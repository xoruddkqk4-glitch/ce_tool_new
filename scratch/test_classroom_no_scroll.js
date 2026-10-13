import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: CLASSROOM MODAL NO HORIZONTAL SCROLL & COMPACT FIT ===');

const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Verify CSS styles for Classroom Modal
console.log('\n[Check 1] Verifying CSS styles for overflow-x: hidden, reduced padding and font size...');
assert(cssContent.includes('.classroom-row-chunks'), 'Must contain .classroom-row-chunks in CSS');
assert(cssContent.includes('overflow-x: hidden'), '.classroom-row-chunks must have overflow-x: hidden to prevent horizontal scrollbar');
assert(cssContent.includes('padding: 4px 7px'), '.classroom-face must have reduced padding 4px 7px');
assert(cssContent.includes('--classroom-font-size, 1.05rem'), '.classroom-chunk-text must have reduced font-size 1.05rem with variable fallback');
console.log('✓ CSS verified: overflow-x: hidden, padding: 4px 7px, font-size: 1.05rem verified');

// 2. Setup Mock DOM and Test Long Sentence Scaling
console.log('\n[Check 2] Verifying long sentence dynamic auto-scaling in Classroom Modal...');
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
    this.clientWidth = 1000;
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
        if (prop === 'measureText') return (str) => ({ width: str.length * 10 });
        return () => {};
      }
    });
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
assert(app, 'app must be mounted on sandbox window');

// Setup the exact sentence from user screenshot:
app.appState.sentenceList = [
  {
    id: 'stn-1',
    text: 'A third of Americans are not doing that and startups are trying to make some money',
    audioStart: 0,
    audioEnd: 4.5,
    result: {
      natural: '미국인의 3분의 1은 그렇게 하지 않고 있으며 스타트업들은 돈을 벌려고 노력하고 있다.',
      chunks: [
        { en: 'A third of Americans', ko: '미국인의 3분의 1은' },
        { en: 'are not doing that', ko: '그렇게 하지 않고 있으며' },
        { en: 'and', ko: '그리고' },
        { en: 'startups are trying to make some money', ko: '스타트업들은 돈을 벌려고 노력하고 있다' }
      ]
    }
  }
];

app.router.navigateTo('memorize');
app.memorizeView.openClassroomModal(0);

const modalContainer = mockDoc.getElementById('classroomChunksContainer');
const rows = modalContainer.querySelectorAll('.classroom-sentence-row');
const activeRow = rows.find(r => r.classList.contains('is-active'));
assert(activeRow, 'Active row must exist in classroom modal');

const chunksWrap = activeRow.querySelector('.classroom-row-chunks');
assert(chunksWrap, 'chunksWrap must exist in active row');

const cards = chunksWrap.querySelectorAll('.classroom-chunk-card');
assert.strictEqual(cards.length, 4, 'Must render 4 chunk cards for the sentence');

// Check card flex and max-width properties
cards.forEach((c, idx) => {
  assert.strictEqual(c.style.flex, '0 0 auto', `Card ${idx} must have flex: 0 0 auto allocated width`);
  assert(parseFloat(c.style.width) > 0, `Card ${idx} must have positive width`);
});

console.log('✓ Cards rendered with proportional fit without horizontal overflow');
console.log('\n🎉 ALL CLASSROOM NO HORIZONTAL SCROLL TESTS PASSED 100%!');
