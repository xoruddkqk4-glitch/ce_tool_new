/**
 * Page 2: Sentence Unit Weak-Form Chunk Practice View (PracticeView)
 * 
 * Strict Vertical Ordering:
 * ① [Top] FELS Weak-Form Chunk Learning Cards (#rowChunks)
 * ② [Middle] Natural Korean Translation (#rowNatural - hidden by default, toggle with 'T')
 * ③ [Bottom] Audio Waveform Player (#audioPlayerSection - sentence-unit zoomed waveform, A-B looper, 0.5s shadowing delay)
 * ④ [Bottom Docked] Sentence Navigator (#sentenceNavigator - prev/next, chips track, auto-advance)
 * 
 * Supports 9 Unified Global Shortcuts: Space, [, ], \, R, ←, →, S, T
 */

import { appState } from '../core/app-state.js';
import { getFelsInfo } from '../config/fels-dict.js';
import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
import { aiService } from '../services/ai-service.js';
import { calculateUniformBlankWidth } from '../core/fels-engine.js';
import { WaveformRenderer } from '../audio/waveform-renderer.js';
import { LooperEngine, formatPreciseTime, formatTime } from '../audio/looper-engine.js';
import { speakText } from '../audio/tts-synthesizer.js';
import { toast } from '../ui/toast-manager.js';
import { splitIntoSentences } from '../core/text-splitter.js';

