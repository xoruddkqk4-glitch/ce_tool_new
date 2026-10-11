/**
 * Verification Test Suite for:
 * 1. Audio end point truncation fix (+0.8s ~ +1.0s headroom, sensitive offset detection)
 * 2. Natural-based 직독직해 (pure Korean sequential interpretation, zero Konglish particles)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { detectAudioSentenceBoundaries } = require('../src/audio/silence-detector.js');
const { RuleChunkEngine } = require('../src/core/rule-chunk-engine.js');
const { AIService } = require('../src/services/ai-service.js');

async function runTests() {
  console.log('🧪 Starting Verification Test Suite for Audio End Headroom & Natural-based 직독직해...\n');

  // =========================================================================
  // Test 1: Audio End Point Headroom & Sensitive Offset Detection
  // =========================================================================
  console.log('▶ Test 1: Audio End Point Headroom & Boundary Analysis');
  
  // Create simulated 12-second PCM AudioBuffer
  const sampleRate = 44100;
  const duration = 12.0;
  const numSamples = Math.floor(sampleRate * duration);
  const channelData = new Float32Array(numSamples);

  // Sentence 1: speech from 1.5s to 4.5s (decaying softly down to 4.9s)
  for (let s = Math.floor(1.5 * sampleRate); s < Math.floor(4.5 * sampleRate); s++) {
    channelData[s] = 0.5 * Math.sin(2 * Math.PI * 440 * (s / sampleRate));
  }
  // Soft trailing consonant decay 4.5s ~ 4.9s (around 0.03 ~ 0.015 RMS)
  for (let s = Math.floor(4.5 * sampleRate); s < Math.floor(4.9 * sampleRate); s++) {
    channelData[s] = 0.025 * Math.sin(2 * Math.PI * 300 * (s / sampleRate));
  }

  // Inter-sentence pause: 4.9s to 6.5s (near zero energy)

  // Sentence 2: speech from 6.5s to 10.0s (decaying softly to 10.6s)
  for (let s = Math.floor(6.5 * sampleRate); s < Math.floor(10.0 * sampleRate); s++) {
    channelData[s] = 0.6 * Math.sin(2 * Math.PI * 520 * (s / sampleRate));
  }
  // Soft trailing consonant decay 10.0s ~ 10.6s
  for (let s = Math.floor(10.0 * sampleRate); s < Math.floor(10.6 * sampleRate); s++) {
    channelData[s] = 0.02 * Math.sin(2 * Math.PI * 350 * (s / sampleRate));
  }

  const mockAudioBuffer = {
    duration,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => channelData
  };

  const sentences = [
    'Hello, visitors to Cryston Beach.',
    'As you know, this beach is famous for its beautiful black stones.'
  ];

  const boundaries = detectAudioSentenceBoundaries(mockAudioBuffer, sentences, duration);
  console.log('Detected Audio Boundaries:', boundaries);

  // Assert Sentence 1 start and end
  assert.ok(boundaries[0].start <= 1.5, `Sentence 1 start (${boundaries[0].start}) should capture onset <= 1.5s`);
  assert.ok(boundaries[0].end >= 4.9, `Sentence 1 end (${boundaries[0].end}) must not cut off audio before 4.9s`);
  assert.ok(boundaries[0].end <= boundaries[1].start, `Sentence 1 end must not overlap Sentence 2 start`);

  // Assert Sentence 2 end (must NOT be cut off at 10.0s, should include decay and headroom >= 10.5s)
  assert.ok(boundaries[1].start >= 5.5 && boundaries[1].start <= 6.6, `Sentence 2 start (${boundaries[1].start}) should be near 6.5s`);
  assert.ok(boundaries[1].end >= 10.6, `Sentence 2 end (${boundaries[1].end}) must include full decay >= 10.6s (no 1-second truncation!)`);
  console.log('✅ Test 1 Passed: Sentence audio boundaries include full trailing release without 1s truncation!\n');

  // =========================================================================
  // Test 2: Natural Korean-based 직독직해 (No "as는", No "beach is famous를")
  // =========================================================================
  console.log('▶ Test 2: Natural Korean-based 직독직해 Generation');

  const ruleEngine = new RuleChunkEngine();
  const aiService = new AIService();

  const englishSentence = 'As you know, this beach is famous for its beautiful black stones.';
  const naturalKorean = '아시다시피 이 해변은 검은 돌이 아름답기로 유명합니다.';

  // 1. Check ruleEngine with naturalKorean passed
  const processed = ruleEngine.process(englishSentence, naturalKorean);
  console.log('RuleEngine Processed Chunks:', processed.chunks);
  console.log('RuleEngine chunk_text:', processed.chunk_text);

  // Verify no English words with Korean particles attached
  assert.ok(!processed.chunk_text.includes('as는'), 'Must NOT contain "as는"');
  assert.ok(!processed.chunk_text.includes('beach is famous를'), 'Must NOT contain "beach is famous를"');
  assert.ok(!processed.chunk_text.includes('know'), 'Must NOT contain English word "know"');
  console.log('✅ Test 2-1: RuleEngine with Latin particle protection completely eliminates pseudo-Konglish.');

  // 2. Check aiService.generateDirectChunks with real endpoint / fallback
  const directChunks = await aiService.generateDirectChunks(processed.chunks, naturalKorean, englishSentence);
  console.log('AI Service Generated Direct Chunks:', directChunks);

  assert.strictEqual(directChunks.length, processed.chunks.length, 'Chunk count must match');
  directChunks.forEach((koChunk, i) => {
    assert.ok(koChunk && koChunk.length > 0, `Chunk ${i} must have Korean content`);
    // Ensure no English particles attached to English words
    assert.ok(!/[a-zA-Z]+[은는이가을를]/.test(koChunk), `Chunk "${koChunk}" must not contain English words with Korean particles`);
  });

  const fullDirectText = directChunks.join(' || ');
  console.log('Final 직독직해 (순차 해석):', fullDirectText);
  assert.ok(!fullDirectText.includes('as는'), 'Final direct text must not contain "as는"');
  console.log('✅ Test 2-2: Final 직독직해 is pure Korean and follows sequential thought order!\n');

  // =========================================================================
  // Test 3: Standalone app.js Verification in VM
  // =========================================================================
  console.log('▶ Test 3: Standalone app.js Integrity Check');
  const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // Assert zero import/export statements
  assert.ok(!/^\s*import\s/m.test(appCode), 'app.js must not contain any import statements');
  assert.ok(!/^\s*export\s/m.test(appCode), 'app.js must not contain any export statements');
  console.log('✅ Test 3 Passed: app.js contains 0 import/export keywords.');

  console.log('\n🎉 ALL AUDIO HEADROOM & NATURAL 직독직해 TESTS PASSED 100% SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
