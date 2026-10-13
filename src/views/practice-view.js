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
import { WaveformRenderer } from '../audio/waveform-renderer.js';
import { LooperEngine, formatPreciseTime, formatTime } from '../audio/looper-engine.js';
import { playbackController } from '../audio/playback-controller.js';
import { speakText } from '../audio/tts-synthesizer.js';
import { toast } from '../ui/toast-manager.js';
import { splitIntoSentences, distributeChunksSequentially } from '../core/text-splitter.js';

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
    this.felsBlanks = [];
    // Last AppState.dataVersion seen by onActivated (fresh data → FELS mode default)
    this.lastSeenDataVersion = -1;

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
      },
      onLoopRestart: () => {
        // Synthesized sessions play a silent WAV; re-speak the sentence on every loop repeat
        if (appState.isSynthesizedAudio) {
          const activeStn = appState.getActiveSentence();
          if (activeStn) speakText(activeStn.text);
        }
      }
    });
  }

  /**
   * Page 2 looper/sentence-boundary enforcement is only valid while Page 2 is visible AND
   * Page 2 started the current playback. Prevents pausing Page 1 / Page 3 segment playback.
   */
  isLooperActive() {
    const onPracticePage = !this.router || typeof this.router.getCurrentPage !== 'function'
      || this.router.getCurrentPage() === 'practice';
    return onPracticePage && playbackController.isOwnedBy('practice');
  }

  initEvents() {
    // 1. Audio Player Events
    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('loadedmetadata', () => {
        this.onAudioLoaded();
      });

      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        this.updateAudioProgress();
        if (this.isLooperActive()) this.looperEngine.checkBoundary();
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

    // Row Natural Visibility (Click mask to reveal, click text to hide)
    if (this.maskCoverNatural) {
      this.maskCoverNatural.addEventListener('click', () => this.setRowNaturalVisibility(true));
    }

    if (this.txtNatural) {
      this.txtNatural.addEventListener('click', () => {
        if (appState.naturalVisible) {
          this.setRowNaturalVisibility(false);
        }
      });
      this.txtNatural.title = '클릭하여 해석 가리기 (T)';
    }

    const rowContentNatural = this.rowNatural ? this.rowNatural.querySelector('.row-content') : null;
    if (rowContentNatural) {
      rowContentNatural.addEventListener('click', (e) => {
        if (e.target.closest('#maskCoverNatural')) return;
        if (appState.naturalVisible) {
          this.setRowNaturalVisibility(false);
        }
      });
    }

    const toggleRowNaturalBtn = document.querySelector('[data-target="rowNatural"]');
    if (toggleRowNaturalBtn) {
      toggleRowNaturalBtn.addEventListener('click', () => this.toggleRowNaturalVisibility());
    }

    // Speak Row buttons
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
      this.computeAndApplyStabilizedWidths();
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

    // Pointer Events: one code path for mouse, touch (tablets / interactive whiteboards) and pen.
    // setPointerCapture keeps move/up events on the canvas even when the pointer leaves it.
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.nativeAudioPlayer.src) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      this.isCanvasMouseDown = true;
      this.dragStartX = e.clientX - rect.left;
      this.currentMouseX = this.dragStartX;
      this.isRangeDragging = false;
      if (typeof canvas.setPointerCapture === 'function') {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isCanvasMouseDown || !this.waveformCanvas) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.currentMouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      if (Math.abs(this.currentMouseX - this.dragStartX) > 5) {
        this.isRangeDragging = true;
        this.drawWaveform();
      }
    });

    canvas.addEventListener('pointercancel', () => {
      this.isCanvasMouseDown = false;
      this.isRangeDragging = false;
      this.dragStartX = null;
      this.currentMouseX = null;
      this.drawWaveform();
    });

    canvas.addEventListener('pointerup', (e) => {
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

    // Sanity check: Ensure this sentence does not contain foreign chunks belonging to other sentences
    if (appState.sentenceList.length > 1 && targetStn.result?.chunks?.length > 1) {
      const otherSentences = appState.sentenceList.filter((_, sIdx) => sIdx !== idx).map(s => s.text);
      const hasForeignChunks = targetStn.result.chunks.some(chunk => {
        const cEn = (chunk.en || '').trim().toLowerCase();
        if (!cEn) return false;
        const inTarget = targetStn.text.toLowerCase().includes(cEn);
        const inOthers = otherSentences.some(stn => stn.toLowerCase().includes(cEn));
        return !inTarget && inOthers;
      });

      if (hasForeignChunks) {
        const allForeignAndLocalChunks = [...targetStn.result.chunks];
        const rawSentences = appState.sentenceList.map(s => s.text);
        const partitioned = distributeChunksSequentially(rawSentences, allForeignAndLocalChunks);

        partitioned.forEach((pChunks, pIdx) => {
          if (pChunks.length > 0 && appState.sentenceList[pIdx]) {
            appState.sentenceList[pIdx].result = {
              ...(appState.sentenceList[pIdx].result || {}),
              chunks: pChunks,
              chunk_text: pChunks.map(c => c.ko).join(' || '),
              direct: pChunks.map(c => c.ko).join(' / ')
            };
          }
        });
      }
    }

    // Extract peaks if not yet cached
    if (!targetStn.cachedPeaks) {
      targetStn.cachedPeaks = WaveformRenderer.extractSentencePeaks(appState.audioBuffer, targetStn);
    }

    // Synchronize Audio Player Source (muted flag is ALWAYS re-applied → no silent real MP3)
    if (appState.uploadedAudioUrl) {
      playbackController.setSource(appState.uploadedAudioUrl, { muted: appState.isSynthesizedAudio });
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
      // 3D Flip Card (Compact, Headerless, Single-Row)
      const card = document.createElement('div');
      card.className = 'chunk-card-3d';
      card.setAttribute('data-idx', idx);

      const initialWidth = this.estimateCardWidth(chunk);
      card.style.flex = '0 0 auto';
      card.style.width = `${initialWidth}px`;
      card.style.minWidth = `${initialWidth}px`;

      const inner = document.createElement('div');
      inner.className = 'card-inner';

      // FRONT FACE: English / FELS Weak-Form Blanks
      const frontFace = document.createElement('div');
      frontFace.className = 'card-face card-front';

      // Word container for FELS mode
      const felsWrap = document.createElement('div');
      felsWrap.className = 'chunk-tokens-wrap chunk-tokens-fels';
      if (!appState.isFelsMode) {
        felsWrap.classList.add('hidden');
        felsWrap.style.display = 'none';
      } else {
        felsWrap.style.display = 'inline-flex';
      }

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
          input.placeholder = '[ ]';
          input.style.width = `${Math.min(76, Math.max(34, felsInfo.clean.length * 9 + 20))}px`;
          input.style.maxWidth = '80px';
          input.spellcheck = false;
          input.autocomplete = 'off';

          const trailingPunct = word.match(/[.,!?;:]+$/);
          const punctStr = trailingPunct ? trailingPunct[0] : '';

          inputWrap.appendChild(input);
          felsWrap.appendChild(inputWrap);

          if (punctStr) {
            const punctSpan = document.createElement('span');
            punctSpan.className = 'fels-punct';
            punctSpan.textContent = punctStr;
            felsWrap.appendChild(punctSpan);
          }

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
      if (appState.isFelsMode) {
        origWrap.classList.add('hidden');
        origWrap.style.display = 'none';
      } else {
        origWrap.style.display = 'inline-flex';
      }

      words.forEach((word) => {
        const origSpan = document.createElement('span');
        origSpan.className = 'orig-word-span';
        origSpan.textContent = word;
        origWrap.appendChild(origSpan);
      });

      frontFace.appendChild(felsWrap);
      frontFace.appendChild(origWrap);

      // BACK FACE: Korean Chunk
      const backFace = document.createElement('div');
      backFace.className = 'card-face card-back';

      const koWrap = document.createElement('div');
      koWrap.className = 'ko-chunk-content';
      koWrap.textContent = chunk.ko || '';

      backFace.appendChild(koWrap);

      const keyNum = idx + 1;
      if (keyNum <= 9) {
        const keyBadge = document.createElement('span');
        keyBadge.className = 'practice-key-badge';
        keyBadge.textContent = `${keyNum}`;
        keyBadge.title = `숫자키 [${keyNum}] 뒤집기`;
        inner.appendChild(keyBadge);
      }

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

    // Compute locked card widths without visual collapse
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        this.computeAndApplyStabilizedWidths();
      });
    }
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
    }, 50);
  }

  estimateCardWidth(chunk) {
    const enText = (chunk?.en || '').trim();
    const koText = (chunk?.ko || '').trim();
    const words = enText ? enText.split(/\s+/).filter(Boolean) : [];

    let felsW = 0;
    words.forEach(word => {
      const felsInfo = getFelsInfo(word);
      if (felsInfo) {
        const inputW = Math.min(76, Math.max(34, felsInfo.clean.length * 9 + 20));
        felsW += inputW;
        const trailingPunct = word.match(/[.,!?;:]+$/);
        if (trailingPunct) {
          felsW += trailingPunct[0].length * 8 + 2;
        }
      } else {
        felsW += word.length * 10;
      }
    });
    if (words.length > 1) {
      felsW += (words.length - 1) * 5;
    }

    const origW = enText.length * 10;
    // Korean text on back face can wrap onto 2 lines if long
    const rawKoW = koText.length * 15;
    const koW = rawKoW > 160 ? Math.ceil(rawKoW / 2) + 14 : rawKoW;

    const frontW = Math.max(felsW, origW, 20);
    const contentW = Math.max(frontW, Math.min(koW, frontW * 1.15 + 16));
    return Math.max(56, Math.ceil(contentW + 14));
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

    const containerWidth = this.chunksContainer.clientWidth || 0;
    const cardMeasurements = [];

    cards.forEach((card) => {
      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');
      const koWrap = card.querySelector('.ko-chunk-content');

      let wFels = 0;
      let wOrig = 0;
      let wKo = 0;

      if (felsWrap) {
        const wasHidden = felsWrap.classList.contains('hidden');
        felsWrap.classList.remove('hidden');
        const prevDisp = felsWrap.style.display;
        felsWrap.style.display = 'inline-flex';

        let childSum = 0;
        Array.from(felsWrap.children).forEach(ch => {
          const inp = ch.querySelector ? ch.querySelector('input') : null;
          if (inp && inp.style && inp.style.width) {
            childSum += (parseFloat(inp.style.width) || ch.offsetWidth || 0);
          } else {
            childSum += (ch.offsetWidth || 0);
          }
        });
        if (felsWrap.children.length > 1) {
          childSum += (felsWrap.children.length - 1) * 4;
        }

        wFels = Math.max(felsWrap.scrollWidth || 0, childSum);
        felsWrap.style.display = prevDisp;
        if (wasHidden) felsWrap.classList.add('hidden');
      }

      if (origWrap) {
        const wasHidden = origWrap.classList.contains('hidden');
        origWrap.classList.remove('hidden');
        const prevDisp = origWrap.style.display;
        origWrap.style.display = 'inline-flex';

        let origChildSum = 0;
        Array.from(origWrap.children).forEach(ch => {
          origChildSum += (ch.offsetWidth || 0);
        });
        if (origWrap.children.length > 1) {
          origChildSum += (origWrap.children.length - 1) * 4;
        }

        wOrig = Math.max(origWrap.scrollWidth || 0, origChildSum);
        origWrap.style.display = prevDisp;
        if (wasHidden) origWrap.classList.add('hidden');
      }

      if (koWrap) {
        const rawKoW = Math.max(koWrap.scrollWidth || 0, koWrap.offsetWidth || 0);
        wKo = rawKoW > 160 ? Math.ceil(rawKoW / 2) + 14 : rawKoW;
      }

      // Front-face dominant sizing: eliminate excessive blank margin on front face
      const frontW = Math.max(wFels, wOrig, 20);
      const effectiveContentW = Math.max(frontW, Math.min(wKo, frontW * 1.15 + 16));
      const currentW = parseFloat(card.style.width) || 0;
      const measuredCardWidth = Math.ceil(effectiveContentW + 14);
      // In real DOM with layout, measuredCardWidth reflects true contents.
      // In mock DOM without layout (where scrollWidth is 0), fall back to currentW.
      const naturalCardWidth = Math.max(currentW, 56, measuredCardWidth);
      const minCardWidth = Math.max(56, Math.ceil(frontW + 10));

      cardMeasurements.push({
        card,
        naturalWidth: naturalCardWidth,
        minWidth: minCardWidth
      });
    });

    const totalNaturalWidth = cardMeasurements.reduce((sum, item) => sum + item.naturalWidth, 0);
    const totalGap = (cardMeasurements.length - 1) * 5;
    const requiredTotal = totalNaturalWidth + totalGap;

    if (containerWidth > 0 && requiredTotal > containerWidth) {
      const availableForCards = Math.max(0, containerWidth - totalGap - 4);
      const scale = availableForCards / totalNaturalWidth;

      cardMeasurements.forEach(({ card, naturalWidth, minWidth }) => {
        let targetWidth = naturalWidth;
        if (scale >= 0.70) {
          targetWidth = Math.max(minWidth, Math.floor(naturalWidth * scale));
        }
        card.style.flex = '0 0 auto';
        card.style.width = `${targetWidth}px`;
        card.style.minWidth = `${Math.min(targetWidth, minWidth)}px`;
      });
    } else {
      cardMeasurements.forEach(({ card, naturalWidth }) => {
        card.style.flex = '0 0 auto';
        card.style.width = `${naturalWidth}px`;
        card.style.minWidth = `${naturalWidth}px`;
      });
    }
  }

  // --- Shortcut & UI Actions ---

  togglePlayPause() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    if (this.nativeAudioPlayer.paused) {
      playbackController.claim('practice');
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

    playbackController.claim('practice');
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

      playbackController.claim('practice');
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
    cards.forEach((card) => {
      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');

      if (felsWrap && origWrap) {
        if (appState.isFelsMode) {
          felsWrap.classList.remove('hidden');
          felsWrap.style.display = 'inline-flex';
          origWrap.classList.add('hidden');
          origWrap.style.display = 'none';
        } else {
          felsWrap.classList.add('hidden');
          felsWrap.style.display = 'none';
          origWrap.classList.remove('hidden');
          origWrap.style.display = 'inline-flex';
        }
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
          const displayAnswer = item.original ? item.original.replace(/[.,!?;:]+$/, '') : item.answer;
          const revealBadge = document.createElement('span');
          revealBadge.className = 'fels-answer-reveal';
          revealBadge.textContent = displayAnswer;
          revealBadge.title = `정답: ${displayAnswer} (${item.category || '약형'})`;
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

  flipCardByIndex(num) {
    if (!this.chunksContainer) return;
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards || !cards.length) return;
    const cardIndex = num - 1;
    if (cardIndex >= 0 && cardIndex < cards.length) {
      const card = cards[cardIndex];
      card.classList.toggle('flipped');
      toast.show(`청크 #${num} 뒤집기`);
    }
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

        chip.innerHTML = `<span class="chip-num">S${idx + 1}</span>`;
        chip.title = `${stn.text}${timeStr ? ' ' + timeStr : ''}`;

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
        if (this.isLooperActive()) this.looperEngine.checkBoundary();
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
      audioBuffer: appState.audioBuffer,
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
    playbackController.claim('practice');

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

    // 2. Default state policy:
    //    - Fresh data (new sentence list since the last visit) → FELS Weak-Form mode.
    //      (AppState.setSentenceList() already reset activeSentenceIndex to S1.)
    //    - Revisit (e.g. Page 3 "S3 ↗" jump, returning from Page 3) → keep the current sentence.
    const isFreshData = this.lastSeenDataVersion !== appState.dataVersion;
    this.lastSeenDataVersion = appState.dataVersion;
    if (isFreshData) {
      appState.isFelsMode = true;
    }
    const lastIdx = appState.sentenceList.length - 1;
    const startIdx = Math.min(Math.max(0, appState.activeSentenceIndex || 0), lastIdx);
    appState.activeSentenceIndex = startIdx;
    this.updateFelsModeButtonUI();

    // 3. Render sentence navigator & load the active sentence
    this.renderSentenceNavigator();
    this.loadSentence(startIdx);

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
