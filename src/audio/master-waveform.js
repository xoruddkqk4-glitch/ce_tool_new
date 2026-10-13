/**
 * Master Audio Waveform & Sentence Segment Selector
 * Renders full-audio PCM timeline in Stage 1 Input View with interactive
 * draggable sentence segment boundaries, silence snapping, and click-to-preview.
 */

import { formatTime } from './looper-engine.js';
import { playbackController } from './playback-controller.js';

export class MasterWaveformTimeline {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;
    this.audioBuffer = null;
    this.sentenceList = [];
    this.options = options;

    this.peaks = [];
    this.totalBars = 600;
    this.hoverInfo = null; // { type: 'boundary'|'segment', index: number, edge: 'start'|'end' }
    this.activeDrag = null; // { index: number, edge: 'start'|'end', startX: number, origTime: number }
    this.snapEnabled = true;

    this.playbackTime = null;
    this.isPlaying = false;
    this.animFrameId = null;

    this.colors = [
      { fill: 'rgba(99, 102, 241, 0.18)', stroke: 'rgba(129, 140, 248, 0.85)', tag: '#818cf8' }, // Indigo
      { fill: 'rgba(16, 185, 129, 0.18)', stroke: 'rgba(52, 211, 153, 0.85)', tag: '#34d399' }, // Emerald
      { fill: 'rgba(245, 158, 11, 0.18)', stroke: 'rgba(251, 191, 36, 0.85)', tag: '#fbbf24' }, // Amber
      { fill: 'rgba(236, 72, 153, 0.18)', stroke: 'rgba(244, 114, 182, 0.85)', tag: '#f472b6' }, // Pink
      { fill: 'rgba(14, 165, 233, 0.18)', stroke: 'rgba(56, 189, 248, 0.85)', tag: '#38bdf8' }, // Cyan
      { fill: 'rgba(168, 85, 247, 0.18)', stroke: 'rgba(192, 132, 252, 0.85)', tag: '#c084fc' }  // Purple
    ];

