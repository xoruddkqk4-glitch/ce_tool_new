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

    // 1. If decoded audioBuffer exists, slice real PCM samples
    if (audioBuffer && !sentence.isSynthesizedAudio) {
      try {
        const rawData = audioBuffer.getChannelData(0);
        const sr = audioBuffer.sampleRate;
        const sttStart = (sentence.audioStart !== null && sentence.audioStart !== undefined) ? sentence.audioStart : 0;
        const sttEnd = (sentence.audioEnd !== null && sentence.audioEnd !== undefined) ? sentence.audioEnd : audioBuffer.duration;
        const startSample = Math.max(0, Math.floor(sttStart * sr));
        const endSample = Math.min(rawData.length, Math.floor(sttEnd * sr));
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
          if (maxPeak > 0.001) {
            const normalized = peaks.map(p => Math.min(1, Math.max(0.05, (p / maxPeak) * 0.95)));
            sentence.cachedPeaks = normalized;
            return normalized;
          }
        }
      } catch (e) {
        console.warn('Sentence audio peak slice error:', e);
      }
    }

    // 2. Dynamic, realistic speech rhythm fallback
    const words = (sentence.text || '').trim().split(/\s+/).filter(Boolean);
    const numWords = Math.max(1, words.length);
    const barsPerWord = totalBars / numWords;
    const peaks = [];

    for (let i = 0; i < totalBars; i++) {
      const wordIdx = Math.min(numWords - 1, Math.floor(i / barsPerWord));
      const posInWord = (i % barsPerWord) / barsPerWord;
      const wordStr = words[wordIdx] || 'word';

      // Vary amplitude by word length & stress pattern
      const isContentWord = wordStr.length >= 4;
      const stressFactor = isContentWord ? 0.92 : (wordStr.length <= 2 ? 0.42 : 0.68);

      if (posInWord < 0.82) {
        const normPos = posInWord / 0.82;
        // Asymmetric bell curve for natural syllable onset and decay
        const envelope = Math.pow(Math.sin(normPos * Math.PI), 1.2);
        // Multi-frequency micro-texture (speech harmonics)
        const harmonics = 0.80 + 0.14 * Math.sin(i * 1.7) * Math.cos(i * 0.85) + 0.06 * Math.sin(i * 3.3);
        const peak = Math.max(0.12, Math.min(0.96, envelope * harmonics * stressFactor));
        peaks.push(peak);
      } else {
        // Inter-word dip / acoustic pause
        const pauseFloor = 0.05 + 0.03 * Math.sin(i * 0.6);
        peaks.push(pauseFloor);
      }
    }

    sentence.cachedPeaks = peaks;
    return peaks;
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

    // Detect Theme (Light Mode vs Dark Mode)
    const isLight = (typeof document !== 'undefined') &&
      (document.documentElement.getAttribute('data-theme') === 'light' ||
       document.body?.getAttribute('data-theme') === 'light');

    const palette = isLight ? {
      bg: '#f8fafc',
      centerLine: 'rgba(148, 163, 184, 0.35)',
      barActive: '#4f46e5',
      barInactive: 'rgba(99, 102, 241, 0.28)',
      playhead: '#312e81',
      playheadDot: '#4338ca',
      playheadGlow: 'rgba(79, 70, 229, 0.4)',
      loopBoxBg: 'rgba(99, 102, 241, 0.12)',
      loopBoxBorder: '#6366f1',
      loopText: '#4338ca',
      dragBg: 'rgba(99, 102, 241, 0.16)',
      dragBorder: '#6366f1',
      badgeBg: 'rgba(255, 255, 255, 0.94)',
      badgeBorder: '#cbd5e1',
      badgeText: '#334155',
      bannerBg: 'rgba(255, 255, 255, 0.96)',
      bannerBorder: '#6366f1',
      bannerText: '#4338ca'
    } : {
      bg: '#090e17',
      centerLine: 'rgba(255, 255, 255, 0.08)',
      barActive: 'rgb(0, 255, 204)',
      barInactive: 'rgba(0, 255, 204, 0.32)',
      playhead: '#ffffff',
      playheadDot: '#ffffff',
      playheadGlow: 'rgba(0, 255, 204, 0.85)',
      loopBoxBg: 'rgba(6, 182, 212, 0.22)',
      loopBoxBorder: 'rgb(0, 255, 204)',
      loopText: 'rgb(0, 255, 204)',
      dragBg: 'rgba(0, 255, 204, 0.25)',
      dragBorder: 'rgba(0, 255, 204, 0.9)',
      badgeBg: 'rgba(9, 14, 23, 0.78)',
      badgeBorder: 'rgba(0, 255, 204, 0.45)',
      badgeText: 'rgb(0, 255, 204)',
      bannerBg: 'rgba(9, 14, 23, 0.88)',
      bannerBorder: 'rgb(0, 255, 204)',
      bannerText: 'rgb(0, 255, 204)'
    };

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    // Fast dimension retrieval to prevent synchronous layout thrashing (getBoundingClientRect)
    const clientW = canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 800);
    const width = clientW || 800;
    const height = 100;

    const targetCanvasW = Math.floor(width * dpr);
    const targetCanvasH = Math.floor(height * dpr);
    if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
      canvas.width = targetCanvasW;
      canvas.height = targetCanvasH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    const centerY = height / 2;
    ctx.strokeStyle = palette.centerLine;
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
          ctx.fillStyle = palette.loopBoxBg;
          ctx.fillRect(x1, 0, x2 - x1, height);

          ctx.strokeStyle = palette.loopBoxBorder;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
          ctx.moveTo(x2, 0); ctx.lineTo(x2, height);
          ctx.stroke();

          ctx.fillStyle = palette.loopText;
          ctx.font = 'bold 11px monospace';
          ctx.fillText('[A]', x1 + 3, 14);
          ctx.fillText('[B]', Math.max(x1 + 22, x2 - 22), 14);
        }
      } else {
        // [A] only
        ctx.save();
        ctx.strokeStyle = palette.loopBoxBorder;
        ctx.lineWidth = 2;
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = palette.loopText;
        ctx.font = 'bold 11px monospace';
        ctx.fillText('[A] 시작점', Math.min(width - 65, x1 + 4), 14);
      }
    }

    // 3. Range Drag Selection Preview
    if (isRangeDragging && dragStartX !== null && currentMouseX !== null) {
      const x1 = Math.min(dragStartX, currentMouseX);
      const x2 = Math.max(dragStartX, currentMouseX);
      ctx.fillStyle = palette.dragBg;
      ctx.fillRect(x1, 0, x2 - x1, height);
      ctx.strokeStyle = palette.dragBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0, x2 - x1, height);
    }

    // 4. Waveform Bars (High-performance batched rendering)
    let bars = activeSentence ? activeSentence.cachedPeaks : null;
    if (!bars || bars.length === 0) {
      if (activeSentence) {
        bars = WaveformRenderer.extractSentencePeaks(params.audioBuffer, activeSentence, CONSTANTS.TOTAL_WAVEFORM_BARS);
        activeSentence.cachedPeaks = bars;
      } else {
        bars = [];
      }
    }
    const totalBars = bars.length || CONSTANTS.TOTAL_WAVEFORM_BARS;
    const barWidth = Math.max(1.8, (width / totalBars) * 0.72);
    const halfH = height / 2;

    // Fast 2-pass drawing (Inactive bars then Active bars) eliminates 360 separate state changes
    // Pass 4a: Inactive (Unplayed) Bars
    ctx.fillStyle = palette.barInactive;
    ctx.shadowBlur = 0;
    for (let i = 0; i < totalBars; i++) {
      const bx = (i / totalBars) * width;
      if (bx > progressX) {
        const peak = bars[i] !== undefined ? bars[i] : 0.12;
        const bh = Math.max(2, peak * halfH * 0.88);
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2, [barWidth / 2]);
          ctx.fill();
        } else {
          ctx.fillRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2);
        }
      }
    }

    // Pass 4b: Active (Played) Bars
    ctx.fillStyle = palette.barActive;
    for (let i = 0; i < totalBars; i++) {
      const bx = (i / totalBars) * width;
      if (bx <= progressX) {
        const peak = bars[i] !== undefined ? bars[i] : 0.12;
        const bh = Math.max(2, peak * halfH * 0.88);
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2, [barWidth / 2]);
          ctx.fill();
        } else {
          ctx.fillRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2);
        }
      }
    }

    // 5. Playhead
    ctx.strokeStyle = palette.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    ctx.fillStyle = palette.playheadDot;
    ctx.beginPath();
    ctx.arc(progressX, 6, 3.5, 0, Math.PI * 2);
    ctx.arc(progressX, height - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5.5 Sentence Unit Badge
    if (activeSentence && totalSentences > 0) {
      const fmt = formatTimeFn || (s => `${s.toFixed(1)}s`);
      const badgeText = `SENTENCE S${(sentenceIndex || 0) + 1}/${totalSentences} (${fmt(stnStart)} ~ ${fmt(stnEnd)})`;
      ctx.font = 'bold 10px monospace';
      const badgeW = ctx.measureText(badgeText).width + 16;

      ctx.fillStyle = palette.badgeBg;
      ctx.fillRect(8, 8, badgeW, 20);
      ctx.strokeStyle = palette.badgeBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, badgeW, 20);

      ctx.fillStyle = palette.badgeText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 16, 18);
    }

    // 6. Shadowing 0.5s pause overlay
    if (isShadowingWaiting) {
      ctx.fillStyle = palette.bannerBg;
      const bannerW = 210;
      const bannerH = 34;
      ctx.fillRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);
      ctx.strokeStyle = palette.bannerBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);

      ctx.fillStyle = palette.bannerText;
      ctx.font = 'bold 12px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗣️ 0.5s 쉐도잉 대기 중...', width / 2, centerY);
    }

    ctx.restore();
  }
}

