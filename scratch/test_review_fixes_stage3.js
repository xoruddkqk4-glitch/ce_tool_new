// scratch/test_review_fixes_stage3.js
// Regression for remaining Low items from 20261024_1445_code_review_fix_plan.md
import assert from 'assert';

const store = {};
const memFailKeys = new Set();
global.localStorage = {
  getItem: (k) => {
    if (memFailKeys.has(k)) return null; // simulate stale/empty LS after failed write
    return (k in store ? store[k] : null);
  },
  setItem: (k, v) => {
    if (String(v).includes('__QUOTA__')) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    store[k] = String(v);
  },
  removeItem: (k) => { delete store[k]; }
};

const { verifyAnswer, parseTokenPunctuation } = await import('../src/core/fels-engine.js');
const { splitIntoSentences } = await import('../src/core/text-splitter.js');
const { StorageService } = await import('../src/services/storage-service.js');
const { appState } = await import('../src/core/app-state.js');

console.log('=== REVIEW FIXES STAGE 3 (Low) ===');

// FELS curly apostrophe
assert.strictEqual(verifyAnswer("don't", "don’t"), true, 'curly apostrophe must match ASCII');
assert.strictEqual(parseTokenPunctuation("don’t").clean, "don't");
console.log('✓ fels apostrophe normalize');

// text-splitter without lookbehind still splits after closing quote
assert.deepStrictEqual(
  splitIntoSentences('He said, "Hi." Then he left.'),
  ['He said, "Hi."', 'Then he left.']
);
console.log('✓ text-splitter no-lookbehind split');

// setActiveSentenceIndex rejects NaN
appState.sentenceList = [{ text: 'a' }, { text: 'b' }];
appState.activeSentenceIndex = 0;
appState.setActiveSentenceIndex(NaN);
assert.strictEqual(appState.activeSentenceIndex, 0, 'NaN must not be stored');
appState.setActiveSentenceIndex(1);
assert.strictEqual(appState.activeSentenceIndex, 1);
console.log('✓ setActiveSentenceIndex NaN guard');

// storage falls back to memory and prefers it after quota failure
StorageService.saveTheme('light__QUOTA__');
// Force the next getTheme path: mark that LS would return null for the key we wrote to mem
memFailKeys.add('ce_tool_theme');
assert.strictEqual(StorageService.getTheme(), 'light__QUOTA__', 'mem-preferred value must win after quota fail');
console.log('✓ storage memPreferred after quota');

console.log('🎉 stage 3 low regressions passed');
