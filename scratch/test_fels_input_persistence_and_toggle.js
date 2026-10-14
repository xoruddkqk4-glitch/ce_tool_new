const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=== TEST: FELS INPUT PERSISTENCE, SIMPLIFIED CHECK, AND SHORTCUT TOGGLE ===');

// Check index.html shortcut bar text
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('Space') && indexHtml.includes('재생/정지'), 'index.html must display Space 재생/정지 shortcut hint');
assert(indexHtml.includes('F5') && indexHtml.includes('빈칸입력'), 'index.html must display F5 빈칸입력 shortcut hint');
assert(indexHtml.includes('F6') && indexHtml.includes('이전문장'), 'index.html must display F6 이전문장 shortcut hint');
assert(indexHtml.includes('F7') && indexHtml.includes('다음문장'), 'index.html must display F7 다음문장 shortcut hint');
assert(indexHtml.includes('F11') && indexHtml.includes('전체문장재생'), 'index.html must display F11 전체문장재생 shortcut hint');
console.log('✓ index.html has Space, F5, F6, F7, F11 shortcut hints');

// Load bundled app.js into sandboxed environment
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
  }
  getContext() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'measureText') return (str) => ({ width: 50 });
        return () => {};
      }
    });
  }
  play() { return Promise.resolve(); }
  pause() {}
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
  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel.startsWith('.') && cur.classList && cur.classList.contains(sel.slice(1))) return cur;
      if (sel.startsWith('#') && cur.id === sel.slice(1)) return cur;
      if (/^[a-z]+$/i.test(sel) && cur.tagName.toLowerCase() === sel.toLowerCase()) return cur;
      cur = cur.parentElement;
    }
    return null;
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
  focus() {
    sandbox.document.activeElement = this;
  }
  blur() {
    if (sandbox.document.activeElement === this) {
      sandbox.document.activeElement = sandbox.document.body;
    }
  }
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
  addEventListener: (evt, fn) => {
    mockWindow.addEventListener(evt, fn);
  }
};
mockDoc.activeElement = mockDoc.body;
['settingsModal', 'handoutModal', 'classroomModal'].forEach(id => {
  mockDoc.getElementById(id).classList.add('hidden');
});

const windowListeners = {};
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
  dispatchEvent: (event) => {
    const fns = windowListeners[event.type] || [];
    fns.forEach(fn => fn(event));
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  speechSynthesis: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => []
  }
};

const sandbox = {
  window: mockWindow,
  document: mockDoc,
  HTMLElement: MockElement,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: () => {},
  AudioContext: function() {
    return {
      createGain: () => ({ connect: () => {}, gain: { value: 1 } }),
      createBufferSource: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
      destination: {}
    };
  },
  console: {
    log: () => {},
    warn: () => {},
    error: () => {}
  }
};

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);

console.log('\n[Check 1] Verify PracticeView Weak Form Blanks & F2 Shortcut Toggle...');
const app = sandbox.window.__ceToolApp;
assert(app, 'app must be mounted on sandbox.window.__ceToolApp');
const appState = app.appState;
assert(appState, 'appState must exist');
const practiceView = app.practiceView;
assert(practiceView, 'practiceView must exist');

// Seed two sentences
const s1 = {
  index: 0,
  text: "Welcome to our beach.",
  audioStart: 0,
  audioEnd: 2.0,
  result: {
    chunks: [
      { en: "Welcome to", ko: "환영합니다" },
      { en: "our beach", ko: "우리의 해변에" }
    ],
    natural: "우리 해변에 오신 것을 환영합니다."
  }
};

const s2 = {
  index: 1,
  text: "He will go for a walk.",
  audioStart: 2.0,
  audioEnd: 4.5,
  result: {
    chunks: [
      { en: "He will go", ko: "그는 갈 것이다" },
      { en: "for a walk", ko: "산책을" }
    ],
    natural: "그는 산책을 갈 것이다."
  }
};

appState.setSentenceList([s1, s2]);
appState.isFelsMode = true;

// Load sentence 0
practiceView.loadSentence(0);
const blanksS1 = practiceView.chunksContainer.querySelectorAll('.fels-blank-input');
assert.strictEqual(blanksS1.length, 2, 'Sentence 1 should have 2 weak form blanks ("to", "our")');

// Press F5 to enter text input mode
practiceView.toggleTextInputMode();
assert.strictEqual(sandbox.document.activeElement, blanksS1[0], 'F5 toggle should focus the first blank input');

// Test Space inside focused input: triggers play/pause and keeps focus
let playPauseCalled = false;
let prevSentenceCalled = false;
let nextSentenceCalled = false;

app.shortcutManager.setHandlers({
  onPlayPause: () => { playPauseCalled = true; },
  onPrevSentence: () => { prevSentenceCalled = true; },
  onNextSentence: () => { nextSentenceCalled = true; }
});

