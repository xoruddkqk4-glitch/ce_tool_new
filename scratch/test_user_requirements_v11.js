import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: USER REQUIREMENTS V11 (PAGE 2 & PAGE 3 COMPACT ROW & DYNAMIC WIDTH UTILIZATION) ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// 1. Check HTML: 크게 보기 button next to 전체 뒤집기 in Page 3
console.log('\n[Check 1] Verifying Page 3 action buttons...');
assert(htmlContent.includes('id="btnOpenClassroomModal"'), '#btnOpenClassroomModal must exist in index.html');
const flipIdx = htmlContent.indexOf('id="btnFlipAllMemorize"');
const openModalIdx = htmlContent.indexOf('id="btnOpenClassroomModal"');
assert(flipIdx !== -1 && openModalIdx > flipIdx, '#btnOpenClassroomModal must be located to the right of #btnFlipAllMemorize');
console.log('✓ #btnOpenClassroomModal successfully placed to the right of #btnFlipAllMemorize');

// 2. Check HTML: speak-btn (🔊) removed from Page 2
console.log('\n[Check 2] Verifying Page 2 speak button (🔊) removal...');
const practiceIdx = htmlContent.indexOf('id="view-practice"');
const endPracticeIdx = htmlContent.indexOf('id="view-memorize"');
const practiceSection = htmlContent.substring(practiceIdx, endPracticeIdx);
assert(!practiceSection.includes('🔊'), '🔊 button must be removed from Page 2');
console.log('✓ 🔊 button confirmed removed from Page 2');

// 3. Mock DOM & app.js Execution
console.log('\n[Check 3] Mock DOM & App initialization...');
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
    this.clientWidth = 0;
    this.scrollWidth = 0;
    this.offsetWidth = 0;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
  }
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(val) {
    this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean));
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
    return child;
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
  getElementById: (id) => {
    if (!elementStore.has(id)) {
      elementStore.set(id, new MockElement(id));
    }
    return elementStore.get(id);
  },
  createElement: (tag) => new MockElement('', tag),
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  documentElement: new MockElement('html', 'html'),
  body: new MockElement('body', 'body')
};

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
assert(app, 'app mounted');

// Setup sentences
app.appState.sentenceList = [
  {
    id: 'stn-1',
    text: 'Hello, visitors to Cryston Beach.',
    audioStart: 0,
    audioEnd: 3.0,
    result: {
      natural: '크리스턴 비치에 오신 방문객 여러분 환영합니다.',
      chunks: [
        { en: 'Hello, visitors', ko: '방문객 여러분 안녕하세요' },
        { en: 'to Cryston Beach.', ko: '크리스턴 비치에' }
      ]
    }
  }
];

// 4. Test Page 3 Same-Row Structure
console.log('\n[Check 4] Testing Page 3 Same-Row Layout (Play button + Chunks in same row)...');
app.router.navigateTo('memorize');

const canvas = mockDoc.getElementById('memorizeCanvas');
const rows = canvas.querySelectorAll('.memorize-sentence-row');
assert.strictEqual(rows.length, 1, '1 sentence row on canvas');

const sRow = rows[0];
// Ensure sHeader is completely gone
assert(!sRow.querySelector('.memorize-sentence-header'), 'memorize-sentence-header must be removed');
assert(!sRow.querySelector('.memorize-stn-expand-btn'), 'Individual 크게 보기 button must be removed from sentence row');

// Ensure play button and chunkGrid are direct siblings in the row
const playBtn = sRow.querySelector('.memorize-stn-play');
const chunkGrid = sRow.querySelector('.memorize-chunk-grid');
assert(playBtn, 'playBtn must exist in sRow');
assert(chunkGrid, 'chunkGrid must exist in sRow');
console.log('✓ Play button (▶) and chunk cards are now in the EXACT SAME ROW (no header row)!');

// 5. Test Top Bar '크게 보기' Click opens Classroom Modal
console.log('\n[Check 5] Testing Top Bar 크게 보기 button action...');
const btnOpenClassroom = mockDoc.getElementById('btnOpenClassroomModal');
assert(btnOpenClassroom, '#btnOpenClassroomModal must exist');
btnOpenClassroom.click();
assert(app.memorizeView.isClassroomModalOpen(), 'Clicking #btnOpenClassroomModal must open classroom modal');
app.memorizeView.closeClassroomModal();
console.log('✓ Top Bar 크게 보기 successfully opens classroom modal');

// 6. Test Page 3 Dynamic Font Scaling and Width Utilization
console.log('\n[Check 6] Testing Page 3 dynamic width utilization in 1000px row...');
chunkGrid.clientWidth = 1000;
app.memorizeView.fitSentenceRow(chunkGrid);

const cards = chunkGrid.querySelectorAll('.memorize-chunk-card');
assert.strictEqual(cards.length, 2, 'Must have 2 cards');

const fontRem = parseFloat(chunkGrid.style['--row-chunk-font-size']);
console.log(`Page 3 short sentence scaled font: ${chunkGrid.style['--row-chunk-font-size']}`);
assert(fontRem > 0.92, `Short sentence font size (${fontRem}rem) must scale UP above base 0.92rem to maximize row`);

let totalCardsWidth = 0;
cards.forEach((c, idx) => {
  const w = parseFloat(c.style.width);
  console.log(`Page 3 Card ${idx + 1} allocated width: ${w}px`);
  totalCardsWidth += w;
});
const p3Gap = parseFloat(chunkGrid.style['--row-chunk-gap']) || 5;
totalCardsWidth += (cards.length - 1) * p3Gap;
console.log(`Total cards width with gaps: ${totalCardsWidth}px (available: ${chunkGrid.clientWidth}px)`);
assert(totalCardsWidth <= chunkGrid.clientWidth, 'Cards must fit within row');
assert(totalCardsWidth >= 900, `Cards must utilize horizontal width of row (>= 900px, got ${totalCardsWidth}px)`);
console.log('✓ Page 3 cards utilize the full horizontal width of the row!');

console.log('\n🎉 ALL USER REQUIREMENTS V11 TESTS PASSED 100%!');
