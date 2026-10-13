const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=== TEST: SENTENCE-WIDE LOOP REPETITION & CUSTOM REGION LOOP ===');

const appCode = fs.readFileSync('app.js', 'utf8');

class MockElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = {
      _set: new Set(),
      add: function(c) { this._set.add(c); },
      remove: function(c) { this._set.delete(c); },
      contains: function(c) { return this._set.has(c); },
      toggle: function(c, force) {
        if (typeof force === 'boolean') {
          if (force) this._set.add(c);
          else this._set.delete(c);
        } else {
          if (this._set.has(c)) this._set.delete(c);
          else this._set.add(c);
        }
      }
    };
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.attributes = {};
    this.currentTime = 0;
    this.duration = 10.0;
    this.paused = true;
    this.ended = false;
    this.src = 'blob:mock-audio';
  }
  getContext() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'measureText') return () => ({ width: 50 });
        return () => {};
      }
    });
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
  }
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(val) { this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean)); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parentElement = null;
      this.children.splice(idx, 1);
    }
  }
  querySelectorAll(sel) {
    const results = [];
    function walk(node) {
      for (const child of node.children) {
        if (sel.startsWith('.') && child.classList && child.classList.contains(sel.slice(1))) {
          results.push(child);
        } else if (sel.startsWith('#') && child.id === sel.slice(1)) {
          results.push(child);
        } else if (/^[a-z]+$/i.test(sel) && child.tagName.toLowerCase() === sel.toLowerCase()) {
          results.push(child);
        }
        walk(child);
      }
    }
    walk(this);
    return results;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  dispatchEvent(event) {
    const fns = this.listeners[event.type] || [];
    fns.forEach(fn => fn(event));
  }
  focus() {}
  blur() {}
  select() {}
}

const elementStore = new Map();
const mockDoc = {
  documentElement: new MockElement('html'),
  head: new MockElement('head'),
  body: new MockElement('body'),
  activeElement: null,
  getElementById: (id) => {
    if (!elementStore.has(id)) {
      elementStore.set(id, new MockElement(id));
    }
    return elementStore.get(id);
  },
  querySelectorAll: (sel) => {
    const results = [];
    for (const el of elementStore.values()) {
      if (sel.startsWith('.') && el.classList && el.classList.contains(sel.slice(1))) {
        results.push(el);
      }
    }
    return results;
  },
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockDoc.getElementById(sel.slice(1));
    return mockDoc.querySelectorAll(sel)[0] || null;
  },
  createElement: (tag) => new MockElement('', tag),
  addEventListener: () => {}
};
mockDoc.activeElement = mockDoc.body;
['settingsModal', 'handoutModal', 'classroomModal'].forEach(id => {
  mockDoc.getElementById(id).classList.add('hidden');
});

const windowListeners = {};
let pendingTimeouts = [];
const mockSetTimeout = (fn, delay) => {
  const item = { fn, delay };
  pendingTimeouts.push(item);
  return item;
};
const mockClearTimeout = (id) => {
  pendingTimeouts = pendingTimeouts.filter(t => t !== id);
};

const runAllPendingTimeouts = () => {
  const list = [...pendingTimeouts];
  pendingTimeouts = [];
  list.forEach(item => item.fn());
};

const mockWindow = {
  document: mockDoc,
  location: { hash: '#practice' },
  addEventListener: (evt, fn) => {
    if (!windowListeners[evt]) windowListeners[evt] = [];
    windowListeners[evt].push(fn);
  },
  removeEventListener: (evt, fn) => {
    if (windowListeners[evt]) {
      windowListeners[evt] = windowListeners[evt].filter(f => f !== fn);
    }
  },
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  setTimeout: mockSetTimeout,
  clearTimeout: mockClearTimeout,
  localStorage: { getItem: () => null, setItem: () => {} },
  speechSynthesis: { speak: () => {}, cancel: () => {}, getVoices: () => [] }
};

const sandbox = {
  window: mockWindow,
  document: mockDoc,
  HTMLElement: MockElement,
  setTimeout: mockSetTimeout,
  clearTimeout: mockClearTimeout,
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  AudioContext: function() {
    return {
      createGain: () => ({ connect: () => {}, gain: { value: 1 } }),
      createBufferSource: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
      destination: {}
    };
  },
  console: console
};

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);

const app = sandbox.window.__ceToolApp;
assert(app, 'App must be booted');
const appState = app.appState;
const practiceView = app.practiceView;

