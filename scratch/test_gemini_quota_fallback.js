// Unit test verifying Gemini 429 Quota Exceeded multi-model fallback and cooldown behavior
const assert = require('assert');

// Mock window and localStorage
global.window = {};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Import AIService class
const { AIService } = require('../src/services/ai-service.js');
const { CONSTANTS } = require('../src/config/constants.js');

async function runTests() {
  console.log('Testing Gemini Quota Fallback and Cooldown...');

  const ai = new AIService();
  ai.saveSettings('gemini', 'fake-api-key', '');

  // 1. Verify candidate models fallback on 429
  let callCount = 0;
  const attemptedModels = [];

  const m1 = CONSTANTS.GEMINI_CANDIDATE_MODELS[0];
  const m2 = CONSTANTS.GEMINI_CANDIDATE_MODELS[1];

  // Mock global fetch to simulate model 1 getting 429 quota, model 2 succeeding
  global.fetch = async (url, options) => {
    callCount++;
    const match = url.match(/models\/([^:]+):generateContent/);
    const model = match ? match[1] : '';
    attemptedModels.push(model);

    if (model === m1) {
      return {
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 429,
            message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_requests",
            status: "RESOURCE_EXHAUSTED"
          }
        })
      };
    }

    if (model === m2) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ natural: '안녕 세계' }) }] } }
          ]
        })
      };
    }

    return { ok: false, status: 500, json: async () => ({}) };
  };

  const res = await ai.postToGemini({ contents: [{ parts: [{ text: 'Hello' }] }] });
  assert.strictEqual(res.natural, '안녕 세계', 'Model 2 should succeed when Model 1 is quota exceeded');
  assert.strictEqual(ai.activeGeminiModel, m2, 'Working model should be cached');
  assert.strictEqual(ai.isQuotaExceededCoolingDown(), false, 'Cooldown should be inactive since model 2 succeeded');
  console.log('✅ Model 1 (429 Quota) -> Model 2 fallback succeeded');

  // 2. Verify all models 429 sets cooldown and throws isQuotaExceeded
  global.fetch = async (url) => {
    return {
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: 429,
          message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_requests",
          status: "RESOURCE_EXHAUSTED"
        }
      })
    };
  };

  let quotaErrThrown = false;
  try {
    await ai.postToGemini({ contents: [{ parts: [{ text: 'Hello' }] }] });
  } catch (err) {
    quotaErrThrown = true;
    assert.strictEqual(err.isQuotaExceeded, true, 'Error should be tagged isQuotaExceeded');
    assert.ok(err.message.includes('사용량 한도'), 'Error message should be user-friendly Korean');
  }
  assert.strictEqual(quotaErrThrown, true, 'Should throw quota error when all models exhausted');
  assert.strictEqual(ai.isQuotaExceededCoolingDown(), true, 'Cooldown should be active');
  console.log('✅ All models 429 triggers user-friendly Korean error and activates cooldown');

  // 3. Verify cooldown prevents re-hammering Gemini and returns immediate quota error
  let immediateErr = null;
  try {
    await ai.postToGemini({ contents: [{ parts: [{ text: 'Hello' }] }] });
  } catch (err) {
    immediateErr = err;
  }
  assert.ok(immediateErr && immediateErr.isQuotaExceeded, 'Immediate quota error thrown during cooldown');
  console.log('✅ Cooldown prevents hammering rate-limited endpoint');

  // 4. Verify saveSettings clears cooldown
  ai.saveSettings('gemini', 'new-api-key', '');
  assert.strictEqual(ai.isQuotaExceededCoolingDown(), false, 'saveSettings should reset cooldown');
  console.log('✅ saveSettings resets cooldown');

  // 5. Verify retirement error "is no longer available to new users" falls back seamlessly
  ai.activeGeminiModel = null;
  global.fetch = async (url) => {
    const match = url.match(/models\/([^:]+):generateContent/);
    const model = match ? match[1] : '';

    if (model === m1) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            message: "models/gemini-2.5-pro is no longer available to new users. Please update your code to use models/gemini-3.1-pro-preview for the latest features and improvements.",
            status: "FAILED_PRECONDITION"
          }
        })
      };
    }

    if (model === m2 || model === 'gemini-3.1-pro-preview') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ natural: '복구 성공' }) }] } }
          ]
        })
      };
    }

    return { ok: false, status: 500, json: async () => ({}) };
  };

  const retiredRes = await ai.postToGemini({ contents: [{ parts: [{ text: 'Test' }] }] });
  assert.strictEqual(retiredRes.natural, '복구 성공', 'Should fallback to next model when model is no longer available');
  console.log('✅ "no longer available to new users" error seamlessly falls back to working model');

  console.log('🎉 All Gemini Quota and Model Fallback tests passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
