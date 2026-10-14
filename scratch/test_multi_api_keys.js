/**
 * Automated Test: Multi-Provider API Key Input (Gemini, OpenAI, Claude, OpenRouter)
 */

const assert = require('assert');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] ?? null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Mock DOM elements
class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      }
    };
    this.value = '';
    this.checked = false;
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.title = '';
    this._listeners = {};
    this._attributes = {};
  }
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  dispatchEvent(event) {
    const list = this._listeners[event.type || event] || [];
    list.forEach(fn => fn(event));
  }
  getAttribute(name) {
    return this._attributes[name] || null;
  }
  setAttribute(name, val) {
    this._attributes[name] = String(val);
  }
  querySelectorAll(selector) {
    if (selector === '.api-key-field-wrap') {
      const wrapGemini = getOrCreate('wrap_gemini');
      wrapGemini.setAttribute('data-provider', 'gemini');
      const wrapOpenAI = getOrCreate('wrap_openai');
      wrapOpenAI.setAttribute('data-provider', 'openai');
      const wrapClaude = getOrCreate('wrap_claude');
      wrapClaude.setAttribute('data-provider', 'claude');
      const wrapOpenRouter = getOrCreate('wrap_openrouter');
      wrapOpenRouter.setAttribute('data-provider', 'openrouter');
      return [wrapGemini, wrapOpenAI, wrapClaude, wrapOpenRouter];
    }
    return [];
  }
}

const elements = {};
function getOrCreate(id, tag = 'div') {
  if (!elements[id]) elements[id] = new MockElement(id, tag);
  return elements[id];
}

const mockDoc = {
  getElementById: (id) => getOrCreate(id),
  querySelectorAll: (selector) => {
    if (selector === 'input[name="aiProvider"]') {
      return [
        getOrCreate('radio_gemini', 'input'),
        getOrCreate('radio_openai', 'input'),
        getOrCreate('radio_claude', 'input'),
        getOrCreate('radio_openrouter', 'input')
      ];
    }
    return [];
  },
  addEventListener: () => {}
};

getOrCreate('radio_gemini', 'input').value = 'gemini';
getOrCreate('radio_openai', 'input').value = 'openai';
getOrCreate('radio_claude', 'input').value = 'claude';
getOrCreate('radio_openrouter', 'input').value = 'openrouter';

global.document = mockDoc;
global.window = { addEventListener: () => {} };

const { StorageService } = require('../src/services/storage-service.js');
const { AIService, aiService } = require('../src/services/ai-service.js');
const { SettingsModal } = require('../src/ui/settings-modal.js');

