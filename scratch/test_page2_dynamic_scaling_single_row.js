import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: PAGE 2 DYNAMIC SCALING FOR SINGLE-ROW CHUNK CARDS ===');

const appCode = fs.readFileSync('app.js', 'utf8');

const mockDoc = {
  getElementById: (id) => {
    if (!mockDoc._elements[id]) {
      mockDoc._elements[id] = new MockElement(id);
    }
    return mockDoc._elements[id];
  },
  createElement: (tag) => new MockElement('', tag),
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  documentElement: null,
  body: null,
  _elements: {}
};

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
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c);
          else this._set.add(c);
        } else if (force) {
          this._set.add(c);
        } else {
          this._set.delete(c);
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
    this.clientWidth = 0;
    this.scrollWidth = 0;
    this.offsetWidth = 0;
  }
  getContext() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'measureText') return () => ({ width: 50 });
        return () => {};
      }
    });
  }
  focus() {}
  blur() {}
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
  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event) {
    const handlers = this.listeners[event.type || event] || [];
    handlers.forEach(h => h(event));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const results = [];
    const check = (el) => {
      let match = false;
      if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) match = true;
      if (sel.startsWith('#') && el.id === sel.slice(1)) match = true;
      if (sel.toUpperCase() === el.tagName) match = true;
      if (match) results.push(el);
      for (const ch of el.children) check(ch);
    };
    for (const ch of this.children) check(ch);
    return results;
  }
}

mockDoc.body = new MockElement('body', 'body');
mockDoc.documentElement = new MockElement('html', 'html');

const sandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { hash: '' },
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
assert(app, 'app must be mounted');

// Setup sentence from user screenshot:
// "A third of Americans are not doing that and startups are trying to make some money from our sleep problems."
app.appState.sentenceList = [
  {
    id: 'stn-user',
    text: 'A third of Americans are not doing that and startups are trying to make some money from our sleep problems.',
    audioStart: 0,
    audioEnd: 6.0,
    result: {
      natural: '미국인의 3분의 1은 그렇게 하지 않고 있으며 스타트업들은 우리의 수면 문제로 돈을 벌려고 노력하고 있다.',
      chunks: [
        { en: 'A third of Americans', ko: '미국인의 3분의 1은' },
        { en: 'are not doing that', ko: '그렇게 하지 않고 있으며' },
        { en: 'and startups are trying to make some money', ko: '스타트업들은 돈을 벌려고 노력하고 있다' },
        { en: 'from our sleep problems.', ko: '우리의 수면 문제로부터' }
      ]
    }
  }
];

app.appState.activeSentenceIndex = 0;
app.router.navigateTo('practice');

const chunksContainer = mockDoc.getElementById('chunksContainer');
const practiceView = app.practiceView;

// Set container width to 850px (simulating the user's viewport where it previously wrapped)
chunksContainer.clientWidth = 850;
practiceView.computeAndApplyStabilizedWidths();

const cards = chunksContainer.querySelectorAll('.chunk-card-3d');
assert.strictEqual(cards.length, 4, 'Must have 4 cards');

console.log('\n[Check 1] Verifying dynamic scale applied in 850px container...');
const fontSize = chunksContainer.style['--practice-font-size'];
const cardPadX = chunksContainer.style['--practice-card-pad-x'];
const chunkGap = chunksContainer.style['--practice-chunk-gap'];

console.log(`--practice-font-size: ${fontSize}`);
console.log(`--practice-card-pad-x: ${cardPadX}`);
console.log(`--practice-chunk-gap: ${chunkGap}`);

assert(parseFloat(fontSize) < 0.95, `Font size (${fontSize}) must be scaled down below 0.95rem`);
assert(parseFloat(cardPadX) < 8, `Card padding (${cardPadX}) must be scaled down below 8px`);
assert(parseFloat(chunkGap) <= 5, `Chunk gap (${chunkGap}) must be <= 5px`);

let totalWidth = 0;
cards.forEach((card, idx) => {
  const w = parseFloat(card.style.width);
  console.log(`Card ${idx + 1} allocated width: ${w}px`);
  totalWidth += w;
});
const gapVal = parseFloat(chunkGap) || 4;
totalWidth += (cards.length - 1) * gapVal;
console.log(`Total width with gaps: ${totalWidth}px (Container: ${chunksContainer.clientWidth}px)`);

assert(totalWidth <= chunksContainer.clientWidth, `Total width (${totalWidth}px) must NOT exceed container (${chunksContainer.clientWidth}px)!`);
console.log('✓ All 4 cards strictly fit within single line (total <= container width)');

// [Check 2] Test wide container expansion back to baseline
console.log('\n[Check 2] Testing wide 1600px container restoration...');
chunksContainer.clientWidth = 1600;
practiceView.computeAndApplyStabilizedWidths();

console.log(`Restored --practice-font-size: ${chunksContainer.style['--practice-font-size']}`);
console.log(`Restored --practice-card-pad-x: ${chunksContainer.style['--practice-card-pad-x']}`);
assert(parseFloat(chunksContainer.style['--practice-font-size']) >= 0.95, 'Font size must scale up >= 0.95rem in wide container');
assert(parseFloat(chunksContainer.style['--practice-card-pad-x']) >= 8, 'Card pad must scale up >= 8px');
console.log('✓ Dynamic enlargement and wide row utilization confirmed');

console.log('\n🎉 ALL DYNAMIC SCALING VERIFICATIONS PASSED 100%!');
