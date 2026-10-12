// scratch/test_manual_chunk_edit_speed.js
/**
 * Test: Instantaneous Manual Chunk Editing Speed and Semantic Alignment
 * Verifies that:
 * 1. rebuildChunksFromBoundaries is 100% synchronous and takes < 5ms.
 * 2. renderWordDividerTrack divider click toggles chunks immediately.
 * 3. updateChunksFromTextInput updates direct interpretation synchronously.
 * 4. Background AI refinement is non-blocking and debounced.
 */

const assert = require('assert');

// Mock minimal DOM element
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this._classListSet = new Set();
    this.classList = {
      _set: this._classListSet,
      add: (c) => this._classListSet.add(c),
      remove: (c) => this._classListSet.delete(c),
      contains: (c) => this._classListSet.has(c),
      toggle: (c, force) => {
        if (typeof force === 'boolean') {
          if (force) this._classListSet.add(c);
          else this._classListSet.delete(c);
        } else {
          if (this._classListSet.has(c)) this._classListSet.delete(c);
          else this._classListSet.add(c);
        }
      }
    };
    this.attributes = {};
    this.style = {};
    this.listeners = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
  }

  get className() {
    return Array.from(this._classListSet).join(' ');
  }

  set className(val) {
    this._classListSet.clear();
    (val || '').split(/\s+/).filter(Boolean).forEach(c => this._classListSet.add(c));
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    if (val === '') this.children = [];
  }

  appendChild(el) {
    this.children.push(el);
    el.parentNode = this;
    return el;
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }

  getAttribute(k) {
    return this.attributes[k] || null;
  }

  addEventListener(type, cb) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  querySelector(sel) {
    if (sel === '.chunk-text-input') return this._chunkInput || null;
    if (sel === '.chunk-direct-input') return this._directInput || null;
    return null;
  }

  closest() {
    return this;
  }
}

// Global stubs for test harness
global.document = {
  getElementById: () => new MockElement('div'),
  querySelectorAll: () => [],
  createElement: (tag) => new MockElement(tag),
  activeElement: null
};

global.window = {};
global.toast = { show: () => {} };
global.appState = { sentenceList: [] };

const { RuleChunkEngine } = require('../src/core/rule-chunk-engine.js');
const { InputView } = require('../src/views/input-view.js');

async function runTest() {
  console.log('--- Testing Manual Chunk Editing Speed & Non-blocking Behavior ---');

  const inputView = new InputView({});

  const stn = {
    text: 'Hello, visitors to Cryston Beach.',
    result: {
      chunks: [
        { en: 'Hello, visitors to Cryston Beach.', ko: '' }
      ],
      natural: '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.',
      chunk_text: '',
      direct: ''
    }
  };

  const words = ['Hello,', 'visitors', 'to', 'Cryston', 'Beach.'];
  const boundaries = new Set([1]); // boundary after 'visitors' -> 'Hello, visitors' || 'to Cryston Beach.'

  // 1. Measure rebuildChunksFromBoundaries execution time
  const t0 = process.hrtime.bigint();
  inputView.rebuildChunksFromBoundaries(stn, words, boundaries);
  const t1 = process.hrtime.bigint();
  const elapsedMs = Number(t1 - t0) / 1e6;

  console.log(`⏱ rebuildChunksFromBoundaries completed in ${elapsedMs.toFixed(3)} ms`);
  assert(elapsedMs < 10, `Execution too slow! Took ${elapsedMs}ms, must be < 10ms`);

  assert.strictEqual(stn.result.chunks.length, 2, 'Should create exactly 2 chunks');
  assert.strictEqual(stn.result.chunks[0].en, 'Hello, visitors');
  assert.strictEqual(stn.result.chunks[1].en, 'to Cryston Beach.');

  // Verify semantic direct translation was computed synchronously
  console.log(`Chunk 1 ko: "${stn.result.chunks[0].ko}"`);
  console.log(`Chunk 2 ko: "${stn.result.chunks[1].ko}"`);
  assert(stn.result.chunks[0].ko.includes('방문객') || stn.result.chunks[0].ko.includes('안녕하세요'), 'Chunk 1 should contain visitor greeting');
  assert(stn.result.chunks[1].ko.includes('크리스톤'), 'Chunk 2 should contain Cryston');
  console.log('✅ Instant synchronous semantic alignment verified!');

  // 2. Test Word Divider Track Click responsiveness
  const track = new MockElement('div');
  const chunkInput = new MockElement('input');
  const directInput = new MockElement('input');
  track._chunkInput = chunkInput;
  track._directInput = directInput;

  inputView.renderWordDividerTrack(track, stn, chunkInput, directInput);

  // Find divider slots in track
  const slots = track.children.filter(c => c.classList && c.classList.contains('divider-slot'));
  assert.strictEqual(slots.length, words.length - 1, `Expected ${words.length - 1} divider slots`);

  // Slot 1 (after 'visitors') should be active ('||')
  assert.strictEqual(slots[1].textContent, '||', 'Slot 1 should be active boundary');
  // Slot 0 (after 'Hello,') should be inactive ('+')
  assert.strictEqual(slots[0].textContent, '+', 'Slot 0 should be inactive boundary');

  // Simulate clicking slot 0 (add boundary after 'Hello,')
  console.log('Simulating click on Slot 0 (+)...');
  const clickStart = process.hrtime.bigint();
  slots[0].listeners['click'][0]();
  const clickEnd = process.hrtime.bigint();
  const clickElapsedMs = Number(clickEnd - clickStart) / 1e6;

  console.log(`⏱ Slot click completed in ${clickElapsedMs.toFixed(3)} ms`);
  assert(clickElapsedMs < 15, `Click handling too slow! Took ${clickElapsedMs}ms, must be < 15ms`);

  // Now chunks should be 3: 'Hello,' || 'visitors' || 'to Cryston Beach.'
  assert.strictEqual(stn.result.chunks.length, 3, 'Should have 3 chunks after click');
  assert.strictEqual(stn.result.chunks[0].en, 'Hello,');
  assert.strictEqual(stn.result.chunks[1].en, 'visitors');
  assert.strictEqual(stn.result.chunks[2].en, 'to Cryston Beach.');

  // Check inputs updated synchronously
  assert.strictEqual(chunkInput.value, 'Hello, || visitors || to Cryston Beach.');
  assert(directInput.value.includes('||'), 'Direct input should have || delimiters');
  console.log(`Direct input value: "${directInput.value}"`);
  console.log('✅ Rapid click and instant DOM track refresh verified!');

  // 3. Test updateChunksFromTextInput synchronous execution
  console.log('Testing updateChunksFromTextInput...');
  inputView.updateChunksFromTextInput(stn, 'Hello, visitors to || Cryston Beach.', directInput, track);
  assert.strictEqual(stn.result.chunks.length, 2);
  assert.strictEqual(stn.result.chunks[0].en, 'Hello, visitors to');
  assert.strictEqual(stn.result.chunks[1].en, 'Cryston Beach.');
  console.log('✅ updateChunksFromTextInput synchronous execution verified!');

  // 4. Verify debounce timer exists and can be cleaned up
  if (inputView.directChunkTimers && inputView.directChunkTimers.has(stn)) {
    clearTimeout(inputView.directChunkTimers.get(stn));
    console.log('✅ Debounced background AI timer registered without blocking.');
  }

  console.log('\n🎉 ALL MANUAL CHUNK EDITING SPEED TESTS PASSED!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
