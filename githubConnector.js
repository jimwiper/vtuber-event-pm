// ==========================================
// GitHub Projects v2 Connector
// ==========================================
//
// 【セットアップ】
// 1. GitHub → Settings → Developer settings → Personal access tokens (classic)
//    スコープ: project (read/write), read:user
// 2. saveGithubToken('ghp_xxx...') を実行
// 3. saveGithubOwner('GitHubユーザー名') を実行
// ==========================================

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

// 優先度・フェーズ・品質評価のカラー定義
const PRIORITY_COLORS = { '高': 'RED', '中': 'YELLOW', '低': 'GRAY' };
const QUALITY_COLORS  = { '良好': 'GREEN', '要改善': 'YELLOW', '問題あり': 'RED' };
const PHASE_COLORS = {
  'Phase0:企画':    'GRAY',
  'Phase1:準備初期': 'BLUE',
  'Phase2:準備中期': 'CYAN',
  'Phase3:直前':    'ORANGE',
  'Phase4:当日':    'RED',
  'Phase5:終了後':  'GREEN',
};

function getGithubToken() {
  const token = PropertiesService.getScriptProperties().getProperty(PROP_GITHUB_TOKEN);
  if (!token) throw new Error('GITHUB_TOKEN が未設定です。saveGithubToken() を実行してください');
  return token;
}

// GraphQL リクエスト共通処理
function githubGraphQL(query, variables) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + getGithubToken(),
      'X-Github-Next-Global-ID': '1',
    },
    payload: JSON.stringify({ query: query, variables: variables || {} }),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(GITHUB_GRAPHQL_URL, options);
  const json = JSON.parse(response.getContentText());

  if (json.errors) {
    throw new Error('GitHub GraphQL エラー: ' + JSON.stringify(json.errors));
  }

  return json.data;
}

function githubGetViewerId() {
  const data = githubGraphQL('query { viewer { id login } }');
  return data.viewer.id;
}

// yyyy/MM/dd → yyyy-MM-dd に変換（GitHub API はISO形式）
function toISODate(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).replace(/\//g, '-');
}

// ==========================================
// プロジェクトフィールド管理
// ==========================================

