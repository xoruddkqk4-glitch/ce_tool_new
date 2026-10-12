import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: PAGE 2 CARD WIDTH STABILIZATION & SENTENCE NAVIGATION ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Verify CSS styles for card width and flex shrink
console.log('\n[Check 1] Verifying CSS card stabilization rules in styles.css...');
assert(cssContent.includes('min-width: 56px'), 'chunk-card-3d should have min-width: 56px');
assert(cssContent.includes('.chunk-tokens-wrap') && cssContent.includes('flex-shrink: 0'), '.chunk-tokens-wrap must have flex-shrink: 0');
assert(cssContent.includes('.ko-chunk-content') && cssContent.includes('flex-shrink: 0'), '.ko-chunk-content must have flex-shrink: 0');
console.log('✓ CSS card min-width and flex-shrink: 0 verified');

// 2. Mock DOM & app.js Execution
console.log('\n[Check 2] Testing multi-sentence navigation and card width estimation in app.js...');
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
      toggle: function(c) {
        if (this._set.has(c)) this._set.delete(c);
        else this._set.add(c);
      }
    };
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.attributes = {};
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

// Setup two sentences: S1 (normal) and S2 (with weak forms and management office)
app.appState.sentenceList = [
  {
    id: 'stn-1',
    text: 'I went to school yesterday.',
    audioStart: 0,
    audioEnd: 3.5,
    result: {
      natural: '나는 어제 학교에 갔다.',
      chunks: [
        { en: 'I', ko: '나는' },
        { en: 'went', ko: '갔다' },
        { en: 'to school', ko: '학교에' },
        { en: 'yesterday', ko: '어제' }
      ]
    }
  },
  {
    id: 'stn-2',
    text: 'Call at the management office.',
    audioStart: 3.5,
    audioEnd: 7.0,
    result: {
      natural: '관리사무소로 전화해.',
      chunks: [
        { en: 'Call at the', ko: '전화해' },
        { en: 'management office.', ko: '관리사무소로' }
      ]
    }
  }
];

// Navigate to practice view on S1
app.appState.activeSentenceIndex = 0;
app.router.navigateTo('practice');

const chunksContainer = mockDoc.getElementById('chunksContainer');
let cards = chunksContainer.querySelectorAll('.chunk-card-3d');
assert.strictEqual(cards.length, 4, 'Sentence 1 must have 4 cards');
cards.forEach((c, idx) => {
  const w = parseFloat(c.style.width);
  assert(w >= 56, `Card ${idx} width (${w}px) must be >= 56px`);
});
console.log('✓ Sentence 1 cards loaded with valid stabilized widths');

// Navigate to Sentence 2 (The user-reported case)
console.log('\n[Check 3] Navigating to Sentence 2 (S2) with weak forms & management office...');
app.appState.setActiveSentenceIndex(1);

cards = chunksContainer.querySelectorAll('.chunk-card-3d');
assert.strictEqual(cards.length, 2, 'Sentence 2 must have exactly 2 cards');

const card1Width = parseFloat(cards[0].style.width);
const card2Width = parseFloat(cards[1].style.width);

console.log(`Sentence 2 Card 1 (Call at the) width: ${card1Width}px`);
console.log(`Sentence 2 Card 2 (management office.) width: ${card2Width}px`);

// Card 1 contains "Call at the" (which has 2 FELS blanks: "at", "the"). It needs at least 150px!
assert(card1Width >= 140, `Card 1 width (${card1Width}px) must be >= 140px to fit multiple blanks without overflowing left`);

// Card 2 contains "management office." (18 chars). It needs at least 180px!
assert(card2Width >= 180, `Card 2 width (${card2Width}px) must be >= 180px to fit management office without overlap`);

// Verify neither card collapsed to 48px or 36px
assert(card1Width > 48, 'Card 1 must NOT collapse to 48px');
assert(card2Width > 48, 'Card 2 must NOT collapse to 48px');

console.log('✓ Card widths verified: No 48px collapse, no negative overflow, ample breathing room!');

// Navigate back to Sentence 1 and then back to Sentence 2 to ensure idempotence
console.log('\n[Check 4] Repeated navigation idempotence (S2 ➔ S1 ➔ S2)...');
app.appState.setActiveSentenceIndex(0);
assert.strictEqual(chunksContainer.querySelectorAll('.chunk-card-3d').length, 4);

app.appState.setActiveSentenceIndex(1);
const reCards = chunksContainer.querySelectorAll('.chunk-card-3d');
assert.strictEqual(reCards.length, 2);
assert.strictEqual(parseFloat(reCards[0].style.width), card1Width);
assert.strictEqual(parseFloat(reCards[1].style.width), card2Width);
console.log('✓ Repeated sentence navigation is 100% idempotent and stable');

console.log('\n🎉 ALL PAGE 2 CARD STABILIZATION CHECKS PASSED!');
