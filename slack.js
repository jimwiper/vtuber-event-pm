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

  // 完了・中止以外のイベントを取得
  const activeEvents = getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止');
  const activeEventIds = activeEvents.map(e => e['イベントID']);
  const eventNameMap   = {};
  activeEvents.forEach(e => { eventNameMap[e['イベントID']] = e['イベント名']; });

  if (activeEventIds.length === 0) return;

  const allTasks = getAllRows(SHEET.TASKS).filter(t =>
    activeEventIds.indexOf(t['イベントID']) !== -1 &&
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

  // 担当者未定 かつ 期限が近い・過ぎているタスク
  const unassigned = allTasks.filter(t => {
    if (t['担当者']) return false;
    if (!t['期限']) return false;
    const d = new Date(t['期限']);
    d.setHours(0, 0, 0, 0);
    return d <= limitDate;
  });

  // 遅延件数がしきい値以上のイベント（要リソース確認）
  const overdueByEvent = {};
  overdue.forEach(t => {
    const id = t['イベントID'];
    overdueByEvent[id] = (overdueByEvent[id] || 0) + 1;
  });
  const resourceAlerts = Object.keys(overdueByEvent).filter(
    id => overdueByEvent[id] >= DELAY_ALERT_THRESHOLD
  );

  // 業者進捗の期限アラート
  const vendorAlerts = getVendorProgressAlerts(today, limitDate);

  const hasTaskAlert     = overdue.length > 0 || upcoming.length > 0;
  const hasUnassigned    = unassigned.length > 0;
  const hasResourceAlert = resourceAlerts.length > 0;
  const hasVendorAlert   = vendorAlerts.overdue.length > 0 || vendorAlerts.upcoming.length > 0;

  if (!hasTaskAlert && !hasUnassigned && !hasResourceAlert && !hasVendorAlert) {
    Logger.log('本日のリマインド対象なし');
    return;
  }

  const lines = [];
  lines.push('*:calendar: イベントPM 本日のリマインド*');
  lines.push(formatDate(today) + ' 時点');
  lines.push('');

  // ── タスク ──
  if (overdue.length > 0) {
    lines.push('*:warning: タスク 期限切れ (' + overdue.length + '件)*');
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
    lines.push('*:clock1: タスク 今後' + REMIND_DAYS_AHEAD + '日以内 (' + upcoming.length + '件)*');
    upcoming.forEach(t => {
      lines.push(
        '• `' + t['期限'] + '` ' +
        '[' + t['イベントID'] + '] ' +
        t['タスク名'] +
        (t['担当者'] ? '  担当: ' + t['担当者'] : '')
      );
    });
    lines.push('');
  }

  // ── 担当者未定 ──
  if (unassigned.length > 0) {
    lines.push('*:bust_in_silhouette: 担当者未定 (' + unassigned.length + '件)*');
    unassigned.forEach(t => {
      lines.push(
        '• `' + t['期限'] + '` ' +
        '[' + t['イベントID'] + '] ' +
        t['タスク名']
      );
    });
    lines.push('');
  }

  // ── 要リソース確認イベント ──
  if (resourceAlerts.length > 0) {
    lines.push('*:sos: 要リソース確認 — 遅延' + DELAY_ALERT_THRESHOLD + '件以上のイベント*');
    resourceAlerts.forEach(id => {
      lines.push(
        '• [' + id + '] ' +
        (eventNameMap[id] || '') +
        '  遅延タスク: *' + overdueByEvent[id] + '件*'
      );
    });
    lines.push('');
  }

  // ── 業者進捗 ──
  if (vendorAlerts.overdue.length > 0) {
    lines.push('*:rotating_light: 業者依頼期限切れ (' + vendorAlerts.overdue.length + '件)*');
    vendorAlerts.overdue.forEach(r => {
      lines.push(
        '• `' + r['依頼期限'] + '` ' +
        '[' + r['イベントID'] + '] ' +
        r['業者名'] + '  ' + r['業務内容'] +
        '  (' + r['契約状況'] + ')'
      );
    });
    lines.push('');
  }

  if (vendorAlerts.upcoming.length > 0) {
    lines.push('*:truck: 業者依頼期限 今後' + REMIND_DAYS_AHEAD + '日以内 (' + vendorAlerts.upcoming.length + '件)*');
    vendorAlerts.upcoming.forEach(r => {
      lines.push(
        '• `' + r['依頼期限'] + '` ' +
        '[' + r['イベントID'] + '] ' +
        r['業者名'] + '  ' + r['業務内容'] +
        '  (' + r['契約状況'] + ')'
      );
    });
  }

  postToSlack(lines.join('\n'));
  Logger.log(
    'Slackリマインド送信完了: タスク期限切れ' + overdue.length + '件' +
    ' / 担当者未定' + unassigned.length + '件' +
    ' / 要リソース確認' + resourceAlerts.length + '件' +
    ' / 業者期限切れ' + vendorAlerts.overdue.length + '件'
  );
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