// プロジェクトの既存フィールドを取得
function getProjectFields(projectId) {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 30) {
            nodes {
              __typename
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField {
                id name
                options { id name }
              }
            }
          }
        }
      }
    }
  `;
  const data = githubGraphQL(query, { projectId });
  return data.node.fields.nodes;
}

// 単一選択フィールドを作成
function createSingleSelectField(projectId, name, options, colorMap) {
  const singleSelectOptions = options.map(opt => ({
    name:        opt,
    color:       (colorMap && colorMap[opt]) || 'GRAY',
    description: '',
  }));

  const mutation = `
    mutation($projectId: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      createProjectV2Field(input: {
        projectId: $projectId
        dataType: SINGLE_SELECT
        name: $name
        singleSelectOptions: $options
      }) {
        projectV2Field {
          ... on ProjectV2SingleSelectField { id name options { id name } }
        }
      }
    }
  `;
  const data = githubGraphQL(mutation, { projectId, name, options: singleSelectOptions });
  return data.createProjectV2Field.projectV2Field;
}

// 日付フィールドを作成
function createDateField(projectId, name) {
  const mutation = `
    mutation($projectId: ID!, $name: String!) {
      createProjectV2Field(input: {
        projectId: $projectId
        dataType: DATE
        name: $name
      }) {
        projectV2Field {
          ... on ProjectV2Field { id name }
        }
      }
    }
  `;
  const data = githubGraphQL(mutation, { projectId, name });
  return data.createProjectV2Field.projectV2Field;
}

// 数値フィールドを作成
function createNumberField(projectId, name) {
  const mutation = `
    mutation($projectId: ID!, $name: String!) {
      createProjectV2Field(input: {
        projectId: $projectId
        dataType: NUMBER
        name: $name
      }) {
        projectV2Field {
          ... on ProjectV2Field { id name }
        }
      }
    }
  `;
  const data = githubGraphQL(mutation, { projectId, name });
  return data.createProjectV2Field.projectV2Field;
}

// フィールドのオプション名 → ID のマップを作成
function buildOptionMap(field) {
  if (!field || !field.options) return {};
  const map = {};
  field.options.forEach(opt => { map[opt.name] = opt.id; });
  return map;
}

// プロジェクト作成後にカスタムフィールドをセットアップ
function setupProjectFields(projectId) {
  const existing = getProjectFields(projectId);
  const findField = name => existing.find(f => f.name === name);

  // Status フィールド（GitHub Projects 組み込み）
  const statusField = findField('Status');

  // 優先度フィールド（なければ作成）
  let priorityField = findField('優先度');
  if (!priorityField) {
    priorityField = createSingleSelectField(
      projectId, '優先度', ['高', '中', '低'], PRIORITY_COLORS
    );
  }

  // 期限フィールド（なければ作成）
  let dueDateField = findField('期限');
  if (!dueDateField) {
    dueDateField = createDateField(projectId, '期限');
  }

  // フェーズフィールド（なければ作成）
  let phaseField = findField('フェーズ');
  if (!phaseField) {
    phaseField = createSingleSelectField(
      projectId, 'フェーズ',
      ['Phase0:企画', 'Phase1:準備初期', 'Phase2:準備中期', 'Phase3:直前', 'Phase4:当日', 'Phase5:終了後'],
      PHASE_COLORS
    );
  }

  // 品質評価フィールド（なければ作成）
  let qualityField = findField('品質評価');
  if (!qualityField) {
    qualityField = createSingleSelectField(
      projectId, '品質評価', ['良好', '要改善', '問題あり'], QUALITY_COLORS
    );
  }

  // 実費フィールド（なければ作成）
  let actualCostField = findField('実費(万円)');
  if (!actualCostField) {
    actualCostField = createNumberField(projectId, '実費(万円)');
  }

  // 実績納期フィールド（なければ作成）
  let actualDateField = findField('実績納期');
  if (!actualDateField) {
    actualDateField = createDateField(projectId, '実績納期');
  }

  return {
    projectId:        projectId,
    statusFieldId:    statusField    ? statusField.id    : null,
    statusOptions:    buildOptionMap(statusField),
    priorityFieldId:  priorityField  ? priorityField.id  : null,
    priorityOptions:  buildOptionMap(priorityField),
    dueDateFieldId:   dueDateField   ? dueDateField.id   : null,
    phaseFieldId:     phaseField     ? phaseField.id     : null,
    phaseOptions:     buildOptionMap(phaseField),
    qualityFieldId:   qualityField   ? qualityField.id   : null,
    qualityOptions:   buildOptionMap(qualityField),
    actualCostFieldId: actualCostField ? actualCostField.id : null,
    actualDateFieldId: actualDateField ? actualDateField.id : null,
  };
}

// ==========================================
// フィールド値の書き込み
// ==========================================

function setFieldValue(projectId, itemId, fieldId, value) {
  if (!fieldId || !itemId) return;
  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId:    $itemId
        fieldId:   $fieldId
        value:     $value
      }) {
        projectV2Item { id }
      }
    }
  `;
  githubGraphQL(mutation, { projectId, itemId, fieldId, value });
}

function applyTaskFields(projectId, itemId, task, fieldMap) {
  // 優先度
  if (fieldMap.priorityFieldId && task.priority) {
    const optId = fieldMap.priorityOptions[task.priority];
    if (optId) setFieldValue(projectId, itemId, fieldMap.priorityFieldId, { singleSelectOptionId: optId });
  }

  // 期限
  if (fieldMap.dueDateFieldId && task.deadline) {
    const isoDate = toISODate(task.deadline);
    if (isoDate) setFieldValue(projectId, itemId, fieldMap.dueDateFieldId, { date: isoDate });
  }

  // フェーズ
  if (fieldMap.phaseFieldId && task.phase) {
    const optId = fieldMap.phaseOptions[task.phase];
    if (optId) setFieldValue(projectId, itemId, fieldMap.phaseFieldId, { singleSelectOptionId: optId });
  }

  // Status（初期値はTodoに相当するオプション）
  if (fieldMap.statusFieldId) {
    const todoId = fieldMap.statusOptions['Todo'] || fieldMap.statusOptions['ToDo'];
    if (todoId) setFieldValue(projectId, itemId, fieldMap.statusFieldId, { singleSelectOptionId: todoId });
  }
}