app.shortcutManager.handleKeyDown({
  key: ' ',
  target: blanksS1[0],
  preventDefault: () => {}
});
assert.strictEqual(playPauseCalled, true, 'Space while typing must trigger onPlayPause');
assert.strictEqual(sandbox.document.activeElement, blanksS1[0], 'Space while typing must NOT lose focus');

// Test F6 inside focused input: triggers prevSentence
app.shortcutManager.handleKeyDown({
  key: 'F6',
  target: blanksS1[0],
  preventDefault: () => {}
});
assert.strictEqual(prevSentenceCalled, true, 'F6 while typing must trigger onPrevSentence');

// Test F7 inside focused input: triggers nextSentence
app.shortcutManager.handleKeyDown({
  key: 'F7',
  target: blanksS1[0],
  preventDefault: () => {}
});
assert.strictEqual(nextSentenceCalled, true, 'F7 while typing must trigger onNextSentence');

// Press F5 again while focused -> should exit text input mode and blur
practiceView.toggleTextInputMode();
assert.notStrictEqual(sandbox.document.activeElement, blanksS1[0], 'F5 toggle when focused should blur the blank input');
console.log('✓ Space, F5, F6, F7 shortcuts work seamlessly inside and outside text input without losing focus');

console.log('\n[Check 2] Verify Simplified Answer Checking (No Banner, No Answer Underneath)...');
// Type wrong answer "in"
blanksS1[0].value = 'in';
// Trigger input event
if (blanksS1[0].listeners['input']) {
  blanksS1[0].listeners['input'].forEach(fn => fn({ target: blanksS1[0] }));
}

assert.strictEqual(s1.userAnswers[0], 'in', 'Typing into input should synchronously update s1.userAnswers');

// Test Enter key on input triggers answer check directly (not moving to next blank)
if (blanksS1[0].listeners['keydown']) {
  blanksS1[0].listeners['keydown'].forEach(fn => fn({ key: 'Enter', preventDefault: () => {} }));
}

// Evaluation check
assert(blanksS1[0].classList.contains('is-wrong'), 'Pressing Enter inside blank must trigger answer check directly');
assert(!blanksS1[0].classList.contains('is-correct'), 'Wrong input must not have is-correct class');

// Banner must be hidden
assert(practiceView.felsScoreBar.classList.contains('hidden'), 'Score bar banner must be hidden');

// No answer badge underneath
const reveals = practiceView.chunksContainer.querySelectorAll('.fels-answer-reveal');
assert.strictEqual(reveals.length, 0, 'No answer reveal badge should be displayed for wrong answer');
console.log('✓ Answer checking only shows correct/wrong styles; score bar and answer reveal badge are completely hidden');

console.log('\n[Check 3] Verify Sentence Switching Retention & Project Serialization...');
// Move to sentence 1
practiceView.loadSentence(1);
const blanksS2 = practiceView.chunksContainer.querySelectorAll('.fels-blank-input');
assert(blanksS2.length > 0, 'Sentence 2 blanks should be rendered');

// Fill blank in sentence 2
blanksS2[0].value = 'for';
if (blanksS2[0].listeners['input']) {
  blanksS2[0].listeners['input'].forEach(fn => fn({ target: blanksS2[0] }));
}

// Return to sentence 0
practiceView.loadSentence(0);
const blanksS1Returned = practiceView.chunksContainer.querySelectorAll('.fels-blank-input');
assert.strictEqual(blanksS1Returned.length, 2, 'Sentence 0 should reload with 2 blanks');
assert.strictEqual(blanksS1Returned[0].value, 'in', 'Sentence 0 blank must retain previously typed answer "in"');
assert(blanksS1Returned[0].classList.contains('is-wrong'), 'Sentence 0 blank must retain is-wrong evaluation state');

// Project serialization
const projectService = app.projectService;
projectService.serializeProject().then(jsonStr => {
  const parsed = JSON.parse(jsonStr);
  assert(parsed.sentenceList, 'Project JSON must contain sentenceList');
  assert.strictEqual(parsed.sentenceList[0].userAnswers[0], 'in', 'Saved project S1 must retain userAnswers');
  assert.strictEqual(parsed.sentenceList[0].userChecked, true, 'Saved project S1 must retain userChecked');
  assert.strictEqual(parsed.sentenceList[1].userAnswers[0], 'for', 'Saved project S2 must retain userAnswers');
  console.log('✓ User answers and checked state persist across sentence navigation and are saved into .ceproject JSON');
  console.log('\n🎉 ALL FELS INPUT PERSISTENCE & SHORTCUT TESTS PASSED!');
}).catch(err => {
  console.error('Serialization test error:', err);
  process.exit(1);
});
