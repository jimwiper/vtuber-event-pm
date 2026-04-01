// ==========================================
// Claude API
// ==========================================

function saveClaudeApiKey(key) {
  PropertiesService.getScriptProperties().setProperty(PROP_CLAUDE_KEY, key);
  Logger.log('Claude APIキーを保存しました');
}

function getClaudeApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty(PROP_CLAUDE_KEY);
  if (!key) throw new Error('Claude APIキーが未設定です。saveClaudeApiKey()を実行してください');
  return key;
}

function callClaude(prompt, maxTokens, caller) {
  maxTokens = maxTokens || 4096;
  caller = caller || '不明';

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': getClaudeApiKey(),
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    logApiUsage(caller, 0, 0, 'エラー', json.error.message);
    throw new Error('Claude APIエラー: ' + json.error.message);
  }

  const usage = json.usage || {};
  logApiUsage(caller, usage.input_tokens || 0, usage.output_tokens || 0, '成功', '');

  return json.content[0].text;
}

function logApiUsage(caller, inputTokens, outputTokens, status, errorMsg) {
  try {
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    appendRow(SHEET.API_LOG, {
      '日時':         now,
      '呼び出し元':   caller,
      'モデル':       CLAUDE_MODEL,
      '入力トークン': inputTokens,
      '出力トークン': outputTokens,
      'ステータス':   status,
      'エラー内容':   errorMsg,
    });
  } catch (e) {
    Logger.log('API使用ログの記録に失敗: ' + e.message);
  }
}

// JSON形式で返す前提のClaude呼び出し。パースして返す
function callClaudeJson(prompt, caller) {
  const raw = callClaude(prompt, 4096, caller);

  // コードブロック除去
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    Logger.log('JSONパースエラー。rawレスポンス: ' + raw);
    throw new Error('ClaudeのレスポンスをJSONとしてパースできませんでした');
  }
}

function testClaude() {
  const result = callClaude('「テスト成功」とだけ日本語で返してください');
  Logger.log('Claudeの返答: ' + result);
}