// ==========================================
// pmConnector.js から呼ばれる実装
// ==========================================

// プロジェクト作成 + フィールドセットアップ → projectData を返す
function githubCreateProject(eventData) {
  const ownerId = githubGetViewerId();

  const mutation = `
    mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 { id url }
      }
    }
  `;
  const data = githubGraphQL(mutation, {
    ownerId: ownerId,
    title:   '[' + eventData.eventId + '] ' + eventData.name,
  });

  const project = data.createProjectV2.projectV2;
  Logger.log('GitHub Project 作成: ' + project.url);

  // カスタムフィールドをセットアップしてfieldMapを取得
  const fieldMap = setupProjectFields(project.id);

  return {
    projectId:  project.id,
    projectUrl: project.url,
    fieldMap:   fieldMap,
  };
}

// タスクをDraft Issueとして作成 + フィールド値を設定
// 戻り値: [{sheetTaskId, itemId}] （PM ItemID書き戻し用）
function githubCreateTasks(projectData, tasks) {
  const { projectId, fieldMap } = projectData;

  const mutation = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body:  $body
      }) {
        projectItem { id }
      }
    }
  `;

  const mappings = [];
  tasks.forEach(task => {
    const title = task.parentTaskName ? '└─ ' + task.taskName : task.taskName;
    const body = [
      task.parentTaskName ? '**親タスク**: ' + task.parentTaskName : '',
      '**担当**: ' + (task.defaultAssignee || '未定'),
      task.memo ? '**メモ**: ' + task.memo : '',
    ].filter(Boolean).join('\n');

    const data = githubGraphQL(mutation, {
      projectId: projectId,
      title:     title,
      body:      body,
    });

    const itemId = data.addProjectV2DraftIssue.projectItem.id;
    applyTaskFields(projectId, itemId, task, fieldMap);

    if (task.sheetTaskId) mappings.push({ sheetTaskId: task.sheetTaskId, itemId: itemId });
  });

  Logger.log('GitHub タスク登録完了: ' + tasks.length + '件');
  return mappings;
}

// マイルストーンを【MS】プレフィックス付きDraft Issueとして作成
function githubCreateMilestones(projectData, milestones) {
  const { projectId, fieldMap } = projectData;

  const mutation = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body:  $body
      }) {
        projectItem { id }
      }
    }
  `;

  milestones.forEach(ms => {
    const body = ms.memo ? '**メモ**: ' + ms.memo : '';
    const data = githubGraphQL(mutation, {
      projectId: projectId,
      title:     '【MS】' + ms.name,
      body:      body,
    });

    const itemId = data.addProjectV2DraftIssue.projectItem.id;

    // マイルストーンは期限のみ設定
    if (fieldMap.dueDateFieldId && ms.date) {
      const isoDate = toISODate(ms.date);
      if (isoDate) setFieldValue(projectId, itemId, fieldMap.dueDateFieldId, { date: isoDate });
    }
  });

  Logger.log('GitHub マイルストーン登録完了: ' + milestones.length + '件');
}

// ==========================================
// 双方向同期
// ==========================================

