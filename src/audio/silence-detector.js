/**
 * Audio Sentence Boundary Detection Engine
 * Combines Web Audio API PCM RMS energy analysis, VAD (Voice Activity Detection),
 * speech onset/offset trimming, and adaptive energy valley alignment.
 */

export function detectAudioSentenceBoundaries(audioBuffer, sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || (audioBuffer ? audioBuffer.duration : 0);

  if (!duration || duration <= 0) {
    return sentences.map(() => ({ start: null, end: null }));
  }

  if (sentences.length === 1) {
    // If audio buffer exists, find actual speech start and end
    if (audioBuffer) {
      try {
        const { speechStart, speechEnd } = detectSpeechOnsetOffset(audioBuffer, duration);
        return [{ start: speechStart, end: speechEnd }];
      } catch (e) {
        console.warn('Single sentence VAD fallback:', e);
      }
    }
    return [{ start: 0, end: Math.round(duration * 10) / 10 }];
  }

  // Step 1: Attempt PCM RMS analysis with VAD and adaptive valley boundary detection
  if (audioBuffer) {
    try {
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSec = 0.05; // 50ms window
      const windowSize = Math.floor(sampleRate * windowSec);
      const numWindows = Math.floor(rawData.length / windowSize);

      const energies = new Float32Array(numWindows);
      let maxRms = 0;
      for (let w = 0; w < numWindows; w++) {
        let sumSq = 0;
        const offset = w * windowSize;
        const step = Math.max(1, Math.floor(windowSize / 128)); // Sample representative points for high speed
        let count = 0;
        for (let k = 0; k < windowSize; k += step) {
          const v = rawData[offset + k];
          sumSq += v * v;
          count++;
        }
        const rms = Math.sqrt(sumSq / count);
        energies[w] = rms;
        if (rms > maxRms) maxRms = rms;
      }

      if (maxRms > 0.001) {
        // Detect speech onset (skipping intro silence / chimes)
        const speechThresh = maxRms * 0.06;
        let speechStartIdx = 0;
        for (let w = 0; w < numWindows; w++) {
          if (energies[w] >= speechThresh) {
            // Require at least 2 consecutive windows of energy
            if (w + 1 < numWindows && energies[w + 1] >= speechThresh * 0.7) {
              speechStartIdx = Math.max(0, w - 2);
              break;
            }
          }
        }
        const speechStart = Math.round(speechStartIdx * windowSec * 10) / 10;

        // Detect speech offset (skipping trailing silence / chimes)
        let speechEndIdx = numWindows - 1;
        for (let w = numWindows - 1; w >= 0; w--) {
          if (energies[w] >= speechThresh) {
            speechEndIdx = Math.min(numWindows - 1, w + 3);
            break;
          }
        }
        const speechEnd = Math.round(speechEndIdx * windowSec * 10) / 10;
        const speechDuration = Math.max(1.0, speechEnd - speechStart);

        // Smooth energy curve with moving average (~250ms window) to suppress plosive stops
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

        // Calculate expected sentence transition timestamps based on word counts
        const weights = sentences.map(s => {
          const words = (s || '').trim().split(/\s+/).filter(Boolean);
          // Sentence ending with question mark or exclamation usually has slightly longer cadence
          const punctBonus = /[?!]/.test(s) ? 1.5 : 1.0;
          return Math.max(3, words.length * punctBonus);
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let curWeight = 0;
        let lastBoundary = speechStart;
        const boundaries = [];

        for (let i = 0; i < sentences.length - 1; i++) {
          curWeight += weights[i];
          const expectedTime = speechStart + speechDuration * (curWeight / totalWeight);
          const expectedIdx = Math.floor(expectedTime / windowSec);
          
          // Search around expected transition for the lowest energy dip (valley / pause)
          const searchSec = Math.min(4.0, Math.max(1.2, (speechDuration * (weights[i] / totalWeight)) * 0.5));
          const searchRadius = Math.floor(searchSec / windowSec);
          const minAllowedIdx = Math.floor((lastBoundary + 0.4) / windowSec);
          const maxAllowedIdx = Math.floor((speechEnd - 0.4) / windowSec);

          const startIdx = Math.max(minAllowedIdx, expectedIdx - searchRadius);
          const endIdx = Math.min(maxAllowedIdx, expectedIdx + searchRadius);

          let minVal = Infinity;
          let bestIdx = expectedIdx;

          for (let k = startIdx; k <= endIdx; k++) {
            // Distance penalty to favor dips closer to expected rhythm
            const distFromExp = Math.abs(k - expectedIdx) / searchRadius;
            const score = smoothed[k] * (1.0 + 0.35 * distFromExp);
            if (score < minVal) {
              minVal = score;
              bestIdx = k;
            }
          }

          const boundaryTime = Math.round(bestIdx * windowSec * 10) / 10;
          const safeBoundary = Math.max(lastBoundary + 0.4, Math.min(speechEnd - 0.3, boundaryTime));
          boundaries.push({ start: lastBoundary, end: safeBoundary });
          lastBoundary = safeBoundary;
        }

        boundaries.push({ start: lastBoundary, end: speechEnd });
        return boundaries;
      }
    } catch (e) {
      console.warn('Audio silence & valley detection fallback:', e);
    }
  }

  // Step 2: Proportional fallback based on word counts
  return proportionalSentenceBoundaries(sentences, duration);
}

function detectSpeechOnsetOffset(audioBuffer, totalDuration) {
  try {
    const rawData = audioBuffer.getChannelData(0);
    const windowSec = 0.05;
    const windowSize = Math.floor(audioBuffer.sampleRate * windowSec);
    const numWindows = Math.floor(rawData.length / windowSize);

    let maxRms = 0;
    const energies = new Float32Array(numWindows);
    for (let w = 0; w < numWindows; w++) {
      let sumSq = 0;
      const offset = w * windowSize;
      for (let k = 0; k < windowSize; k += 8) {
        const v = rawData[offset + k];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / (windowSize / 8));
      energies[w] = rms;
      if (rms > maxRms) maxRms = rms;
    }

    const thresh = maxRms * 0.06;
    let startSec = 0;
    for (let w = 0; w < numWindows; w++) {
      if (energies[w] >= thresh) {
        startSec = Math.max(0, Math.round((w * windowSec - 0.1) * 10) / 10);
        break;
      }
    }

    let endSec = totalDuration;
    for (let w = numWindows - 1; w >= 0; w--) {
      if (energies[w] >= thresh) {
        endSec = Math.min(totalDuration, Math.round(((w + 1) * windowSec + 0.2) * 10) / 10);
        break;
      }
    }

    return { speechStart: startSec, speechEnd: endSec };
  } catch (e) {
    return { speechStart: 0, speechEnd: Math.round(totalDuration * 10) / 10 };
  }
}

export function proportionalSentenceBoundaries(sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  if (sentences.length === 1) {
    return [{ start: 0, end: Math.round(totalDuration * 10) / 10 }];
  }
  const weights = sentences.map(s => Math.max(3, (s || '').trim().split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cur = 0;
  return sentences.map((s, idx) => {
    const fraction = weights[idx] / totalWeight;
    const dur = totalDuration * fraction;
    const start = Math.round(cur * 10) / 10;
    const end = idx === sentences.length - 1 ? Math.round(totalDuration * 10) / 10 : Math.round((cur + dur) * 10) / 10;
    cur += dur;
    return { start, end };
  });
}