async function runTests() {
  console.log('▶ Testing Multi-Provider API Key Input (Gemini, OpenAI, Claude, OpenRouter)...');

  // 1. StorageService multi-key get/set
  console.log('Test 1: StorageService multi-key persistence');
  StorageService.saveApiSettings('gemini', 'key_gem_1', 'custom prompt', {
    geminiKey: 'AIzaSy_gemini_test',
    openaiKey: 'sk-openai_test',
    claudeKey: 'sk-ant-claude_test',
    openrouterKey: 'sk-or-v1-openrouter_test'
  });

  assert.strictEqual(StorageService.getProvider(), 'gemini');
  assert.strictEqual(StorageService.getGeminiKey(), 'AIzaSy_gemini_test');
  assert.strictEqual(StorageService.getOpenAIKey(), 'sk-openai_test');
  assert.strictEqual(StorageService.getClaudeKey(), 'sk-ant-claude_test');
  assert.strictEqual(StorageService.getOpenRouterKey(), 'sk-or-v1-openrouter_test');
  assert.strictEqual(StorageService.getApiKey('gemini'), 'AIzaSy_gemini_test');
  assert.strictEqual(StorageService.getApiKey('openai'), 'sk-openai_test');
  assert.strictEqual(StorageService.getApiKey('claude'), 'sk-ant-claude_test');
  assert.strictEqual(StorageService.getApiKey('openrouter'), 'sk-or-v1-openrouter_test');
  console.log('✅ Test 1 Passed: StorageService correctly saves and returns distinct keys for all 4 providers.');

  // 2. AIService key resolution and provider switching
  console.log('Test 2: AIService key resolution');
  aiService.saveSettings('gemini', 'key_gem_1', 'custom prompt', {
    geminiKey: 'AIzaSy_gemini_test',
    openaiKey: 'sk-openai_test',
    claudeKey: 'sk-ant-claude_test',
    openrouterKey: 'sk-or-v1-openrouter_test'
  });
  assert.strictEqual(aiService.getKeyForProvider('gemini'), 'AIzaSy_gemini_test');
  assert.strictEqual(aiService.getKeyForProvider('openai'), 'sk-openai_test');
  assert.strictEqual(aiService.getKeyForProvider('claude'), 'sk-ant-claude_test');
  assert.strictEqual(aiService.getKeyForProvider('openrouter'), 'sk-or-v1-openrouter_test');
  assert.strictEqual(aiService.hasKey('claude'), true);
  assert.strictEqual(aiService.hasKey('openai'), true);
  assert.strictEqual(aiService.hasKey('gemini'), true);
  assert.strictEqual(aiService.hasKey('openrouter'), true);

  aiService.saveSettings('openrouter', 'sk-or-v1-openrouter_test', 'prompt', {
    geminiKey: 'AIzaSy_gemini_test',
    openaiKey: 'sk-openai_test',
    claudeKey: 'sk-ant-claude_test',
    openrouterKey: 'sk-or-v1-openrouter_test'
  });
  assert.strictEqual(aiService.provider, 'openrouter');
  assert.strictEqual(aiService.apiKey, 'sk-or-v1-openrouter_test');
  console.log('✅ Test 2 Passed: AIService resolves active key and provider-specific keys.');

  // 3. SettingsModal UI population, badges, and saving
  console.log('Test 3: SettingsModal UI integration');
  const modal = new SettingsModal();
  modal.populate();

  assert.strictEqual(getOrCreate('geminiApiKeyInput').value, 'AIzaSy_gemini_test');
  assert.strictEqual(getOrCreate('openaiApiKeyInput').value, 'sk-openai_test');
  assert.strictEqual(getOrCreate('claudeApiKeyInput').value, 'sk-ant-claude_test');
  assert.strictEqual(getOrCreate('openrouterApiKeyInput').value, 'sk-or-v1-openrouter_test');
  assert.strictEqual(getOrCreate('geminiKeyBadge').textContent, '등록됨');
  assert.strictEqual(getOrCreate('openaiKeyBadge').textContent, '등록됨');
  assert.strictEqual(getOrCreate('claudeKeyBadge').textContent, '등록됨');
  assert.strictEqual(getOrCreate('openrouterKeyBadge').textContent, '등록됨');

  // Switch to OpenRouter and save
  const radioOpenAI = getOrCreate('radio_openai');
  const radioGemini = getOrCreate('radio_gemini');
  const radioClaude = getOrCreate('radio_claude');
  const radioOpenRouter = getOrCreate('radio_openrouter');
  radioGemini.checked = false;
  radioOpenAI.checked = false;
  radioClaude.checked = false;
  radioOpenRouter.checked = true;

  getOrCreate('openrouterApiKeyInput').value = 'sk-or-v1-new_key_777';
  modal.save();

  assert.strictEqual(StorageService.getProvider(), 'openrouter');
  assert.strictEqual(StorageService.getOpenRouterKey(), 'sk-or-v1-new_key_777');
  assert.strictEqual(StorageService.getClaudeKey(), 'sk-ant-claude_test');
  assert.strictEqual(StorageService.getGeminiKey(), 'AIzaSy_gemini_test');
  assert.strictEqual(getOrCreate('apiKeyInput').value, 'sk-or-v1-new_key_777');
  console.log('✅ Test 3 Passed: SettingsModal updates and synchronizes OpenRouter key and backward-compatible input.');

  // 4. OpenRouter call mocked routing
  console.log('Test 4: OpenRouter routing in translate()');
  aiService.saveSettings('openrouter', 'sk-or-test', '', { openrouterKey: 'sk-or-test' });

  global.fetch = async (url, opts) => {
    assert.ok(url.includes('openrouter.ai/api/v1/chat/completions'));
    assert.strictEqual(opts.headers['Authorization'], 'Bearer sk-or-test');
    assert.strictEqual(opts.headers['X-Title'], 'CE Tool');
    const body = JSON.parse(opts.body);
    assert.ok(body.model);
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ natural: '오픈라우터 번역', chunk_text: '오픈라우터 || 번역', chunks: [{ en: 'test', ko: '오픈라우터' }] })
          }
        }]
      })
    };
  };

  const res = await aiService.translate('test');
  assert.strictEqual(res.natural, '오픈라우터 번역');
  console.log('✅ Test 4 Passed: AIService correctly routes and parses OpenRouter API responses.');

  // 5. AIService.testConnection tests for all 4 providers
  console.log('Test 5: AIService.testConnection across all providers');
  
  // Gemini test
  global.fetch = async (url, opts) => {
    if (url.includes('googleapis.com')) {
      if (opts.headers['x-goog-api-key'] === 'valid_gemini') {
        return { ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash' }] }) };
      }
      return { ok: false, status: 400, json: async () => ({ error: { message: 'API_KEY_INVALID' } }) };
    }
    throw new Error('Unknown url: ' + url);
  };
  const geminiOk = await aiService.testConnection('gemini', 'valid_gemini');
  assert.strictEqual(geminiOk.success, true);
  assert.ok(geminiOk.message.includes('연결 성공'));

  const geminiFail = await aiService.testConnection('gemini', 'invalid_gemini');
  assert.strictEqual(geminiFail.success, false);
  assert.ok(geminiFail.message.includes('API_KEY_INVALID'));

  // OpenAI test
  global.fetch = async (url, opts) => {
    if (url.includes('api.openai.com/v1/models')) {
      if (opts.headers['Authorization'] === 'Bearer valid_openai') {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      return { ok: false, status: 401, json: async () => ({ error: { message: 'Invalid API key' } }) };
    }
    throw new Error('Unknown url: ' + url);
  };
  const openaiOk = await aiService.testConnection('openai', 'valid_openai');
  assert.strictEqual(openaiOk.success, true);
  assert.ok(openaiOk.message.includes('연결 성공'));

  const openaiFail = await aiService.testConnection('openai', 'bad_key');
  assert.strictEqual(openaiFail.success, false);
  assert.ok(openaiFail.message.includes('Invalid API key'));

  // Claude test
  global.fetch = async (url, opts) => {
    if (url.includes('anthropic.com')) {
      if (opts.headers['x-api-key'] === 'valid_claude') {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false, status: 401, json: async () => ({ error: { message: 'invalid x-api-key' } }) };
    }
    throw new Error('Unknown url: ' + url);
  };
  const claudeOk = await aiService.testConnection('claude', 'valid_claude');
  assert.strictEqual(claudeOk.success, true);
  assert.ok(claudeOk.message.includes('연결 성공'));

  // OpenRouter test
  global.fetch = async (url, opts) => {
    if (url.includes('openrouter.ai/api/v1/auth/key')) {
      if (opts.headers['Authorization'] === 'Bearer valid_openrouter') {
        return { ok: true, json: async () => ({ data: { label: 'My Test Key' } }) };
      }
      return { ok: false, status: 401, json: async () => ({ error: { message: 'Key not found' } }) };
    }
    throw new Error('Unknown url: ' + url);
  };
  const openrouterOk = await aiService.testConnection('openrouter', 'valid_openrouter');
  assert.strictEqual(openrouterOk.success, true);
  assert.ok(openrouterOk.message.includes('My Test Key'));
  console.log('✅ Test 5 Passed: AIService.testConnection verifies Gemini, OpenAI, Claude, and OpenRouter.');

  // 6. SettingsModal UI connection test button click & result display
  console.log('Test 6: SettingsModal UI connection test button click');
  const btnTestOpenRouter = getOrCreate('btnTestOpenRouter', 'button');
  const openrouterTestResult = getOrCreate('openrouterTestResult');
  const inputOpenRouter = getOrCreate('openrouterApiKeyInput');
  inputOpenRouter.value = 'valid_openrouter';

  await modal.runConnectionTest('openrouter', inputOpenRouter, btnTestOpenRouter, openrouterTestResult, 'OpenRouter');
  assert.ok(openrouterTestResult.textContent.includes('연결 성공'));
  assert.strictEqual(openrouterTestResult.className, 'api-test-result success');

  // Test empty key handling
  inputOpenRouter.value = '';
  await modal.runConnectionTest('openrouter', inputOpenRouter, btnTestOpenRouter, openrouterTestResult, 'OpenRouter');
  assert.ok(openrouterTestResult.textContent.includes('API 키를 먼저 입력해주세요'));
  assert.strictEqual(openrouterTestResult.className, 'api-test-result error');
  console.log('✅ Test 6 Passed: SettingsModal test button click, validation, and feedback work correctly.');

  // 7. Gemini High Demand 503 Auto-Recovery Test
  console.log('Test 7: Gemini High Demand (503) auto-recovery to next model');
  let modelAttempts = [];
  global.fetch = async (url) => {
    if (url.includes('models/')) {
      const match = url.match(/models\/([^:]+):generateContent/);
      const model = match ? match[1] : 'unknown';
      modelAttempts.push(model);
      if (model.includes('3.8-flash')) {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            error: {
              code: 503,
              message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.'
            }
          })
        };
      }
      // Next candidate succeeds
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: JSON.stringify({ natural: '복구 성공', chunk_text: '복구 || 성공', chunks: [] }) }] }
          }]
        })
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  aiService.saveSettings('gemini', 'AIzaSy_test', '', { geminiKey: 'AIzaSy_test' });
  const recoveredRes = await aiService.postToGemini({ contents: [] });
  assert.strictEqual(recoveredRes.natural, '복구 성공');
  assert.ok(modelAttempts.length >= 2, 'Should have attempted next candidate model after 503 high demand');
  console.log('✅ Test 7 Passed: Gemini 503 High Demand successfully auto-recovers to next candidate model.');

  // 8. Multi-Provider Auto-Failover Test
  console.log('Test 8: Multi-Provider Auto-Failover from failing provider to next provider');
  aiService.saveSettings('gemini', 'AIzaSy_gemini', '', {
    geminiKey: 'AIzaSy_gemini',
    openaiKey: 'sk-openai_valid',
    autoFailover: true
  });

  global.fetch = async (url, opts) => {
    if (url.includes('googleapis.com')) {
      // Gemini completely fails with Quota / Rate limit
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded for Gemini' } })
      };
    }
    if (url.includes('api.openai.com/v1/chat/completions')) {
      // OpenAI succeeds
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({ natural: 'OpenAI 우회 성공', chunk_text: '우회 || 성공', chunks: [{ en: 'test', ko: '우회' }] })
            }
          }]
        })
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const failoverRes = await aiService.translate('test sentence');
  assert.strictEqual(failoverRes.natural, 'OpenAI 우회 성공');
  console.log('✅ Test 8 Passed: Auto-Failover successfully rerouted from failing Gemini to OpenAI.');

  console.log('\n🎉 ALL MULTI-PROVIDER API KEY, CONNECTION & AUTO-FAILOVER TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

