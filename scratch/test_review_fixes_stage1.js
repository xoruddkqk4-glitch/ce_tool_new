// scratch/test_review_fixes_stage1.js
// Regression tests for docs/implementation/20261024_1445_code_review_fix_plan.md (stage 1 / High items)
//   H1 speakText({ onEnd }) object form, H4 shadowing timer guard, H6 API key isolation, H7 verb-map alignment
import assert from 'assert';

// ---- Environment mocks (must exist before the modules are used) ----
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const spoken = [];
class FakeUtterance {
  constructor(text) { this.text = text; }
}
global.SpeechSynthesisUtterance = FakeUtterance;
global.window = {
  speechSynthesis: {
    paused: false,
    cancel() {},
    resume() {},
    getVoices: () => [{ lang: 'en-US', name: 'Google US English', localService: false }],
    speak(u) { spoken.push(u); }
  }
};

const { speakText } = await import('../src/audio/tts-synthesizer.js');
const { AIService } = await import('../src/services/ai-service.js');
const { LooperEngine } = await import('../src/audio/looper-engine.js');
const { RuleChunkEngine } = await import('../src/core/rule-chunk-engine.js');

console.log('=== REVIEW FIXES STAGE 1 ===');

// ---------- H1: speakText accepts an options object and fires onEnd ----------
{
  let ended = 0;
  speakText('Hello there', { onEnd: () => ended++ });
  assert.strictEqual(spoken.length, 1, 'speakText must actually speak when given an options object');
  const u = spoken[0];
  assert.strictEqual(u.lang, 'en-US', 'default lang must be preserved (not "[object Object]")');
  assert.ok(u.voice, 'a matching voice must be picked (no TypeError on lang.toLowerCase)');
  assert.strictEqual(typeof u.onend, 'function', 'onend must be wired');

  // A newer utterance cancelling this one must NOT advance the sequence
  u.onerror({ error: 'interrupted' });
  u.onerror({ error: 'canceled' });
  assert.strictEqual(ended, 0, 'cancel/interrupt must not fire onEnd');

  u.onend();
  u.onend();
  assert.strictEqual(ended, 1, 'onEnd must fire exactly once');

  // Legacy positional form still works
  speakText('안녕', 'ko-KR', 0.8);
  assert.strictEqual(spoken[1].lang, 'ko-KR');
  assert.strictEqual(spoken[1].rate, 0.8);

  // Without speechSynthesis the callback must still fire (play-all must never stall)
  const saved = global.window.speechSynthesis;
  delete global.window.speechSynthesis;
  let fallbackEnded = 0;
  speakText('No TTS', { onEnd: () => fallbackEnded++ });
  assert.strictEqual(fallbackEnded, 1, 'onEnd must fire when TTS is unavailable');
  global.window.speechSynthesis = saved;
  console.log('✓ H1 speakText options/onEnd');
}

// ---------- H6: API keys never leak between providers ----------
{
  const ai = new AIService();
  ai.saveSettings('gemini', 'GEMINI_KEY', '', { geminiKey: 'GEMINI_KEY', openaiKey: '', claudeKey: '', openrouterKey: '' });
  assert.strictEqual(ai.hasKey('gemini'), true);

  // Switch to OpenAI with NO OpenAI key: must not borrow the Gemini key
  ai.saveSettings('openai', '', '', { geminiKey: 'GEMINI_KEY', openaiKey: '', claudeKey: '', openrouterKey: '' });
  assert.strictEqual(ai.apiKey, '', 'apiKey must be the selected provider\'s own (empty) key');
  assert.strictEqual(ai.hasKey('openai'), false, 'OpenAI must not count as configured');
  assert.strictEqual(ai.getKeyForProvider('openai'), '');

  let leaked = null;
  global.fetch = async (url, opts) => {
    leaked = { url, opts };
    return { ok: false, status: 401, json: async () => ({}), text: async () => '' };
  };
  let threw = false;
  try { await ai.callOpenAI('hello', 'sys'); } catch (e) { threw = true; }
  assert.ok(threw, 'callOpenAI without a key must fail');
  assert.strictEqual(leaked, null, 'no request (and no foreign key) may be sent to OpenAI');

  // Clearing the Gemini key really removes it
  ai.saveSettings('gemini', '', '', { geminiKey: '' });
  assert.strictEqual(ai.hasKey('gemini'), false, 'a cleared key must stay cleared');
  assert.strictEqual(store['ce_tool_api_key'], '', 'legacy stored key must be cleared too');

  // Legacy call form saveSettings(provider, key, prompt) assigns the key to that provider only
  ai.saveSettings('claude', 'CLAUDE_KEY', '');
  assert.strictEqual(ai.getKeyForProvider('claude'), 'CLAUDE_KEY');
  assert.strictEqual(ai.getKeyForProvider('openai'), '');
  console.log('✓ H6 API key isolation');
}

// ---------- H4: shadowing timer must not restart playback after reset() ----------
{
  const player = {
    paused: false, ended: false, currentTime: 5,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
  const appState = {
    loopStart: null, loopEnd: null, targetLoopCount: Infinity, currentLoopCount: 0,
    isShadowingWaiting: false, activeSentenceIndex: 0,
    getActiveSentence: () => ({ audioStart: 1, audioEnd: 4 })
  };
  const looper = new LooperEngine(player, appState);
  looper.setSectionSilentSeconds(0.05);
  looper.checkBoundary(); // cur(5) >= end(4) -> pauses and arms the shadow timer
  assert.strictEqual(appState.isShadowingWaiting, true, 'shadowing wait must be armed');
  looper.reset(); // e.g. page left / user took over
  const before = player.currentTime;
  await new Promise(r => setTimeout(r, 120));
  assert.strictEqual(player.currentTime, before, 'timer must not rewind after reset()');
  assert.strictEqual(player.paused, true, 'timer must not restart playback after reset()');
  console.log('✓ H4 shadow timer guard');
}

// ---------- H7: verb dictionary matching must not match every Korean word ----------
{
  const ai = new AIService();
  const engine = new RuleChunkEngine();
  // Before the fix every Korean word scored 11 for the chunk containing "went", so the
  // unknown-word chunk ("Cryston Beach") lost "해변에" to the verb chunk.
  const chunks = [{ en: 'I went', ko: '' }, { en: 'to Cryston Beach', ko: '' }];
  for (const [name, owner] of [['AIService', ai], ['RuleChunkEngine', engine]]) {
    const out = owner.alignChunksWithNatural(chunks, '나는 크리스톤 해변에 갔다', []);
    assert.strictEqual(out.length, 2, `${name}: must return one slice per chunk`);
    assert.ok(out[0].includes('갔다'), `${name}: verb chunk should hold the verb, got "${out[0]}"`);
    assert.ok(!out[0].includes('해변에'), `${name}: "해변에" must not leak into the verb chunk, got "${out[0]}"`);
    assert.ok(out[1].includes('해변에'), `${name}: place chunk should hold "해변에", got "${out[1]}"`);
  }
  console.log('✓ H7 verb-map alignment');
}

console.log('\n🎉 REVIEW FIXES STAGE 1 TESTS PASSED');
