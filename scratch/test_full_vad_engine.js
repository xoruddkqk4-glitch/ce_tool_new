// Comprehensive test of Audio Sentence Boundary & Korean Intro/Outro Omission Engine

function simulateAudioEnergy(totalSec, events) {
  const windowSec = 0.05;
  const numWindows = Math.floor(totalSec / windowSec);
  const energies = new Float32Array(numWindows);

  // Default noise floor
  for (let w = 0; w < numWindows; w++) {
    energies[w] = 0.005 + Math.random() * 0.005;
  }

  // Populate events (speech or chime)
  events.forEach(ev => {
    const startW = Math.floor(ev.start / windowSec);
    const endW = Math.min(numWindows, Math.floor(ev.end / windowSec));
    for (let w = startW; w < endW; w++) {
      energies[w] = ev.rms || 0.25;
    }
  });

  return { energies, windowSec, numWindows };
}

function detectKoreanAndAlign(energies, windowSec, numWindows, totalDuration, sentences) {
  let maxRms = 0;
  for (let w = 0; w < numWindows; w++) {
    if (energies[w] > maxRms) maxRms = energies[w];
  }

  const vadThreshold = maxRms * 0.06;
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
        if (durSec >= 0.3) {
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

  const totalEnglishWords = sentences.reduce((sum, s) => sum + (s || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const expectedEnglishSpeechSec = Math.max(2.5, totalEnglishWords * 0.42 + (sentences.length - 1) * 0.65);
  const overhead = totalDuration - expectedEnglishSpeechSec;

  console.log(`Speech segments detected:`, speechSegments.length);
  speechSegments.forEach((seg, i) => console.log(`  Seg ${i}: ${seg.startSec}s ~ ${seg.endSec}s (${seg.duration}s)`));
  console.log(`Expected English duration: ${expectedEnglishSpeechSec.toFixed(1)}s, Overhead: ${overhead.toFixed(1)}s`);

  // Detect English speech onset (skipping Korean intro)
  let speechStartIdx = speechSegments[0]?.startIdx ?? 0;
  let speechStart = speechSegments[0]?.startSec ?? 0;

  if (speechSegments.length >= 2 && overhead >= 2.0) {
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 1; i < speechSegments.length; i++) {
      const prevSeg = speechSegments[i - 1];
      const currSeg = speechSegments[i];
      const gap = currSeg.startSec - prevSeg.endSec;
      const timeFromStart = currSeg.startSec;

      if (timeFromStart > 15.0) break;

      const remainingDur = totalDuration - timeFromStart;
      if (remainingDur < expectedEnglishSpeechSec * 0.70) continue;

      const s1Words = (sentences[0] || '').trim().split(/\s+/).filter(Boolean).length;
      const s1MinDur = Math.min(1.0, s1Words * 0.25);
      if (currSeg.duration < s1MinDur) continue; // Skip short chime ding

      const durDiff = Math.abs(remainingDur - (expectedEnglishSpeechSec + 0.8));
      const gapBonus = Math.min(3.0, Math.max(0, gap - 0.4) * 2.0);
      const score = durDiff - gapBonus;

      console.log(`  Candidate Seg ${i} at ${currSeg.startSec}s (gap: ${gap.toFixed(2)}s, remDur: ${remainingDur.toFixed(2)}s) -> score: ${score.toFixed(2)}`);

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx > 0) {
      speechStartIdx = Math.max(0, speechSegments[bestIdx].startIdx - 2);
      speechStart = Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
      console.log(`  -> Selected Seg ${bestIdx} starting at ${speechStart}s as English S1 onset! (Skipped Korean intro)`);
    }
  }

  // Detect speech offset
  let speechEnd = totalDuration;
  if (speechSegments.length >= 2) {
    const lastSeg = speechSegments[speechSegments.length - 1];
    speechEnd = Math.min(totalDuration, Math.round((lastSeg.endSec + 0.8) * 10) / 10);
  }

  return { speechStart, speechEnd };
}

// Test Case: EBS CSAT English Audio Simulation
// 0.8s ~ 1.8s: Korean "1번 문제입니다"
// 2.3s ~ 5.5s: Korean "대화를 듣고 남자가..."
// 5.8s ~ 6.5s: Ding-dong chime (0.7s)
// 7.0s ~ 10.2s: English S1 "Hello, Jane. How are you doing today?" (7 words)
// 10.8s ~ 14.5s: English S2 "Hi, Peter. I am preparing for the science fair." (8 words)
// 15.0s ~ 18.2s: English S3 "Do you need any help with your project?" (8 words)
// Total 20 seconds.
const testSentences = [
  'Hello, Jane. How are you doing today?',
  'Hi, Peter. I am preparing for the science fair.',
  'Do you need any help with your project?'
];

const sim = simulateAudioEnergy(20.0, [
  { start: 0.8, end: 1.8, rms: 0.22 },
  { start: 2.3, end: 5.5, rms: 0.25 },
  { start: 5.8, end: 6.5, rms: 0.15 }, // chime
  { start: 7.0, end: 10.2, rms: 0.28 }, // S1
  { start: 10.8, end: 14.5, rms: 0.27 }, // S2
  { start: 15.0, end: 18.2, rms: 0.26 }  // S3
]);

const res = detectKoreanAndAlign(sim.energies, sim.windowSec, sim.numWindows, 20.0, testSentences);
console.log('Result:', res);
