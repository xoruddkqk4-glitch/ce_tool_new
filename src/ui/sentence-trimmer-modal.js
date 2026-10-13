/**
 * Sentence Audio Waveform Trimmer Modal
 * High-resolution zoomed waveform editor for adjusting individual sentence audioStart & audioEnd
 * with visual draggable handles, numeric inputs, and instant segment preview playback.
 */

import { playbackController } from '../audio/playback-controller.js';
import { toast } from './toast-manager.js';

export class SentenceTrimmerModal {
  constructor() {
    this.modalEl = document.getElementById('sentenceTrimmerModal');
    this.canvas = document.getElementById('trimmerCanvas');
    this.ctx = (this.canvas && typeof this.canvas.getContext === 'function') ? this.canvas.getContext('2d') : null;

    this.titleEl = document.getElementById('trimmerModalTitle');
    this.textPreviewEl = document.getElementById('trimmerStnText');
    this.inputStart = document.getElementById('trimmerInputStart');
    this.inputEnd = document.getElementById('trimmerInputEnd');
    this.btnPlay = document.getElementById('btnTrimmerPlaySegment');
    this.btnSave = document.getElementById('btnSaveTrimmer');
    this.btnCancel = document.getElementById('btnCancelTrimmer');
    this.btnClose = document.getElementById('btnCloseTrimmerModal');

    this.currentStn = null;
    this.audioBuffer = null;
    this.onSave = null;

    this.zoomStart = 0;
    this.zoomEnd = 10;
    this.currentStart = 0;
    this.currentEnd = 5;

    this.activeDrag = null; // 'start' | 'end' | 'body'
    this.dragStartX = 0;
    this.dragOrigStart = 0;
    this.dragOrigEnd = 0;

    this.peaks = [];
    this.initEvents();
  }

  open(stn, audioBuffer, onSaveCallback) {
    if (!stn || !audioBuffer) return;
    this.currentStn = stn;
    this.audioBuffer = audioBuffer;
    this.onSave = onSaveCallback;

    const totalDur = audioBuffer.duration || 1;
    this.currentStart = stn.audioStart !== null ? Math.max(0, stn.audioStart) : 0;
    this.currentEnd = stn.audioEnd !== null ? Math.min(totalDur, stn.audioEnd) : Math.min(totalDur, this.currentStart + 4);

    // Zoom view: 1.8s margin before and after sentence
    const margin = 1.8;
    this.zoomStart = Math.max(0, this.currentStart - margin);
    this.zoomEnd = Math.min(totalDur, this.currentEnd + margin);

    if (this.titleEl) {
      this.titleEl.textContent = `문장 S${stn.index + 1} 음성 구간 정밀 조정`;
    }
    if (this.textPreviewEl) {
      this.textPreviewEl.textContent = `"${stn.text || ''}"`;
    }

    this.updateInputFields();
    this.extractZoomedPeaks();

    if (this.modalEl) {
      this.modalEl.classList.remove('hidden');
    }

    requestAnimationFrame(() => {
      this.syncCanvasSize();
      this.draw();
    });
  }

  close() {
    playbackController.stopAll();
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
    this.currentStn = null;
  }

  updateInputFields() {
    if (this.inputStart) this.inputStart.value = (Math.round(this.currentStart * 10) / 10).toFixed(1);
    if (this.inputEnd) this.inputEnd.value = (Math.round(this.currentEnd * 10) / 10).toFixed(1);
  }

