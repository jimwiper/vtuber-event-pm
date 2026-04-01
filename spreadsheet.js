// ==========================================
// スプレッドシート初期化・共通操作
// ==========================================

// シートヘッダー定義
const HEADERS = {
  [SHEET.EVENTS]: [
    'イベントID', 'イベント名', '種別', '開催日', '終了日',
    '収容規模', '開催形式', '会場ID', 'ステータス', '予算(万円)', '担当者', '備考'
  ],
  [SHEET.TASKS]: [
    'タスクID', 'イベントID', 'フェーズ', 'タスク名', '担当者',
    '期限', 'ステータス', '優先度', 'メモ'
  ],
  [SHEET.MILESTONES]: [
    'マイルストーンID', 'イベントID', 'マイルストーン名', '日付',
    'カレンダー登録済', 'カレンダーイベントID', '備考'
  ],
  [SHEET.EQUIPMENT_LIST]: [
    '調達ID', 'イベントID', '機材ID', '品目名', '数量',
    'レンタル業者', '費用(万円)', '確認状況', '手配期限', 'メモ'
  ],
  [SHEET.STAFF_ASSIGN]: [
    'アサインID', 'イベントID', 'ポジション', 'スタッフID', '氏名',
    'シフト開始', 'シフト終了', '備考'
  ],
  [SHEET.VENUE_MASTER]: [
    '会場ID', '会場名', '所在地', '収容人数', '会場種別',
    '設備メモ', '費用目安(万円/日)', '担当窓口', '連絡先', '取引実績', '備考'
  ],
  [SHEET.EQUIPMENT_MASTER]: [
    '機材ID', 'カテゴリ', '品目名', '仕様メモ',
    '主要レンタル業者', '費用目安', 'VTuber特化', '備考'
  ],
  [SHEET.VENDOR_MASTER]: [
    '業者ID', 'カテゴリ', '社名', '対応規模(人)', '担当者',
    '連絡先', '取引実績', '得意分野', '備考'
  ],
  [SHEET.STAFF_MASTER]: [
    'スタッフID', '氏名', '種別', 'ポジション区分', '連絡先', 'メールアドレス', '備考'
  ],
  [SHEET.API_LOG]: [
    '日時', '呼び出し元', 'モデル', '入力トークン', '出力トークン', 'ステータス', 'エラー内容'
  ],
};

// 全シートを初期化（初回1回だけ実行）
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(HEADERS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('シート作成: ' + sheetName);
    } else {
      Logger.log('シート既存: ' + sheetName);
    }
    setupSheetHeader(sheet, HEADERS[sheetName]);
  });

  // スタッフ台帳を保護（オーナーのみ編集可）
  protectStaffSheet(ss);

  // デフォルトの「シート1」を削除
  const defaultSheet = ss.getSheetByName('シート1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);

  Logger.log('スプレッドシートの初期化が完了しました');
}

// ヘッダー行を設定（太字・背景色）
function setupSheetHeader(sheet, headers) {
  const headerRow = sheet.getRange(1, 1, 1, headers.length);
  headerRow.setValues([headers]);
  headerRow.setFontWeight('bold');
  headerRow.setBackground('#263238');
  headerRow.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// スタッフ台帳シートを保護
function protectStaffSheet(ss) {
  const sheet = ss.getSheetByName(SHEET.STAFF_MASTER);
  if (!sheet) return;

  // 既存の保護を削除してから再設定
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());

  const protection = sheet.protect();
  protection.setDescription('スタッフ個人情報 - オーナーのみ編集可');
  protection.removeEditors(protection.getEditors());
  // オーナー（自分）は自動的に編集可のまま
  Logger.log('スタッフ台帳を保護しました');
}

// ==========================================
// 共通CRUD操作
// ==========================================

function getSheet(sheetName) {
  if (!sheetName) throw new Error('sheetNameが未定義です。config.jsが正しく読み込まれているか確認してください');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('アクティブなスプレッドシートが見つかりません');
  // getSheetByName の代わりにシート一覧から検索（GASのキャッシュ問題を回避）
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === sheetName) return sheets[i];
  }
  throw new Error('シートが見つかりません: ' + sheetName);
}

// シートの全データを取得（ヘッダー除く）。オブジェクト配列で返す
function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// 条件でフィルタ（例: { 'イベントID': 'EVT001' }）
function filterRows(sheetName, conditions) {
  return getAllRows(sheetName).filter(row => {
    return Object.keys(conditions).every(key => row[key] === conditions[key]);
  });
}

// 数式インジェクション対策: =, +, -, @ 等で始まる文字列を ' でエスケープして
// Google Sheets が数式として解釈しないようにする
function sanitizeForSheet(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

// 1行追記（ヘッダー順にオブジェクトを配列変換して追加）
function appendRow(sheetName, rowObj) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const values = headers.map(h => sanitizeForSheet(rowObj[h] !== undefined ? rowObj[h] : ''));
  sheet.appendRow(values);
}

// IDで行を検索して更新
function updateRowById(sheetName, idColumn, idValue, updateObj) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);

  if (idIdx === -1) throw new Error('ID列が見つかりません: ' + idColumn);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === idValue) {
      Object.keys(updateObj).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) sheet.getRange(i + 1, colIdx + 1).setValue(updateObj[key]);
      });
      return true;
    }
  }
  return false;
}

// 採番（シートの最大ID+1を返す）
function generateId(prefix, sheetName, idColumn) {
  const rows = getAllRows(sheetName);
  if (rows.length === 0) return prefix + '001';

  const nums = rows
    .map(r => parseInt((r[idColumn] || '').replace(prefix, ''), 10))
    .filter(n => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return prefix + String(next).padStart(3, '0');
}
