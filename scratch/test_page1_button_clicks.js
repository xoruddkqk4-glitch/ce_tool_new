/**
 * Browser DOM Simulation Test for Page 1 Button Responsiveness
 */

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appCode = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// Mock DOM Environment
class MockElement {
  constructor(id, tagName = 'DIV') {
    this.id = id || '';
    this.tagName = tagName.toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c, force) {
        if (typeof force === 'boolean') {
          if (force) this._classes.add(c);
          else this._classes.delete(c);
        } else {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        }
      }
    };
    this.listeners = {};
    this.children = [];
    this.parentNode = null;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.getContext = () => ({
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      roundRect: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      fillText: () => {},
      measureText: () => ({ width: 50 }),
      createLinearGradient: () => ({ addColorStop: () => {} })
    });
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  }

  dispatchEvent(event) {
    const type = event.type || event;
    const fns = this.listeners[type] || [];
    fns.forEach(fn => fn(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    function scan(el) {
      if (matches(el, sel)) results.push(el);
      for (const c of el.children) scan(c);
    }
    for (const c of this.children) scan(c);
    return results;
  }

  focus() {}
  scrollIntoView() {}
}

function matches(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.includes('[data-mode="')) {
    const mode = sel.match(/\[data-mode="([^"]+)"\]/)[1];
    return el.getAttribute('data-mode') === mode;
  }
  if (sel.includes('[data-page="')) {
    const page = sel.match(/\[data-page="([^"]+)"\]/)[1];
    return el.getAttribute('data-page') === page;
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

const elementsById = new Map();
function getEl(id, tag = 'DIV') {
  if (!elementsById.has(id)) {
    elementsById.set(id, new MockElement(id, tag));
  }
  return elementsById.get(id);
}

// Extract IDs from index.html
const idMatches = htmlContent.matchAll(/id="([^"]+)"/g);
for (const m of idMatches) {
  getEl(m[1]);
}

// Create mode tabs
const modeTabs = [
  new MockElement('modeTab1', 'BUTTON'),
  new MockElement('modeTab2', 'BUTTON'),
  new MockElement('modeTab3', 'BUTTON')
];
modeTabs[0].classList.add('mode-tab'); modeTabs[0].setAttribute('data-mode', 'both');
modeTabs[1].classList.add('mode-tab'); modeTabs[1].setAttribute('data-mode', 'audio');
modeTabs[2].classList.add('mode-tab'); modeTabs[2].setAttribute('data-mode', 'text');
modeTabs[2].classList.add('active');

// Create preset chips
const presetChips = [
  new MockElement('chip1', 'BUTTON'),
  new MockElement('chip2', 'BUTTON')
];
presetChips[0].classList.add('preset-chip');
presetChips[0].setAttribute('data-text', 'Hello, visitors to Cryston Beach.');
presetChips[1].classList.add('preset-chip');
presetChips[1].setAttribute('data-text', 'We hope you have a wonderful time.');

// Document mock
const mockDocument = {
  readyState: 'complete',
  documentElement: new MockElement('html', 'HTML'),
  getElementById: (id) => getEl(id),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getEl(sel.slice(1));
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '.mode-tab') return modeTabs;
    if (sel === '.preset-chip') return presetChips;
    if (sel === '.nav-tab-btn') return [getEl('navTabInput'), getEl('navTabPractice')];
    if (sel === '.speed-btn') return [];
    if (sel === '.memorize-mode-chip') return [];
    return [];
  },
  createElement: (tag) => new MockElement('', tag),
  addEventListener: () => {}
};

// Window mock
const mockWindow = {
  document: mockDocument,
  location: { hash: '#input' },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  fetch: global.fetch || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  AudioContext: class {
    createBuffer(channels, length, sampleRate) {
      return {
        numberOfChannels: channels || 1,
        length: length || 44100,
        sampleRate: sampleRate || 44100,
        duration: (length || 44100) / (sampleRate || 44100),
        getChannelData: () => new Float32Array(length || 44100)
      };
    }
  },
  webkitAudioContext: class {
    createBuffer(channels, length, sampleRate) {
      return {
        numberOfChannels: channels || 1,
        length: length || 44100,
        sampleRate: sampleRate || 44100,
        duration: (length || 44100) / (sampleRate || 44100),
        getChannelData: () => new Float32Array(length || 44100)
      };
    }
  }
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockWindow.localStorage,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  cancelAnimationFrame: mockWindow.cancelAnimationFrame,
  URL: {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
  },
  Blob: global.Blob || class Blob { constructor() {} },
  File: global.File || class File { constructor() { this.name = 'mock.mp3'; } },
  console: console,
  fetch: global.fetch || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  Float32Array: Float32Array,
  Uint8Array: Uint8Array,
  ArrayBuffer: ArrayBuffer,
  Math: Math,
  Set: Set,
  Map: Map,
  RegExp: RegExp,
  Date: Date,
  JSON: JSON,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent
};

