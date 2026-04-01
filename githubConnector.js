// ==========================================
// GitHub Projects v2 Connector
// ==========================================
//
// 【セットアップ】
// 1. GitHub → Settings → Developer settings → Personal access tokens
//    スコープ: project (read/write), read:user
// 2. saveGithubToken('ghp_xxx...') を実行
// 3. saveGithubOwner('あなたのGitHubユーザー名') を実行
// ==========================================

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

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

// 認証ユーザーのノードIDを取得（ProjectV2作成に必要）
function githubGetViewerId() {
  const data = githubGraphQL('query { viewer { id login } }');
  return data.viewer.id;
}

// ==========================================
// pmConnector.js から呼ばれる実装
// ==========================================

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
  return { projectId: project.id, projectUrl: project.url };
}

function githubCreateTasks(projectId, tasks) {
  const mutation = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body: $body
      }) {
        projectItem { id }
      }
    }
  `;

  tasks.forEach(task => {
    const body = [
      '**フェーズ**: ' + (task.phase            || ''),
      '**優先度**: '  + (task.priority          || '中'),
      '**担当**: '    + (task.defaultAssignee   || '未定'),
      '**期限**: '    + (task.deadline          || ''),
      task.memo ? '**メモ**: ' + task.memo : '',
    ].filter(Boolean).join('\n');

    githubGraphQL(mutation, {
      projectId: projectId,
      title:     task.taskName,
      body:      body,
    });
  });

  Logger.log('GitHub タスク登録完了: ' + tasks.length + '件');
}

function githubCreateMilestones(projectId, milestones) {
  const mutation = `
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {
        projectId: $projectId
        title: $title
        body: $body
      }) {
        projectItem { id }
      }
    }
  `;

  milestones.forEach(ms => {
    const body = [
      '**種別**: マイルストーン',
      '**期日**: ' + (ms.date || ms.dueDate || ''),
      ms.memo ? '**メモ**: ' + ms.memo : '',
    ].filter(Boolean).join('\n');

    githubGraphQL(mutation, {
      projectId: projectId,
      title:     '【MS】' + ms.name,
      body:      body,
    });
  });

  Logger.log('GitHub マイルストーン登録完了: ' + milestones.length + '件');
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

// 接続テスト
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
