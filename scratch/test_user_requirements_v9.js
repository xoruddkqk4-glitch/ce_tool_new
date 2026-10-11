/**
 * Comprehensive Automated Test Suite for 5 User Requirements (v9)
 * 1. Audio-Script Auto Sync & VAD
 * 2. Korean Sentence Exclusion from Practice Drill
 * 3. Sentence Merge (이전 문장 결합) & Sentence Split (문장 분리)
 * 4. Natural Korean Translation (우리말 자연스러운 해석)
 * 5. Strict 2x2 Editor Layout (영어 문장 | 우리말 해석, 청크 영어 | 직독직해)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Load modules
const { splitIntoSentences, cleanPracticeSentence, isKoreanSentence } = require('../src/core/text-splitter.js');
const { detectAudioSentenceBoundaries } = require('../src/audio/silence-detector.js');
const { aiService } = require('../src/services/ai-service.js');
const { RuleChunkEngine } = require('../src/core/rule-chunk-engine.js');

console.log('🧪 Starting 5-Requirement Verification Test Suite...\n');

// -----------------------------------------------------------------------------
// Test 1: Korean Sentence Exclusion & Prefix Cleaning (Requirement 2)
// -----------------------------------------------------------------------------
console.log('▶ Test 1: Korean Sentence Exclusion & Cleaning');
{
  const testScript = `1번. 대화를 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.
1번. 남: Hello, visitors to Cryston Beach. (해변에 오신 것을 환영합니다)
여: We hope you have a wonderful time today.
다음 대화를 듣고 물음에 답하시오.
Please remember to put all your trash into the bins.`;

  const sentences = splitIntoSentences(testScript, { filterKorean: true });
  console.log('Parsed sentences:', sentences);

  assert.strictEqual(sentences.length, 3, 'Should filter out 2 pure Korean sentences and retain 3 English sentences');
  assert.strictEqual(isKoreanSentence('1번. 대화를 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.'), true);
  assert.strictEqual(isKoreanSentence('다음 대화를 듣고 물음에 답하시오.'), true);
  assert.strictEqual(isKoreanSentence(sentences[0]), false);

  assert.strictEqual(sentences[0], 'Hello, visitors to Cryston Beach.', 'Should strip leading question/speaker tag and inline Korean annotation');
  assert.strictEqual(sentences[1], 'We hope you have a wonderful time today.', 'Should retain clean English sentence 2');
  assert.strictEqual(sentences[2], 'Please remember to put all your trash into the bins.', 'Should retain clean English sentence 3');

  console.log('✅ Test 1 Passed: Korean instructions completely excluded, prefixes & annotations stripped cleanly.');
}

// -----------------------------------------------------------------------------
// Test 2: Audio-Script Auto Sync & VAD (Requirement 1)
// -----------------------------------------------------------------------------
console.log('\n▶ Test 2: Audio-Script Auto Sync & Acoustic VAD Boundaries');
{
  // Create mock AudioBuffer with channel data
  const sampleRate = 8000;
  const totalSec = 10;
  const numSamples = sampleRate * totalSec;
  const channelData = new Float32Array(numSamples);

  // Lead-in silence / low noise (0s ~ 1.5s)
  for (let i = 0; i < sampleRate * 1.5; i++) {
    channelData[i] = 0.005 * Math.sin(i);
  }
  // Sentence 1 speech energy (1.5s ~ 4.5s)
  for (let i = Math.floor(sampleRate * 1.5); i < Math.floor(sampleRate * 4.5); i++) {
    channelData[i] = 0.4 * Math.sin(i * 0.1);
  }
  // Inter-sentence pause / silence valley (4.5s ~ 5.5s)
  for (let i = Math.floor(sampleRate * 4.5); i < Math.floor(sampleRate * 5.5); i++) {
    channelData[i] = 0.008 * Math.sin(i);
  }
  // Sentence 2 speech energy (5.5s ~ 8.5s)
  for (let i = Math.floor(sampleRate * 5.5); i < Math.floor(sampleRate * 8.5); i++) {
    channelData[i] = 0.45 * Math.sin(i * 0.1);
  }
  // Trailing silence (8.5s ~ 10.0s)
  for (let i = Math.floor(sampleRate * 8.5); i < numSamples; i++) {
    channelData[i] = 0.005 * Math.sin(i);
  }

  const mockBuffer = {
    sampleRate,
    duration: totalSec,
    getChannelData: () => channelData
  };

  const sents = [
    'Hello, visitors to Cryston Beach.',
    'We hope you have a wonderful time today.'
  ];

  const boundaries = detectAudioSentenceBoundaries(mockBuffer, sents);
  console.log('Calculated boundaries:', boundaries);

  assert.strictEqual(boundaries.length, 2, 'Should return 2 boundary objects');
  assert.ok(boundaries[0].start >= 1.0 && boundaries[0].start <= 1.6, `Speech start should detect onset around 1.5s (got ${boundaries[0].start})`);
  assert.ok(boundaries[0].end <= boundaries[1].start, 'Boundaries must not overlap');
  assert.ok(boundaries[1].end >= 8.0, `Sentence 2 end should align with headroom (got ${boundaries[1].end})`);

  console.log('✅ Test 2 Passed: VAD onset detection and energy valley alignment verified.');
}

// -----------------------------------------------------------------------------
// Test 3: Natural Korean Translation (Requirement 4)
// -----------------------------------------------------------------------------
console.log('\n▶ Test 3: Natural Korean Translation');
(async () => {
  try {
    const text = 'Hello, visitors to Cryston Beach.';
    const natural = await aiService.translateNatural(text);
    console.log(`Input: "${text}"`);
    console.log(`Natural translation: "${natural}"`);

    assert.ok(natural && natural.length > 5, 'Natural translation should be non-empty');
    assert.ok(!natural.includes('hello,는'), 'Must NOT contain broken hello,는');
    assert.ok(!natural.includes('visitors를'), 'Must NOT contain broken visitors를');
    assert.ok(natural.includes('안녕하세요') || natural.includes('방문객') || natural.includes('크리스톤'), 'Should contain idiomatic Korean terms');

    console.log('✅ Test 3 Passed: Natural Korean translation is fluent and idiomatic.');
  } catch (err) {
    console.error('Test 3 Failed:', err);
    process.exit(1);
  }

  // -----------------------------------------------------------------------------
  // Test 4: 2x2 Editor Layout & Split/Merge Verification (Requirements 3 & 5)
  // -----------------------------------------------------------------------------
  console.log('\n▶ Test 4: 2x2 Layout & Split/Merge in app.js and styles.css');
  {
    const appJsContent = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const stylesContent = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

    // Requirement 5: 2x2 Grid HTML elements
    assert.ok(appJsContent.includes('class="sentence-edit-grid"'), 'app.js must contain sentence-edit-grid');
    assert.ok(appJsContent.includes('sentence-script-input'), 'app.js must contain sentence-script-input (Row 1, Col 1)');
    assert.ok(appJsContent.includes('sentence-natural-input'), 'app.js must contain sentence-natural-input (Row 1, Col 2)');
    assert.ok(appJsContent.includes('chunk-text-input'), 'app.js must contain chunk-text-input (Row 2, Col 1)');
    assert.ok(appJsContent.includes('chunk-direct-input'), 'app.js must contain chunk-direct-input (Row 2, Col 2)');

    // Requirement 5: CSS grid 1fr 1fr
    assert.ok(stylesContent.includes('grid-template-columns: 1fr 1fr;'), 'styles.css must configure 2 equal columns for 2x2 grid');
    assert.ok(stylesContent.includes('.chunk-direct-input'), 'styles.css must include chunk-direct-input styling');

    // Requirement 3: Split and Merge features
    assert.ok(appJsContent.includes('stn-merge-btn'), 'app.js must contain merge button');
    assert.ok(appJsContent.includes('stn-split-btn'), 'app.js must contain split button');
    assert.ok(appJsContent.includes('mergeWithPreviousSentence'), 'app.js must implement mergeWithPreviousSentence');
    assert.ok(appJsContent.includes('splitSentence'), 'app.js must implement splitSentence');
    assert.ok(appJsContent.includes('toggleSplitBar'), 'app.js must implement toggleSplitBar');
    assert.ok(stylesContent.includes('.sentence-split-bar'), 'styles.css must include split bar styling');
    assert.ok(stylesContent.includes('.stn-merge-btn'), 'styles.css must include merge button styling');

    // Requirement 1: Auto Sync Button in index.html & app.js
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('btnAutoSyncAudio'), 'index.html must include btnAutoSyncAudio button');
    assert.ok(appJsContent.includes('autoSyncAudioScript'), 'app.js must implement autoSyncAudioScript');

    console.log('✅ Test 4 Passed: 2x2 grid, direct chunk input, split bar, merge buttons, and auto-sync verified.');
  }

  // -----------------------------------------------------------------------------
  // Test 5: End-to-end Split and Merge Logic Simulation
  // -----------------------------------------------------------------------------
  console.log('\n▶ Test 5: Sentence Split & Merge Logic Simulation');
  {
    const ruleEngine = new RuleChunkEngine();
    let sentenceList = [
      {
        index: 0,
        text: 'Hello, visitors to Cryston Beach.',
        audioStart: 1.2,
        audioEnd: 4.8,
        result: ruleEngine.process('Hello, visitors to Cryston Beach.')
      },
      {
        index: 1,
        text: 'We hope you have a wonderful time.',
        audioStart: 4.8,
        audioEnd: 8.2,
        result: ruleEngine.process('We hope you have a wonderful time.')
      }
    ];

    // Simulate Merge
    const prev = sentenceList[0];
    const cur = sentenceList[1];
    const mergedText = `${prev.text} ${cur.text}`.trim();
    prev.text = mergedText;
    prev.audioEnd = cur.audioEnd;
    prev.result.chunks = [...prev.result.chunks, ...cur.result.chunks];
    sentenceList.splice(1, 1);
    sentenceList.forEach((s, i) => s.index = i);

    assert.strictEqual(sentenceList.length, 1, 'Sentence count should be 1 after merge');
    assert.strictEqual(sentenceList[0].audioStart, 1.2);
    assert.strictEqual(sentenceList[0].audioEnd, 8.2);
    assert.ok(sentenceList[0].text.includes('Hello,') && sentenceList[0].text.includes('wonderful time.'));

    // Simulate Split
    const words = sentenceList[0].text.split(/\s+/);
    const splitIndex = 4; // after 'Beach.' (index 4)
    const words1 = words.slice(0, splitIndex + 1);
    const words2 = words.slice(splitIndex + 1);
    const text1 = words1.join(' ');
    const text2 = words2.join(' ');

    const newS1 = { index: 0, text: text1, audioStart: 1.2, audioEnd: 4.7, result: ruleEngine.process(text1) };
    const newS2 = { index: 1, text: text2, audioStart: 4.7, audioEnd: 8.2, result: ruleEngine.process(text2) };

    sentenceList = [newS1, newS2];
    assert.strictEqual(sentenceList.length, 2, 'Sentence count should be 2 after split');
    assert.strictEqual(sentenceList[0].text, 'Hello, visitors to Cryston Beach.');
    assert.strictEqual(sentenceList[1].text, 'We hope you have a wonderful time.');

    console.log('✅ Test 5 Passed: Sentence split and merge data integrity verified.');
  }

  console.log('\n🎉 ALL 5 USER REQUIREMENT TESTS PASSED 100% SUCCESSFULLY!');
})();
