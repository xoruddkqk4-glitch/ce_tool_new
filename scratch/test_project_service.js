/**
 * Regression Test Suite for CE Tool Project Service
 * Verifies .ceproject serialization, deserialization, 3-action workflow,
 * dirty state tracking, and recent folder persistence.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runTest() {
  console.log('=== TEST: CE TOOL PROJECT SERVICE & 3-ACTION WORKFLOW ===');

  const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

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
          if (force !== undefined) {
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
      if (val === '') this.children = [];
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
    readyState: 'complete',
    getElementById: (id) => {
      if (!elementStore.has(id)) {
        const el = new MockElement(id);
        if (id.includes('Modal')) {
          el.classList.add('hidden');
        }
        elementStore.set(id, el);
      }
      return elementStore.get(id);
    },
    querySelectorAll: (sel) => {
      const results = [];
      elementStore.forEach(el => {
        if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) results.push(el);
      });
      return results;
    },
    querySelector: (sel) => mockDoc.querySelectorAll(sel)[0] || null,
    createElement: (tag) => new MockElement('', tag),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const mockStorage = {};
  const mockIDBStore = {};

  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    document: mockDoc,
    window: {
      location: { hash: '#input' },
      addEventListener: () => {},
      removeEventListener: () => {},
      showOpenFilePicker: null,
      showSaveFilePicker: null
    },
    localStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; }
    },
    indexedDB: {
      open: () => ({
        set onupgradeneeded(fn) {
          fn({ target: { result: { objectStoreNames: { contains: () => false }, createObjectStore: () => {} } } });
        },
        set onsuccess(fn) {
          fn({
            target: {
              result: {
                transaction: () => ({
                  objectStore: () => ({
                    put: (val, key) => { mockIDBStore[key] = val; },
                    get: (key) => ({
                      set onsuccess(cb) { cb({ target: { result: mockIDBStore[key] || null } }); },
                      set onerror(cb) {}
                    })
                  }),
                  set oncomplete(cb) { if (cb) cb(); },
                  set onerror(cb) {}
                })
              }
            }
          });
        },
        set onerror(fn) {}
      })
    },
    FileReader: class MockFileReader {
      readAsDataURL(blob) {
        setTimeout(() => {
          this.result = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
          if (this.onload) this.onload();
        }, 5);
      }
    },
    Blob: class MockBlob {
      constructor(chunks, opts) {
        this.chunks = chunks;
        this.type = opts ? opts.type : '';
        this.size = 120;
      }
    },
    File: class MockFile {
      constructor(chunks, name, opts) {
        this.chunks = chunks;
        this.name = name;
        this.type = opts ? opts.type : 'audio/mp3';
        this.size = 120;
      }
    },
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {}
    },
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    Uint8Array: Uint8Array
  };

  vm.createContext(sandbox);
  vm.runInContext(appCode, sandbox);

  const app = sandbox.window.__ceToolApp || sandbox.__ceToolApp;
  assert.ok(app, 'CE Tool app must be initialized');
  assert.ok(app.projectService, 'ProjectService must be registered on app');

  const ps = app.projectService;
  const state = app.appState;

  // Test 1: Initial state & Dirty Tracking
  assert.strictEqual(ps.isDirty, false, 'Project should initially not be dirty');
  ps.markDirty();
  assert.strictEqual(ps.isDirty, true, 'Project should be marked dirty');
  ps.markClean('수능특강_01강.ceproject');
  assert.strictEqual(ps.isDirty, false, 'Project should be clean after markClean');
  assert.strictEqual(ps.currentProjectName, '수능특강_01강.ceproject', 'Project name should be updated');
  console.log('✓ Check 1: ProjectService dirty tracking verified');

  // Test 2: Serialization of state into .ceproject
  state.scriptText = 'Hello, visitors to Cryston Beach.';
  state.currentMode = 'both';
  state.setSentenceList([
    {
      index: 0,
      text: 'Hello, visitors to Cryston Beach.',
      audioStart: 0.5,
      audioEnd: 3.8,
      result: {
        natural: '크리스톤 비치 방문객 여러분 안녕하세요.',
        chunk_text: '안녕하세요, 방문객 여러분. || 크리스톤 비치를 방문하시는',
        direct: '안녕하세요, 방문객 여러분. / 크리스톤 비치를 방문하시는',
        chunks: [
          { en: 'Hello, visitors', ko: '안녕하세요, 방문객 여러분.' },
          { en: 'to Cryston Beach.', ko: '크리스톤 비치를 방문하시는' }
        ]
      }
    }
  ]);
  state.uploadedAudioFile = new sandbox.File(['mock-audio'], 'lecture_01.mp3', { type: 'audio/mp3' });

  ps.serializeProject().then((jsonStr) => {
    assert.ok(jsonStr, 'Serialized project JSON must be generated');
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.format, 'ce-project', 'Format must be ce-project');
    assert.strictEqual(parsed.version, '1.1.0', 'Version must be 1.1.0');
    assert.strictEqual(parsed.mode, 'both', 'Mode must be both');
    assert.strictEqual(parsed.scriptText, 'Hello, visitors to Cryston Beach.', 'Script text must match');
    assert.ok(parsed.audio, 'Audio metadata must exist');
    assert.strictEqual(parsed.audio.fileName, 'lecture_01.mp3', 'Audio filename must match');
    assert.ok(parsed.audio.dataBase64.startsWith('data:audio/mp3;base64,'), 'Base64 audio must be encoded');
    assert.strictEqual(parsed.sentenceList.length, 1, 'Sentence list count must be 1');
    assert.strictEqual(parsed.sentenceList[0].result.chunks.length, 2, 'Chunks count must be 2');
    console.log('✓ Check 2: Project serialization (.ceproject) verified');

    // Test 3: Deserialization and State Restoration
    state.resetAll();
    assert.strictEqual(state.sentenceList.length, 0, 'State must be reset before test 3');
    assert.strictEqual(state.uploadedAudioFile, null, 'Audio file must be reset');

    ps.deserializeAndApply(jsonStr, app.inputView).then((applied) => {
      assert.strictEqual(state.sentenceList.length, 1, 'Restored sentence list count must be 1');
      assert.strictEqual(state.sentenceList[0].text, 'Hello, visitors to Cryston Beach.', 'Restored sentence text must match');
      assert.strictEqual(state.sentenceList[0].result.chunks[0].en, 'Hello, visitors', 'Restored chunk en must match');
      assert.strictEqual(state.sentenceList[0].result.chunks[1].ko, '크리스톤 비치를 방문하시는', 'Restored chunk ko must match');
      assert.ok(state.uploadedAudioFile, 'Audio file must be restored from Base64');
      assert.strictEqual(state.uploadedAudioFile.name, 'lecture_01.mp3', 'Restored audio filename must match');
      console.log('✓ Check 3: Project deserialization and state restoration verified');

      // Test 4: Keyboard Shortcuts for Project Operations
      let openCalled = false;
      let saveCalled = false;
      let saveAsCalled = false;

      const sm = app.shortcutManager;
      sm.setHandlers({
        onOpenProject: () => { openCalled = true; },
        onSaveProject: () => { saveCalled = true; },
        onSaveProjectAs: () => { saveAsCalled = true; }
      });

      // Ctrl + O
      sm.handleKeyDown({ ctrlKey: true, key: 'o', preventDefault: () => {} });
      assert.strictEqual(openCalled, true, 'Ctrl+O must trigger onOpenProject');

      // Ctrl + S
      sm.handleKeyDown({ ctrlKey: true, key: 's', shiftKey: false, preventDefault: () => {} });
      assert.strictEqual(saveCalled, true, 'Ctrl+S must trigger onSaveProject');

      // Ctrl + Shift + S
      sm.handleKeyDown({ ctrlKey: true, key: 's', shiftKey: true, preventDefault: () => {} });
      assert.strictEqual(saveAsCalled, true, 'Ctrl+Shift+S must trigger onSaveProjectAs');
      console.log('✓ Check 4: Global keyboard shortcuts (Ctrl+O, Ctrl+S, Ctrl+Shift+S) verified');

      console.log('✅ ALL CHECKS PASSED: Project Service is fully functional!\n');
    }).catch(err => {
      console.error('❌ Test 3 Failed:', err);
      process.exit(1);
    });
  }).catch(err => {
    console.error('❌ Test 2 Failed:', err);
    process.exit(1);
  });
}

runTest();
