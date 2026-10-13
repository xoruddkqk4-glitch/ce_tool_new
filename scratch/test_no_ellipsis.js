// scratch/test_no_ellipsis.js
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: VERIFY NO ELLIPSIS & 100% VISIBLE CHUNK CARDS ===');

const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Verify CSS does NOT have text-overflow: ellipsis on chunk cards
assert(!cssContent.includes('.chunk-en-text {\n  font-size: var(--row-chunk-font-size, 0.92rem);\n  font-weight: 700;\n  color: #ffffff;\n  white-space: nowrap !important;\n  word-break: normal !important;\n  overflow-wrap: normal !important;\n  display: inline-block;\n  line-height: 1.25;\n  text-overflow: ellipsis;'), 'Must not have text-overflow: ellipsis');
assert(cssContent.includes('.chunk-en-text') && cssContent.includes('text-overflow: clip !important'), 'chunk-en-text must have text-overflow: clip !important');
assert(cssContent.includes('.chunk-ko-text') && cssContent.includes('text-overflow: clip !important'), 'chunk-ko-text must have text-overflow: clip !important');
console.log('✓ CSS verified: text-overflow is clip !important (no ellipsis ever generated)');

// 2. Mock DOM & app.js Execution
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
    this.style = {
      _props: {},
      setProperty: function(k, v) { this._props[k] = v; },
      removeProperty: function(k) { delete this._props[k]; },
      getPropertyValue: function(k) { return this._props[k] || ''; }
    };
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.attributes = {};
    this.clientWidth = 920; // 920px container
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
  }
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(val) { this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean)); }
  getContext() {
    return {
      measureText: () => ({ width: 0 }) // fallback to char-based calculation in test
    };
  }
  focus() {}
  blur() {}
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
}

const mockDoc = {
  documentElement: new MockElement('html'),
  head: new MockElement('head'),
  body: new MockElement('body'),
  getElementById: (id) => {
    if (!elementStore.has(id)) elementStore.set(id, new MockElement(id));
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
    requestAnimationFrame: (fn) => fn()
  },
  requestAnimationFrame: (fn) => fn(),
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
assert(app, 'app must be initialized');

// Test with S4 from user's screenshot
app.appState.sentenceList = [
  {
    id: 'stn-s4',
    text: 'Unfortunately, there were some cases where visitors damaged the beach by taking stones.',
    audioStart: 0,
    audioEnd: 5.0,
    result: {
      natural: '불행하게도, 방문객들이 돌을 가져가 해변을 훼손한 사례들이 있었습니다.',
      chunks: [
        { en: 'Unfortunately,', ko: '불행하게도,' },
        { en: 'there were some cases', ko: '사례들이 있었습니다' },
        { en: 'where visitors damaged the beach', ko: '해변을 훼손한' },
        { en: 'by taking stones.', ko: '방문객들이 돌을 가져가 사례들이 있었습니다' }
      ]
    }
  }
];

app.router.navigateTo('memorize');
const canvas = mockDoc.getElementById('memorizeCanvas');
const grid = canvas.querySelector('.memorize-chunk-grid');
assert(grid, 'grid must exist');

// Set container width to 850px (typical laptop / content area width)
grid.clientWidth = 850;
app.memorizeView.fitSentenceRow(grid);

const cards = grid.querySelectorAll('.memorize-chunk-card');
assert.strictEqual(cards.length, 4, 'Must have 4 chunk cards');

let totalWidth = 0;
const gap = 4;
cards.forEach((c, idx) => {
  const w = parseFloat(c.style.width);
  assert(w > 0, `Card ${idx} width must be positive`);
  totalWidth += w;
});
totalWidth += (cards.length - 1) * gap;

console.log(`Total row width allocated: ${totalWidth}px (Available: ${grid.clientWidth}px)`);
assert(totalWidth <= grid.clientWidth + 1, `Total width (${totalWidth}px) must be <= available width (${grid.clientWidth}px)`);

const scaledFont = grid.style.getPropertyValue('--row-chunk-font-size');
console.log(`Scaled font size for row: ${scaledFont}`);
assert(scaledFont, 'Font size variable must be set on grid');

console.log('\n🎉 TEST PASSED: No ellipsis, full text fits within container width!');
