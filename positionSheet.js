// ==========================================
// 当日スタッフポジション表の生成
// スプレッドシートに印刷用シートを出力する
// ==========================================

// メニューから呼ぶ：イベントIDを入力してポジション表を生成
function openPositionSheetDialog() {
  const ui = SpreadsheetApp.getUi();

  // アクティブなイベント一覧を選択肢として表示
  const events = getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止');

  if (events.length === 0) {
    ui.alert('対象イベントがありません。先にイベントを登録してください。');
    return;
  }

  const list = events.map((e, i) =>
    (i + 1) + '. [' + e['イベントID'] + '] ' + e['イベント名'] + ' (' + e['開催日'] + ')'
  ).join('\n');

  const response = ui.prompt(
    'ポジション表を生成するイベントIDを入力してください',
    list + '\n\nイベントIDを入力（例: EVT001）:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const eventId = response.getResponseText().trim();
  if (!eventId) return;

  try {
    const sheetName = generatePositionSheet(eventId);
    ui.alert('ポジション表を生成しました。\nシート名: ' + sheetName);
  } catch (e) {
    ui.alert('エラー: ' + e.message);
  }
}

// ポジション表シートを生成してシート名を返す
function generatePositionSheet(eventId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // イベント情報を取得
  const events = filterRows(SHEET.EVENTS, { 'イベントID': eventId });
  if (events.length === 0) throw new Error('イベントが見つかりません: ' + eventId);
  const event = events[0];

  // スタッフアサインを取得
  const assignments = filterRows(SHEET.STAFF_ASSIGN, { 'イベントID': eventId });

  // 出力先シート名（既存なら上書き）
  const sheetName = 'ポジション表_' + eventId;
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.clearContents();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  // ==========================================
  // レイアウト構築
  // ==========================================

  let row = 1;

  // タイトル行
  sheet.getRange(row, 1, 1, 6).merge();
  sheet.getRange(row, 1).setValue('当日スタッフ ポジション表');
  sheet.getRange(row, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  row++;

  // イベント情報
  const infoData = [
    ['イベント名', event['イベント名'], '', '開催日', event['開催日'] + (event['終了日'] && event['終了日'] !== event['開催日'] ? ' 〜 ' + event['終了日'] : ''), ''],
    ['種別',       event['種別'],       '', '開催形式', event['開催形式'], ''],
    ['収容規模',   event['収容規模'] + '人', '', '担当者', event['担当者'], ''],
  ];
  infoData.forEach(rowData => {
    sheet.getRange(row, 1, 1, 6).setValues([rowData]);
    sheet.getRange(row, 1).setFontWeight('bold').setBackground('#eceff1');
    sheet.getRange(row, 4).setFontWeight('bold').setBackground('#eceff1');
    row++;
  });
  row++; // 空行

  // ポジション表ヘッダー
  const headers = ['ポジション', '担当者氏名', 'シフト開始', 'シフト終了', '備考', ''];
  sheet.getRange(row, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(row, 1, 1, headers.length)
    .setBackground('#263238')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  row++;

  // アサインデータ
  if (assignments.length === 0) {
    sheet.getRange(row, 1, 1, 5).merge();
    sheet.getRange(row, 1).setValue('スタッフ未アサイン（スタッフアサインシートに入力してください）');
    sheet.getRange(row, 1).setFontColor('#888888');
    row++;
  } else {
    assignments.forEach((a, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      const values = [
        [a['ポジション'], a['氏名'] || '（未定）', a['シフト開始'], a['シフト終了'], a['備考'], '']
      ];
      sheet.getRange(row, 1, 1, 6).setValues(values).setBackground(bg);
      row++;
    });
  }

  row++; // 空行

  // 備考欄
  sheet.getRange(row, 1, 1, 6).merge();
  sheet.getRange(row, 1).setValue('【当日備考・連絡先】');
  sheet.getRange(row, 1).setFontWeight('bold').setBackground('#eceff1');
  row++;

  for (let i = 0; i < 5; i++) {
    sheet.getRange(row, 1, 1, 6).merge();
    sheet.getRange(row, 1).setValue('');
    sheet.getRange(row, 1, 1, 6).setBorder(true, true, true, true, null, null);
    row++;
  }

  // 列幅調整
  sheet.setColumnWidth(1, 180); // ポジション
  sheet.setColumnWidth(2, 120); // 氏名
  sheet.setColumnWidth(3, 110); // シフト開始
  sheet.setColumnWidth(4, 110); // シフト終了
  sheet.setColumnWidth(5, 200); // 備考
  sheet.setColumnWidth(6, 20);  // 余白

  // 印刷設定
  sheet.setHiddenGridlines(false);

  Logger.log('ポジション表を生成しました: ' + sheetName);
  return sheetName;
}