// Setup sentence 1: audioStart = 1.0, audioEnd = 3.0
const s1 = {
  index: 0,
  text: "Hello world.",
  audioStart: 1.0,
  audioEnd: 3.0,
  result: { chunks: [{ en: "Hello", ko: "안녕" }], natural: "안녕 세상아" }
};
appState.setSentenceList([s1]);
practiceView.loadSentence(0);

console.log('\n[Check 1] Verify Sentence-Wide Looping (3 repeats by default)...');
appState.targetLoopCount = 3;
appState.clearLoop(); // loopStart = null, loopEnd = null
practiceView.updateLoopBadge();

assert.strictEqual(practiceView.loopStatusBadge.classList.contains('hidden'), false, 'Badge must be visible for 3 repeats');
assert(practiceView.loopRangeLabel.textContent.includes('문장 S1'), 'Badge must show sentence loop label');
assert(practiceView.loopCountLabel.textContent.includes('1/3회'), 'Badge must show 1/3회 initially');

const player = practiceView.nativeAudioPlayer;
player.src = 'blob:test';
player.currentTime = 1.0;
player.paused = false;

// 1st pass: reach end of sentence (3.0)
player.currentTime = 3.0;
practiceView.looperEngine.checkBoundary();

assert.strictEqual(player.paused, true, 'Player must pause at sentence end');
assert.strictEqual(appState.currentLoopCount, 1, 'currentLoopCount should be 1');
assert.strictEqual(appState.isShadowingWaiting, true, 'Should enter shadowing delay');

// Run shadowing delay (0.5s pause)
runAllPendingTimeouts();
assert.strictEqual(appState.isShadowingWaiting, false, 'Shadowing delay cleared');
assert.strictEqual(player.currentTime, 1.0, 'Player must rewind to sentence start (1.0)');
assert.strictEqual(player.paused, false, 'Player must resume playback for 2nd repeat');
assert(practiceView.loopCountLabel.textContent.includes('2/3회'), 'Badge must now show 2/3회');

// 2nd pass: reach end of sentence (3.0)
player.currentTime = 3.0;
practiceView.looperEngine.checkBoundary();
assert.strictEqual(appState.currentLoopCount, 2, 'currentLoopCount should be 2');

runAllPendingTimeouts();
assert.strictEqual(player.currentTime, 1.0, 'Player must rewind to sentence start for 3rd repeat');
assert(practiceView.loopCountLabel.textContent.includes('3/3회'), 'Badge must now show 3/3회');

// 3rd pass: reach end of sentence (3.0)
let loopCompleted = false;
practiceView.looperEngine.callbacks.onLoopComplete = (target, typeStr) => {
  loopCompleted = true;
};
player.currentTime = 3.0;
practiceView.looperEngine.checkBoundary();
assert.strictEqual(appState.currentLoopCount, 3, 'currentLoopCount should be 3');
assert.strictEqual(loopCompleted, true, 'onLoopComplete callback must be triggered after 3 repeats');
console.log('✓ Entire sentence loops 3 times with 0.5s pause and updates badge accurately');

console.log('\n[Check 2] Verify Custom A-B Loop overrides Sentence Loop...');
// Set custom A-B loop: 1.5 ~ 2.5
appState.setLoopRange(1.5, 2.5);
practiceView.updateLoopBadge();
assert(practiceView.loopRangeLabel.textContent.includes('구간 루프'), 'Badge must indicate custom region loop');
assert.strictEqual(appState.loopStart, 1.5);
assert.strictEqual(appState.loopEnd, 2.5);

player.currentTime = 2.5;
player.paused = false;
practiceView.looperEngine.checkBoundary();
assert.strictEqual(appState.currentLoopCount, 1, 'Custom loop iteration 1');
runAllPendingTimeouts();
assert.strictEqual(player.currentTime, 1.5, 'Must rewind to custom loopStart (1.5)');

// Clear custom loop
practiceView.clearSelectedRegion();
assert.strictEqual(appState.loopStart, null, 'Custom loopStart must be null');
assert.strictEqual(appState.loopEnd, null, 'Custom loopEnd must be null');
assert(practiceView.loopRangeLabel.textContent.includes('문장 S1'), 'Badge must revert to sentence loop');
console.log('✓ Custom loop functions properly and reverts to sentence loop upon clearing');

console.log('\n🎉 ALL SENTENCE & REGION LOOP REPETITION TESTS PASSED!');
