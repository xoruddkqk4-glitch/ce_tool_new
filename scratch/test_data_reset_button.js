/**
 * Test Page 1 "데이터 새로고침" (Reset All Data) Button:
 * Verifies that clicking btnResetAllData clears all script, audio, parsed sentences,
 * project metadata, and DOM views back to clean initial state.
 */

const assert = require('assert');

// Mock DOM
class MockElement {
  constructor(id = '', className = '') {
    this.id = id;
    this.className = className;
    this.classList = {
      classes: new Set(className.split(' ').filter(Boolean)),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) this.classList.classes.add(c);
          else this.classList.classes.delete(c);
          return force;
        }
        if (this.classList.classes.has(c)) {
          this.classList.classes.delete(c);
          return false;
        } else {
          this.classList.classes.add(c);
          return true;
        }
      }
    };
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.listeners = {};
    this.style = {};
    this.attributes = {};
  }
  getAttribute(name) { return this.attributes[name] || ''; }
  setAttribute(name, val) { this.attributes[name] = val; }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn({ preventDefault: () => {}, stopPropagation: () => {} }));
    }
  }
  focus() {}
  querySelector(sel) { return new MockElement(); }
  querySelectorAll(sel) { return []; }
}

const elements = {};
function getEl(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

global.document = {
  getElementById: (id) => getEl(id),
  querySelectorAll: (sel) => {
    if (sel === '.mode-tab') return [new MockElement('tab1', 'mode-tab'), new MockElement('tab2', 'mode-tab')];
    if (sel === '.preset-chip') return [];
    return [];
  },
  createElement: (tag) => new MockElement('', tag),
  addEventListener: () => {}
};

let confirmReturnVal = true;
global.confirm = () => confirmReturnVal;

global.window = {
  addEventListener: () => {},
  scrollTo: () => {}
};

async function run() {
  const { appState } = await import('../src/core/app-state.js');
  const { projectService } = await import('../src/services/project-service.js');
  const { InputView } = await import('../src/views/input-view.js');

  const inputView = new InputView();

  console.log('1. Checking btnResetAllData binding...');
  const btnReset = getEl('btnResetAllData');
  assert.ok(btnReset.listeners['click'] && btnReset.listeners['click'].length > 0, 'btnResetAllData must have click listener');

  console.log('2. Populating mock data...');
  inputView.inputEnglish.value = 'Sample English sentence for testing.';
  inputView.charCount.textContent = '37자';
  appState.scriptText = 'Sample English sentence for testing.';
  appState.setSentenceList([
    { index: 0, text: 'Sample English sentence for testing.', audioStart: 0, audioEnd: 3.5 }
  ]);
  appState.uploadedAudioFile = { name: 'test.mp3', size: 1024, type: 'audio/mp3' };
  projectService.currentProjectName = 'my_lesson.ceproject';
  projectService.markDirty();

  assert.strictEqual(inputView.inputEnglish.value, 'Sample English sentence for testing.');
  assert.strictEqual(appState.sentenceList.length, 1);
  assert.strictEqual(projectService.isDirty, true);

  console.log('3. Testing cancellation when user declines confirm...');
  confirmReturnVal = false;
  btnReset.click();
  // Should NOT reset
  assert.strictEqual(inputView.inputEnglish.value, 'Sample English sentence for testing.', 'Data must remain when canceled');
  assert.strictEqual(appState.sentenceList.length, 1, 'SentenceList must remain when canceled');

  console.log('4. Testing data reset when confirmed...');
  confirmReturnVal = true;
  btnReset.click();

  // Everything must be cleared!
  assert.strictEqual(inputView.inputEnglish.value, '', 'inputEnglish must be empty');
  assert.strictEqual(inputView.charCount.textContent, '0자', 'charCount must be 0자');
  assert.strictEqual(appState.scriptText, '', 'appState.scriptText must be empty');
  assert.strictEqual(appState.sentenceList.length, 0, 'appState.sentenceList must be empty');
  assert.strictEqual(appState.uploadedAudioFile, null, 'uploadedAudioFile must be null');
  assert.strictEqual(projectService.currentProjectName, '새 프로젝트', 'projectService name must be reset');
  assert.strictEqual(projectService.isDirty, false, 'projectService must be marked clean');
  assert.ok(inputView.parsedResultsSection.classList.contains('hidden'), 'parsedResultsSection must be hidden');

  console.log('✅ btnResetAllData successfully tested: all data cleared to initial state!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