  syncCanvasSize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    if (w > 0 && w !== this.canvas.width) {
      this.canvas.width = w;
      this.extractZoomedPeaks();
    }
  }

  extractZoomedPeaks() {
    if (!this.audioBuffer) return;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const sr = this.audioBuffer.sampleRate;
      const startSample = Math.floor(this.zoomStart * sr);
      const endSample = Math.min(rawData.length, Math.floor(this.zoomEnd * sr));
      const rangeSamples = Math.max(1, endSample - startSample);
      const numBars = 320;
      const blockSize = Math.max(1, Math.floor(rangeSamples / numBars));
      const peaks = [];
      let maxVal = 0;

      for (let i = 0; i < numBars; i++) {
        const s = startSample + i * blockSize;
        const e = Math.min(s + blockSize, endSample);
        let sum = 0;
        let count = 0;
        for (let j = s; j < e; j += 4) {
          const val = Math.abs(rawData[j]);
          if (val > sum) sum = val;
          count++;
        }
        peaks.push(sum);
        if (sum > maxVal) maxVal = sum;
      }

      if (maxVal > 0.001) {
        this.peaks = peaks.map(p => Math.min(1, Math.max(0.05, (p / maxVal) * 0.95)));
      } else {
        this.peaks = new Array(numBars).fill(0.1);
      }
    } catch (e) {
      this.peaks = new Array(320).fill(0.1);
    }
  }

  timeToX(time) {
    if (!this.canvas) return 0;
    const span = Math.max(0.1, this.zoomEnd - this.zoomStart);
    return Math.round(((time - this.zoomStart) / span) * this.canvas.width);
  }

  xToTime(x) {
    if (!this.canvas) return 0;
    const fraction = Math.max(0, Math.min(1, x / this.canvas.width));
    const span = Math.max(0.1, this.zoomEnd - this.zoomStart);
    return this.zoomStart + fraction * span;
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const startX = this.timeToX(this.currentStart);
    const endX = this.timeToX(this.currentEnd);
    const activeW = Math.max(4, endX - startX);

    // 2. Pre-selection dim background
    if (startX > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, startX, h);
    }

    // Active Selection Background
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(startX, 0, activeW, h);

    // Post-selection dim background
    if (endX < w) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(endX, 0, w - endX, h);
    }

    // 3. High-definition PCM Bars
    if (this.peaks.length > 0) {
      const numBars = this.peaks.length;
      const barSpacing = w / numBars;
      const barW = Math.max(1, barSpacing * 0.75);
      const halfH = h / 2;

      for (let i = 0; i < numBars; i++) {
        const peak = this.peaks[i];
        const barH = Math.max(2, peak * (halfH - 10));
        const x = i * barSpacing;

        const isInside = x >= startX && x <= endX;
        ctx.fillStyle = isInside ? '#00ffcc' : 'rgba(100, 116, 139, 0.4)';
        ctx.fillRect(x, halfH - barH, barW, barH * 2);
      }
    }

    // 4. Selection Active Border Box
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 0, activeW, h);

    // 5. Handles (Start & End)
    this.drawHandle(ctx, startX, h, '#10b981', '시작');
    this.drawHandle(ctx, endX, h, '#f43f5e', '종료');

    // 6. Time HUD at bottom
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`${(Math.round(this.currentStart * 10) / 10).toFixed(1)}s`, Math.max(6, startX - 20), h - 8);

    ctx.fillStyle = '#fb7185';
    ctx.fillText(`${(Math.round(this.currentEnd * 10) / 10).toFixed(1)}s`, Math.min(w - 38, endX - 10), h - 8);
  }

  drawHandle(ctx, x, h, color, text) {
    // Vertical line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Top Handle Badge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 18, 4, 36, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, 17);
    ctx.textAlign = 'left';
  }

  initEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    if (this.inputStart) {
      this.inputStart.addEventListener('change', () => {
        const val = parseFloat(this.inputStart.value);
        if (!isNaN(val) && val >= 0 && val < this.currentEnd - 0.2) {
          this.currentStart = Math.round(val * 10) / 10;
          this.draw();
        } else {
          this.updateInputFields();
        }
      });
    }

    if (this.inputEnd) {
      this.inputEnd.addEventListener('change', () => {
        const val = parseFloat(this.inputEnd.value);
        const totalDur = this.audioBuffer ? this.audioBuffer.duration : 999;
        if (!isNaN(val) && val > this.currentStart + 0.2 && val <= totalDur) {
          this.currentEnd = Math.round(val * 10) / 10;
          this.draw();
        } else {
          this.updateInputFields();
        }
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        playbackController.playSegment(this.currentStart, this.currentEnd, { owner: 'trimmer-modal' });
      });
    }

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => {
        if (typeof this.onSave === 'function') {
          this.onSave(this.currentStart, this.currentEnd);
        }
        this.close();
      });
    }

    if (this.btnCancel) this.btnCancel.addEventListener('click', () => this.close());
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.close());

    // Close on backdrop click
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }
  }

  handleMouseDown(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startX = this.timeToX(this.currentStart);
    const endX = this.timeToX(this.currentEnd);
    const hitThreshold = 18;

    if (Math.abs(x - startX) <= hitThreshold) {
      this.activeDrag = 'start';
    } else if (Math.abs(x - endX) <= hitThreshold) {
      this.activeDrag = 'end';
    } else if (x > startX && x < endX) {
      this.activeDrag = 'body';
      this.dragStartX = x;
      this.dragOrigStart = this.currentStart;
      this.dragOrigEnd = this.currentEnd;
    }
  }

  handleMouseMove(e) {
    if (!this.activeDrag || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalDur = this.audioBuffer ? this.audioBuffer.duration : 999;

    if (this.activeDrag === 'start') {
      const newTime = Math.max(0, Math.min(this.currentEnd - 0.2, this.xToTime(x)));
      this.currentStart = Math.round(newTime * 10) / 10;
    } else if (this.activeDrag === 'end') {
      const newTime = Math.max(this.currentStart + 0.2, Math.min(totalDur, this.xToTime(x)));
      this.currentEnd = Math.round(newTime * 10) / 10;
    } else if (this.activeDrag === 'body') {
      const deltaX = x - this.dragStartX;
      const deltaTime = (deltaX / this.canvas.width) * (this.zoomEnd - this.zoomStart);
      const dur = this.dragOrigEnd - this.dragOrigStart;

      let newStart = Math.max(0, this.dragOrigStart + deltaTime);
      let newEnd = newStart + dur;
      if (newEnd > totalDur) {
        newEnd = totalDur;
        newStart = Math.max(0, newEnd - dur);
      }
      this.currentStart = Math.round(newStart * 10) / 10;
      this.currentEnd = Math.round(newEnd * 10) / 10;
    }

    this.updateInputFields();
    this.draw();
  }

  handleMouseUp() {
    this.activeDrag = null;
  }
}
