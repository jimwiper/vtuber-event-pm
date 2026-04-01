// ==========================================
// 業者進捗管理
// ==========================================

// サイドバーを開く
function openVendorProgressForm() {
  const html = HtmlService.createHtmlOutputFromFile('VendorProgress')
    .setTitle('業者進捗を登録')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// HTML側から呼ばれる：アクティブなイベント一覧を返す
function getActiveEvents() {
  return getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止')
    .map(e => ({ id: e['イベントID'], name: e['イベント名'] }));
}

// HTML側から呼ばれる：業者マスタから業者一覧を返す
function getVendorMasterList() {
  return getAllRows(SHEET.VENDOR_MASTER).map(v => ({
    id:       v['業者ID'],
    name:     v['社名'],
    category: v['カテゴリ'],
    contact:  v['担当者'],
    tel:      v['連絡先'],
  }));
}

// 業者進捗を1件登録
function addVendorProgress(data) {
  try {
    const progressId = generateId('VPR', SHEET.VENDOR_PROGRESS, '進捗ID');
    appendRow(SHEET.VENDOR_PROGRESS, {
      '進捗ID':     progressId,
      'イベントID': data.eventId,
      '業者ID':     data.vendorId   || '',
      '業者名':     data.vendorName,
      '業務カテゴリ': data.category || '',
      '業務内容':   data.description,
      '契約状況':   data.status     || '未依頼',
      '担当窓口':   data.contact    || '',
      '連絡先':     data.tel        || '',
      '依頼期限':   data.requestDeadline || '',
      '納期':       data.deliveryDate    || '',
      '費用(万円)': data.cost            || '',
      '最終確認日': '',
      'メモ':       data.memo       || '',
    });
    return { success: true, progressId };
  } catch (e) {
    Logger.log('addVendorProgress エラー: ' + e.message);
    return { success: false, error: e.message };
  }
}

// 契約状況を更新
function updateVendorStatus(progressId, status, memo) {
  try {
    const today = formatDate(new Date());
    const updated = updateRowById(SHEET.VENDOR_PROGRESS, '進捗ID', progressId, {
      '契約状況':   status,
      '最終確認日': today,
      'メモ':       memo || '',
    });
    if (!updated) throw new Error('進捗IDが見つかりません: ' + progressId);
    return { success: true };
  } catch (e) {
    Logger.log('updateVendorStatus エラー: ' + e.message);
    return { success: false, error: e.message };
  }
}

// イベントIDに紐づく業者進捗を返す
function getVendorProgressByEvent(eventId) {
  return filterRows(SHEET.VENDOR_PROGRESS, { 'イベントID': eventId });
}

// 期限切れ・直近の業者進捗を返す（Slackリマインド用）
function getVendorProgressAlerts(today, limitDate) {
  const activeEventIds = getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止')
    .map(e => e['イベントID']);

  const rows = getAllRows(SHEET.VENDOR_PROGRESS).filter(r =>
    activeEventIds.includes(r['イベントID']) &&
    r['契約状況'] !== '完了' &&
    r['契約状況'] !== 'キャンセル'
  );

  const overdue  = [];
  const upcoming = [];

  rows.forEach(r => {
    const deadline = r['依頼期限'] ? new Date(r['依頼期限']) : null;
    if (!deadline) return;
    deadline.setHours(0, 0, 0, 0);

    if (deadline < today)                          overdue.push(r);
    else if (deadline >= today && deadline <= limitDate) upcoming.push(r);
  });

  return { overdue, upcoming };
}