vm.createContext(sandbox);

console.log('🧪 Executing app.js inside simulated browser context...');
try {
  vm.runInContext(appCode, sandbox);
  console.log('✅ app.js executed without any SyntaxError or RuntimeError!');
} catch (err) {
  console.error('❌ app.js execution failed:', err);
  process.exit(1);
}

// Verify app instance created
const app = sandbox.window.__ceToolApp;
assert.ok(app, 'app instance window.__ceToolApp must exist');
console.log('✅ App initialized successfully: window.__ceToolApp is active.');

// -----------------------------------------------------------------------------
// Test Button 1: Mode Tabs
// -----------------------------------------------------------------------------
console.log('\n▶ Testing Mode Tab Click:');
modeTabs[0].click(); // click 'both' mode
console.log('Current upload mode:', app.appState.currentMode);
assert.strictEqual(app.appState.currentMode, 'both', 'Mode should change to both');
console.log('✅ Mode tab button responds properly.');

// -----------------------------------------------------------------------------
// Test Button 2: Preset Chip Click
// -----------------------------------------------------------------------------
console.log('\n▶ Testing Preset Chip Click:');
presetChips[0].click();
const inputEnglish = getEl('inputEnglish');
console.log('inputEnglish text:', inputEnglish.value);
assert.strictEqual(inputEnglish.value, 'Hello, visitors to Cryston Beach.');
console.log('✅ Preset chip responds and populates textarea.');

// -----------------------------------------------------------------------------
// Test Button 3: Clear Button Click
// -----------------------------------------------------------------------------
console.log('\n▶ Testing Clear Button Click:');
const btnClear = getEl('btnClear');
assert.ok(btnClear.listeners['click'] && btnClear.listeners['click'].length > 0, 'btnClear must have click listener');
btnClear.click();
assert.strictEqual(inputEnglish.value, '', 'inputEnglish should be empty after clear');
console.log('✅ Clear button responds and clears textarea.');

// -----------------------------------------------------------------------------
// Test Button 4: Translate Button Click (handleTranslate)
// -----------------------------------------------------------------------------
console.log('\n▶ Testing Translate Button Click:');
inputEnglish.value = 'Hello, visitors to Cryston Beach.';
const btnTranslate = getEl('btnTranslate');
assert.ok(btnTranslate.listeners['click'] && btnTranslate.listeners['click'].length > 0, 'btnTranslate must have click listener');

(async () => {
  btnTranslate.click();
  // Wait a tick for async processing
  await new Promise(r => setTimeout(r, 500));

  const sentences = app.appState.sentenceList;
  console.log('Generated sentences count:', sentences ? sentences.length : 0);
  assert.ok(sentences && sentences.length >= 1, 'Sentence list must be generated');
  console.log('First sentence text:', sentences[0].text);
  console.log('First sentence natural:', sentences[0].result?.natural);
  console.log('First sentence chunks:', sentences[0].result?.chunks?.map(c => c.en));

  // -----------------------------------------------------------------------------
  // Test Button 5: Auto Sync Button Click
  // -----------------------------------------------------------------------------
  console.log('\n▶ Testing Auto Sync Button Click:');
  const btnAutoSync = getEl('btnAutoSyncAudio');
  assert.ok(btnAutoSync.listeners['click'] && btnAutoSync.listeners['click'].length > 0, 'btnAutoSyncAudio must have click listener');
  btnAutoSync.click();
  console.log('✅ Auto Sync button click listener invoked without error.');

  console.log('\n🎉 ALL PAGE 1 BUTTONS TESTED AND FULLY RESPONSIVE!');
})();
