// ==========================================
// PM Tool 抽象インターフェース
// ==========================================
//
// 【他ツールへの流用方法】
// 1. {toolName}Connector.js を新規作成し、下記4関数を実装する
// 2. config.js の PM_CONNECTOR_TYPE を変更する
// 3. pmConnector.js の各関数にルーティングを1行追加する
//
// 【データ型の定義】
//
// EventData:
//   { eventId: string, name: string, type: string, startDate: string }
//
// TaskData:
//   { taskName: string, phase: string, priority: string,
//     deadline: string, defaultAssignee: string, memo: string }
//
// MilestoneData:
//   { name: string, date: string, memo: string }
//
// ProjectResult:
//   { projectId: string, projectUrl: string }
// ==========================================

/**
 * イベントに対応するプロジェクトをPMツール上に作成する
 * @param {EventData} eventData
 * @returns {ProjectResult}
 */
function pmCreateProject(eventData) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateProject(eventData);
  // if (PM_CONNECTOR_TYPE === 'backlog') return backlogCreateProject(eventData);
  // if (PM_CONNECTOR_TYPE === 'linear')  return linearCreateProject(eventData);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}

/**
 * タスク一覧をPMツールのプロジェクトに登録する
 * @param {string} projectId
 * @param {TaskData[]} tasks
 */
function pmCreateTasks(projectId, tasks) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateTasks(projectId, tasks);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}

/**
 * マイルストーン一覧をPMツールのプロジェクトに登録する
 * @param {string} projectId
 * @param {MilestoneData[]} milestones
 */
function pmCreateMilestones(projectId, milestones) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateMilestones(projectId, milestones);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}
