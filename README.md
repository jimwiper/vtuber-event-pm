# vtuber-event-pm

VTuberエンタメ企業向け イベントPM補助ツール

Google Apps Script + Claude API で構成。オフライン・オンラインイベントの企画〜当日運営までの業務を自動化・補助する。

---

## 機能一覧

| 機能 | 概要 |
|------|------|
| イベント登録 + タスク自動展開 | イベント種別・規模・開催日を入力するとClaude APIがタスク・機材・スタッフポジション・マイルストーンを一括生成 |
| WBS構造（タスク親子関係） | Claude生成タスクに親子関係（`parentIndex`）を持たせ、シートの`親タスクID`列・GitHubタイトルのインデントで階層を表現 |
| QCD管理フィールド | タスクごとに品質評価（良好/要改善/問題あり）・実費（万円）・実績納期を記録。GitHubと双方向同期 |
| 逆算スケジュール → カレンダー登録 | 開催日から締切を自動計算し、Googleカレンダーにマイルストーンを登録 |
| 会場候補検索 | 収容規模を入力すると会場マスタから候補をフィルタして表示 |
| 当日ポジション表生成 | スタッフアサインシートの内容を印刷用レイアウトのシートに自動出力 |
| 業者進捗管理 | 音響・照明・映像等の外部業者の契約状況・依頼期限・納期をシートで管理。サイドバーから登録 |
| GitHub Projects連携 | イベント登録時にGitHub Projects v2へプロジェクト・タスク・マイルストーンを自動作成。優先度/フェーズ/QCDフィールド付き |
| Sheets ↔ GitHub 双方向同期 | ステータス・QCDフィールドをメニューから手動で双方向に同期 |
| Slackリマインド | 毎朝9時に期限切れ・直近7日以内のタスクをSlackに通知 |
| Slackアラート強化 | 担当者未定タスク・遅延3件以上のイベント（要リソース確認）を追加通知 |
| API使用ログ | Claude API呼び出しのトークン数・ステータスを`API使用ログ`シートに自動記録 |

---

## 対応イベント種別

- 体験型（ファンミーティング・特典会など）
- ライブ型（3Dモーションキャプチャあり）
- ライブ型（3Dなし）
- eスポーツ型（ゲーム大会・競技イベント）
- 複合フェス型（ライブ＋eスポーツ＋物販）
- コラボ型（外部施設・企業との共同イベント）

---

## 構成ファイル

```
vtuber-event-pm/
├── appsscript.json      マニフェスト（権限スコープ定義）
├── config.js            定数・シート名・カテゴリ定義
├── claude.js            Claude API呼び出し
├── spreadsheet.js       シート初期化・共通CRUD操作
├── masterData.js        会場・機材・業者マスタの初期データ
├── events.js            イベント登録・タスク/機材/ポジション展開ロジック
├── calendar.js          Googleカレンダー連携
├── slack.js             Slack通知（毎朝リマインド）
├── master.js            会場検索・業者参照ユーティリティ
├── positionSheet.js     当日ポジション表生成
├── vendor.js            業者進捗管理ロジック
├── pmConnector.js       PMツール抽象インターフェース（差し替え可）
├── githubConnector.js   GitHub Projects v2 実装（GraphQL API）
├── menu.js              カスタムメニュー・フォーム制御
├── EventForm.html       イベント登録サイドバーUI
├── VenueSearch.html     会場検索サイドバーUI
├── VendorProgress.html  業者進捗登録サイドバーUI
└── security-test/       Node.jsモック環境によるセキュリティテスト
```

---

## スプレッドシート構成（11シート）

| シート名 | 用途 |
|---------|------|
| イベント台帳 | イベントの基本情報・PM ProjectID・PM URL |
| タスク管理 | フェーズ別タスク一覧・担当者・期限・ステータス・WBS親子・QCD・PM ItemID |
| マイルストーン | カレンダー登録用の主要締切 |
| 機材調達リスト | イベント別の機材・レンタル業者・費用 |
| スタッフアサイン | 当日スタッフのポジション・シフト割当 |
| 会場マスタ | 収容人数・設備・費用・取引実績（初期20件） |
| 機材マスタ | VTuber特化カテゴリ別機材リスト（初期35件） |
| 業者マスタ | 音響/照明/映像/モーキャプ等のカテゴリ枠 |
| スタッフ台帳 | スタッフ個人情報（アクセス制限保護あり） |
| 業者進捗管理 | 外部業者の契約状況・依頼期限・納期 |
| API使用ログ | Claude API呼び出し履歴（トークン数・ステータス） |

---

## セットアップ手順

### 1. GASプロジェクトの作成

1. Google Driveで新しいスプレッドシートを作成
2. 拡張機能 → Apps Script を開く
3. 各 `.js` ファイルをスクリプトとして、`.html` ファイルをHTMLとして追加
4. `appsscript.json` はプロジェクトの設定から「マニフェストを表示」して内容を差し替え

### 2. 外部サービスの準備

以下のキー・IDを用意してから手順3に進む。

