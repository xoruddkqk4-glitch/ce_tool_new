import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: CLASSROOM MODAL FULL-WIDTH UTILIZATION & DYNAMIC SCALING ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Verify CSS rules for dynamic variables
assert(cssContent.includes('--classroom-chunk-gap'), 'styles.css must reference --classroom-chunk-gap');
assert(cssContent.includes('--classroom-card-pad-x'), 'styles.css must reference --classroom-card-pad-x');
assert(cssContent.includes('--classroom-font-size'), 'styles.css must reference --classroom-font-size');
console.log('✓ CSS dynamic variables (--classroom-chunk-gap, --classroom-card-pad-x, --classroom-font-size) verified');

// 2. Setup Mock DOM environment
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
    this.clientWidth = 1200;
    this.clientHeight = 600;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') {
      this.children = [];
    }
  }
  get className() {
    return Array.from(this.classList._set).join(' ');
  }
  set className(val) {
    this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean));
  }
  getContext() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'measureText') return () => ({ width: 50 });
        if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
        return () => {};
      }
    });
  }
  focus() {}
  blur() {}
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
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
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  removeEventListener(evt, fn) {
    if (!this.listeners[evt]) return;
    this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
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
assert(app && app.memorizeView, 'app.memorizeView must be initialized');

// 3. Inject sample sentence data (S3 from screenshot: 3 chunks)
app.appState.setSentenceList([
  {
    id: 'stn-1',
    text: 'Hello world.',
    result: { natural: '안녕 세계', chunks: [{ en: 'Hello', ko: '안녕' }, { en: 'world', ko: '세계' }] }
  },
  {
    id: 'stn-2',
    text: 'We are learning English.',
    result: { natural: '우리는 영어를 배우고 있습니다.', chunks: [{ en: 'We are learning', ko: '우리는 배우고 있다' }, { en: 'English', ko: '영어를' }] }
  },
  {
    id: 'stn-3',
    text: 'As you know, this beach is famous for its beautiful black stones.',
    result: {
      natural: '아시다시피, 이 해변은 아름다운 검은 돌들로 유명합니다.',
      chunks: [
        { en: 'As you know,', ko: '아시다시피,' },
        { en: 'this beach is famous', ko: '이 해변은 유명합니다.' },
        { en: 'for its beautiful black stones', ko: '아름다운 검은 돌들로' }
      ]
    }
  }
]);

// 4. Test opening Classroom modal for Sentence S3
console.log('\n[Check 4] Testing Classroom modal card width distribution for Sentence S3...');
app.memorizeView.openClassroomModal(2); // Sentence index 2 (S3)

const container = mockDoc.getElementById('classroomChunksContainer');
const row = container.children.find(c => c.classList && c.classList.contains('classroom-sentence-row'));
assert(row, 'Sentence row must be rendered in modal');

const chunksWrap = row.children.find(c => c.classList && c.classList.contains('classroom-row-chunks'));
assert(chunksWrap, 'classroom-row-chunks must exist');

// Ensure chunksWrap has simulated clientWidth = 1172 (1200 - 28px padding)
chunksWrap.clientWidth = 1172;

// Run fitClassroomSentenceRows
app.memorizeView.fitClassroomSentenceRows();

const cards = chunksWrap.querySelectorAll('.classroom-chunk-card');
assert.strictEqual(cards.length, 3, 'Must have 3 chunk cards');

// Measure card widths
const widths = cards.map(c => parseInt(c.style.width, 10));
console.log('Allocated chunk card widths:', widths);

const sumWidths = widths.reduce((sum, w) => sum + w, 0);
console.log('Total cards width:', sumWidths, 'AvailWidth:', chunksWrap.clientWidth);

// Total card widths must fully utilize the row width (1172px)
assert(sumWidths > 1000, `Total card widths (${sumWidths}px) must fully utilize the row width (1172px)`);
assert(widths.every(w => w > 150), 'Every card should have expanded proportionally beyond minimum text width');
console.log('✓ Confirmed: Chunk cards dynamically stretch and utilize the entire horizontal width of the row!');

// 5. Verify dynamic CSS variables are set on chunksWrap
assert(chunksWrap.style['--classroom-font-size'], '--classroom-font-size must be dynamically set');
assert(chunksWrap.style['--classroom-card-pad-x'], '--classroom-card-pad-x must be dynamically set');
assert(chunksWrap.style['--classroom-chunk-gap'], '--classroom-chunk-gap must be dynamically set');
console.log(`✓ Dynamic variables applied: font-size=${chunksWrap.style['--classroom-font-size']}, pad-x=${chunksWrap.style['--classroom-card-pad-x']}, gap=${chunksWrap.style['--classroom-chunk-gap']}`);

console.log('\n🎉 ALL CLASSROOM MODAL FULL-WIDTH TESTS PASSED 100%!');
