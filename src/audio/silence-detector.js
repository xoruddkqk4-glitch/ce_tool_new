/**
 * Audio Sentence Boundary Detection Engine
 * Combines Web Audio API PCM RMS energy analysis, VAD (Voice Activity Detection),
 * Korean question intro/outro omission, and adaptive energy valley alignment.
 */

/**
 * Calculates expected English reading duration based on word count
 */
export function estimateEnglishSpeechDuration(sentences) {
  if (!sentences || !sentences.length) return 0;
  const totalEnglishWords = sentences.reduce((sum, s) => sum + (s || '').trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(2.0, totalEnglishWords * 0.42 + (sentences.length - 1) * 0.65);
}

/**
 * Detects Korean question announcement duration (in seconds) to be omitted
 */
export function detectKoreanIntroDuration(audioBuffer, sentences, totalDuration) {
  if (!audioBuffer) return 0;
  try {
    const duration = totalDuration || audioBuffer.duration || 0;
    if (duration <= 0) return 0;

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSec = 0.05;
    const windowSize = Math.floor(sampleRate * windowSec);
    const numWindows = Math.floor(rawData.length / windowSize);

    const energies = new Float32Array(numWindows);
    let maxRms = 0;
    for (let w = 0; w < numWindows; w++) {
      let sumSq = 0;
      const offset = w * windowSize;
      const step = Math.max(1, Math.floor(windowSize / 128));
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

    if (maxRms <= 0.001) return 0;

    const vadThreshold = maxRms * 0.055;
    const speechSegments = extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold);
    const expectedEnglishSec = estimateEnglishSpeechDuration(sentences);
    const overhead = duration - expectedEnglishSec;

    if (speechSegments.length > sentences.length && overhead >= 2.0) {
      const remDur0 = duration - speechSegments[0].startSec;
      let bestScore = Math.abs(remDur0 - (expectedEnglishSec + 0.8));
      let bestIdx = 0;

      const maxIntroIdx = speechSegments.length - sentences.length;
      for (let i = 1; i <= maxIntroIdx; i++) {
        const prevSeg = speechSegments[i - 1];
        const currSeg = speechSegments[i];
        const gap = currSeg.startSec - prevSeg.endSec;
        const timeFromStart = currSeg.startSec;

        if (timeFromStart > 16.0) break;

        const remainingDur = duration - timeFromStart;
        if (remainingDur < expectedEnglishSec * 0.65) continue;

        const s1Words = (sentences[0] || '').trim().split(/\s+/).filter(Boolean).length;
        const s1MinDur = Math.min(1.0, s1Words * 0.25);
        if (currSeg.duration < s1MinDur) continue;

        const durDiff = Math.abs(remainingDur - (expectedEnglishSec + 0.8));
        const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
        const score = durDiff - gapBonus;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx > 0) {
        return Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
      }
    } else if (sentences.length === 1 && speechSegments.length >= 2 && overhead >= 2.0) {
      const remDur0 = duration - speechSegments[0].startSec;
      let bestScore = Math.abs(remDur0 - (expectedEnglishSec + 0.8));
      let bestIdx = 0;

      for (let i = 1; i < speechSegments.length; i++) {
        const prevSeg = speechSegments[i - 1];
        const currSeg = speechSegments[i];
        const gap = currSeg.startSec - prevSeg.endSec;
        const timeFromStart = currSeg.startSec;

        if (timeFromStart > 16.0) break;

        const remainingDur = duration - timeFromStart;
        if (remainingDur < expectedEnglishSec * 0.65) continue;

        const durDiff = Math.abs(remainingDur - (expectedEnglishSec + 0.8));
        const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
        const score = durDiff - gapBonus;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx > 0) {
        return Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
      }
    } else if (speechSegments.length <= 1 && overhead >= 3.0) {
      return Math.max(0, Math.round((overhead - 0.8) * 10) / 10);
    }
  } catch (e) {
    console.warn('detectKoreanIntroDuration error:', e);
  }
  return 0;
}

function extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold) {
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
  return speechSegments;
}

