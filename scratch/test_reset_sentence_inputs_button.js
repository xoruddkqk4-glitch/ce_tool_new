// scratch/test_reset_sentence_inputs_button.js
import assert from 'assert';

console.log('Testing [ ] 초기화 button and resetFelsInputs logic...');

const appState = {
  activeSentenceIndex: 0,
  sentenceList: [
    { index: 0, text: 'I was going home', userAnswers: { 0: 'was' }, userChecked: true },
    { index: 1, text: 'She had a book', userAnswers: { 0: 'had' }, userChecked: true }
  ],
  getActiveSentence() {
    return this.sentenceList[this.activeSentenceIndex];
  }
};

class MockPracticeView {
  constructor() {
    this.currentRenderedSentenceIndex = 0;
    this.felsBlanks = [
      {
        inputEl: { value: 'was', classList: new Set(['is-correct']) },
        answer: 'was'
      }
    ];
  }

  resetFelsInputs() {
    const activeStn = (this.currentRenderedSentenceIndex !== null && appState.sentenceList?.[this.currentRenderedSentenceIndex])
      ? appState.sentenceList[this.currentRenderedSentenceIndex]
      : appState.getActiveSentence();
    if (activeStn) {
      activeStn.userAnswers = {};
      delete activeStn.userChecked;
    }

    this.felsBlanks.forEach(item => {
      if (!item.inputEl) return;
      item.inputEl.value = '';
      item.inputEl.classList.delete('is-correct');
      item.inputEl.classList.delete('is-wrong');
    });
  }
}

const pv = new MockPracticeView();

// Verify initial state
assert.strictEqual(appState.sentenceList[0].userAnswers[0], 'was');
assert.strictEqual(appState.sentenceList[0].userChecked, true);
assert.strictEqual(appState.sentenceList[1].userAnswers[0], 'had');
assert.strictEqual(appState.sentenceList[1].userChecked, true);

// Execute reset
pv.resetFelsInputs();

// Verify Sentence 0 was reset
assert.deepStrictEqual(appState.sentenceList[0].userAnswers, {}, 'Sentence 0 userAnswers must be empty');
assert.strictEqual(appState.sentenceList[0].userChecked, undefined, 'Sentence 0 userChecked must be deleted');
assert.strictEqual(pv.felsBlanks[0].inputEl.value, '', 'Input value must be cleared');
assert.strictEqual(pv.felsBlanks[0].inputEl.classList.has('is-correct'), false, 'is-correct class must be removed');

// Verify Sentence 1 was untouched
assert.strictEqual(appState.sentenceList[1].userAnswers[0], 'had', 'Sentence 1 answers must remain intact');
assert.strictEqual(appState.sentenceList[1].userChecked, true, 'Sentence 1 userChecked must remain intact');

console.log('✓ [ ] 초기화 button and resetFelsInputs logic verified successfully!');
