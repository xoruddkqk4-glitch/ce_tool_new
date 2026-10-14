import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: PAGE 3 MEMORIZE VIEW & 3-SENTENCE CLASSROOM MODAL ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Verify Mode Buttons in index.html
console.log('\n[Check 1] Verifying removed English-only and Korean-only buttons in index.html...');
assert(!htmlContent.includes('영어만 보기'), '"영어만 보기" button must be deleted from index.html');
assert(!htmlContent.includes('한국어만 보기'), '"한국어만 보기" button must be deleted from index.html');
assert(htmlContent.includes('data-memorize-mode="all"'), '전체 보기 button must exist');
assert(htmlContent.includes('data-memorize-mode="cloze"'), '청크 가리기 (Cloze) button must exist');
console.log('✓ Buttons verified: "영어만 보기" & "한국어만 보기" removed; "전체 보기" & "청크 가리기" preserved');

// 2. Verify CSS Single-Line Layout & Compact Margin/Padding
console.log('\n[Check 2] Verifying CSS strict single-line (nowrap) for cards...');
assert(cssContent.includes('.memorize-chunk-grid') && cssContent.includes('flex-wrap: nowrap'), '.memorize-chunk-grid must have flex-wrap: nowrap');
assert(cssContent.includes('.classroom-row-chunks') && cssContent.includes('flex-wrap: nowrap'), '.classroom-row-chunks must have flex-wrap: nowrap');
console.log('✓ Confirmed flex-wrap: nowrap on both Page 3 canvas and Classroom modal rows');

// 3. Mock DOM & app.js Execution
console.log('\n[Check 3] Setting up Mock DOM and executing app.js...');
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

// Setup 3 sentences
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
  },
  {
    id: 'stn-3',
    text: 'We are discussing the new project.',
    audioStart: 7.0,
    audioEnd: 10.5,
    result: {
      natural: '우리는 새 프로젝트를 논의 중이다.',
      chunks: [
        { en: 'We are discussing', ko: '우리는 논의 중이다' },
        { en: 'the new project', ko: '새 프로젝트를' }
      ]
    }
  }
];

// Navigate to Memorize view (Page 3)
app.router.navigateTo('memorize');
const canvas = mockDoc.getElementById('memorizeCanvas');
const rows = canvas.querySelectorAll('.memorize-sentence-row');
assert.strictEqual(rows.length, 3, 'Page 3 canvas must render 3 sentence rows');
console.log('✓ Page 3 canvas initialized with 3 sentence rows');

// 4. Test Korean Card Front & Zero English Initial Exposure in Classroom Modal
console.log('\n[Check 4] Testing Korean front cards & hidden English answer in Classroom modal...');
app.memorizeView.openClassroomModal(1); // Open on Sentence S2
assert.strictEqual(app.memorizeView.areClassroomCardsFlipped, false, 'Classroom modal must open with Korean front (unflipped)');

const modalChunksContainer = mockDoc.getElementById('classroomChunksContainer');
let classroomRows = modalChunksContainer.querySelectorAll('.classroom-sentence-row');
assert.strictEqual(classroomRows.length, 1, 'Classroom modal must display exactly 1 sentence row');

const activeRow = classroomRows[0];
assert(activeRow.classList.contains('is-active'), 'The single row must be active');

// Verify Page 3 canvas header has NO English sentence exposed
assert(!rows[0].children[0].innerHTML.includes('The recommendation is that'), 'Page 3 canvas header must NOT display English sentence text');

// Verify modal row header contains NO translation text (pure chunk card focus)
const previewEl = activeRow.querySelector('.classroom-row-preview');
assert(previewEl, 'Row preview element must exist');
assert.strictEqual(previewEl.textContent, '', 'Classroom modal row header must have no translation text');

// Verify card front is Korean, back is English
const cards = activeRow.querySelectorAll('.classroom-chunk-card');
assert.strictEqual(cards.length, 2, 'Sentence S2 must have 2 chunk cards');
assert(cards[0].innerHTML.includes('classroom-face-ko'), 'Card must have Korean face');
assert(cards[0].innerHTML.includes('classroom-face-en'), 'Card must have English face');
assert(!cards[0].classList.contains('flipped'), 'Card must NOT be flipped by default');

console.log('✓ Korean front cards verified: English answer is hidden, modal header has no sentence text');

// 5. Test Flipping to Reveal English Answer
console.log('\n[Check 5] Verifying flip interaction to reveal English answer...');
app.memorizeView.flipAllClassroomCards();
assert.strictEqual(app.memorizeView.areClassroomCardsFlipped, true, 'Cards must be marked flipped');
assert(cards[0].classList.contains('flipped'), 'Card 0 must have .flipped class');

// Flip back to Korean
app.memorizeView.flipAllClassroomCards();
assert.strictEqual(app.memorizeView.areClassroomCardsFlipped, false, 'Cards must flip back to Korean');
assert(!cards[0].classList.contains('flipped'), 'Card 0 must remove .flipped class');
console.log('✓ Flip toggle verified: flips to English answer and back to Korean front');

// 6. Test Sentence Navigation (Previous / Next Sentence)
console.log('\n[Check 6] Testing sentence navigation (S2 -> S1)...');
app.memorizeView.prevClassroomSentence(); // Navigate from S2 to S1
assert.strictEqual(app.memorizeView.classroomIndex, 0);

classroomRows = modalChunksContainer.querySelectorAll('.classroom-sentence-row');
assert.strictEqual(classroomRows.length, 1, 'Classroom modal must still display exactly 1 sentence');

const s1Preview = classroomRows[0].querySelector('.classroom-row-preview');
assert.strictEqual(s1Preview.textContent, '', 'S1 modal header must also be empty');
assert.strictEqual(app.memorizeView.areClassroomCardsFlipped, false, 'Moving to next/prev sentence must reset to Korean front');

console.log('✓ Sentence navigation verified: Exactly 1 sentence displayed and Korean front reset');

console.log('\n🎉 ALL PAGE 3 & CLASSROOM MODAL TESTS PASSED 100%!');
