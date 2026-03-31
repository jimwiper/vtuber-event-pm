// ==========================================
// トリガー管理
// ==========================================

// 毎朝9時のSlackリマインドトリガーを登録（1回だけ実行）
function setDailyReminderTrigger() {
  deleteTriggerByName('dailySlackReminder');

  ScriptApp.newTrigger('dailySlackReminder')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('毎朝9時のSlackリマインドトリガーを登録しました');
}

// 登録済みトリガーを確認
function listTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    Logger.log('関数: ' + t.getHandlerFunction() + ', タイプ: ' + t.getEventType());
  });
}

// 特定の関数名のトリガーを削除
function deleteTriggerByName(functionName) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === functionName)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// 全トリガーを削除（リセット用）
function deleteAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('全トリガーを削除しました');
}

// ==========================================
// セットアップ（初期設定まとめて実行）
// ==========================================

function saveSlackWebhookUrl(url) {
  PropertiesService.getScriptProperties().setProperty(PROP_SLACK_URL, url);
  Logger.log('Slack Webhook URLを保存しました');
}

function saveCalendarId(calendarId) {
  PropertiesService.getScriptProperties().setProperty(PROP_CALENDAR_ID, calendarId);
  Logger.log('カレンダーIDを保存しました');
}

// 初期セットアップ手順をログに出力
function printSetupGuide() {
  Logger.log('========== セットアップ手順 ==========');
  Logger.log('1. saveClaudeApiKey("sk-ant-...") を実行');
  Logger.log('2. saveSlackWebhookUrl("https://hooks.slack.com/...") を実行');
  Logger.log('3. saveCalendarId("xxxxx@group.calendar.google.com") を実行');
  Logger.log('   ※ Google Calendarでイベント専用カレンダーを作成してIDをコピー');
  Logger.log('4. initializeSpreadsheet() を実行（シート作成）');
  Logger.log('5. initializeMasterData() を実行（初期データ投入）');
  Logger.log('6. setDailyReminderTrigger() を実行（毎朝9時リマインド有効化）');
  Logger.log('=====================================');
}
