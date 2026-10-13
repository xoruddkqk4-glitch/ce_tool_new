// scratch/test_fels_answer_persistence.js
// Verification of 약형드랩 answers and check status persistence

import assert from 'assert';

console.log('Testing 약형드랩 answers and check status persistence logic...');

// Mock appState
const appState = {
  activeSentenceIndex: 0,
  sentenceList: [
    { index: 0, text: 'I was going home', userAnswers: {}, userChecked: false },
    { index: 1, text: 'She had a book', userAnswers: {}, userChecked: false }
  ],
  getActiveSentence() {
    return this.sentenceList[this.activeSentenceIndex];
  },
  setActiveSentenceIndex(idx) {
    this.activeSentenceIndex = idx;
  }
};

// Mock practice-view context
class MockPracticeView {
  constructor() {
    this.currentRenderedSentenceIndex = 0;
    this.felsBlanks = [];
    this.domInputs = [];
  }

  // Simulate user typing in S0
  userTypesInS0(blankIdx, value) {
    const stn = appState.sentenceList[this.currentRenderedSentenceIndex];
    if (!stn.userAnswers) stn.userAnswers = {};
    stn.userAnswers[blankIdx] = value;
    this.domInputs[blankIdx] = { value, dataBlankIdx: blankIdx, classList: new Set() };
  }

  // Simulate checking answers in S0
  checkFelsAnswers(answers) {
    const activeStn = (this.currentRenderedSentenceIndex !== null && appState.sentenceList[this.currentRenderedSentenceIndex])
      ? appState.sentenceList[this.currentRenderedSentenceIndex]
      : appState.getActiveSentence();

    activeStn.userChecked = true;
    this.domInputs.forEach((input, idx) => {
      const isCorrect = input.value === answers[idx];
      if (isCorrect) {
        input.classList.add('is-correct');
      } else {
        input.classList.add('is-wrong');
      }
    });
  }

  saveCurrentSentenceAnswers() {
    const renderedIdx = (this.currentRenderedSentenceIndex !== null && typeof this.currentRenderedSentenceIndex === 'number')
      ? this.currentRenderedSentenceIndex
      : null;
    if (renderedIdx === null || !appState.sentenceList || !appState.sentenceList[renderedIdx]) return;

    const targetStn = appState.sentenceList[renderedIdx];
    if (!targetStn.userAnswers) targetStn.userAnswers = {};

    this.domInputs.forEach((input, fallbackIdx) => {
      const bIdx = input.dataBlankIdx !== undefined ? input.dataBlankIdx : fallbackIdx;
      targetStn.userAnswers[bIdx] = input.value;
    });
  }

  nextSentence() {
    this.saveCurrentSentenceAnswers();
    if (appState.sentenceList && appState.activeSentenceIndex < appState.sentenceList.length - 1) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex + 1);
      this.loadSentence(appState.activeSentenceIndex);
    }
  }

  prevSentence() {
    this.saveCurrentSentenceAnswers();
    if (appState.activeSentenceIndex > 0) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex - 1);
      this.loadSentence(appState.activeSentenceIndex);
    }
  }

  loadSentence(idx) {
    this.saveCurrentSentenceAnswers();
    appState.activeSentenceIndex = idx;
    const targetStn = appState.sentenceList[idx];
    this.renderChunkCards(targetStn);
  }

  renderChunkCards(targetStn) {
    this.currentRenderedSentenceIndex = targetStn.index;
    this.domInputs = []; // reset DOM for new sentence

    // Simulate 1 blank
    const currentBlankIdx = 0;
    const expected = targetStn.index === 0 ? 'was' : 'had';
    const savedAnswer = targetStn.userAnswers?.[currentBlankIdx];

    const input = {
      value: typeof savedAnswer === 'string' ? savedAnswer : '',
      dataBlankIdx: currentBlankIdx,
      classList: new Set()
    };

    if (targetStn.userChecked) {
      const currentVal = (input.value || '').trim().toLowerCase();
      const isCorrect = currentVal.length > 0 && currentVal === expected;
      if (isCorrect) input.classList.add('is-correct');
      else input.classList.add('is-wrong');
    }

    this.domInputs.push(input);
  }
}

// Execute scenario
const pv = new MockPracticeView();
pv.renderChunkCards(appState.sentenceList[0]);

// 1. User types "was" in S0 and checks answers
pv.userTypesInS0(0, 'was');
pv.checkFelsAnswers(['was']);
assert.strictEqual(pv.domInputs[0].classList.has('is-correct'), true, 'S0 should be marked correct');
assert.strictEqual(appState.sentenceList[0].userAnswers[0], 'was', 'S0 answer should be was');
assert.strictEqual(appState.sentenceList[0].userChecked, true, 'S0 should be marked checked');

// 2. User navigates to S1 (Next sentence)
pv.nextSentence();
assert.strictEqual(appState.activeSentenceIndex, 1, 'Should now be on S1');
assert.strictEqual(pv.currentRenderedSentenceIndex, 1, 'Rendered sentence should be S1');
assert.strictEqual(pv.domInputs[0].value, '', 'S1 input should be empty');
assert.strictEqual(pv.domInputs[0].classList.has('is-correct'), false, 'S1 should not be checked');

// 3. User types in S1
pv.domInputs[0].value = 'had';
pv.saveCurrentSentenceAnswers();
assert.strictEqual(appState.sentenceList[1].userAnswers[0], 'had', 'S1 answer should be had');

// 4. User navigates back to S0 (Prev sentence)
pv.prevSentence();
assert.strictEqual(appState.activeSentenceIndex, 0, 'Should now be back on S0');
assert.strictEqual(pv.currentRenderedSentenceIndex, 0, 'Rendered sentence should be S0');

// 5. Verify S0 answer and check state are completely intact!
assert.strictEqual(pv.domInputs[0].value, 'was', 'S0 input value must still be was!');
assert.strictEqual(pv.domInputs[0].classList.has('is-correct'), true, 'S0 must still have is-correct class!');
assert.strictEqual(appState.sentenceList[0].userAnswers[0], 'was', 'S0 stored answer must be was!');
assert.strictEqual(appState.sentenceList[0].userChecked, true, 'S0 stored userChecked must be true!');

// 6. Verify S1 stored answer is also intact!
assert.strictEqual(appState.sentenceList[1].userAnswers[0], 'had', 'S1 stored answer must still be had!');

console.log('✓ All verification assertions passed successfully!');
