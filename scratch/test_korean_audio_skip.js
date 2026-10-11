// scratch/test_korean_audio_skip.js

/**
 * Simulate audio energy profile for Korean English listening test:
 * 0.0s - 0.8s : initial silence
 * 0.8s - 5.2s : Korean question announcement ("1번 문제입니다. 대화를 듣고...")
 * 5.2s - 6.8s : Chime and pause (silence gap = 1.6s)
 * 6.8s - 10.5s: English Sentence 1 ("Hello, visitors to Cryston Beach.")
 * 10.5s - 11.2s: pause (0.7s)
 * 11.2s - 18.0s: English Sentence 2 ("As you know, this beach is famous for its beautiful black stones.")
 * 18.0s - 19.5s: trailing silence
 */

const sampleRate = 44100;
const totalDuration = 19.5;
const numSamples = Math.floor(sampleRate * totalDuration);
const pcm = new Float32Array(numSamples);

// Helper to fill speech energy with white noise + tones
function fillSpeech(startSec, endSec, amplitude = 0.5) {
  const start = Math.floor(startSec * sampleRate);
  const end = Math.floor(endSec * sampleRate);
  for (let i = start; i < end; i++) {
    // voice-like waveform: mix of low freq harmonics + noise
    const t = i / sampleRate;
    pcm[i] = (Math.sin(2 * Math.PI * 150 * t) * 0.4 +
              Math.sin(2 * Math.PI * 300 * t) * 0.3 +
              (Math.random() - 0.5) * 0.3) * amplitude;
  }
}

// 1. Korean intro speech: 0.8s ~ 5.2s
fillSpeech(0.8, 5.2, 0.6);

// 2. Chime at 5.4s ~ 5.8s (faint)
fillSpeech(5.4, 5.8, 0.1);

// 3. English Sentence 1: 6.8s ~ 10.5s
fillSpeech(6.8, 10.5, 0.7);

// 4. English Sentence 2: 11.2s ~ 18.0s
fillSpeech(11.2, 18.0, 0.7);

console.log('Simulated Audio Buffer generated. Duration:', totalDuration, 'sec');

// Now let's test our VAD & Korean intro detection algorithm
const windowSec = 0.05;
const windowSize = Math.floor(sampleRate * windowSec);
const numWindows = Math.floor(pcm.length / windowSize);

const energies = new Float32Array(numWindows);
let maxRms = 0;
for (let w = 0; w < numWindows; w++) {
  let sumSq = 0;
  const offset = w * windowSize;
  for (let k = 0; k < windowSize; k += 8) {
    const v = pcm[offset + k];
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / (windowSize / 8));
  energies[w] = rms;
  if (rms > maxRms) maxRms = rms;
}

console.log('Max RMS:', maxRms.toFixed(4));

// Detect distinct speech activity segments (VAD)
const speechThresh = maxRms * 0.08;
const segments = [];
let inSpeech = false;
let segStart = 0;

for (let w = 0; w < numWindows; w++) {
  const isSpeech = energies[w] >= speechThresh;
  if (!inSpeech && isSpeech) {
    inSpeech = true;
    segStart = w * windowSec;
  } else if (inSpeech && !isSpeech) {
    // Check if silence persists for >= 0.3s
    let silenceEnd = true;
    const lookahead = Math.floor(0.3 / windowSec);
    for (let k = 1; k <= lookahead && w + k < numWindows; k++) {
      if (energies[w + k] >= speechThresh) {
        silenceEnd = false;
        break;
      }
    }
    if (silenceEnd) {
      inSpeech = false;
      const segEnd = w * windowSec;
      if (segEnd - segStart >= 0.4) {
        segments.push({ start: Math.round(segStart * 10) / 10, end: Math.round(segEnd * 10) / 10 });
      }
    }
  }
}
if (inSpeech) {
  segments.push({ start: Math.round(segStart * 10) / 10, end: Math.round(numWindows * windowSec * 10) / 10 });
}

console.log('Detected Audio Speech Segments:');
segments.forEach((s, idx) => {
  console.log(`Segment ${idx + 1}: ${s.start}s ~ ${s.end}s (duration: ${(s.end - s.start).toFixed(1)}s)`);
});

// Check if first segment is Korean intro announcement
const sentences = [
  'Hello, visitors to Cryston Beach.',
  'As you know, this beach is famous for its beautiful black stones.'
];

const totalEnglishWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).filter(Boolean).length, 0);
const expectedEnglishDuration = totalEnglishWords * 0.42 + (sentences.length - 1) * 0.7;
console.log('\nTotal English words:', totalEnglishWords);
console.log('Expected English duration:', expectedEnglishDuration.toFixed(1), 'sec');
console.log('Total Audio duration:', totalDuration, 'sec');

// Korean Intro Detection logic
let englishStart = segments[0]?.start ?? 0;
if (segments.length >= 2) {
  const firstSeg = segments[0];
  const secondSeg = segments[1];
  const gap = secondSeg.start - firstSeg.end;

  console.log(`Gap between Seg 1 and Seg 2: ${gap.toFixed(2)}s`);

  // If first segment duration is 2.0s ~ 9.0s AND gap is >= 0.8s (or total audio is much longer than expected English)
  const remainingDurationFromSeg2 = totalDuration - secondSeg.start;
  const isIntroCandidate = firstSeg.start <= 2.5 && (firstSeg.end - firstSeg.start >= 1.5);
  const gapIsSignificant = gap >= 0.7;
  const remainingMatchesEnglish = Math.abs(remainingDurationFromSeg2 - expectedEnglishDuration) < expectedEnglishDuration * 0.45;

  console.log('isIntroCandidate:', isIntroCandidate);
  console.log('gapIsSignificant:', gapIsSignificant);
  console.log('remainingMatchesEnglish:', remainingMatchesEnglish, `(remaining: ${remainingDurationFromSeg2.toFixed(1)}s vs expected: ${expectedEnglishDuration.toFixed(1)}s)`);

  if (isIntroCandidate && (gapIsSignificant || remainingMatchesEnglish)) {
    console.log(`\n🚨 DETECTED KOREAN INTRO ANNOUNCEMENT: ${firstSeg.start}s ~ ${firstSeg.end}s!`);
    console.log(`⏩ SKIPPING KOREAN INTRO. English speech begins at Segment 2: ${secondSeg.start}s!`);
    englishStart = secondSeg.start;
  }
}

console.log('\nFinal English Speech Start Time:', englishStart, 'sec');
