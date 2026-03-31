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

function callClaude(prompt, maxTokens) {
  maxTokens = maxTokens || 4096;

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

  if (json.error) throw new Error('Claude APIエラー: ' + json.error.message);

  return json.content[0].text;
}

// JSON形式で返す前提のClaude呼び出し。パースして返す
function callClaudeJson(prompt) {
  const raw = callClaude(prompt, 4096);

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
