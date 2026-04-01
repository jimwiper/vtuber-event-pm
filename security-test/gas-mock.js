/**
 * GAS API モック
 * vm サンドボックス内で使用するグローバル変数群
 */

'use strict';

// Claude API 呼び出しのキャプチャ用
const capturedApiCalls = [];

// Spreadsheet 書き込みのキャプチャ用
const capturedSheetWrites = [];

function createMockSheet(sheetName) {
  return {
    getName: () => sheetName,
    getDataRange: () => ({
      getValues: () => [[]] // 空シート
    }),
    appendRow: (values) => {
      capturedSheetWrites.push({ sheet: sheetName, values });
    },
    getRange: () => ({
      setValues: () => {},
      setFontWeight: () => {},
      setBackground: () => {},
      setFontColor: () => {},
      setValue: () => {},
    }),
    setFrozenRows: () => {},
    autoResizeColumns: () => {},
    getProtections: () => [],
    protect: () => ({
      setDescription: () => {},
      getEditors: () => [],
      removeEditors: () => {},
    }),
  };
}

const mockSheets = {};

const gasMock = {
  Logger: {
    log: () => {} // テスト時は無音
  },
  Utilities: {
    formatDate: (date, _tz, fmt) => {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return fmt.replace('yyyy', y).replace('MM', m).replace('dd', day);
    }
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => {
        if (key === 'ANTHROPIC_API_KEY') return 'sk-ant-test-xxxxxxxxxxxx';
        if (key === 'SLACK_WEBHOOK_URL') return 'https://hooks.slack.com/test/xxx';
        return null;
      },
      setProperty: () => {}
    })
  },
  UrlFetchApp: {
    fetch: (url, options) => {
      const body = JSON.parse(options.payload);
      capturedApiCalls.push({ url, body });

      // デフォルトの正常レスポンス
      const mockJson = {
        tasks: [{ phase: 'Phase0:企画', taskName: '企画書作成', priority: '高', daysBeforeEvent: 180, defaultAssignee: 'PM', memo: '' }],
        equipment: [],
        staffPositions: [{ position: 'MC', count: 1, shiftStart: '開場1時間前', shiftEnd: '撤収完了', memo: '' }],
        milestones: [{ name: '会場確定', daysBeforeEvent: 120, memo: '' }]
      };

      return {
        getContentText: () => JSON.stringify({ content: [{ text: JSON.stringify(mockJson) }] }),
        getResponseCode: () => 200,
      };
    }
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheets: () => Object.values(mockSheets),
      getSheetByName: (name) => mockSheets[name] || null,
      insertSheet: (name) => {
        mockSheets[name] = createMockSheet(name);
        return mockSheets[name];
      },
      deleteSheet: () => {},
    }),
    ProtectionType: { SHEET: 'SHEET' },
    getUi: () => ({ alert: () => {} }),
  },
};

module.exports = { gasMock, capturedApiCalls, capturedSheetWrites };
