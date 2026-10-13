import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: R SHORTCUT REWIND SECONDS (0.5s, 1s, 1.5s, 2s) ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Check HTML buttons
console.log('\n[Check 1] Verifying buttons in index.html for 0.5s, 1s, 1.5s, 2s...');
assert(htmlContent.includes('data-sec="0.5"'), 'Must have button with data-sec="0.5"');
assert(htmlContent.includes('data-sec="1"'), 'Must have button with data-sec="1"');
assert(htmlContent.includes('data-sec="1.5"'), 'Must have button with data-sec="1.5"');
assert(htmlContent.includes('data-sec="2"'), 'Must have button with data-sec="2"');
assert(!htmlContent.includes('data-sec="3"'), 'Must NOT have button with data-sec="3"');
assert(!htmlContent.includes('data-sec="5"'), 'Must NOT have button with data-sec="5"');
console.log('✓ index.html has exact buttons: 0.5초, 1초, 1.5초, 2초');

// 2. Mock DOM & app.js execution
console.log('\n[Check 2] Testing PracticeView and StorageService behavior in sandbox...');
const elementStore = new Map();
let mockStorage = {};

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
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      removeProperty: (k) => { delete this.style[k]; }
    };
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.attributes = {};
    this.currentTime = 5.0;
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
  play() { return Promise.resolve(); }
  pause() {}
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

// Create the 4 replay buttons in DOM
const btn05 = new MockElement('btn05', 'button');
btn05.classList.add('replay-sec-btn');
btn05.setAttribute('data-sec', '0.5');
btn05.textContent = '0.5초';
elementStore.set('btn05', btn05);

const btn1 = new MockElement('btn1', 'button');
btn1.classList.add('replay-sec-btn');
btn1.setAttribute('data-sec', '1');
btn1.textContent = '1초';
elementStore.set('btn1', btn1);

const btn15 = new MockElement('btn15', 'button');
btn15.classList.add('replay-sec-btn');
btn15.setAttribute('data-sec', '1.5');
btn15.textContent = '1.5초';
elementStore.set('btn15', btn15);

const btn2 = new MockElement('btn2', 'button');
btn2.classList.add('replay-sec-btn');
btn2.setAttribute('data-sec', '2');
btn2.textContent = '2초';
elementStore.set('btn2', btn2);

const shortcutRLabel = new MockElement('shortcutRLabel', 'span');
elementStore.set('shortcutRLabel', shortcutRLabel);

const sandbox = {
  window: {
    location: { hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); }
    },
    setTimeout: (fn) => fn(),
    setInterval: () => 1,
    clearTimeout: () => {},
    clearInterval: () => {},
    requestAnimationFrame: (fn) => {
      // Don't synchronously loop indefinitely
    }
  },
  requestAnimationFrame: (fn) => {},
  localStorage: {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); }
  },
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

const practiceView = app.practiceView;

// Check setting to 0.5s
console.log('\n[Check 3] Setting rewind to 0.5s...');
practiceView.setReplaySeconds(0.5);
assert.strictEqual(practiceView.replaySeconds, 0.5);
assert.strictEqual(mockStorage['ce_tool_replay_seconds'], '0.5');
assert.strictEqual(btn05.classList.contains('active'), true);
assert.strictEqual(btn1.classList.contains('active'), false);
assert.strictEqual(shortcutRLabel.textContent, '0.5초 되감기재생');
console.log('✓ 0.5s correctly stored, active class updated, shortcut label updated');

// Check setting to 1.5s
console.log('\n[Check 4] Setting rewind to 1.5s...');
practiceView.setReplaySeconds(1.5);
assert.strictEqual(practiceView.replaySeconds, 1.5);
assert.strictEqual(mockStorage['ce_tool_replay_seconds'], '1.5');
assert.strictEqual(btn15.classList.contains('active'), true);
assert.strictEqual(btn05.classList.contains('active'), false);
assert.strictEqual(shortcutRLabel.textContent, '1.5초 되감기재생');
console.log('✓ 1.5s correctly stored, active class updated, shortcut label updated');

// Check rewindAndPlay calculation
console.log('\n[Check 5] Verifying rewindAndPlay calculation with 1.5s...');
practiceView.nativeAudioPlayer.currentTime = 5.0;
app.appState.sentenceList = [{
  id: 'stn-1',
  text: 'Test sentence',
  audioStart: 1.0,
  audioEnd: 10.0
}];
app.appState.activeSentenceIndex = 0;

practiceView.rewindAndPlay();
// 5.0 - 1.5 = 3.5s
assert(Math.abs(practiceView.nativeAudioPlayer.currentTime - 3.5) < 0.01, `Target time should be 3.5, got ${practiceView.nativeAudioPlayer.currentTime}`);
console.log('✓ rewindAndPlay correctly rewound from 5.0s to 3.5s (by 1.5s)');

console.log('\n🎉 ALL R SHORTCUT SETTINGS TESTS PASSED 100%!');
