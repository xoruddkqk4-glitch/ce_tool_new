import assert from 'assert';
import { splitIntoSentences, cleanPracticeSentence } from '../src/core/text-splitter.js';
import {
  detectAudioSentenceBoundaries,
  detectKoreanIntroDuration,
  estimateEnglishSpeechDuration
} from '../src/audio/silence-detector.js';

console.log('=== Test 1: Script Sentence Splitting & Korean Cleaning ===');
const testScript1 = `1번 대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오.
M: Hello, Jane. How are you doing today?
W: Hi, Peter. I am getting ready for the science fair.
M: Do you need any help with your project? (도움이 필요하니?)`;

const sentences1 = splitIntoSentences(testScript1);
console.log('Parsed Sentences:', sentences1);

assert.strictEqual(sentences1.length, 5, 'Should have 5 English sentences (excluding Korean question direction)');
assert.strictEqual(sentences1[0], 'Hello, Jane.', 'Speaker tag M: should be stripped');
assert.strictEqual(sentences1[1], 'How are you doing today?', 'Second sentence in turn parsed cleanly');
assert.strictEqual(sentences1[2], 'Hi, Peter.', 'Speaker tag W: should be stripped');
assert.strictEqual(sentences1[3], 'I am getting ready for the science fair.', 'Fourth sentence parsed cleanly');
assert.strictEqual(sentences1[4], 'Do you need any help with your project?', 'Inline Korean parenthetical should be stripped');
console.log('✅ Test 1 Passed: Script cleaned and Korean question directions excluded!');

const sentences3 = [
  'Hello, Jane, how are you doing today?',
  'Hi, Peter, I am getting ready for the science fair.',
  'Do you need any help with your project?'
];

console.log('\n=== Test 2: Audio Boundary Detection with Korean Intro & Chime ===');
// Helper to create mock Web Audio AudioBuffer
function createMockAudioBuffer(durationSec, sampleRate, eventRegions) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const channelData = new Float32Array(numSamples);

  eventRegions.forEach(ev => {
    const startSample = Math.floor(ev.start * sampleRate);
    const endSample = Math.min(numSamples, Math.floor(ev.end * sampleRate));
    for (let i = startSample; i < endSample; i++) {
      // Simulate audio waveform oscillation
      channelData[i] = (Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * (ev.amp || 0.4));
    }
  });

  return {
    duration: durationSec,
    sampleRate: sampleRate,
    numberOfChannels: 1,
    getChannelData: () => channelData
  };
}

// 21.0 second audio file:
// 0.8s ~ 1.8s: Korean intro part 1 ("1번 문제입니다.")
// 2.3s ~ 5.5s: Korean intro part 2 ("대화를 듣고, 남자가...")
// 5.8s ~ 6.6s: Ding-dong chime (0.8s)
// 7.2s ~ 10.5s: English S1 "Hello, Jane. How are you doing today?"
// 11.2s ~ 14.5s: English S2 "Hi, Peter. I am getting ready for the science fair."
// 15.2s ~ 18.5s: English S3 "Do you need any help with your project?"
// 19.2s ~ 20.5s: Trailing Korean outro / answer chime
const mockBuffer = createMockAudioBuffer(21.0, 44100, [
  { start: 0.8, end: 1.8, amp: 0.35 },
  { start: 2.3, end: 5.5, amp: 0.40 },
  { start: 5.8, end: 6.6, amp: 0.20 }, // Chime
  { start: 7.2, end: 10.5, amp: 0.45 }, // S1
  { start: 11.2, end: 14.5, amp: 0.45 }, // S2
  { start: 15.2, end: 18.5, amp: 0.45 }, // S3
  { start: 19.2, end: 20.5, amp: 0.30 }  // Korean outro
]);

const introSec = detectKoreanIntroDuration(mockBuffer, sentences3);
console.log('Detected Korean Intro Offset:', introSec, 'seconds');
assert.ok(introSec >= 6.8 && introSec <= 7.3, `Intro offset should be around 7.1s, got: ${introSec}`);

