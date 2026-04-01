// ==========================================
// PM Tool 抽象インターフェース
// ==========================================
//
// 【他ツールへの流用方法】
// 1. {toolName}Connector.js を新規作成し、下記3関数を実装する
// 2. config.js の PM_CONNECTOR_TYPE を変更する
// 3. pmConnector.js の各関数にルーティングを1行追加する
//
// 【データ型の定義】
//
// EventData:
//   { eventId: string, name: string }
//
// TaskData:
//   { taskName: string, phase: string, priority: string,
//     deadline: string, defaultAssignee: string, memo: string }
//
// MilestoneData:
//   { name: string, date: string, memo: string }
//
// ProjectData（pmCreateProject の戻り値）:
//   { projectId: string, projectUrl: string, ...connector固有データ }
//   ※ pmCreateTasks / pmCreateMilestones にそのまま渡す
// ==========================================

/**
 * イベントに対応するプロジェクトをPMツール上に作成する
 * @param {EventData} eventData
 * @returns {ProjectData}
 */
function pmCreateProject(eventData) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateProject(eventData);
  // if (PM_CONNECTOR_TYPE === 'backlog') return backlogCreateProject(eventData);
  // if (PM_CONNECTOR_TYPE === 'linear')  return linearCreateProject(eventData);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}

/**
 * タスク一覧をPMツールのプロジェクトに登録する
 * @param {ProjectData} projectData - pmCreateProject の戻り値をそのまま渡す
 * @param {TaskData[]} tasks
 */
function pmCreateTasks(projectData, tasks) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateTasks(projectData, tasks);
  // if (PM_CONNECTOR_TYPE === 'backlog') return backlogCreateTasks(projectData, tasks);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}

/**
 * マイルストーン一覧をPMツールのプロジェクトに登録する
 * @param {ProjectData} projectData - pmCreateProject の戻り値をそのまま渡す
 * @param {MilestoneData[]} milestones
 */
function pmCreateMilestones(projectData, milestones) {
  if (PM_CONNECTOR_TYPE === 'github') return githubCreateMilestones(projectData, milestones);
  // if (PM_CONNECTOR_TYPE === 'backlog') return backlogCreateMilestones(projectData, milestones);
  throw new Error('未対応のPM Connector: ' + PM_CONNECTOR_TYPE);
}
