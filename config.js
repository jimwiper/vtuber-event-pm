// ==========================================
// 設定・定数
// ==========================================

const SHEET = {
  EVENTS:           'イベント台帳',
  TASKS:            'タスク管理',
  MILESTONES:       'マイルストーン',
  EQUIPMENT_LIST:   '機材調達リスト',
  STAFF_ASSIGN:     'スタッフアサイン',
  VENUE_MASTER:     '会場マスタ',
  EQUIPMENT_MASTER: '機材マスタ',
  VENDOR_MASTER:    '業者マスタ',
  STAFF_MASTER:     'スタッフ台帳',
  API_LOG:          'API使用ログ',
  VENDOR_PROGRESS:  '業者進捗管理',
};

// 業者進捗ステータス
const VENDOR_PROGRESS_STATUS = ['未依頼', '依頼中', '見積中', '契約済', '完了', 'キャンセル'];

const CLAUDE_MODEL   = 'claude-opus-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// スクリプトプロパティのキー名
const PROP_CLAUDE_KEY  = 'ANTHROPIC_API_KEY';
const PROP_SLACK_URL   = 'SLACK_WEBHOOK_URL';
const PROP_CALENDAR_ID = 'CALENDAR_ID'; // イベントPM用カレンダーのID

// イベント種別
const EVENT_TYPES = [
  '体験型',
  'ライブ型（3Dあり）',
  'ライブ型（3Dなし）',
  'eスポーツ型',
  '複合フェス型',
  'コラボ型',
];

// イベントステータス
const EVENT_STATUS = ['企画中', '準備中', '直前', '完了', '中止'];

// タスクフェーズ
const PHASES = [
  'Phase0:企画',
  'Phase1:準備初期',
  'Phase2:準備中期',
  'Phase3:直前',
  'Phase4:当日',
  'Phase5:終了後',
];

// タスクステータス
const TASK_STATUS = ['未着手', '進行中', '完了', '要確認', 'ブロック中'];

// 機材カテゴリ
const EQUIPMENT_CATEGORIES = [
  '映像',
  '3Dライブ専用',
  'eスポーツ・ゲーム',
  '配信',
  '音響',
  '照明',
  '会場設備補完',
];

// 業者カテゴリ
const VENDOR_CATEGORIES = [
  '音響（PA）',
  '照明',
  '映像',
  'モーションキャプチャ',
  'グッズ製造',
  '警備',
  '仮設・設営',
  '配信技術',
  'チケット販売',
  'スタッフ派遣',
];

// Slackリマインド設定（何日前から通知するか）
const REMIND_DAYS_AHEAD = 7; // 7日以内に期限が来るタスクを通知

// ==========================================
// PM Tool 連携設定
// ==========================================

// 使用するPMツール。null にすると連携をスキップ
// 対応値: 'github' | null
// 他ツール追加時: 対応するConnectorファイルを作成し値を追加する
const PM_CONNECTOR_TYPE = 'github';

// Script Propertiesのキー名
const PROP_GITHUB_TOKEN = 'GITHUB_TOKEN'; // GitHub Personal Access Token
const PROP_GITHUB_OWNER = 'GITHUB_OWNER'; // GitHubのユーザー名またはOrg名