// Sheets（ステータス列）→ GitHub Projects（Statusフィールド）
function githubSyncSheetsToGitHub(eventId) {
  const events = filterRows(SHEET.EVENTS, { 'イベントID': eventId });
  if (!events.length || !events[0]['PM ProjectID']) {
    throw new Error('GitHub ProjectIDが見つかりません: ' + eventId);
  }

  const projectId = events[0]['PM ProjectID'];
  const fieldMap  = setupProjectFields(projectId);
  const tasks     = filterRows(SHEET.TASKS, { 'イベントID': eventId });

  const STATUS_TO_GH = {
    '未着手':    'Todo',
    '進行中':    'In Progress',
    '完了':      'Done',
    '要確認':    'In Review',
    'ブロック中': 'Blocked',
  };

  let count = 0;
  tasks.forEach(function(task) {
    const itemId = task['PM ItemID'];
    if (!itemId) return;

    // ステータス
    const ghLabel = STATUS_TO_GH[task['ステータス']];
    if (ghLabel) {
      const optId = fieldMap.statusOptions[ghLabel];
      if (optId && fieldMap.statusFieldId) {
        setFieldValue(projectId, itemId, fieldMap.statusFieldId, { singleSelectOptionId: optId });
      }
    }

    // 品質評価
    if (task['品質評価'] && fieldMap.qualityFieldId) {
      const optId = fieldMap.qualityOptions[task['品質評価']];
      if (optId) setFieldValue(projectId, itemId, fieldMap.qualityFieldId, { singleSelectOptionId: optId });
    }

    // 実費(万円)
    const cost = Number(task['実費(万円)']);
    if (!isNaN(cost) && task['実費(万円)'] !== '' && fieldMap.actualCostFieldId) {
      setFieldValue(projectId, itemId, fieldMap.actualCostFieldId, { number: cost });
    }

    // 実績納期
    if (task['実績納期'] && fieldMap.actualDateFieldId) {
      const isoDate = toISODate(task['実績納期']);
      if (isoDate) setFieldValue(projectId, itemId, fieldMap.actualDateFieldId, { date: isoDate });
    }

    count++;
  });

  Logger.log('Sheets→GitHub同期完了: ' + count + '件');
  return count;
}

// GitHub Projects（Statusフィールド）→ Sheets（ステータス列）
function githubSyncGitHubToSheets(eventId) {
  const events = filterRows(SHEET.EVENTS, { 'イベントID': eventId });
  if (!events.length || !events[0]['PM ProjectID']) {
    throw new Error('GitHub ProjectIDが見つかりません: ' + eventId);
  }

  const projectId = events[0]['PM ProjectID'];

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field { ... on ProjectV2Field { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data  = githubGraphQL(query, { projectId: projectId });
  const items = data.node.items.nodes;

  const STATUS_TO_SHEETS = {
    'Todo':        '未着手',
    'In Progress': '進行中',
    'Done':        '完了',
    'In Review':   '要確認',
    'Blocked':     'ブロック中',
  };

  let count = 0;
  items.forEach(function(item) {
    const fvNodes = item.fieldValues.nodes;
    const findFv  = function(fieldName) {
      return fvNodes.find(function(fv) { return fv.field && fv.field.name === fieldName; });
    };

    const updateObj = {};

    // ステータス
    const statusFv = findFv('Status');
    if (statusFv && STATUS_TO_SHEETS[statusFv.name]) {
      updateObj['ステータス'] = STATUS_TO_SHEETS[statusFv.name];
    }

    // 品質評価
    const qualityFv = findFv('品質評価');
    if (qualityFv && qualityFv.name) updateObj['品質評価'] = qualityFv.name;

    // 実費(万円)
    const costFv = findFv('実費(万円)');
    if (costFv && costFv.number != null) updateObj['実費(万円)'] = costFv.number;

    // 実績納期
    const actualDateFv = findFv('実績納期');
    if (actualDateFv && actualDateFv.date) {
      updateObj['実績納期'] = actualDateFv.date.replace(/-/g, '/');
    }

    if (Object.keys(updateObj).length > 0) {
      if (updateRowById(SHEET.TASKS, 'PM ItemID', item.id, updateObj)) count++;
    }
  });

  Logger.log('GitHub→Sheets同期完了: ' + count + '件');
  return count;
}

// ==========================================
// セットアップ用ヘルパー
// ==========================================

function saveGithubToken(token) {
  PropertiesService.getScriptProperties().setProperty(PROP_GITHUB_TOKEN, token);
  Logger.log('GitHub Token を保存しました');
}

function saveGithubOwner(owner) {
  PropertiesService.getScriptProperties().setProperty(PROP_GITHUB_OWNER, owner);
  Logger.log('GitHub Owner を保存しました: ' + owner);
}

function testGithubConnection() {
  try {
    const data = githubGraphQL('query { viewer { login } }');
    Logger.log('GitHub 接続成功: @' + data.viewer.login);
    SpreadsheetApp.getUi().alert('接続成功: @' + data.viewer.login);
  } catch (e) {
    Logger.log('GitHub 接続失敗: ' + e.message);
    SpreadsheetApp.getUi().alert('接続失敗: ' + e.message);
  }
}
