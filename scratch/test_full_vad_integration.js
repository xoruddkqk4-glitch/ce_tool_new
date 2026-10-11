// Verification test for complete silence-detector implementation
import assert from 'assert';

function calculateSentenceBoundaries(energies, windowSec, numWindows, totalDuration, sentences) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || 0;
  if (!duration || duration <= 0) return sentences.map(() => ({ start: null, end: null }));

  const totalEnglishWords = sentences.reduce((sum, s) => sum + (s || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const expectedEnglishSpeechSec = Math.max(2.0, totalEnglishWords * 0.42 + (sentences.length - 1) * 0.65);
  const overhead = duration - expectedEnglishSpeechSec;

  let maxRms = 0;
  for (let w = 0; w < numWindows; w++) {
    if (energies[w] > maxRms) maxRms = energies[w];
  }

  if (maxRms <= 0.001) {
    // Proportional fallback
    return proportionalBoundaries(sentences, duration, expectedEnglishSpeechSec);
  }

  // 1. Detect VAD speech segments
  const vadThreshold = maxRms * 0.055;
  const speechSegments = [];
  let inSeg = false;
  let segStartW = 0;

  for (let w = 0; w < numWindows; w++) {
    const isSpeech = energies[w] >= vadThreshold;
    if (!inSeg && isSpeech) {
      inSeg = true;
      segStartW = w;
    } else if (inSeg && !isSpeech) {
      let silenceEnd = true;
      const look = Math.floor(0.25 / windowSec);
      for (let k = 1; k <= look && w + k < numWindows; k++) {
        if (energies[w + k] >= vadThreshold) {
          silenceEnd = false;
          break;
        }
      }
      if (silenceEnd) {
        inSeg = false;
        const durSec = (w - segStartW) * windowSec;
        if (durSec >= 0.25) {
          speechSegments.push({
            startIdx: segStartW,
            endIdx: w,
            startSec: Math.round(segStartW * windowSec * 10) / 10,
            endSec: Math.round(w * windowSec * 10) / 10,
            duration: Math.round(durSec * 10) / 10
          });
        }
      }
    }
  }
  if (inSeg) {
    speechSegments.push({
      startIdx: segStartW,
      endIdx: numWindows - 1,
      startSec: Math.round(segStartW * windowSec * 10) / 10,
      endSec: Math.round(numWindows * windowSec * 10) / 10,
      duration: Math.round((numWindows - 1 - segStartW) * windowSec * 10) / 10
    });
  }

  // 2. Korean intro detection
  let speechStart = speechSegments[0]?.startSec ?? 0;
  if (speechSegments.length >= 2 && overhead >= 2.0) {
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 1; i < speechSegments.length; i++) {
      const prevSeg = speechSegments[i - 1];
      const currSeg = speechSegments[i];
      const gap = currSeg.startSec - prevSeg.endSec;
      const timeFromStart = currSeg.startSec;

      if (timeFromStart > 16.0) break;

      const remainingDur = duration - timeFromStart;
      if (remainingDur < expectedEnglishSpeechSec * 0.65) continue;

      const s1Words = (sentences[0] || '').trim().split(/\s+/).filter(Boolean).length;
      const s1MinDur = Math.min(1.0, s1Words * 0.25);
      if (currSeg.duration < s1MinDur) continue;

      const durDiff = Math.abs(remainingDur - (expectedEnglishSpeechSec + 0.8));
      const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
      const score = durDiff - gapBonus;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx > 0) {
      speechStart = Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
    }
  } else if (speechSegments.length <= 1 && overhead >= 3.0) {
    speechStart = Math.max(0, Math.round((overhead - 0.8) * 10) / 10);
  }

  // 3. Korean outro detection
  let speechEnd = Math.round(duration * 10) / 10;
  const englishSegments = speechSegments.filter(s => s.startSec >= speechStart - 0.1);
  if (englishSegments.length > 0) {
    const lastEngSeg = englishSegments[englishSegments.length - 1];
    if (englishSegments.length > sentences.length) {
      // Check if trailing segment is an outro question
      const targetSeg = englishSegments[sentences.length - 1];
      const nextSeg = englishSegments[sentences.length];
      if (nextSeg && (nextSeg.startSec - targetSeg.endSec >= 0.8)) {
        speechEnd = Math.min(duration, Math.round((targetSeg.endSec + 0.8) * 10) / 10);
      } else {
        speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
      }
    } else {
      speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
    }
  }

  if (speechEnd + 1.0 >= duration - 0.2) {
    speechEnd = Math.round(duration * 10) / 10;
  }

  if (sentences.length === 1) {
    return [{ start: speechStart, end: speechEnd }];
  }

  const speechDuration = Math.max(1.0, speechEnd - speechStart);

  // Smooth energy
  const smoothRadius = 3;
  const smoothed = new Float32Array(numWindows);
  for (let i = 0; i < numWindows; i++) {
    let sum = 0, count = 0;
    for (let r = -smoothRadius; r <= smoothRadius; r++) {
      const idx = i + r;
      if (idx >= 0 && idx < numWindows) {
        sum += energies[idx];
        count++;
      }
    }
    smoothed[i] = sum / count;
  }

  const weights = sentences.map(s => {
    const words = (s || '').trim().split(/\s+/).filter(Boolean);
    const punctBonus = /[?!]/.test(s) ? 1.5 : 1.0;
    return Math.max(3, words.length * punctBonus);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let curWeight = 0;
  let lastStart = speechStart;
  const transitions = [];

  for (let i = 0; i < sentences.length - 1; i++) {
    curWeight += weights[i];
    const expectedTime = speechStart + speechDuration * (curWeight / totalWeight);
    const expectedIdx = Math.floor(expectedTime / windowSec);

    const searchSec = Math.min(4.5, Math.max(1.5, (speechDuration * (weights[i] / totalWeight)) * 0.6));
    const searchRadius = Math.floor(searchSec / windowSec);
    const minAllowedIdx = Math.floor((lastStart + 0.5) / windowSec);
    const maxAllowedIdx = Math.floor((speechEnd - 0.5) / windowSec);

    const startIdx = Math.max(minAllowedIdx, expectedIdx - searchRadius);
    const endIdx = Math.min(maxAllowedIdx, expectedIdx + searchRadius);

    let minVal = Infinity;
    let bestIdx = expectedIdx;

    for (let k = startIdx; k <= endIdx; k++) {
      const distFromExp = Math.abs(k - expectedIdx) / searchRadius;
      const score = smoothed[k] * (1.0 + 0.3 * distFromExp);
      if (score < minVal) {
        minVal = score;
        bestIdx = k;
      }
    }

    const valleyTime = Math.round(bestIdx * windowSec * 10) / 10;
    let nextOnsetIdx = bestIdx;
    for (let w = bestIdx; w < numWindows; w++) {
      if (energies[w] >= vadThreshold) {
        nextOnsetIdx = Math.max(bestIdx, w);
        break;
      }
    }
    const nextOnsetTime = Math.round(nextOnsetIdx * windowSec * 10) / 10;
    transitions.push({ valleyTime, nextOnsetTime });
    lastStart = nextOnsetTime;
  }

  const boundaries = [];
  let curSentenceStart = speechStart;

  for (let i = 0; i < sentences.length - 1; i++) {
    const { valleyTime, nextOnsetTime } = transitions[i];
    const nextSentenceStart = Math.max(curSentenceStart + 0.6, Math.round((nextOnsetTime - 0.15) * 10) / 10);
    const maxTail = Math.round((valleyTime + 0.8) * 10) / 10;
    const curSentenceEnd = Math.max(curSentenceStart + 0.5, Math.min(nextSentenceStart - 0.15, maxTail));
    boundaries.push({ start: curSentenceStart, end: curSentenceEnd });
    curSentenceStart = nextSentenceStart;
  }

  boundaries.push({ start: curSentenceStart, end: speechEnd });
  return boundaries;
}

function proportionalBoundaries(sentences, totalDuration, expectedEnglishSpeechSec) {
  const overhead = totalDuration - expectedEnglishSpeechSec;
  const startOffset = overhead >= 2.5 ? Math.round((overhead - 0.5) * 10) / 10 : 0;
  const effectiveDur = totalDuration - startOffset;

  const weights = sentences.map(s => Math.max(3, (s || '').trim().split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cur = startOffset;
  return sentences.map((s, idx) => {
    const fraction = weights[idx] / totalWeight;
    const dur = effectiveDur * fraction;
    const start = Math.round(cur * 10) / 10;
    const end = idx === sentences.length - 1 ? Math.round(totalDuration * 10) / 10 : Math.round((cur + dur) * 10) / 10;
    cur += dur;
    return { start, end };
  });
}

// TEST 1: EBS 2-part intro with chime
const windowSec = 0.05;
const numWindows = Math.floor(21.0 / windowSec);
const energies = new Float32Array(numWindows);
for (let w = 0; w < numWindows; w++) energies[w] = 0.005;

// Korean 0.8~1.8s
for (let w = Math.floor(0.8 / 0.05); w < Math.floor(1.8 / 0.05); w++) energies[w] = 0.2;
// Korean 2.3~5.5s
for (let w = Math.floor(2.3 / 0.05); w < Math.floor(5.5 / 0.05); w++) energies[w] = 0.25;
// Chime 5.8~6.6s
for (let w = Math.floor(5.8 / 0.05); w < Math.floor(6.6 / 0.05); w++) energies[w] = 0.12;
// English S1 7.2~10.5s
for (let w = Math.floor(7.2 / 0.05); w < Math.floor(10.5 / 0.05); w++) energies[w] = 0.26;
// English S2 11.2~14.5s
for (let w = Math.floor(11.2 / 0.05); w < Math.floor(14.5 / 0.05); w++) energies[w] = 0.28;
// English S3 15.2~18.5s
for (let w = Math.floor(15.2 / 0.05); w < Math.floor(18.5 / 0.05); w++) energies[w] = 0.25;

const sentences = [
  'Hello, Jane. How are you doing today?',
  'Hi, Peter. I am preparing for the science fair.',
  'Do you need any help with your project?'
];

const bounds = calculateSentenceBoundaries(energies, windowSec, numWindows, 21.0, sentences);
console.log('Calculated sentence boundaries:', bounds);
assert.ok(bounds[0].start >= 6.8 && bounds[0].start <= 7.3, `S1 must start at English dialogue (~7.1s), got: ${bounds[0].start}`);
assert.ok(bounds[1].start >= 10.8 && bounds[1].start <= 11.3, `S2 must start at ~11.1s, got: ${bounds[1].start}`);
assert.ok(bounds[2].start >= 14.8 && bounds[2].start <= 15.3, `S3 must start at ~15.1s, got: ${bounds[2].start}`);
console.log('All tests passed successfully!');
