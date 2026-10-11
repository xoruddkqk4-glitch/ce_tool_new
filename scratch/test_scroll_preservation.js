// scratch/test_scroll_preservation.js

// Setup mock document & window BEFORE requiring any UI modules
global.window = {
  scrollY: 450,
  scrollBy: (opts) => {
    window.scrollY += opts.top;
  },
  scrollTo: (opts) => {
    window.scrollY = opts.top;
  }
};

global.document = {
  documentElement: {
    scrollTop: 450
  },
  getElementById: (id) => ({
    id,
    classList: { add: () => {}, remove: () => {} },
    textContent: '',
    style: {},
    addEventListener: () => {}
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      style: {},
      attributes: {},
      children: [],
      classList: {
        add: (cls) => { el.className += ' ' + cls; },
        remove: (cls) => { el.className = el.className.replace(cls, '').trim(); },
        contains: (cls) => el.className.includes(cls)
      },
      setAttribute: (k, v) => { el.attributes[k] = String(v); },
      getAttribute: (k) => el.attributes[k],
      appendChild: (child) => { el.children.push(child); },
      querySelector: (sel) => {
        if (sel.includes('data-stn-idx')) {
          const match = sel.match(/data-stn-idx="(\d+)"/);
          if (match) {
            const idx = match[1];
            return el.children.find(c => c.attributes['data-stn-idx'] === idx) || null;
          }
        }
        return el.children[0] || null;
      },
      querySelectorAll: () => el.children,
      getBoundingClientRect: () => ({ top: 120, height: 180 }),
      scrollIntoView: (opts) => {
        el.scrolledIntoViewWith = opts;
      },
      addEventListener: () => {},
      offsetHeight: 800
    };
    return el;
  }
};

global.requestAnimationFrame = (cb) => cb();

const { appState } = require('../src/core/app-state.js');
const { InputView } = require('../src/views/input-view.js');

async function runTest() {
  console.log('🧪 Starting Scroll Preservation Verification...');

  // Setup sentences
  appState.setSentenceList([
    { index: 0, text: 'Hello, visitors.', audioStart: 0, audioEnd: 2, result: { chunks: [] } },
    { index: 1, text: 'Welcome to Cryston Beach.', audioStart: 2, audioEnd: 5, result: { chunks: [] } },
    { index: 2, text: 'This beach is famous for black stones.', audioStart: 5, audioEnd: 9, result: { chunks: [] } },
    { index: 3, text: 'Please enjoy your time.', audioStart: 9, audioEnd: 12, result: { chunks: [] } }
  ]);

  const view = new InputView();
  view.parsedResultsSection = document.createElement('div');
  view.parsedSentenceList = document.createElement('div');
  view.parsedResultsSection.appendChild(view.parsedSentenceList);
  view.resultsCountBadge = document.createElement('span');

  // 1. Initial render with scrollToSection
  view.renderParsedResults({ scrollToSection: true });
  console.log('Initial render completed. Children count:', view.parsedSentenceList.children.length);

  if (view.parsedResultsSection.scrolledIntoViewWith?.block !== 'start') {
    throw new Error('FAIL: Initial render should scroll to section start!');
  }
  console.log('✅ Initial render scrolls to section correctly.');

  // Reset section scroll record
  view.parsedResultsSection.scrolledIntoViewWith = null;

  // 2. Set scroll position to 600px (simulating user scrolled down to S3)
  window.scrollY = 600;

  // 3. Merge S3 (index 2) with S2 (index 1)
  console.log('\nMerging S3 into S2 at scrollY =', window.scrollY);
  view.mergeWithPreviousSentence(2);

  // Check that parsedResultsSection was NOT scrolled to start!
  if (view.parsedResultsSection.scrolledIntoViewWith) {
    throw new Error('FAIL: mergeWithPreviousSentence incorrectly called scrollIntoView on parsedResultsSection!');
  }
  console.log('✅ parsedResultsSection.scrollIntoView was NOT called on merge (No jump to top)!');

  // Check remaining sentence count
  if (appState.sentenceList.length !== 3) {
    throw new Error(`FAIL: Expected 3 sentences after merge, got ${appState.sentenceList.length}`);
  }
  console.log('✅ Sentences successfully merged into 3 sentences.');

  // Check final scroll position
  console.log('Final window.scrollY:', window.scrollY);
  if (window.scrollY === 0) {
    throw new Error('FAIL: window.scrollY dropped to 0!');
  }
  console.log('✅ window.scrollY preserved (did not drop to 0)!');

  console.log('\n🎉 ALL SCROLL PRESERVATION TESTS PASSED 100%!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