    this.initEvents();
  }

  setAudioBuffer(audioBuffer) {
    this.audioBuffer = audioBuffer;
    this.peaks = [];
    if (audioBuffer) {
      this.extractPeaks();
    }
    this.draw();
  }

  setSentenceList(sentenceList) {
    this.sentenceList = sentenceList || [];
    this.draw();
  }

  setSnapEnabled(enabled) {
    this.snapEnabled = !!enabled;
  }

  extractPeaks() {
    if (!this.audioBuffer) return;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const totalSamples = rawData.length;
      const blockSize = Math.max(1, Math.floor(totalSamples / this.totalBars));
      const peaks = [];
      let maxVal = 0;

      for (let i = 0; i < this.totalBars; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, totalSamples);
        let sum = 0;
        const step = Math.max(1, Math.floor(blockSize / 64));
        let count = 0;
        for (let j = start; j < end; j += step) {
          const val = Math.abs(rawData[j]);
          if (val > sum) sum = val;
          count++;
        }
        peaks.push(sum);
        if (sum > maxVal) maxVal = sum;
      }

      if (maxVal > 0.001) {
        this.peaks = peaks.map(p => Math.min(1, Math.max(0.04, (p / maxVal) * 0.95)));
      } else {
        this.peaks = new Array(this.totalBars).fill(0.1);
      }
    } catch (e) {
      console.warn('Master waveform peak extraction error:', e);
      this.peaks = new Array(this.totalBars).fill(0.1);
    }
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    const duration = this.audioBuffer ? this.audioBuffer.duration : 1;

    // 1. Background Grid & Glass styling
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // Subtle time division grid lines every 5 seconds (or 1s for short audio)
    const timeStep = duration > 30 ? 5 : (duration > 10 ? 2 : 1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';

    for (let t = 0; t <= duration; t += timeStep) {
      const x = Math.round((t / duration) * w);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      if (t > 0 && x < w - 24) {
        ctx.fillText(`${t}s`, x + 2, 11);
      }
    }

    // 2. Base Waveform PCM Bars
    if (this.peaks.length > 0) {
      const numBars = this.peaks.length;
      const barSpacing = w / numBars;
      const barWidth = Math.max(1, barSpacing * 0.72);
      const halfH = h / 2;

      for (let i = 0; i < numBars; i++) {
        const peak = this.peaks[i];
        const barH = Math.max(2, peak * (halfH - 8));
        const x = i * barSpacing;

        ctx.fillStyle = 'rgba(0, 255, 204, 0.35)';
        ctx.fillRect(x, halfH - barH, barWidth, barH * 2);
      }
    }

    // 3. Sentence Segment Overlays
    const validSentences = (this.sentenceList || []).filter(s => s.audioStart !== null && s.audioEnd !== null);

    validSentences.forEach((stn, idx) => {
      const startX = Math.round((stn.audioStart / duration) * w);
      const endX = Math.round((stn.audioEnd / duration) * w);
      const segW = Math.max(4, endX - startX);
      const color = this.colors[idx % this.colors.length];

      const isHovered = this.hoverInfo && this.hoverInfo.index === stn.index;
      const isDragging = this.activeDrag && this.activeDrag.index === stn.index;

      // Segment Background
      ctx.fillStyle = (isHovered || isDragging) ? color.fill.replace('0.18', '0.32') : color.fill;
      ctx.fillRect(startX, 0, segW, h);

      // Top Header Border
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, 0, segW, h);

      // Label Tag: S1 (00:03.2)
      ctx.fillStyle = color.tag;
      ctx.font = 'bold 10px sans-serif';
      const label = `S${stn.index + 1} (${this.formatSec(stn.audioStart)}~${this.formatSec(stn.audioEnd)})`;
      ctx.fillText(label, startX + 5, 22);

      // Left Boundary Handle Line
      const isStartHovered = isHovered && this.hoverInfo.edge === 'start';
      ctx.strokeStyle = isStartHovered ? '#ffffff' : color.stroke;
      ctx.lineWidth = isStartHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.stroke();

      // Right Boundary Handle Line
      const isEndHovered = isHovered && this.hoverInfo.edge === 'end';
      ctx.strokeStyle = isEndHovered ? '#ffffff' : color.stroke;
      ctx.lineWidth = isEndHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, h);
      ctx.stroke();

      // Grab handle diamond indicators
      this.drawHandleDiamond(ctx, startX, h / 2, isStartHovered ? '#ffffff' : color.tag);
      this.drawHandleDiamond(ctx, endX, h / 2, isEndHovered ? '#ffffff' : color.tag);
    });

    // 4. Playhead Line
    if (this.playbackTime !== null && this.playbackTime >= 0 && this.playbackTime <= duration) {
      const playheadX = Math.round((this.playbackTime / duration) * w);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawHandleDiamond(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
  }

  initEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousemove', (e) => this.handleWindowMouseMove(e));
      window.addEventListener('mouseup', (e) => this.handleWindowMouseUp(e));
    }
    this.canvas.addEventListener('mouseleave', () => {
      if (!this.activeDrag) {
        this.hoverInfo = null;
        this.draw();
      }
    });

    // Handle container resize
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncCanvasSize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  syncCanvasSize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const newW = Math.floor(rect.width);
    if (newW > 0 && newW !== this.canvas.width) {
      this.canvas.width = newW;
      this.draw();
    }
  }

  getTimeAtX(clientX) {
    if (!this.canvas || !this.audioBuffer) return 0;
    const rect = this.canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const fraction = relX / rect.width;
    return fraction * this.audioBuffer.duration;
  }

  handleMouseMove(e) {
    if (this.activeDrag) return;
    if (!this.audioBuffer || !this.sentenceList.length) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const duration = this.audioBuffer.duration;
    const thresholdPx = 8;

    let found = null;

    // Check boundary lines first
    for (let i = 0; i < this.sentenceList.length; i++) {
      const stn = this.sentenceList[i];
      if (stn.audioStart === null || stn.audioEnd === null) continue;

      const startX = (stn.audioStart / duration) * w;
      const endX = (stn.audioEnd / duration) * w;

      if (Math.abs(x - startX) <= thresholdPx) {
        found = { type: 'boundary', index: stn.index, edge: 'start' };
        break;
      }
      if (Math.abs(x - endX) <= thresholdPx) {
        found = { type: 'boundary', index: stn.index, edge: 'end' };
        break;
      }
    }

    // If not hovering boundary, check inside segment
    if (!found) {
      for (let i = 0; i < this.sentenceList.length; i++) {
        const stn = this.sentenceList[i];
        if (stn.audioStart === null || stn.audioEnd === null) continue;
        const startX = (stn.audioStart / duration) * w;
        const endX = (stn.audioEnd / duration) * w;
        if (x >= startX && x <= endX) {
          found = { type: 'segment', index: stn.index };
          break;
        }
      }
    }

    this.hoverInfo = found;
    if (found && found.type === 'boundary') {
      this.canvas.style.cursor = 'col-resize';
    } else if (found && found.type === 'segment') {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }

    this.draw();
  }

  handleMouseDown(e) {
    if (!this.audioBuffer || !this.sentenceList.length) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (this.hoverInfo && this.hoverInfo.type === 'boundary') {
      const stn = this.sentenceList.find(s => s.index === this.hoverInfo.index);
      if (stn) {
        this.activeDrag = {
          index: stn.index,
          edge: this.hoverInfo.edge,
          startX: e.clientX,
          origStart: stn.audioStart,
          origEnd: stn.audioEnd
        };
      }
    } else if (this.hoverInfo && this.hoverInfo.type === 'segment') {
      // Click inside segment: Play this segment and select it
      const stn = this.sentenceList.find(s => s.index === this.hoverInfo.index);
      if (stn && stn.audioStart !== null && stn.audioEnd !== null) {
        playbackController.playSegment(stn.audioStart, stn.audioEnd, { owner: 'master-waveform' });
        if (typeof this.options.onSegmentSelect === 'function') {
          this.options.onSegmentSelect(stn.index);
        }
      }
    }
  }

  handleWindowMouseMove(e) {
    if (!this.activeDrag || !this.audioBuffer) return;

    let targetTime = this.getTimeAtX(e.clientX);
    const duration = this.audioBuffer.duration;
    targetTime = Math.max(0, Math.min(duration, targetTime));

    if (this.snapEnabled) {
      targetTime = this.findNearestSilenceTime(targetTime, 0.25);
    }

    targetTime = Math.round(targetTime * 10) / 10;

    const stn = this.sentenceList.find(s => s.index === this.activeDrag.index);
    if (!stn) return;

    if (this.activeDrag.edge === 'start') {
      // Must be < audioEnd - 0.2
      const maxStart = Math.max(0, (stn.audioEnd || duration) - 0.3);
      stn.audioStart = Math.min(maxStart, targetTime);
      stn.cachedPeaks = null;
    } else {
      // Must be > audioStart + 0.2
      const minEnd = (stn.audioStart || 0) + 0.3;
      stn.audioEnd = Math.max(minEnd, Math.min(duration, targetTime));
      stn.cachedPeaks = null;
    }

    this.draw();

    if (typeof this.options.onSegmentChange === 'function') {
      this.options.onSegmentChange(stn.index, stn.audioStart, stn.audioEnd, false);
    }
  }

  handleWindowMouseUp(e) {
    if (!this.activeDrag) return;

    const stn = this.sentenceList.find(s => s.index === this.activeDrag.index);
    if (stn && typeof this.options.onSegmentChange === 'function') {
      this.options.onSegmentChange(stn.index, stn.audioStart, stn.audioEnd, true);
    }

    this.activeDrag = null;
    this.draw();
  }

  findNearestSilenceTime(time, thresholdSec = 0.25) {
    if (!this.audioBuffer) return time;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const sr = this.audioBuffer.sampleRate;
      const centerSample = Math.floor(time * sr);
      const rangeSamples = Math.floor(thresholdSec * sr);
      const startSample = Math.max(0, centerSample - rangeSamples);
      const endSample = Math.min(rawData.length, centerSample + rangeSamples);

      let minRms = Infinity;
      let minSample = centerSample;
      const windowSize = Math.floor(sr * 0.04); // 40ms window

      for (let s = startSample; s < endSample - windowSize; s += Math.floor(windowSize / 2)) {
        let sumSq = 0;
        for (let j = 0; j < windowSize; j += 8) {
          const v = rawData[s + j];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / (windowSize / 8));
        if (rms < minRms) {
          minRms = rms;
          minSample = s + Math.floor(windowSize / 2);
        }
      }

      if (minRms < 0.05) {
        return minSample / sr;
      }
    } catch (e) {}
    return time;
  }

  setPlayheadTime(time) {
    this.playbackTime = time;
    this.draw();
  }

  formatSec(sec) {
    if (sec === null || sec === undefined) return '0.0s';
    return `${sec.toFixed(1)}s`;
  }
}