const boundaries = detectAudioSentenceBoundaries(mockBuffer, sentences3);
console.log('Detected Sentence Boundaries:', boundaries);

assert.strictEqual(boundaries.length, 3, 'Should produce boundaries for 3 sentences');
// Sentence 1 MUST start at ~7.1s (English S1), skipping the Korean voice (0.8~5.5s) and chime!
assert.ok(boundaries[0].start >= 6.9 && boundaries[0].start <= 7.3, `S1 must start at English dialogue (~7.1s), got: ${boundaries[0].start}`);
assert.ok(boundaries[0].end >= 10.5 && boundaries[0].end <= 11.2, `S1 end should have generous headroom (~10.8s), got: ${boundaries[0].end}`);

// Sentence 2
assert.ok(boundaries[1].start >= 10.9 && boundaries[1].start <= 11.3, `S2 must start at ~11.1s, got: ${boundaries[1].start}`);
assert.ok(boundaries[1].end >= 14.5 && boundaries[1].end <= 15.2, `S2 end should have generous headroom (~14.8s), got: ${boundaries[1].end}`);

// Sentence 3
assert.ok(boundaries[2].start >= 14.9 && boundaries[2].start <= 15.3, `S3 must start at ~15.1s, got: ${boundaries[2].start}`);
// Sentence 3 end must NOT include the trailing Korean outro at 19.2s!
assert.ok(boundaries[2].end <= 19.5, `S3 end must exclude trailing Korean outro, got: ${boundaries[2].end}`);
console.log('✅ Test 2 Passed: Audio boundaries perfectly synchronized, Korean intro & outro omitted!');

console.log('\n=== Test 3: Single Sentence with Korean Intro ===');
const singleSentence = ['Hello, Jane. How are you doing today?'];
const singleBuffer = createMockAudioBuffer(12.0, 44100, [
  { start: 0.8, end: 5.2, amp: 0.40 }, // Korean intro
  { start: 5.5, end: 6.2, amp: 0.20 }, // Chime
  { start: 6.8, end: 10.2, amp: 0.45 }  // S1
]);
const singleBoundaries = detectAudioSentenceBoundaries(singleBuffer, singleSentence);
console.log('Single sentence boundaries:', singleBoundaries);
assert.ok(singleBoundaries[0].start >= 6.5 && singleBoundaries[0].start <= 7.0, `Single sentence must skip Korean intro, got: ${singleBoundaries[0].start}`);
console.log('✅ Test 3 Passed: Single sentence audio skips Korean intro!');

console.log('\n=== Test 4: Clean Audio File (No Korean Intro) ===');
const cleanBuffer = createMockAudioBuffer(12.0, 44100, [
  { start: 0.5, end: 4.0, amp: 0.40 },
  { start: 4.5, end: 8.0, amp: 0.40 },
  { start: 8.5, end: 11.5, amp: 0.40 }
]);
const cleanSentences = ['Clean audio first sentence.', 'Second clean sentence.', 'Third clean sentence.'];
const cleanIntro = detectKoreanIntroDuration(cleanBuffer, cleanSentences);
console.log('Clean audio intro offset:', cleanIntro);
assert.strictEqual(cleanIntro, 0, 'Clean audio should have 0 intro offset');

const cleanBoundaries = detectAudioSentenceBoundaries(cleanBuffer, cleanSentences);
console.log('Clean audio boundaries:', cleanBoundaries);
assert.ok(cleanBoundaries[0].start <= 0.6, `Clean audio should start at beginning (~0.4s), got: ${cleanBoundaries[0].start}`);
console.log('✅ Test 4 Passed: Clean audio without Korean intro is preserved without false positives!');

console.log('\n🎉 ALL 4 UNIT & INTEGRATION TESTS PASSED PERFECTLY!');
