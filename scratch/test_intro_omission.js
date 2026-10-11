// Test Korean Intro Omission Algorithm
function findEnglishSpeechStart(segments, totalDuration, expectedEnglishSec) {
  console.log(`Total duration: ${totalDuration}s, Expected English: ${expectedEnglishSec}s`);
  
  if (!segments || segments.length <= 1) {
    // If only 1 segment or no segments, but audio is much longer than expected English
    const overhead = totalDuration - expectedEnglishSec;
    if (overhead >= 3.0) {
      // Intro takes approximately overhead seconds
      return Math.round(overhead * 10) / 10;
    }
    return segments && segments[0] ? segments[0].startSec : 0;
  }

  const overhead = totalDuration - expectedEnglishSec;
  console.log(`Intro/outro overhead: ${overhead}s`);

  // If total duration closely matches expected English (no intro)
  if (overhead < 2.0) {
    console.log('No significant overhead detected, speech begins at first segment:', segments[0].startSec);
    return segments[0].startSec;
  }

  // Find candidate transition between segments in first 14 seconds
  let bestCandidate = segments[0].startSec;
  let bestScore = Infinity;

  for (let i = 1; i < segments.length; i++) {
    const prevSeg = segments[i - 1];
    const currSeg = segments[i];
    const gap = currSeg.startSec - prevSeg.endSec;
    const timeFromStart = currSeg.startSec;

    if (timeFromStart > 15.0) break; // Korean intros never exceed 15s

    const remainingDur = totalDuration - timeFromStart;
    
    // Remaining audio must be sufficient to fit the English dialogue
    if (remainingDur < expectedEnglishSec * 0.75) continue;

    // Score based on:
    // 1. How close remainingDur is to expectedEnglishSec
    // 2. Size of pause/gap before currSeg (larger gap = more likely chime/transition)
    const durDiff = Math.abs(remainingDur - (expectedEnglishSec + 1.0)); // allow ~1s trailing silence
    const gapBonus = gap >= 0.6 ? 2.0 : 0;
    const score = durDiff - gapBonus * 1.5;

    console.log(`Seg ${i} start at ${timeFromStart}s (gap: ${gap.toFixed(2)}s, remDur: ${remainingDur.toFixed(2)}s) -> score: ${score.toFixed(2)}`);

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = currSeg.startSec;
    }
  }

  return bestCandidate;
}

// Scenario 1: EBS 18s audio with 2 Korean intro segments (0.5s~1.8s, 2.3s~5.6s), Chime at 5.6~6.8s, English at 6.8s~17.5s (3 sentences, ~11s expected)
const segments1 = [
  { startSec: 0.5, endSec: 1.8 },
  { startSec: 2.3, endSec: 5.6 },
  { startSec: 6.8, endSec: 9.8 },
  { startSec: 10.4, endSec: 13.5 },
  { startSec: 14.1, endSec: 17.5 }
];
console.log('--- Scenario 1: EBS 2-part intro ---');
const start1 = findEnglishSpeechStart(segments1, 18.0, 11.0);
console.log('Result start:', start1, '(Expected ~6.8)');

// Scenario 2: EBS 1-part continuous Korean intro (0.8s~5.2s), 1.2s chime gap, English at 6.4s~16.0s
const segments2 = [
  { startSec: 0.8, endSec: 5.2 },
  { startSec: 6.4, endSec: 10.0 },
  { startSec: 10.6, endSec: 15.8 }
];
console.log('\n--- Scenario 2: EBS 1-part intro ---');
const start2 = findEnglishSpeechStart(segments2, 16.5, 9.5);
console.log('Result start:', start2, '(Expected ~6.4)');

// Scenario 3: Clean English dialogue (no Korean intro)
const segments3 = [
  { startSec: 0.6, endSec: 4.5 },
  { startSec: 5.0, endSec: 8.5 },
  { startSec: 9.0, endSec: 12.0 }
];
console.log('\n--- Scenario 3: Clean English (no Korean intro) ---');
const start3 = findEnglishSpeechStart(segments3, 12.5, 11.5);
console.log('Result start:', start3, '(Expected ~0.6)');
