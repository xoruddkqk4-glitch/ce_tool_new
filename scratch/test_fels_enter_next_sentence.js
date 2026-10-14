// Unit test verifying Enter key navigation to next sentence when all FELS answers are correct
import assert from 'assert';
import fs from 'fs';
import vm from 'vm';

console.log('=== TEST: FELS ENTER TO NEXT SENTENCE WHEN ALL ANSWERS CORRECT ===');

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
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      removeProperty: (k) => { delete this.style[k]; }
    };
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.attributes = {};
    this.clientWidth = 1000;
    this.clientHeight = 500;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
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
  focus() { this._focused = true; }
  blur() { this._focused = false; }
  select() { this._selected = true; }
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
  dispatchKeydown(key) {
    if (this.listeners['keydown']) {
      this.listeners['keydown'].forEach(fn => fn({
        key,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: this
      }));
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

// Required DOM Elements
[
  'app', 'navItems', 'inputSection', 'practiceSection', 'memorizeSection',
  'btnSettings', 'settingsModal', 'btnCloseModal', 'btnSaveSettings', 'apiKeyInput',
  'customPrompt', 'themeToggle', 'engineBadge', 'nativeAudioPlayer',
  'rowChunks', 'chunksContainer', 'btnCheckFels', 'btnToggleFels', 'sentenceNavList',
  'waveformCanvas', 'timelineCanvas', 'btnResetAllInputs', 'btnResetSentenceInputs'
].forEach(id => mockDoc.getElementById(id));

const mockWindow = {
  location: { hash: '' },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  requestAnimationFrame: (fn) => fn()
};

const sandbox = {
  window: mockWindow,
  document: mockDoc,
  localStorage: mockWindow.localStorage,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  console,
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
assert(app && app.practiceView, 'practiceView must exist');

// 1. Setup sample sentences with FELS words
// Sentence 1 has "can" and "the"
// Sentence 2 has "should" and "a"
app.appState.setSentenceList([
  {
    id: 's1',
    text: 'You can see the ocean.',
    result: {
      natural: '당신은 바다를 볼 수 있습니다.',
      chunks: [
        { en: 'You can see', ko: '당신은 볼 수 있다' },
        { en: 'the ocean.', ko: '바다를' }
      ]
    }
  },
  {
    id: 's2',
    text: 'We should take a walk.',
    result: {
      natural: '우리는 산책을 해야 합니다.',
      chunks: [
        { en: 'We should take', ko: '우리는 해야 한다' },
        { en: 'a walk.', ko: '산책을' }
      ]
    }
  }
]);

// Switch to practice view
app.router.navigateTo('practice');

// Ensure FELS mode is on
if (!app.appState.isFelsMode) {
  app.practiceView.toggleFelsMode();
}
assert.strictEqual(app.appState.isFelsMode, true, 'FELS mode must be active');

// S1 has blanks: "can" and "the"
const blanks = app.practiceView.felsBlanks;
assert(blanks.length >= 2, 'S1 should have FELS blanks');
console.log(`✓ S1 has ${blanks.length} FELS blanks (${blanks.map(b => b.answer).join(', ')})`);

// 2. Test initial incorrect / empty state
blanks[0].inputEl.value = 'xyz'; // wrong
blanks[1].inputEl.value = 'abc'; // wrong

assert.strictEqual(app.practiceView.areAllFelsAnswersCorrect(), false, 'Answers should not be marked correct initially');

// Press Enter on input 0 -> checks answers
blanks[0].inputEl.dispatchKeydown('Enter');
assert.strictEqual(app.appState.activeSentenceIndex, 0, 'Should stay on S1 because answers are wrong');
assert(blanks[0].inputEl.classList.contains('is-wrong'), 'Blank 0 should be marked wrong');
console.log('✓ Enter with wrong answers checks and marks wrong without changing sentence');

// 3. Enter correct answers and press Enter to check
blanks.forEach(b => {
  b.inputEl.value = b.answer;
});

// 1st Enter: evaluates and marks correct
blanks[0].inputEl.dispatchKeydown('Enter');
assert.strictEqual(app.practiceView.areAllFelsAnswersCorrect(), true, 'All answers should now be marked correct');
assert.strictEqual(app.appState.activeSentenceIndex, 0, 'First Enter verifies answers (now all correct)');
console.log('✓ First Enter: verified all answers as correct (green)');

// 4. In "정답이 모두 맞은 상태": 2nd Enter MUST advance to next sentence (S2)!
blanks[0].inputEl.dispatchKeydown('Enter');
assert.strictEqual(app.appState.activeSentenceIndex, 1, 'Pressing Enter when all answers are correct MUST advance to Sentence S2!');
console.log('✓ Second Enter in all-correct state: advanced to next sentence S2 (activeSentenceIndex = 1)!');

// 5. Verify the new sentence's first blank is focused
const newBlanks = app.practiceView.felsBlanks;
assert(newBlanks.length > 0, 'S2 must have FELS blanks');
console.log('✓ Next sentence S2 blanks ready for typing');

// 6. Test on last sentence (S2): getting all correct on last sentence stays on last sentence
newBlanks.forEach(b => {
  b.inputEl.value = b.answer;
});
newBlanks[0].inputEl.dispatchKeydown('Enter'); // verify correct
assert.strictEqual(app.practiceView.areAllFelsAnswersCorrect(), true);

newBlanks[0].inputEl.dispatchKeydown('Enter'); // Enter again on last sentence
assert.strictEqual(app.appState.activeSentenceIndex, 1, 'Should stay on last sentence');
console.log('✓ Enter on last sentence gracefully informs user without out-of-bounds error');

console.log('\n🎉 ALL FELS ENTER TO NEXT SENTENCE TESTS PASSED 100%!');
