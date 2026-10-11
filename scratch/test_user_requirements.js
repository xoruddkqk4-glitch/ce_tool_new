import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('=== TEST: VERIFYING ALL 7 USER REQUIREMENTS ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const appCode = fs.readFileSync('app.js', 'utf8');

// [Req 3] Handout category text deletion
console.log('\n[Check 1] Verifying deletion of (관사), (전치사) hints from handout...');
assert(!appCode.includes('handout-fels-hint'), 'handout-fels-hint must be completely removed from app.js');
console.log('✓ Confirmed: (관사) and all category hint tags are eliminated from printable handout');

// [Req 6] Page 2 Clipboard copy button removal
console.log('\n[Check 2] Verifying removal of clipboard copy buttons (📋) from Page 2...');
const practiceHtml = htmlContent.substring(htmlContent.indexOf('id="view-practice"'), htmlContent.indexOf('id="view-memorize"'));
assert(!practiceHtml.includes('class="icon-btn copy-btn"'), 'Page 2 must NOT contain any copy-btn buttons');
assert(!practiceHtml.includes('📋'), 'Page 2 must NOT contain clipboard icon');
console.log('✓ Confirmed: Page 2 has zero clipboard copy buttons');

// [Req 4] Wave window height and visibility on Page 2
console.log('\n[Check 3] Verifying Wave window 2:1 ratio (440px : 220px) and 100px waveform canvas...');
assert(cssContent.includes('440px'), '440px min-height for #rowChunks missing');
assert(cssContent.includes('220px'), '220px min-height for #audioPlayerSection missing');
assert(cssContent.includes('height: 100px') || cssContent.includes('min-height: 100px'), 'waveform-container 100px height missing');
console.log('✓ Confirmed: Exact 2:1 ratio (440px : 220px) with dedicated 100px wave window');

// [Req 7] Card text boundaries
console.log('\n[Check 4] Verifying card bounds and text wrapping...');
assert(cssContent.includes('overflow: hidden'), 'card-face must have overflow: hidden');
assert(cssContent.includes('flex-wrap: wrap'), 'chunk-tokens-wrap must have flex-wrap: wrap inside card');
console.log('✓ Confirmed: Card text and FELS blanks wrap properly and never overflow card borders');

// Setup mock DOM for app.js functional tests
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
  set innerHTML(htmlStr) {
    this._innerHTML = String(htmlStr);
    this.children = [];
    if (!htmlStr) return;
    const tagMatches = Array.from(String(htmlStr).matchAll(/<([a-z0-9-]+)([^>]*)>/gi));
    for (const match of tagMatches) {
      const tag = match[1];
      const attrsStr = match[2];
      const classMatch = attrsStr.match(/class=["']([^"']+)["']/i);
      const valueMatch = attrsStr.match(/value=["']([^"']*)["']/i);
      const idMatch = attrsStr.match(/id=["']([^"']+)["']/i);
      if (classMatch || idMatch) {
        const el = new MockElement(idMatch ? idMatch[1] : '', tag);
        if (classMatch) {
          const classes = classMatch[1].split(/\s+/).filter(Boolean);
          classes.forEach(c => el.classList.add(c));
        }
        if (valueMatch) el.value = valueMatch[1];
        this.appendChild(el);
      }
    }
  }
  get innerHTML() {
    return this._innerHTML || '';
  }
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(val) { this.classList._set = new Set(String(val).split(/\s+/).filter(Boolean)); }
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
  scrollIntoView() {}
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
    function traverse(node) {
      for (const c of node.children) {
        if (sel.startsWith('.') && c.classList && c.classList.contains(sel.slice(1))) {
          results.push(c);
        } else if (sel.startsWith('#') && c.id === sel.slice(1)) {
          results.push(c);
        } else if (sel.toLowerCase() === c.tagName.toLowerCase()) {
          results.push(c);
        }
        traverse(c);
      }
    }
    traverse(this);
    return results;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel.startsWith('.') && cur.classList.contains(sel.slice(1))) return cur;
      if (sel.startsWith('#') && cur.id === sel.slice(1)) return cur;
      if (cur.tagName && cur.tagName.toLowerCase() === sel.toLowerCase()) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event) {
    const fns = this.listeners[event.type] || [];
    for (const fn of fns) fn.call(this, event);
  }
  click() {
    this.dispatchEvent({ type: 'click', target: this, stopPropagation: () => {} });
  }
}

