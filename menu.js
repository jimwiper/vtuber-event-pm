// ==========================================
// カスタムメニュー・フォーム制御
// ==========================================

// スプレッドシートを開いたときにメニューを追加
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('イベントPM')
    .addItem('新規イベント登録', 'openEventForm')
    .addSeparator()
    .addItem('会場候補を検索', 'openVenueSearch')
    .addItem('当日ポジション表を生成', 'openPositionSheetDialog')
    .addItem('業者進捗を登録', 'openVendorProgressForm')
    .addSeparator()
    .addItem('マイルストーンをカレンダーに登録（全イベント）', 'registerAllPendingMilestones')
    .addSeparator()
    .addItem('Slackリマインド（即時テスト）', 'testSlackReminder')
    .addItem('セットアップ手順を確認', 'printSetupGuide')
    .addToUi();
}

// イベント登録フォームをサイドバーで開く
function openEventForm() {
  const html = HtmlService.createHtmlOutputFromFile('EventForm')
    .setTitle('新規イベント登録')
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

// フォームのsubmitから呼ばれる
function submitEventForm(formData) {
  const result = registerEventFromForm(formData);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message:
      'イベントID: ' + result.eventId + '\n' +
      'タスク: '     + result.taskCount     + '件\n' +
      '機材: '       + result.equipmentCount + '件\n' +
      'ポジション: ' + result.positionCount  + '件\n' +
      'マイルストーン: ' + result.milestoneCount + '件\n' +
      '\n各シートに書き込みました。',
  };
}
