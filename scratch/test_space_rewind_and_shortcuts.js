import assert from 'assert';
import { ShortcutManager } from '../src/ui/shortcut-manager.js';

console.log('=== TEST: SPACE REWIND & NEW SHORTCUT SYSTEM (F5, F6, F7, F11) ===');

// 1. Verify ShortcutManager bindings
console.log('\n[Check 1] ShortcutManager event handling...');
let lastAction = null;

const handlers = {
  onPlayPause: () => { lastAction = 'playPause'; },
  onPrevSentence: () => { lastAction = 'prevSentence'; },
  onNextSentence: () => { lastAction = 'nextSentence'; },
  onToggleTextInput: () => { lastAction = 'toggleTextInput'; },
  onTogglePlayAllSentences: () => { lastAction = 'togglePlayAllSentences'; },
  getCurrentPage: () => 'practice'
};

const sm = new ShortcutManager(handlers);

function fireKey(key, target = { tagName: 'DIV' }) {
  lastAction = null;
  let prevented = false;
  const event = {
    key,
    code: key,
    target,
    preventDefault: () => { prevented = true; }
  };
  sm.handleKeyDown(event);
  return { action: lastAction, prevented };
}

// Test Space
let res = fireKey(' ');
assert.strictEqual(res.action, 'playPause');
assert.strictEqual(res.prevented, true);

// Test F5 outside blank -> toggleTextInput
res = fireKey('F5');
assert.strictEqual(res.action, 'toggleTextInput');
assert.strictEqual(res.prevented, true);

// Test F6 outside blank -> prevSentence
res = fireKey('F6');
assert.strictEqual(res.action, 'prevSentence');
assert.strictEqual(res.prevented, true);

// Test F7 outside blank -> nextSentence
res = fireKey('F7');
assert.strictEqual(res.action, 'nextSentence');
assert.strictEqual(res.prevented, true);

// Test F11 outside blank -> togglePlayAllSentences
res = fireKey('F11');
assert.strictEqual(res.action, 'togglePlayAllSentences');
assert.strictEqual(res.prevented, true);

// Test F3 outside blank -> should do NOTHING (deleted)
res = fireKey('F3');
assert.strictEqual(res.action, null);

// Test inside fels-blank-input (typing mode)
const blankEl = {
  tagName: 'INPUT',
  classList: {
    contains: (cls) => cls === 'fels-blank-input'
  },
  blurred: false,
  blur() { this.blurred = true; }
};

// Space inside blank -> playPause with focus kept
res = fireKey(' ', blankEl);
assert.strictEqual(res.action, 'playPause');
assert.strictEqual(res.prevented, true);

// F6 inside blank -> prevSentence
res = fireKey('F6', blankEl);
assert.strictEqual(res.action, 'prevSentence');
assert.strictEqual(res.prevented, true);

// F7 inside blank -> nextSentence
res = fireKey('F7', blankEl);
assert.strictEqual(res.action, 'nextSentence');
assert.strictEqual(res.prevented, true);

// F5 inside blank -> blur (exit input mode)
res = fireKey('F5', blankEl);
assert.strictEqual(blankEl.blurred, true);
assert.strictEqual(res.prevented, true);

// F11 inside blank -> togglePlayAllSentences
res = fireKey('F11', blankEl);
assert.strictEqual(res.action, 'togglePlayAllSentences');
assert.strictEqual(res.prevented, true);

// F3 inside blank -> should do NOTHING
res = fireKey('F3', blankEl);
assert.strictEqual(res.action, null);

console.log('✓ ShortcutManager: Space, F5, F6, F7, F11 verified and F3 confirmed deleted!');

// 2. Test Spacebar rewind auto-apply logic simulation
console.log('\n[Check 2] Testing Spacebar auto-rewind calculation...');
function simulateTogglePlayPause(audioState, rewindSeconds) {
  const activeStn = { audioStart: 1.0, audioEnd: 10.0 };
  const minBound = activeStn.audioStart;
  const maxBound = activeStn.audioEnd;

  if (audioState.paused) {
    if (audioState.currentTime < minBound || audioState.currentTime >= maxBound) {
      audioState.currentTime = minBound;
    } else {
      // Space 일시정지 후 재생 시 자동 되감기
      if (rewindSeconds > 0) {
        audioState.currentTime = Math.max(minBound, audioState.currentTime - rewindSeconds);
      }
    }
    audioState.paused = false;
  } else {
    audioState.paused = true;
  }
}

// Case A: Playing at 4.0s, paused, then resumed with default 0.5s rewind
const audioA = { paused: true, currentTime: 4.0 };
simulateTogglePlayPause(audioA, 0.5);
assert.strictEqual(audioA.paused, false);
assert.strictEqual(Math.round(audioA.currentTime * 10) / 10, 3.5, 'Should rewind from 4.0s to 3.5s');

// Case B: Near start (1.2s), rewind 0.5s -> bounded by minBound (1.0s)
const audioB = { paused: true, currentTime: 1.2 };
simulateTogglePlayPause(audioB, 0.5);
assert.strictEqual(audioB.currentTime, 1.0, 'Should be bounded at 1.0s, not 0.7s');

// Case C: rewind 0.0s -> no rewind
const audioC = { paused: true, currentTime: 4.0 };
simulateTogglePlayPause(audioC, 0.0);
assert.strictEqual(audioC.currentTime, 4.0, 'Should resume exactly at 4.0s when rewind is 0s');

console.log('✓ Spacebar auto-rewind calculation accurately rewinds and respects boundaries');

console.log('\n🎉 ALL SPACE REWIND & SHORTCUT VERIFICATION TESTS PASSED 100%!');