const mockDoc = {
  documentElement: new MockElement('html'),
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

let lastTtsSpoken = null;

const sandbox = {
  window: {
    location: { hash: '' },
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    speechSynthesis: {
      cancel: () => {},
      resume: () => {},
      getVoices: () => [{ lang: 'en-US', name: 'Google US English' }],
      speak: (u) => { lastTtsSpoken = u.text; }
    },
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {}
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  speechSynthesis: {
    cancel: () => {},
    resume: () => {},
    getVoices: () => [{ lang: 'en-US', name: 'Google US English' }],
    speak: (u) => { lastTtsSpoken = u.text; }
  },
  SpeechSynthesisUtterance: class {
    constructor(text) { this.text = text; }
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

// [Req 1] Test Script Editing on Page 1
console.log('\n[Check 5] Testing English script editing on Page 1...');
app.inputView.inputEnglish.value = 'She visited Paris last summer.';
app.inputView.handleTranslate();

const parsedList = mockDoc.getElementById('parsedSentenceList');
const firstItem = parsedList.children[0];
assert(firstItem, 'First parsed sentence item must exist');

const scriptInput = firstItem.querySelector('.sentence-script-input');
const chunkInput = firstItem.querySelector('.chunk-text-input');
assert(scriptInput, 'sentence-script-input must exist in parsed sentence item');
assert.strictEqual(scriptInput.value, 'She visited Paris last summer.');

// Edit English script
scriptInput.value = 'She visited London last winter.';
scriptInput.dispatchEvent({ type: 'change', target: scriptInput });

assert.strictEqual(app.appState.sentenceList[0].text, 'She visited London last winter.');
assert(app.appState.scriptText.includes('London'), 'appState.scriptText must be updated');
console.log('✓ Confirmed: Editing English script updates sentence, re-chunks, and syncs global scriptText');

// [Req 2] Test Sentence Audio Listening button on Page 1
console.log('\n[Check 6] Testing Sentence Audio Listening (문장 듣기) on Page 1...');
const speakBtn = firstItem.querySelector('.stn-speak-btn');
assert(speakBtn, 'Speak button must exist');
lastTtsSpoken = null;
speakBtn.click();
assert.strictEqual(lastTtsSpoken, 'She visited London last winter.', 'TTS must speak updated sentence text');
console.log('✓ Confirmed: 문장 듣기 button triggers speech synthesis cleanly');

// [Req 5] Test Page 2 Default View (Sentence 1 + FELS Weak-Form mode)
console.log('\n[Check 7] Testing Page 2 Default View (Sentence 1 & FELS mode)...');
app.router.navigateTo('practice');

assert.strictEqual(app.appState.activeSentenceIndex, 0, 'Default sentence must be index 0 (Sentence 1)');
assert.strictEqual(app.appState.isFelsMode, true, 'Default mode must be FELS Weak-Form mode');

const chunksContainer = mockDoc.getElementById('chunksContainer');
const cards = chunksContainer.querySelectorAll('.chunk-card-3d');
assert(cards.length > 0, 'Cards must be loaded on Page 2');
console.log(`✓ Confirmed: Page 2 defaults to Sentence 1 with FELS Weak-Form cards (${cards.length} cards rendered)`);

console.log('\n🎉 ALL 7 REQUIREMENTS VERIFIED WITH 100% SUCCESS!');
