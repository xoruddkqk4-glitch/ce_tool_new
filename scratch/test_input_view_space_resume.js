import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: STAGE 1 SPACEBAR RESUME FROM PAUSED POINT ===');

const appCode = fs.readFileSync('app.js', 'utf8');
const elementStore = new Map();

class MockElement {
  constructor(id, tag = 'div') {
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
    this.paused = true;
    this.src = 'blob:test';
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
  }
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(val) { this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean)); }
  getContext() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'measureText') return (str) => ({ width: 50 });
        return () => {};
      }
    });
  }
  focus() {}
  blur() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) { child.parentElement = this; this.children.push(child); }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
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
  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn({ target: this, stopPropagation: () => {} }));
    }
  }
}

const mockDoc = {
  documentElement: new MockElement('html'),
  head: new MockElement('head'),
  body: new MockElement('body'),
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

const sandbox = {
  window: {
    location: { hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: (fn) => fn(),
    setInterval: () => 1,
    clearTimeout: () => {},
    clearInterval: () => {},
    requestAnimationFrame: (fn) => {}
  },
  requestAnimationFrame: (fn) => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  document: mockDoc,
  console: console,
  AudioContext: class {},
  webkitAudioContext: class {},
  FileReader: class { readAsArrayBuffer() {} },
  Blob: class {},
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }
};
sandbox.window.document = mockDoc;

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);

const app = sandbox.window.__ceToolApp;
assert(app, 'app must be mounted on sandbox window');

const inputView = app.inputView;
const player = inputView.nativeAudioPlayer;
assert(player, 'player must exist');

// Setup sentence in appState
app.appState.sentenceList = [
  {
    index: 0,
    text: 'First test sentence.',
    audioStart: 1.0,
    audioEnd: 4.0,
    result: { natural: '첫 번째 테스트 문장.', chunks: [{ en: 'First', ko: '첫' }] }
  }
];
inputView.activeSentenceIndex = 0;

// 1. Initial play via Spacebar
console.log('\n[Check 1] Starting initial playback with Spacebar...');
player.paused = true;
player.currentTime = 0;
inputView.togglePlayPauseWaveform();

assert.strictEqual(player.paused, false, 'Player must be playing');
assert.strictEqual(player.currentTime, 1.0, 'Initial play must start from audioStart 1.0');
console.log('✓ Initial Spacebar played from sentence start (1.0s ~ 4.0s)');

// 2. Spacebar pause at 2.5s
console.log('\n[Check 2] Pausing with Spacebar at 2.5s...');
player.currentTime = 2.5;
inputView.togglePlayPauseWaveform();
assert.strictEqual(player.paused, true, 'Player must be paused');
assert.strictEqual(player.currentTime, 2.5, 'Current time must stay at 2.5s');
console.log('✓ Spacebar paused playback, keeping currentTime at 2.5s');

// 3. Spacebar resume from 2.5s
console.log('\n[Check 3] Resuming with Spacebar from paused position...');
inputView.togglePlayPauseWaveform();

assert.strictEqual(player.paused, false, 'Player must resume playing');
assert.strictEqual(player.currentTime, 2.5, 'Resume must start from paused position 2.5s (NOT reset to 1.0s!)');
console.log('✓ Spacebar resumed playback from 2.5s (NOT 1.0s!)');

// 4. Mouse click plays from the beginning (1.0s)
console.log('\n[Check 4] Verifying mouse click plays from beginning (1.0s)...');
app.appState.uploadedAudioUrl = 'blob:test';
app.appState.isSynthesizedAudio = false;

inputView.playOrSpeakSentence(app.appState.sentenceList[0]);
assert.strictEqual(player.currentTime, 1.0, 'Mouse click must start from sentence start 1.0s');
console.log('✓ Mouse click on sentence played from sentence beginning (1.0s)');

// 5. Playback ended (currentTime at 4.0s), pressing Spacebar restarts from 1.0s
console.log('\n[Check 5] Verifying sentence restart when playback has already completed...');
player.paused = true;
player.currentTime = 4.0;
inputView.togglePlayPauseWaveform();
assert.strictEqual(player.currentTime, 1.0, 'When sentence already finished, Spacebar starts from beginning 1.0s');
console.log('✓ Spacebar restarts from beginning (1.0s) if sentence already completed');

console.log('\n🎉 ALL STAGE 1 SPACEBAR RESUME TESTS PASSED 100%!');
