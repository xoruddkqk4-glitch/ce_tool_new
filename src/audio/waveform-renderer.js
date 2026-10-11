/**
 * Waveform Canvas Renderer
 * Renders symmetrical neon mint waveform bars, sentence-unit zoom, playhead,
 * A-B looper selection box, range drag preview, and 0.5s shadowing overlay.
 */

import { CONSTANTS } from '../config/constants.js';

export class WaveformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  /**
   * Slice or generate sentence-unit waveform peaks (360 bars)
   */
  static extractSentencePeaks(audioBuffer, sentence, totalBars = CONSTANTS.TOTAL_WAVEFORM_BARS) {
    if (!sentence) return [];
    if (sentence.cachedPeaks && sentence.cachedPeaks.length === totalBars) {
      return sentence.cachedPeaks;
    }

    if (audioBuffer && sentence.audioStart !== null && sentence.audioEnd !== null) {
      try {
        const rawData = audioBuffer.getChannelData(0);
        const sr = audioBuffer.sampleRate;
        const startSample = Math.max(0, Math.floor(sentence.audioStart * sr));
        const endSample = Math.min(rawData.length, Math.floor(sentence.audioEnd * sr));
        const sampleCount = endSample - startSample;

        if (sampleCount > totalBars) {
          const blockSize = Math.floor(sampleCount / totalBars);
          const peaks = [];
          let maxPeak = 0;
          for (let i = 0; i < totalBars; i++) {
            const s = startSample + i * blockSize;
            const e = Math.min(s + blockSize, endSample);
            let sum = 0;
            for (let j = s; j < e; j += 4) {
              const val = Math.abs(rawData[j]);
              if (val > sum) sum = val;
            }
            peaks.push(sum);
            if (sum > maxPeak) maxPeak = sum;
          }
          if (maxPeak > 0) {
            const normalized = peaks.map(p => Math.min(1, (p / maxPeak) * 0.92));
            sentence.cachedPeaks = normalized;
            return normalized;
          }
          sentence.cachedPeaks = peaks;
          return peaks;
        }
      } catch (e) {
        console.warn('Sentence audio peak slice error:', e);
      }
    }

    // Word rhythm fallback
    const words = (sentence.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const peaks = [];
      const barsPerWord = totalBars / words.length;
      for (let i = 0; i < totalBars; i++) {
        const posInWord = (i % barsPerWord) / barsPerWord;
        if (posInWord < 0.80) {
          const normPos = posInWord / 0.80;
          const diamondEnv = Math.sin(normPos * Math.PI);
          const texture = 0.90 + 0.10 * Math.sin(i * 1.5) * Math.cos(i * 0.7);
          const peak = Math.max(0.14, Math.min(0.96, diamondEnv * texture * 0.88));
          peaks.push(peak);
        } else {
          const baseline = 0.08 + 0.04 * Math.sin(i * 0.8);
          peaks.push(baseline);
        }
      }
      sentence.cachedPeaks = peaks;
      return peaks;
    }

    // Baseline fallback
    const fallback = [];
    for (let i = 0; i < totalBars; i++) {
      const wave = 0.25 + 0.45 * Math.sin(i * 0.12) * Math.cos(i * 0.06);
      fallback.push(Math.max(0.1, Math.min(0.85, Math.abs(wave))));
    }
    return fallback;
  }

  draw(params) {
    if (!this.canvas || !this.ctx) return;
    const {
      activeSentence,
      sentenceIndex,
      totalSentences,
      currentTime,
      totalDuration,
      loopStart,
      loopEnd,
      isRangeDragging,
      dragStartX,
      currentMouseX,
      isShadowingWaiting,
      formatTimeFn
    } = params;

    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = (typeof canvas.getBoundingClientRect === 'function')
      ? canvas.getBoundingClientRect()
      : { width: canvas.width || 800, height: canvas.height || 110 };
    const width = rect.width || 800;
    const height = 110;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Dark background
    ctx.fillStyle = '#090e17';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    const centerY = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Sentence time window
    const stnStart = (activeSentence && activeSentence.audioStart !== null) ? activeSentence.audioStart : 0;
    const stnEnd = (activeSentence && activeSentence.audioEnd !== null) ? activeSentence.audioEnd : totalDuration;
    const stnDuration = Math.max(0.1, stnEnd - stnStart);

    const curTime = currentTime || 0;
    const sentenceProgress = Math.max(0, Math.min(1, (curTime - stnStart) / stnDuration));
    const progressX = sentenceProgress * width;

    // 2. A-B Loop Box
    if (loopStart !== null) {
      const x1 = Math.max(0, Math.min(width, ((loopStart - stnStart) / stnDuration) * width));
      if (loopEnd !== null) {
        const x2 = Math.max(0, Math.min(width, ((loopEnd - stnStart) / stnDuration) * width));
        if (x2 > x1 + 1) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
          ctx.fillRect(x1, 0, x2 - x1, height);

          ctx.strokeStyle = 'rgb(0, 255, 204)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
          ctx.moveTo(x2, 0); ctx.lineTo(x2, height);
          ctx.stroke();

          ctx.fillStyle = 'rgb(0, 255, 204)';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('[A]', x1 + 3, 14);
          ctx.fillText('[B]', Math.max(x1 + 22, x2 - 22), 14);
        }
      } else {
        // [A] only
        ctx.save();
        ctx.strokeStyle = 'rgb(0, 255, 204)';
        ctx.lineWidth = 2;
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgb(0, 255, 204)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('[A] 시작점', Math.min(width - 65, x1 + 4), 14);
      }
    }

    // 3. Range Drag Selection Preview
    if (isRangeDragging && dragStartX !== null && currentMouseX !== null) {
      const x1 = Math.min(dragStartX, currentMouseX);
      const x2 = Math.max(dragStartX, currentMouseX);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
      ctx.fillRect(x1, 0, x2 - x1, height);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0, x2 - x1, height);
    }

    // 4. Waveform Bars
    const bars = activeSentence ? (activeSentence.cachedPeaks || []) : [];
    const totalBars = bars.length || CONSTANTS.TOTAL_WAVEFORM_BARS;
    const barWidth = Math.max(1.8, (width / totalBars) * 0.72);

    for (let i = 0; i < totalBars; i++) {
      const bx = (i / totalBars) * width;
      const peak = bars[i] || 0.12;
      const bh = Math.max(2, peak * (height / 2) * 0.88);

      if (bx <= progressX) {
        ctx.fillStyle = 'rgb(0, 255, 204)';
        ctx.shadowColor = 'rgba(0, 255, 204, 0.75)';
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(0, 255, 204, 0.32)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2, [barWidth / 2]);
      } else {
        ctx.rect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2);
      }
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // 5. Playhead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(progressX, 6, 3.5, 0, Math.PI * 2);
    ctx.arc(progressX, height - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5.5 Sentence Unit Badge
    if (activeSentence && totalSentences > 0) {
      ctx.shadowBlur = 0;
      const fmt = formatTimeFn || (s => `${s.toFixed(1)}s`);
      const badgeText = `SENTENCE S${(sentenceIndex || 0) + 1}/${totalSentences} (${fmt(stnStart)} ~ ${fmt(stnEnd)})`;
      ctx.font = 'bold 10px monospace';
      const badgeW = ctx.measureText(badgeText).width + 16;

      ctx.fillStyle = 'rgba(9, 14, 23, 0.78)';
      ctx.fillRect(8, 8, badgeW, 20);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, badgeW, 20);

      ctx.fillStyle = 'rgb(0, 255, 204)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 16, 18);
    }

    // 6. Shadowing 0.5s pause overlay
    if (isShadowingWaiting) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';
      ctx.fillStyle = 'rgba(9, 14, 23, 0.88)';
      const bannerW = 210;
      const bannerH = 34;
      ctx.fillRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);
      ctx.strokeStyle = 'rgb(0, 255, 204)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);

      ctx.fillStyle = 'rgb(0, 255, 204)';
      ctx.font = 'bold 12px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗣️ 0.5s 쉐도잉 대기 중...', width / 2, centerY);
    }

    ctx.restore();
  }
}
