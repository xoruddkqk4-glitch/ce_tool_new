/**
 * Audio Sentence Boundary Detection Engine
 * Combines Web Audio API PCM RMS energy silence detection with proportional time fallback.
 */

export function detectAudioSentenceBoundaries(audioBuffer, sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || (audioBuffer ? audioBuffer.duration : 0);

  if (!duration || duration <= 0) {
    return sentences.map(() => ({ start: null, end: null }));
  }

  if (sentences.length === 1) {
    return [{ start: 0, end: Math.round(duration * 10) / 10 }];
  }

  // Step 1: Attempt PCM RMS silence dip detection if audioBuffer exists
  if (audioBuffer) {
    try {
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSec = 0.05; // 50ms window
      const windowSize = Math.floor(sampleRate * windowSec);
      const numWindows = Math.floor(rawData.length / windowSize);

      const energies = [];
      let maxRms = 0;
      for (let w = 0; w < numWindows; w++) {
        let sumSq = 0;
        const offset = w * windowSize;
        for (let k = 0; k < windowSize; k += 4) {
          const v = rawData[offset + k];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / (windowSize / 4));
        energies.push(rms);
        if (rms > maxRms) maxRms = rms;
      }

      const silenceThresh = maxRms * 0.08;
      const silencePauses = [];
      let inSilence = false;
      let silenceStart = 0;

      for (let w = 0; w < numWindows; w++) {
        if (energies[w] < silenceThresh) {
          if (!inSilence) {
            inSilence = true;
            silenceStart = w * windowSec;
          }
        } else {
          if (inSilence) {
            const silenceDur = (w * windowSec) - silenceStart;
            if (silenceDur >= 0.2 && silenceStart > 0.3 && (w * windowSec) < duration - 0.3) {
              silencePauses.push(silenceStart + silenceDur / 2);
            }
            inSilence = false;
          }
        }
      }

      if (silencePauses.length >= sentences.length - 1) {
        const weights = sentences.map(s => Math.max(3, s.trim().split(/\s+/).length));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let curWeight = 0;
        const splitPoints = [];

        for (let i = 0; i < sentences.length - 1; i++) {
          curWeight += weights[i];
          const expectedTime = duration * (curWeight / totalWeight);
          let closest = silencePauses[0];
          let minDist = Math.abs(closest - expectedTime);
          for (const p of silencePauses) {
            const d = Math.abs(p - expectedTime);
            if (d < minDist) {
              minDist = d;
              closest = p;
            }
          }
          splitPoints.push(Math.round(closest * 10) / 10);
        }

        const result = [];
        let lastT = 0;
        for (let i = 0; i < sentences.length; i++) {
          const endT = i === sentences.length - 1 ? Math.round(duration * 10) / 10 : splitPoints[i];
          result.push({ start: lastT, end: Math.max(lastT + 0.3, endT) });
          lastT = endT;
        }
        return result;
      }
    } catch (e) {
      console.warn('Audio silence detection fallback:', e);
    }
  }

  // Step 2: Proportional fallback based on word counts
  return proportionalSentenceBoundaries(sentences, duration);
}

export function proportionalSentenceBoundaries(sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  if (sentences.length === 1) {
    return [{ start: 0, end: Math.round(totalDuration * 10) / 10 }];
  }
  const weights = sentences.map(s => Math.max(3, s.trim().split(/\s+/).length));
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