export class PracticeView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();

    // Native Audio Player Element
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    // Section 1 (Top): Chunk Cards Elements
    this.chunksContainer = document.getElementById('chunksContainer');
    this.btnCheckFels = document.getElementById('btnCheckFels');
    this.btnToggleFelsMode = document.getElementById('btnToggleFelsMode');
    this.felsModeIcon = document.getElementById('felsModeIcon');
    this.felsModeLabel = document.getElementById('felsModeLabel');
    this.btnResetFels = document.getElementById('btnResetFels');
    this.btnFlipAllCards = document.getElementById('btnFlipAllCards');
    this.flipAllIcon = document.getElementById('flipAllIcon');
    this.flipAllLabel = document.getElementById('flipAllLabel');
    this.felsScoreBar = document.getElementById('felsScoreBar');
    this.felsScoreText = document.getElementById('felsScoreText');

    // Section 2 (Middle): Natural Korean Translation Elements
    this.rowNatural = document.getElementById('rowNatural');
    this.txtNatural = document.getElementById('txtNatural');
    this.maskCoverNatural = document.getElementById('maskCoverNatural');

    // Section 3 (Bottom): Audio Player & Waveform Elements
    this.audioPlayerSection = document.getElementById('audioPlayerSection');
    this.waveformCanvas = document.getElementById('waveformCanvas');
    this.waveformLoading = document.getElementById('waveformLoading');
    this.btnAudioPlay = document.getElementById('btnAudioPlay');
    this.iconPlay = document.getElementById('iconPlay');
    this.iconPause = document.getElementById('iconPause');
    this.audioFileName = document.getElementById('audioFileName');
    this.audioFileSize = document.getElementById('audioFileSize');
    this.audioCurrentTime = document.getElementById('audioCurrentTime');
    this.audioDuration = document.getElementById('audioDuration');
    this.speedBtns = document.querySelectorAll('.speed-btn');
    this.looperCountBtns = document.querySelectorAll('.looper-count-btn');
    this.btnClearLoop = document.getElementById('btnClearLoop');
    this.loopStatusBadge = document.getElementById('loopStatusBadge');
    this.loopRangeLabel = document.getElementById('loopRangeLabel');
    this.loopCountLabel = document.getElementById('loopCountLabel');
    this.shadowingIndicator = document.getElementById('shadowingIndicator');

    // Section 4 (Bottom Dock): Sentence Navigator Elements
    this.sentenceNavigator = document.getElementById('sentenceNavigator');
    this.btnPrevSentence = document.getElementById('btnPrevSentence');
    this.btnNextSentence = document.getElementById('btnNextSentence');
    this.currentSentenceNum = document.getElementById('currentSentenceNum');
    this.totalSentenceNum = document.getElementById('totalSentenceNum');
    this.sentenceChipsTrack = document.getElementById('sentenceChipsTrack');
    this.chkAutoAdvance = document.getElementById('chkAutoAdvance');

    // Engines
    this.waveformRenderer = new WaveformRenderer(this.waveformCanvas);
    this.looperEngine = new LooperEngine(this.nativeAudioPlayer, appState);

    // Canvas interaction state
    this.isCanvasMouseDown = false;
    this.isRangeDragging = false;
    this.dragStartX = null;
    this.currentMouseX = null;
    this.draggingDividerIndex = null;
    this.selectedDividerForMove = null;
    this.stabilizedWidths = [];
    this.felsBlanks = [];

    this.initLooperCallbacks();
    this.initEvents();
  }

  initLooperCallbacks() {
    this.looperEngine.setCallbacks({
      onLoopCountUpdate: (cur, target) => {
        this.updateLoopBadge();
      },
      onLoopComplete: (target) => {
        toast.show(`🔁 구간 ${target}회 반복 재생이 완료되었습니다.`);
        this.updatePlayPauseIcon(false);
        this.drawWaveform();
      },
      onShadowingWait: (isWaiting) => {
        if (this.shadowingIndicator) {
          this.shadowingIndicator.classList.toggle('hidden', !isWaiting);
        }
        this.drawWaveform();
      },
      onAutoAdvance: () => {
        if (appState.activeSentenceIndex < appState.sentenceList.length - 1) {
          toast.show('⏭️ 다음 문장으로 자동 이동합니다...');
          this.nextSentence();
        }
      },
      onPlayStateChange: (isPlaying) => {
        this.updatePlayPauseIcon(isPlaying);
      }
    });
  }

  initEvents() {
    // 1. Audio Player Events
    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('loadedmetadata', () => {
        this.onAudioLoaded();
      });

      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        this.updateAudioProgress();
        this.looperEngine.checkBoundary();
        this.drawWaveform();
      });

      this.nativeAudioPlayer.addEventListener('play', () => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
      });

      this.nativeAudioPlayer.addEventListener('pause', () => {
        this.updatePlayPauseIcon(false);
      });

      this.nativeAudioPlayer.addEventListener('ended', () => {
        this.updatePlayPauseIcon(false);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      });
    }

    if (this.btnAudioPlay) {
      this.btnAudioPlay.addEventListener('click', () => this.togglePlayPause());
    }

    // Playback Speed
    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.setPlaybackSpeed(speed, btn);
      });
    });

    // Repeat Counts
    this.looperCountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const count = btn.getAttribute('data-count');
        this.looperCountBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        appState.targetLoopCount = count === 'infinite' ? Infinity : parseInt(count, 10);
        this.updateLoopBadge();
        const str = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
        toast.show(`반복 횟수가 ${str}로 변경되었습니다.`);
      });
    });

    // Clear Loop
    if (this.btnClearLoop) {
      this.btnClearLoop.addEventListener('click', () => this.clearSelectedRegion());
    }

    // Canvas Events
    this.initWaveformCanvasEvents();

    // 2. FELS Card Controls
    if (this.btnCheckFels) {
      this.btnCheckFels.addEventListener('click', () => this.checkFelsAnswers());
    }
    if (this.btnToggleFelsMode) {
      this.btnToggleFelsMode.addEventListener('click', () => this.toggleFelsMode());
    }
    if (this.btnResetFels) {
      this.btnResetFels.addEventListener('click', () => this.resetFelsInputs());
    }
    if (this.btnFlipAllCards) {
      this.btnFlipAllCards.addEventListener('click', () => this.toggleFlipAllCards());
    }

    // Row Natural Visibility
    if (this.maskCoverNatural) {
      this.maskCoverNatural.addEventListener('click', () => this.setRowNaturalVisibility(true));
    }

    const toggleRowNaturalBtn = document.querySelector('[data-target="rowNatural"]');
    if (toggleRowNaturalBtn) {
      toggleRowNaturalBtn.addEventListener('click', () => this.toggleRowNaturalVisibility());
    }

    // Copy & Speak Row buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        this.copyResult(target, btn);
      });
    });

    document.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        this.speakResult(target);
      });
    });

    // 3. Sentence Navigator Events
    if (this.btnPrevSentence) {
      this.btnPrevSentence.addEventListener('click', () => this.prevSentence());
    }
    if (this.btnNextSentence) {
      this.btnNextSentence.addEventListener('click', () => this.nextSentence());
    }
    if (this.chkAutoAdvance) {
      this.chkAutoAdvance.addEventListener('change', (e) => {
        appState.isAutoAdvance = e.target.checked;
        toast.show(appState.isAutoAdvance ? '⏩ 다음 문장 자동 이동이 활성화되었습니다.' : '다음 문장 자동 이동이 해제되었습니다.');
      });
    }

    // Listen to AppState events
    appState.on('sentencesLoaded', (list) => {
      this.renderSentenceNavigator();
      this.loadSentence(0);
    });

    appState.on('activeSentenceChanged', ({ index }) => {
      this.loadSentence(index);
    });

    window.addEventListener('resize', () => {
      this.drawWaveform();
    });

    // Resize observer on waveform container to ensure wave window is always drawn
    if (this.waveformCanvas && this.waveformCanvas.parentElement && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        this.drawWaveform();
      });
      ro.observe(this.waveformCanvas.parentElement);
    }
  }

  initWaveformCanvasEvents() {
    if (!this.waveformCanvas) return;
    const canvas = this.waveformCanvas;

    canvas.addEventListener('mousedown', (e) => {
      if (!this.nativeAudioPlayer.src) return;
      const rect = canvas.getBoundingClientRect();
      this.isCanvasMouseDown = true;
      this.dragStartX = e.clientX - rect.left;
      this.currentMouseX = this.dragStartX;
      this.isRangeDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isCanvasMouseDown || !this.waveformCanvas) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.currentMouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      if (Math.abs(this.currentMouseX - this.dragStartX) > 5) {
        this.isRangeDragging = true;
        this.drawWaveform();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isCanvasMouseDown) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

      const activeStn = appState.getActiveSentence();
      const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
        ? this.nativeAudioPlayer.duration
        : (appState.audioBuffer ? appState.audioBuffer.duration : 0);

      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : totalDuration;
      const stnDuration = Math.max(0.1, stnEnd - stnStart);

      if (totalDuration > 0 || stnDuration > 0) {
        if (this.isRangeDragging && Math.abs(curX - this.dragStartX) > 8) {
          // A-B Looper Drag Selection inside sentence
          const x1 = Math.min(this.dragStartX, curX);
          const x2 = Math.max(this.dragStartX, curX);
          const t1 = stnStart + (x1 / rect.width) * stnDuration;
          const t2 = stnStart + (x2 / rect.width) * stnDuration;
          this.setLoopRange(t1, t2);
        } else {
          // Instant Seek on Click
          const seekRatio = Math.max(0, Math.min(1, curX / rect.width));
          this.seekAudio(stnStart + seekRatio * stnDuration);
        }
      }

      this.isCanvasMouseDown = false;
      this.isRangeDragging = false;
      this.dragStartX = null;
      this.currentMouseX = null;
      this.drawWaveform();
    });
  }

  async loadSentence(idx) {
    if (!appState.sentenceList || idx < 0 || idx >= appState.sentenceList.length) return;
    const targetStn = appState.sentenceList[idx];

    // Compute or fetch 3x1 chunk result
    if (!targetStn.result) {
      if (aiService.hasKey()) {
        try {
          toast.show(`🤖 문장 S${idx + 1} AI 3x1 해석 생성 중...`);
          targetStn.result = await aiService.translate(targetStn.text);
        } catch (e) {
          console.warn('AI translation failed, using rule engine:', e);
          targetStn.result = this.ruleEngine.process(targetStn.text);
        }
      } else {
        targetStn.result = this.ruleEngine.process(targetStn.text);
      }
    }

    // Extract peaks if not yet cached
    if (!targetStn.cachedPeaks) {
      targetStn.cachedPeaks = WaveformRenderer.extractSentencePeaks(appState.audioBuffer, targetStn);
    }

    // Synchronize Audio Player Source
    if (appState.uploadedAudioUrl && (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl)) {
      this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
      this.nativeAudioPlayer.muted = appState.isSynthesizedAudio;
    }

    // Update Natural Korean Text (Keep hidden by default)
    if (this.txtNatural) {
      this.txtNatural.textContent = targetStn.result.natural || '';
    }
    this.setRowNaturalVisibility(false); // Default hidden

    // Render Cards in Top Section
    this.renderChunkCards(targetStn.result.chunks || []);

    // Set Audio Player HUD
    if (appState.uploadedAudioFile) {
      if (this.audioFileName) this.audioFileName.textContent = appState.uploadedAudioFile.name;
    }
    if (targetStn.audioStart !== null && targetStn.audioEnd !== null) {
      if (this.nativeAudioPlayer.src) {
        try {
          this.nativeAudioPlayer.currentTime = targetStn.audioStart;
        } catch (e) {}
      }
    }

    // Clear previous loops
    this.clearSelectedRegion();
    this.updateSentenceChipsUI();
    this.drawWaveform();
  }

  renderChunkCards(chunks) {
    if (!this.chunksContainer) return;
    this.chunksContainer.innerHTML = '';
    this.felsBlanks = [];
    appState.areAllCardsFlipped = false;
    this.updateFlipAllButtonUI();

    if (!chunks || !chunks.length) {
      this.chunksContainer.innerHTML = '<span class="placeholder-text">청크 정보가 없습니다.</span>';
      return;
    }

    chunks.forEach((chunk, idx) => {
      // Static '||' Divider between chunk cards on Page 2 (Rechunking is on Page 1)
      if (idx > 0) {
        const divider = document.createElement('div');
        divider.className = 'chunk-static-divider';
        divider.setAttribute('aria-hidden', 'true');
        divider.innerHTML = `<span class="divider-symbol">||</span>`;
        this.chunksContainer.appendChild(divider);
      }

      // 3D Flip Card
      const card = document.createElement('div');
      card.className = 'chunk-card-3d';
      card.setAttribute('data-idx', idx);

      const inner = document.createElement('div');
      inner.className = 'card-inner';

      // FRONT FACE: English / FELS Weak-Form Blanks
      const frontFace = document.createElement('div');
      frontFace.className = 'card-face card-front';

      const frontTop = document.createElement('div');
      frontTop.className = 'card-top-bar';
      frontTop.innerHTML = `
        <span class="chunk-badge">청크 ${idx + 1}</span>
        <span class="face-flip-hint" title="클릭하여 해석 보기">
          <span>해석</span>
          <span class="flip-icon">🔄</span>
        </span>
      `;

      // Word container for FELS mode
      const felsWrap = document.createElement('div');
      felsWrap.className = 'chunk-tokens-wrap chunk-tokens-fels';
      if (!appState.isFelsMode) felsWrap.style.display = 'none';

      const words = (chunk.en || '').trim().split(/\s+/).filter(Boolean);
      words.forEach((word) => {
        const felsInfo = getFelsInfo(word);

        if (felsInfo) {
          const inputWrap = document.createElement('div');
          inputWrap.className = 'fels-input-wrap';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'fels-input fels-blank-input';
          input.setAttribute('data-answer', felsInfo.clean);
          input.setAttribute('data-original', word);
          input.setAttribute('data-category', felsInfo.label);
          input.placeholder = '[  ]';
          input.style.width = `${Math.min(94, Math.max(54, felsInfo.clean.length * 12 + 18))}px`;
          input.style.maxWidth = '100px';
          input.spellcheck = false;
          input.autocomplete = 'off';

          const trailingPunct = word.match(/[.,!?;:]+$/);
          const punctStr = trailingPunct ? trailingPunct[0] : '';

          inputWrap.appendChild(input);
          if (punctStr) {
            const punctSpan = document.createElement('span');
            punctSpan.className = 'fels-punct';
            punctSpan.textContent = punctStr;
            inputWrap.appendChild(punctSpan);
          }

          felsWrap.appendChild(inputWrap);

          this.felsBlanks.push({
            inputEl: input,
            answer: felsInfo.clean,
            original: word,
            category: felsInfo.label
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const nextInput = this.findNextBlank(input);
              if (nextInput) {
                nextInput.focus();
              } else {
                this.checkFelsAnswers();
              }
            }
          });
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'fels-token-content';
          wordSpan.textContent = word;
          felsWrap.appendChild(wordSpan);
        }
      });

      // Original English Text Container
      const origWrap = document.createElement('div');
      origWrap.className = 'chunk-tokens-original';
      if (appState.isFelsMode) origWrap.style.display = 'none';

      words.forEach((word) => {
        const origSpan = document.createElement('span');
        origSpan.className = 'orig-word-span';
        origSpan.textContent = word;
        origWrap.appendChild(origSpan);
      });

      frontFace.appendChild(frontTop);
      frontFace.appendChild(felsWrap);
      frontFace.appendChild(origWrap);

      // BACK FACE: Korean Chunk
      const backFace = document.createElement('div');
      backFace.className = 'card-face card-back';

      const backTop = document.createElement('div');
      backTop.className = 'card-top-bar';
      backTop.innerHTML = `
        <span class="chunk-badge ko-badge">해석 ${idx + 1}</span>
        <span class="face-flip-hint" title="클릭하여 영어 보기">
          <span>영어</span>
          <span class="flip-icon">🔄</span>
        </span>
      `;

      const koWrap = document.createElement('div');
      koWrap.className = 'ko-chunk-content';
      koWrap.textContent = chunk.ko || '';

      backFace.appendChild(backTop);
      backFace.appendChild(koWrap);

      inner.appendChild(frontFace);
      inner.appendChild(backFace);
      card.appendChild(inner);

      // Card Click Flip
      card.addEventListener('click', (e) => {
        if (e.target.closest('input') || e.target.closest('.fels-input-wrap')) return;
        card.classList.toggle('flipped');
      });

      this.chunksContainer.appendChild(card);
    });

    // Compute locked card widths
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
    }, 50);
  }

  translateCustomChunk(chunkEn, originalChunks = []) {
    const cleanEn = chunkEn.trim();
    if (!cleanEn) return '';
    const existing = (originalChunks || []).find(c => c.en && c.en.trim().toLowerCase() === cleanEn.toLowerCase());
    if (existing && existing.ko) return existing.ko;

    try {
      const parsed = this.ruleEngine.process(cleanEn);
      if (parsed && parsed.chunks && parsed.chunks.length > 0) {
        return parsed.chunks.map(c => c.ko).join(' ');
      }
      if (parsed && parsed.natural) return parsed.natural;
    } catch (e) {}

    return this.ruleEngine.translatePhrase(cleanEn) || cleanEn;
  }

  findNextBlank(currentInput) {
    const idx = this.felsBlanks.findIndex(b => b.inputEl === currentInput);
    if (idx !== -1 && idx + 1 < this.felsBlanks.length) {
      return this.felsBlanks[idx + 1].inputEl;
    }
    return null;
  }

  computeAndApplyStabilizedWidths() {
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards.length) return;

    this.stabilizedWidths = [];

    cards.forEach((card, idx) => {
      card.style.width = 'auto';

      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');
      const koWrap = card.querySelector('.ko-chunk-content');

      let wFels = 0;
      let wOrig = 0;
      let wKo = 0;

      if (felsWrap) {
        const prevDisplay = felsWrap.style.display;
        felsWrap.style.display = 'flex';
        wFels = felsWrap.scrollWidth + 36;
        felsWrap.style.display = prevDisplay;
      }

      if (origWrap) {
        const prevDisplay = origWrap.style.display;
        origWrap.style.display = 'flex';
        wOrig = origWrap.scrollWidth + 36;
        origWrap.style.display = prevDisplay;
      }

      if (koWrap) {
        wKo = koWrap.scrollWidth + 36;
      }

      const targetW = Math.max(180, Math.min(340, Math.ceil(Math.max(wFels, wOrig, wKo, 180))));
      this.stabilizedWidths[idx] = targetW;
      card.style.width = `${targetW}px`;
    });
  }

  // --- Shortcut & UI Actions ---

  togglePlayPause() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    if (this.nativeAudioPlayer.paused) {
      const activeStn = appState.getActiveSentence();
      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : this.nativeAudioPlayer.duration;

      if (appState.loopStart !== null && appState.loopEnd !== null) {
        if (this.nativeAudioPlayer.currentTime < appState.loopStart || this.nativeAudioPlayer.currentTime >= appState.loopEnd) {
          this.nativeAudioPlayer.currentTime = appState.loopStart;
        }
      } else {
        if (this.nativeAudioPlayer.currentTime < stnStart || this.nativeAudioPlayer.currentTime >= stnEnd) {
          this.nativeAudioPlayer.currentTime = stnStart;
        }
      }

      this.nativeAudioPlayer.play().then(() => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
        if (appState.isSynthesizedAudio && activeStn) {
          speakText(activeStn.text);
        }
      }).catch(e => console.error(e));
    } else {
      this.nativeAudioPlayer.pause();
      this.updatePlayPauseIcon(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  setRegionStartFromCurrentTime() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }
    const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;
    appState.loopStart = cur;

    if (appState.loopEnd !== null && appState.loopEnd <= appState.loopStart) {
      appState.loopEnd = null;
    }

    if (appState.loopEnd !== null) {
      this.setLoopRange(appState.loopStart, appState.loopEnd);
      toast.show(`🚩 [A] 시작점 설정: ${formatPreciseTime(appState.loopStart)} (루프: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)})`);
    } else {
      appState.currentLoopCount = 0;
      this.updateLoopBadge();
      if (this.loopStatusBadge) {
        this.loopStatusBadge.classList.remove('hidden');
        this.loopRangeLabel.textContent = `시작점 [A]: ${formatPreciseTime(appState.loopStart)} ~ (']' 끝점 대기)`;
        this.loopCountLabel.textContent = '';
      }
      this.drawWaveform();
      toast.show(`🚩 [A] 시작점 설정: ${formatPreciseTime(appState.loopStart)} (']' 키를 눌러 끝점을 확정하세요)`);
    }
  }

  setRegionEndFromCurrentTime() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }
    const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;
    const activeStn = appState.getActiveSentence();
    const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;

    let start = appState.loopStart !== null ? appState.loopStart : stnStart;
    let end = cur;

    if (end <= start) {
      if (start - end > 0.3) {
        const temp = start;
        start = end;
        end = temp;
      } else {
        end = start + 0.5;
      }
    }

    this.setLoopRange(start, end);
    const countStr = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
    toast.show(`🏁 [B] 끝점 확정: ${formatPreciseTime(end)} ➔ A-B 구간 ${countStr} 반복 시작!`);
  }

  setLoopRange(start, end) {
    if (Math.abs(end - start) < 0.2) return;
    appState.setLoopRange(start, end);
    this.updateLoopBadge();

    this.nativeAudioPlayer.currentTime = appState.loopStart;
    this.nativeAudioPlayer.play().then(() => {
      this.updatePlayPauseIcon(true);
      this.startWaveformPlaybackLoop();
      if (appState.isSynthesizedAudio) {
        const activeStn = appState.getActiveSentence();
        if (activeStn) speakText(activeStn.text);
      }
    }).catch(e => console.error(e));

    this.drawWaveform();
  }

  clearSelectedRegion() {
    appState.clearLoop();
    this.looperEngine.reset();
    if (this.loopStatusBadge) this.loopStatusBadge.classList.add('hidden');
    this.drawWaveform();
  }

  startRegionLoop() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    const activeStn = appState.getActiveSentence();

    if (appState.loopStart !== null && appState.loopEnd !== null) {
      appState.currentLoopCount = 0;
      this.looperEngine.reset();
      this.updateLoopBadge();

      this.nativeAudioPlayer.currentTime = appState.loopStart;
      this.nativeAudioPlayer.play().then(() => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
        if (appState.isSynthesizedAudio && activeStn) {
          speakText(activeStn.text);
        }
      }).catch(e => console.error(e));

      const countStr = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
      toast.show(`🔁 구간 반복 재생 시작: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)} (${countStr})`);
    } else if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null) {
      this.setLoopRange(activeStn.audioStart, activeStn.audioEnd);
      toast.show(`🔁 S${appState.activeSentenceIndex + 1} 문장 구간 반복 재생을 시작합니다.`);
    } else {
      const dur = this.nativeAudioPlayer.duration || 1;
      this.setLoopRange(0, dur);
      toast.show('🔁 전체 오디오 구간 반복 재생을 시작합니다.');
    }
  }

  prevSentence() {
    if (appState.activeSentenceIndex > 0) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex - 1);
      toast.show(`⬅️ 이전 문장 (S${appState.activeSentenceIndex + 1}/${appState.sentenceList.length})`);
    } else {
      toast.show('첫 번째 문장입니다.');
    }
  }

  nextSentence() {
    if (appState.sentenceList && appState.activeSentenceIndex < appState.sentenceList.length - 1) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex + 1);
      toast.show(`➡️ 다음 문장 (S${appState.activeSentenceIndex + 1}/${appState.sentenceList.length})`);
    } else {
      toast.show('마지막 문장입니다.');
    }
  }

  toggleFelsMode() {
    appState.isFelsMode = !appState.isFelsMode;
    this.updateFelsModeButtonUI();

    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    cards.forEach((card, idx) => {
      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');

      if (felsWrap && origWrap) {
        if (appState.isFelsMode) {
          felsWrap.style.display = 'inline-flex';
          origWrap.style.display = 'none';
        } else {
          felsWrap.style.display = 'none';
          origWrap.style.display = 'flex';
        }
      }

      if (this.stabilizedWidths[idx]) {
        card.style.width = `${this.stabilizedWidths[idx]}px`;
      }
    });

    toast.show(appState.isFelsMode ? '✏️ FELS 빈칸 모드로 전환되었습니다.' : '📖 원문 전체 보기 모드로 전환되었습니다.');
  }

  updateFelsModeButtonUI() {
    if (this.felsModeIcon && this.felsModeLabel) {
      if (appState.isFelsMode) {
        this.felsModeIcon.textContent = '🔤';
        this.felsModeLabel.textContent = '원문 보기';
      } else {
        this.felsModeIcon.textContent = '✏️';
        this.felsModeLabel.textContent = 'FELS 빈칸';
      }
    }
  }

  checkFelsAnswers() {
    if (!this.felsBlanks.length) {
      toast.show('확인할 FELS 빈칸이 없습니다.');
      return;
    }

    if (!appState.isFelsMode) {
      this.toggleFelsMode();
    }

    let correctCount = 0;
    const totalCount = this.felsBlanks.length;

    this.felsBlanks.forEach(item => {
      if (!item.inputEl) return;
      const userVal = (item.inputEl.value || '').trim().toLowerCase();
      const expected = (item.answer || '').toLowerCase();

      const parent = item.inputEl.parentElement;
      if (parent && typeof parent.querySelector === 'function') {
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      }

      if (userVal === expected) {
        correctCount++;
        item.inputEl.classList.remove('is-wrong');
        item.inputEl.classList.add('is-correct');
      } else {
        item.inputEl.classList.remove('is-correct');
        item.inputEl.classList.add('is-wrong');

        if (parent) {
          const revealBadge = document.createElement('span');
          revealBadge.className = 'fels-answer-reveal';
          revealBadge.textContent = item.answer;
          revealBadge.title = `기능어: ${item.answer}`;
          parent.appendChild(revealBadge);
        }
      }
    });

    const percentage = Math.round((correctCount / totalCount) * 100);

    if (this.felsScoreText && this.felsScoreBar) {
      this.felsScoreText.innerHTML = `
        🎯 <strong>채점 결과:</strong> 총 ${totalCount}개 중 <strong>${correctCount}개</strong> 정답 (${percentage}%) 
        <span style="font-weight: 500; font-size: 0.8rem; margin-left: 8px;">
          ${percentage === 100 ? '🎉 완벽합니다! 약형 기능어를 모두 청취했습니다.' : '💡 오답 항목 아래 표시된 초록색 정답을 확인해보세요.'}
        </span>
      `;
      this.felsScoreBar.classList.remove('hidden');
    }

    toast.show(`채점 완료! 정답: ${correctCount}/${totalCount}개 (${percentage}%)`);
  }

  resetFelsInputs() {
    this.felsBlanks.forEach(item => {
      if (!item.inputEl) return;
      item.inputEl.value = '';
      item.inputEl.classList.remove('is-correct', 'is-wrong');
      const parent = item.inputEl.parentElement;
      if (parent && typeof parent.querySelector === 'function') {
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      }
    });
    if (this.felsScoreBar) this.felsScoreBar.classList.add('hidden');
    if (this.felsBlanks.length > 0) {
      this.felsBlanks[0].inputEl.focus();
    }
    toast.show('빈칸이 초기화되었습니다. 다시 입력해 보세요.');
  }

  toggleFlipAllCards() {
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards.length) return;

    appState.areAllCardsFlipped = !appState.areAllCardsFlipped;
    cards.forEach(card => {
      card.classList.toggle('flipped', appState.areAllCardsFlipped);
    });
    this.updateFlipAllButtonUI();
    toast.show(appState.areAllCardsFlipped ? '🔄 모든 카드를 해석(뒷면)으로 뒤집었습니다.' : '🔄 모든 카드를 영어(앞면)로 뒤집었습니다.');
  }

  updateFlipAllButtonUI() {
    if (!this.flipAllLabel || !this.flipAllIcon) return;
    if (appState.areAllCardsFlipped) {
      this.flipAllLabel.textContent = '영어 앞면';
      this.flipAllIcon.textContent = '🔤';
    } else {
      this.flipAllLabel.textContent = '해석 뒷면';
      this.flipAllIcon.textContent = '🔄';
    }
  }

  // --- Row Natural Visibility ---

  toggleRowNaturalVisibility() {
    this.setRowNaturalVisibility(!appState.naturalVisible);
  }

  setRowNaturalVisibility(makeVisible) {
    appState.naturalVisible = makeVisible;
    if (!this.rowNatural) return;

    const rowContent = this.rowNatural.querySelector('.row-content');
    const maskCover = this.rowNatural.querySelector('.row-mask-cover');
    const toggleBtn = document.querySelector('[data-target="rowNatural"]');

    if (makeVisible) {
      if (rowContent) rowContent.classList.remove('is-masked');
      if (maskCover) maskCover.classList.add('hidden');
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.title = '해석 가리기 (T)';
      }
    } else {
      if (rowContent) rowContent.classList.add('is-masked');
      if (maskCover) maskCover.classList.remove('hidden');
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.title = '해석 보기 (T)';
      }
    }
  }

  // --- Sentence Navigator ---

  renderSentenceNavigator() {
    if (!this.sentenceNavigator || !appState.sentenceList || appState.sentenceList.length === 0) {
      if (this.sentenceNavigator) this.sentenceNavigator.classList.add('hidden');
      return;
    }

    this.sentenceNavigator.classList.remove('hidden');
    if (this.totalSentenceNum) this.totalSentenceNum.textContent = appState.sentenceList.length;

    if (this.sentenceChipsTrack) {
      this.sentenceChipsTrack.innerHTML = '';
      appState.sentenceList.forEach((stn, idx) => {
        const chip = document.createElement('button');
        chip.className = `sentence-chip ${idx === appState.activeSentenceIndex ? 'active' : ''}`;
        chip.setAttribute('data-stn-idx', idx);

        let timeStr = '';
        if (stn.audioStart !== null && stn.audioEnd !== null) {
          timeStr = ` (${formatTime(stn.audioStart)})`;
        }

        chip.innerHTML = `
          <span class="chip-num">S${idx + 1}</span>
          <span class="chip-preview">${stn.text.slice(0, 18)}${stn.text.length > 18 ? '...' : ''}</span>
          <span class="chip-time">${timeStr}</span>
        `;

        chip.addEventListener('click', () => {
          appState.setActiveSentenceIndex(idx);
        });

        this.sentenceChipsTrack.appendChild(chip);
      });
    }

    this.updateSentenceChipsUI();
  }

  updateSentenceChipsUI() {
    if (!this.sentenceNavigator) return;
    if (this.currentSentenceNum) {
      this.currentSentenceNum.textContent = appState.activeSentenceIndex + 1;
    }
    if (this.btnPrevSentence) {
      this.btnPrevSentence.disabled = (appState.activeSentenceIndex <= 0);
    }
    if (this.btnNextSentence) {
      this.btnNextSentence.disabled = (appState.activeSentenceIndex >= appState.sentenceList.length - 1);
    }

    if (this.sentenceChipsTrack) {
      const chips = this.sentenceChipsTrack.querySelectorAll('.sentence-chip');
      chips.forEach((c, idx) => {
        c.classList.toggle('active', idx === appState.activeSentenceIndex);
      });
      const activeChip = this.sentenceChipsTrack.querySelector('.sentence-chip.active');
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  // --- Audio Helpers ---

  onAudioLoaded() {
    if (this.audioDuration) {
      this.audioDuration.textContent = formatPreciseTime(this.nativeAudioPlayer.duration);
    }
    this.drawWaveform();
  }

  updateAudioProgress() {
    if (this.audioCurrentTime) {
      this.audioCurrentTime.textContent = formatPreciseTime(this.nativeAudioPlayer.currentTime);
    }
  }

  updatePlayPauseIcon(isPlaying) {
    if (!this.iconPlay || !this.iconPause) return;
    if (isPlaying) {
      this.iconPlay.classList.add('hidden');
      this.iconPause.classList.remove('hidden');
    } else {
      this.iconPlay.classList.remove('hidden');
      this.iconPause.classList.add('hidden');
    }
  }

  updateLoopBadge() {
    if (!this.loopStatusBadge) return;
    if (appState.loopStart !== null && appState.loopEnd !== null) {
      this.loopStatusBadge.classList.remove('hidden');
      if (this.loopRangeLabel) {
        this.loopRangeLabel.textContent = `루프: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)}`;
      }
      if (this.loopCountLabel) {
        const targetStr = appState.targetLoopCount === Infinity ? '∞' : appState.targetLoopCount;
        this.loopCountLabel.textContent = `(${Math.min(appState.currentLoopCount + 1, appState.targetLoopCount || 1)}/${targetStr}회)`;
      }
    } else {
      this.loopStatusBadge.classList.add('hidden');
    }
  }

  seekAudio(time) {
    this.nativeAudioPlayer.currentTime = Math.max(0, Math.min(this.nativeAudioPlayer.duration || time, time));
    this.updateAudioProgress();
    this.drawWaveform();
  }

  setPlaybackSpeed(speed, activeBtn) {
    this.nativeAudioPlayer.playbackRate = speed;
    appState.playbackSpeed = speed;
    this.speedBtns.forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    toast.show(`재생 속도: ${speed}x`);
  }

  startWaveformPlaybackLoop() {
    const loop = () => {
      if (!this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
        this.updateAudioProgress();
        this.looperEngine.checkBoundary();
        this.drawWaveform();
        requestAnimationFrame(loop);
      } else {
        this.updateAudioProgress();
        this.drawWaveform();
      }
    };
    requestAnimationFrame(loop);
  }

  drawWaveform() {
    const activeStn = appState.getActiveSentence();
    const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
      ? this.nativeAudioPlayer.duration
      : (appState.audioBuffer ? appState.audioBuffer.duration : 1);

    this.waveformRenderer.draw({
      activeSentence: activeStn,
      sentenceIndex: appState.activeSentenceIndex,
      totalSentences: appState.sentenceList.length,
      currentTime: this.nativeAudioPlayer.currentTime,
      totalDuration: totalDuration,
      loopStart: appState.loopStart,
      loopEnd: appState.loopEnd,
      isRangeDragging: this.isRangeDragging,
      dragStartX: this.dragStartX,
      currentMouseX: this.currentMouseX,
      isShadowingWaiting: appState.isShadowingWaiting,
      formatTimeFn: formatPreciseTime
    });
  }

  copyResult(target, btn) {
    const activeStn = appState.getActiveSentence();
    if (!activeStn) return;

    let text = '';
    if (target === 'en') {
      text = activeStn.text || '';
    } else if (target === 'chunk') {
      text = activeStn.result?.chunks ? activeStn.result.chunks.map(c => c.ko).join(' || ') : '';
    } else if (target === 'natural') {
      text = activeStn.result?.natural || '';
    }

    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>복사됨!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
      toast.show('📋 클립보드에 복사되었습니다.');
    });
  }

  speakResult(target) {
    const activeStn = appState.getActiveSentence();
    if (!activeStn) return;

    if (target === 'en') {
      if (appState.uploadedAudioFile && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
        this.togglePlayPause();
      } else {
        speakText(activeStn.text, 'en-US');
      }
    } else {
      const ko = activeStn.result?.natural || '';
      if (ko) speakText(ko, 'ko-KR');
    }
  }

  onActivated() {
    // 1. If sentenceList is empty, seed with default sample sentence
    if (!appState.sentenceList || appState.sentenceList.length === 0) {
      const defaultScript = "I went to school yesterday. She bought a new book at the bookstore.";
      const rawSentences = splitIntoSentences(defaultScript);
      const list = rawSentences.map((stnText, idx) => ({
        index: idx,
        text: stnText,
        audioStart: null,
        audioEnd: null,
        result: this.ruleEngine.process(stnText)
      }));
      appState.scriptText = defaultScript;
      appState.setSentenceList(list);
    }

    // 2. Default state: Sentence 1 + FELS Weak-Form mode
    appState.activeSentenceIndex = 0;
    appState.isFelsMode = true;
    this.updateFelsModeButtonUI();

    // 3. Render sentence navigator & load sentence 1
    this.renderSentenceNavigator();
    this.loadSentence(0);

    // 4. Ensure Waveform Canvas is drawn with proper visible dimensions
    this.drawWaveform();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.drawWaveform());
    }
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
      this.drawWaveform();
    }, 60);
    setTimeout(() => {
      this.drawWaveform();
    }, 180);
  }

  onDeactivated() {
    if (this.nativeAudioPlayer && typeof this.nativeAudioPlayer.pause === 'function') {
      try {
        if (!this.nativeAudioPlayer.paused) {
          this.nativeAudioPlayer.pause();
        }
      } catch (e) {}
    }
    if ('speechSynthesis' in window && typeof window.speechSynthesis.cancel === 'function') {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}