export function detectAudioSentenceBoundaries(audioBuffer, sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || (audioBuffer ? audioBuffer.duration : 0);

  if (!duration || duration <= 0) {
    return sentences.map(() => ({ start: null, end: null }));
  }

  const expectedEnglishSpeechSec = estimateEnglishSpeechDuration(sentences);
  const overhead = duration - expectedEnglishSpeechSec;

  // Step 1: PCM RMS analysis with VAD & Korean intro/outro omission
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
        const step = Math.max(1, Math.floor(windowSize / 128));
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
        const vadThreshold = maxRms * 0.055;
        const speechSegments = extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold);

        // 1. Detect English speech onset (omitting Korean question announcement)
        let speechStart = speechSegments[0]?.startSec ?? 0;

        if (speechSegments.length > sentences.length && overhead >= 2.0) {
          const remDur0 = duration - speechSegments[0].startSec;
          let bestScore = Math.abs(remDur0 - (expectedEnglishSpeechSec + 0.8));
          let bestIdx = 0;

          const maxIntroIdx = speechSegments.length - sentences.length;
          for (let i = 1; i <= maxIntroIdx; i++) {
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
        } else if (sentences.length === 1 && speechSegments.length >= 2 && overhead >= 2.0) {
          const remDur0 = duration - speechSegments[0].startSec;
          let bestScore = Math.abs(remDur0 - (expectedEnglishSpeechSec + 0.8));
          let bestIdx = 0;

          for (let i = 1; i < speechSegments.length; i++) {
            const prevSeg = speechSegments[i - 1];
            const currSeg = speechSegments[i];
            const gap = currSeg.startSec - prevSeg.endSec;
            const timeFromStart = currSeg.startSec;

            if (timeFromStart > 16.0) break;

            const remainingDur = duration - timeFromStart;
            if (remainingDur < expectedEnglishSpeechSec * 0.65) continue;

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
        } else if (speechSegments.length === 0) {
          const onsetThresh = maxRms * 0.05;
          let speechStartIdx = 0;
          for (let w = 0; w < numWindows; w++) {
            if (energies[w] >= onsetThresh) {
              speechStartIdx = Math.max(0, w - 2);
              break;
            }
          }
          speechStart = Math.max(0, Math.round((speechStartIdx * windowSec - 0.1) * 10) / 10);
        }

        // 2. Detect English speech offset (omitting trailing Korean outro questions / chimes)
        let speechEnd = Math.round(duration * 10) / 10;
        const englishSegments = speechSegments.filter(s => s.startSec >= speechStart - 0.1);
        if (englishSegments.length > 0) {
          const lastEngSeg = englishSegments[englishSegments.length - 1];
          if (englishSegments.length > sentences.length) {
            const targetSeg = englishSegments[sentences.length - 1];
            const span = targetSeg.endSec - speechStart;
            const nextSeg = englishSegments[sentences.length];
            if (span >= expectedEnglishSpeechSec * 0.8 || (nextSeg && nextSeg.startSec - targetSeg.endSec >= 0.5)) {
              speechEnd = Math.min(duration, Math.round((targetSeg.endSec + 0.8) * 10) / 10);
            } else {
              speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
            }
          } else {
            speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
          }
        }

        if (duration - speechEnd <= 0.6) {
          speechEnd = Math.round(duration * 10) / 10;
        }

        // Single sentence case
        if (sentences.length === 1) {
          return [{ start: speechStart, end: speechEnd }];
        }

        const speechDuration = Math.max(1.0, speechEnd - speechStart);

        // Smooth energy curve with moving average (~250ms window)
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

          let startIdx = Math.max(minAllowedIdx, expectedIdx - searchRadius);
          let endIdx = Math.min(maxAllowedIdx, expectedIdx + searchRadius);

          let minVal = Infinity;
          let bestIdx = expectedIdx;
          // When the allowed window is empty (too many sentences for a short audio), clamp
          if (startIdx > endIdx) {
            bestIdx = Math.max(minAllowedIdx, Math.min(maxAllowedIdx, expectedIdx));
          } else {
            for (let k = startIdx; k <= endIdx; k++) {
              const distFromExp = Math.abs(k - expectedIdx) / Math.max(1, searchRadius);
              const score = smoothed[k] * (1.0 + 0.3 * distFromExp);
              if (score < minVal) {
                minVal = score;
                bestIdx = k;
              }
            }
          }

          const valleyTime = Math.round(bestIdx * windowSec * 10) / 10;

          // Find the speech onset of the next sentence following the valley
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

        // Construct boundaries where:
        // 1. Current sentence has generous tail headroom (+0.8s), stopping 0.15s before next sentence
        // 2. Next sentence starts cleanly 0.15s before its actual speech onset
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

        // Clamp so start < end ≤ speechEnd even when many short sentences force starts past speechEnd
        const clampedLastStart = Math.min(curSentenceStart, Math.max(speechStart, speechEnd - 0.3));
        boundaries.push({ start: clampedLastStart, end: speechEnd });
        for (const b of boundaries) {
          if (!b || b.start == null || b.end == null) continue;
          if (b.end <= b.start) b.end = Math.min(speechEnd, b.start + 0.3);
          if (b.end > speechEnd) b.end = speechEnd;
        }
        return boundaries;
      }
    } catch (e) {
      console.warn('Audio silence & valley detection fallback:', e);
    }
  }

  // Step 2: Proportional fallback based on word counts with intro offset
  return proportionalSentenceBoundaries(sentences, duration, expectedEnglishSpeechSec);
}

export function proportionalSentenceBoundaries(sentences, totalDuration, expectedEnglishSpeechSec) {
  if (!sentences || !sentences.length) return [];
  const expSec = expectedEnglishSpeechSec || estimateEnglishSpeechDuration(sentences);
  const overhead = totalDuration - expSec;
  const startOffset = overhead >= 2.5 ? Math.round((overhead - 0.5) * 10) / 10 : 0;
  const effectiveDur = Math.max(1.0, totalDuration - startOffset);

  if (sentences.length === 1) {
    return [{ start: startOffset, end: Math.round(totalDuration * 10) / 10 }];
  }
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