| 項目 | 取得場所 | 形式の例 |
|------|---------|---------|
| Claude APIキー | [Anthropic Console](https://console.anthropic.com) → API Keys | `sk-ant-api03-...` |
| Slack Webhook URL | [Slack API](https://api.slack.com/apps) → アプリ作成 → Incoming Webhooks を有効化 | `https://hooks.slack.com/services/...` |
| GoogleカレンダーID | Google Calendar → カレンダー設定 → 「カレンダーの統合」 | `xxxxx@group.calendar.google.com` |
| GitHub Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens (classic)<br>必要スコープ: `project`（read/write）, `read:user` | `ghp_xxxxxxxxxxxx` |
| GitHub ユーザー名 / Org名 | GitHubのURLに表示されるアカウント名 | `your-username` |

**GitHub Projectsを使わない場合**
`config.js` の `PM_CONNECTOR_TYPE` を `null` に変更するとGitHub連携をスキップできる。その場合はGitHubのトークン・ユーザー名の設定は不要。

### 3. 初期設定（GASエディタで実行）

**手順3-1: APIキー類を保存する**

GASエディタで以下を一時的に実行してスクリプトプロパティに保存する。  
実行後はコードをエディタから削除すること（コードに直接残さない）。

```javascript
// ▼ 一時的に実行してすぐ削除する
function setupKeys() {
  saveClaudeApiKey('sk-ant-...');          // Claude APIキー
  saveSlackWebhookUrl('https://hooks.slack.com/services/...');  // Slack Webhook URL
  saveCalendarId('xxxxx@group.calendar.google.com');            // GoogleカレンダーID
  saveGithubToken('ghp_xxxxxxxxxxxx');     // GitHub Personal Access Token
  saveGithubOwner('your-username');        // GitHubユーザー名またはOrg名
}
```

**手順3-2: スプレッドシートを初期化する**

続けて以下を順番に実行：

```javascript
initializeSpreadsheet()    // 11シートを作成
initializeMasterData()     // 会場・機材・業者マスタを投入
setDailyReminderTrigger()  // 毎朝9時のSlackリマインドを有効化
```

**手順3-3: 接続テストを行う**

```javascript
testGithubConnection()     // GitHub接続確認（メニューからも実行可）
```

成功すると「接続成功: @your-username」のダイアログが表示される。

---

## 使い方

スプレッドシートを開くとメニューバーに「イベントPM」が追加される。

### イベントを登録する

1. メニュー「イベントPM」→「新規イベント登録」
2. サイドバーに必要事項を入力して「登録してタスクを自動展開」
3. Claude APIが処理（約30秒）し、各シートにタスク・機材・ポジション・マイルストーンを書き込む

### マイルストーンをカレンダーに登録する

メニュー「マイルストーンをカレンダーに登録（全イベント）」を実行する。  
未登録のマイルストーンがGoogleカレンダーに一括登録される。

### 会場を探す

メニュー「会場候補を検索」→ 収容規模を入力 → マスタから条件に合う会場を表示。

### 当日ポジション表を出力する

1. スタッフアサインシートに担当者・シフトを入力しておく
2. メニュー「当日ポジション表を生成」→ イベントIDを選択
3. `ポジション表_EVTxxx` という名前のシートが生成される（印刷用）

### 業者進捗を登録する

1. メニュー「業者進捗を登録」→ サイドバーから業者・業務内容・依頼期限・納期を入力
2. 期限が近い・超過した業者依頼はSlackリマインドに自動で表示される

### GitHub Projects に同期する

イベント登録時に自動でGitHub Projectsにプロジェクトが作成される。  
登録後にステータスやQCDフィールドを更新した場合は手動で同期する。

- **Sheets → GitHub**: メニュー「Sheets → GitHub 同期（全イベント）」  
  シートのステータス・品質評価・実費・実績納期をGitHubに反映する
- **GitHub → Sheets**: メニュー「GitHub → Sheets 同期（全イベント）」  
  GitHub Projects側での更新をシートに書き戻す

### タスクのQCD情報を入力する

タスク管理シートの以下の列を直接入力する：

| 列名 | 内容 | 値の例 |
|------|------|-------|
| 品質評価 | 成果物の品質判定 | `良好` / `要改善` / `問題あり` |
| 実費(万円) | 実際にかかった費用 | `15` |
| 実績納期 | 実際の完了日 | `2026/08/10` |

入力後にGitHub同期を行うとGitHub Projects側にも反映される。

### Slackリマインドをテストする

メニュー「Slackリマインド（即時テスト）」で手動送信して確認できる。

通知される内容：

| セクション | 条件 |
|-----------|------|
| タスク 期限切れ | 完了していない期限超過タスク |
| タスク 今後7日以内 | 完了していない直近タスク |
| 担当者未定 | 担当者が空で期限が7日以内または超過 |
| 要リソース確認 | 遅延タスクが3件以上あるイベント（閾値は`config.js`の`DELAY_ALERT_THRESHOLD`で変更可） |
| 業者依頼期限切れ | 未完了の業者依頼で期限超過 |
| 業者依頼 今後7日以内 | 未完了の業者依頼で直近期限 |

---

## 注意事項

- APIキー・Slack Webhook URL・GitHubトークンはコードに直接書かない。GASの `PropertiesService`（スクリプトプロパティ）で管理する
- GitHubトークンはスコープを `project` と `read:user` の最小権限に絞ること。classic tokenの場合はexpiration（有効期限）を設定することを推奨
- スタッフ台帳シートは個人情報を含むため、スプレッドシートの共有設定で閲覧者を限定すること
- 業者マスタの取引先情報（社名・連絡先）は初期投入されていないため、チームで追記する
- GitHub ProjectsをOrgアカウントで使う場合、トークンのスコープに `admin:org` → `read:org` の追加が必要な場合がある

---

## 動作環境

- Google Apps Script（V8ランタイム）
- Claude API（`claude-opus-4-6`）
- Google Workspace（スプレッドシート・カレンダー）
- Slack（Incoming Webhooks）
