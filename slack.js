// ==========================================
// Slack通知
// ==========================================

function getSlackWebhookUrl() {
  const url = PropertiesService.getScriptProperties().getProperty(PROP_SLACK_URL);
  if (!url) throw new Error('Slack Webhook URLが未設定です。saveSlackWebhookUrl()を実行してください');
  return url;
}

function postToSlack(text) {
  const url = getSlackWebhookUrl();

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error('Slack送信失敗: ' + response.getContentText());
  }
}

// ==========================================
// 毎朝9時のリマインド（トリガーから呼ばれる）
// ==========================================

function dailySlackReminder() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + REMIND_DAYS_AHEAD);

  // 完了・中止以外のイベントのタスクを全取得
  const activeEventIds = getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止')
    .map(e => e['イベントID']);

  if (activeEventIds.length === 0) return;

  const allTasks = getAllRows(SHEET.TASKS).filter(t =>
    activeEventIds.includes(t['イベントID']) &&
    t['ステータス'] !== '完了'
  );

  // 期限切れタスク
  const overdue = allTasks.filter(t => {
    if (!t['期限']) return false;
    const d = new Date(t['期限']);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  // 今後7日以内に期限が来るタスク
  const upcoming = allTasks.filter(t => {
    if (!t['期限']) return false;
    const d = new Date(t['期限']);
    d.setHours(0, 0, 0, 0);
    return d >= today && d <= limitDate;
  });

  if (overdue.length === 0 && upcoming.length === 0) {
    Logger.log('本日のリマインド対象タスクなし');
    return;
  }

  const lines = [];
  lines.push('*:calendar: イベントPM 本日のリマインド*');
  lines.push(formatDate(today) + ' 時点');
  lines.push('');

  if (overdue.length > 0) {
    lines.push('*:warning: 期限切れ (' + overdue.length + '件)*');
    overdue.forEach(t => {
      lines.push(
        '• `' + t['期限'] + '` ' +
        '[' + t['イベントID'] + '] ' +
        t['タスク名'] +
        (t['担当者'] ? '  担当: ' + t['担当者'] : '')
      );
    });
    lines.push('');
  }

  if (upcoming.length > 0) {
    lines.push('*:clock1: 今後' + REMIND_DAYS_AHEAD + '日以内の期限 (' + upcoming.length + '件)*');
    upcoming.forEach(t => {
      lines.push(
        '• `' + t['期限'] + '` ' +
        '[' + t['イベントID'] + '] ' +
        t['タスク名'] +
        (t['担当者'] ? '  担当: ' + t['担当者'] : '')
      );
    });
  }

  postToSlack(lines.join('\n'));
  Logger.log('Slackリマインド送信完了: 期限切れ' + overdue.length + '件 / 直近' + upcoming.length + '件');
}

// 即時テスト用（メニューから呼ぶ）
function testSlackReminder() {
  try {
    dailySlackReminder();
    SpreadsheetApp.getUi().alert('Slackに送信しました。チャンネルを確認してください。');
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}
