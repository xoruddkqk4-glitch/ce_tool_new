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
import { StorageService } from '../services/storage-service.js';
import { projectService } from '../services/project-service.js';

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

    // Section 2: Natural Korean Translation Modal Elements
    this.translationModal = document.getElementById('translationModal');
    this.translationModalBadge = document.getElementById('translationModalBadge');
    this.txtNatural = document.getElementById('txtNatural');
    this.btnCloseTranslationModal = document.getElementById('btnCloseTranslationModal');
    this.btnConfirmTranslationModal = document.getElementById('btnConfirmTranslationModal');
    this.btnTranslationSpeak = document.getElementById('btnTranslationSpeak');
    this.boundTranslationKeyHandler = (e) => this.handleTranslationKeyDown(e);

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
    this.btnClearLoop = document.getElementById('btnClearLoop');
    this.loopStatusBadge = document.getElementById('loopStatusBadge');
    this.loopRangeLabel = document.getElementById('loopRangeLabel');
    this.loopCountLabel = document.getElementById('loopCountLabel');
    this.shadowingIndicator = document.getElementById('shadowingIndicator');

    // User Settings HUD Dropdown Controls
    this.selectSectionSilent = document.getElementById('selectSectionSilent');
    this.selectRewindSeconds = document.getElementById('selectRewindSeconds');
    this.selectLoopCount = document.getElementById('selectLoopCount');

    this.sectionSilentSeconds = (typeof StorageService !== 'undefined' && StorageService.getSectionSilentSeconds) ? StorageService.getSectionSilentSeconds() : 1.0;
    this.rewindSeconds = (typeof StorageService !== 'undefined' && StorageService.getReplaySeconds) ? StorageService.getReplaySeconds() : 0.5;

    // Play All Sentences (F11) State
    this.isPlayingAllSentences = false;
    this.playAllTimer = null;
    this.playAllEndHandler = null;

    // Section 4 (Bottom Dock): Sentence Navigator Elements
    this.sentenceNavigator = document.getElementById('sentenceNavigator');
    this.btnPrevSentence = document.getElementById('btnPrevSentence');
    this.btnNextSentence = document.getElementById('btnNextSentence');
    this.btnTogglePlayAllSentences = document.getElementById('btnTogglePlayAllSentences');
    this.currentSentenceNum = document.getElementById('currentSentenceNum');
    this.totalSentenceNum = document.getElementById('totalSentenceNum');
    this.sentenceChipsTrack = document.getElementById('sentenceChipsTrack');
    this.btnResetSentenceInputs = document.getElementById('btnResetSentenceInputs');

    // Engines
    this.waveformRenderer = new WaveformRenderer(this.waveformCanvas);
    this.looperEngine = new LooperEngine(this.nativeAudioPlayer, appState);
    if (this.looperEngine && typeof this.looperEngine.setSectionSilentSeconds === 'function') {
      this.looperEngine.setSectionSilentSeconds(this.sectionSilentSeconds);
    }

    // Canvas interaction state
    this.isCanvasMouseDown = false;
    this.isRangeDragging = false;
    this.dragStartX = null;
    this.currentMouseX = null;
    this.draggingDividerIndex = null;
    this.selectedDividerForMove = null;
    this.felsBlanks = [];
    this.currentRenderedSentenceIndex = null;
    // Last AppState.dataVersion seen by onActivated (fresh data → FELS mode default)
    this.lastSeenDataVersion = -1;

    // Waveform 60FPS Playback Loop & High-Precision Interpolation State
    this.isWaveformLoopRunning = false;
    this.waveformRafId = null;
    this.lastAudioAnchorTime = 0;
    this.lastAudioAnchorWallTime = 0;

    this.initLooperCallbacks();
    this.initEvents();
  }

  initLooperCallbacks() {
    this.looperEngine.setCallbacks({
      onLoopCountUpdate: (cur, target) => {
        this.updateLoopBadge();
      },
      onLoopComplete: (target, typeStr) => {
        const desc = typeStr || '구간';
        if (target > 1 || target === Infinity) {
          toast.show(`🔁 ${desc} ${target}회 반복 재생이 완료되었습니다.`);
        }
        this.updatePlayPauseIcon(false);
        this.drawWaveform();
      },
      onShadowingWait: (isWaiting) => {
        if (this.shadowingIndicator) {
          if (isWaiting) {
            const sec = (typeof this.sectionSilentSeconds === 'number') ? this.sectionSilentSeconds : 1.0;
            this.shadowingIndicator.textContent = `🗣️ ${sec}s 쉐도잉 대기 중`;
            this.shadowingIndicator.classList.remove('hidden');
          } else {
            this.shadowingIndicator.classList.add('hidden');
          }
        }
        this.drawWaveform();
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
    // Whole-script play-all owns the player as 'practice' but must not trigger A-B / sentence repeats
    if (this.isPlayingAllSentences) return false;
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
        // While 60FPS rAF loop is active, avoid redundant out-of-sync waveform re-renders
        if (!this.isWaveformLoopRunning) {
          this.updateAudioProgress();
          if (this.isLooperActive()) this.looperEngine.checkBoundary();
          this.drawWaveform();
        }
      });

      this.nativeAudioPlayer.addEventListener('play', () => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
      });

      this.nativeAudioPlayer.addEventListener('pause', () => {
        this.updatePlayPauseIcon(false);
        this.stopWaveformPlaybackLoop();
        this.drawWaveform();
      });

      this.nativeAudioPlayer.addEventListener('ended', () => {
        this.updatePlayPauseIcon(false);
        this.stopWaveformPlaybackLoop();
        this.drawWaveform();
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

    // 1. Section Silent Seconds Dropdown
    if (this.selectSectionSilent) {
      this.selectSectionSilent.value = String(this.sectionSilentSeconds);
      this.selectSectionSilent.addEventListener('change', (e) => {
        const sec = parseFloat(e.target.value);
        this.setSectionSilentSeconds(!isNaN(sec) ? sec : 1.0);
      });
    }

    // 2. Rewind Seconds Dropdown
    if (this.selectRewindSeconds) {
      this.selectRewindSeconds.value = String(this.rewindSeconds);
      this.selectRewindSeconds.addEventListener('change', (e) => {
        const sec = parseFloat(e.target.value);
        this.setRewindSeconds(!isNaN(sec) ? sec : 0.5);
      });
    }

    // 3. Repeat Count Dropdown
    if (this.selectLoopCount) {
      this.selectLoopCount.value = (appState.targetLoopCount === Infinity) ? 'infinite' : String(appState.targetLoopCount);
      this.selectLoopCount.addEventListener('change', (e) => {
        const val = e.target.value;
        const count = val === 'infinite' ? Infinity : parseInt(val, 10);
        this.setTargetLoopCount(count);
      });
    }

    // Play All Sentences Button (F11)
    if (this.btnTogglePlayAllSentences) {
      this.btnTogglePlayAllSentences.addEventListener('click', () => {
        this.togglePlayAllSentences();
      });
    }

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

    // Translation Modal Actions
    if (this.btnCloseTranslationModal) {
      this.btnCloseTranslationModal.addEventListener('click', () => this.closeTranslationModal());
    }
    if (this.btnConfirmTranslationModal) {
      this.btnConfirmTranslationModal.addEventListener('click', () => this.closeTranslationModal());
    }
    if (this.btnTranslationSpeak) {
      this.btnTranslationSpeak.addEventListener('click', () => {
        const text = this.txtNatural ? this.txtNatural.textContent : '';
        if (text) speakText(text, 'ko-KR');
      });
    }
    if (this.translationModal) {
      this.translationModal.addEventListener('click', (e) => {
        if (e.target === this.translationModal) this.closeTranslationModal();
      });
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
    if (this.btnResetSentenceInputs) {
      this.btnResetSentenceInputs.addEventListener('click', () => {
        this.resetAllFelsInputs();
      });
    }

    // Listen to AppState events
    appState.on('sentencesLoaded', (list) => {
      // The previously rendered inputs belong to the OLD list: never save them into the new one
      this.currentRenderedSentenceIndex = null;
      this.felsBlanks = [];
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

    // Resize observer on chunk cards container to re-stabilize card widths on resize
    if (this.chunksContainer && this.chunksContainer.parentElement && typeof ResizeObserver !== 'undefined') {
      let lastObservedW = 0;
      const roChunks = new ResizeObserver((entries) => {
        const onPractice = this.router && typeof this.router.getCurrentPage === 'function'
          ? this.router.getCurrentPage() === 'practice'
          : true;
        if (onPractice) {
          const entry = entries[0];
          const currentW = entry ? Math.round(entry.contentRect.width) : 0;
          if (currentW > 0 && Math.abs(currentW - lastObservedW) >= 4) {
            lastObservedW = currentW;
            this.computeAndApplyStabilizedWidths();
          }
        }
      });
      roChunks.observe(this.chunksContainer.parentElement);
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

  saveCurrentSentenceAnswers() {
    const renderedIdx = (this.currentRenderedSentenceIndex !== null && typeof this.currentRenderedSentenceIndex === 'number')
      ? this.currentRenderedSentenceIndex
      : null;
    if (renderedIdx === null || !appState.sentenceList || !appState.sentenceList[renderedIdx]) return;
    if (!this.chunksContainer) return;

    const targetStn = appState.sentenceList[renderedIdx];
    if (!targetStn.userAnswers) targetStn.userAnswers = {};

    let changed = false;
    const inputs = this.chunksContainer.querySelectorAll('.fels-blank-input');
    inputs.forEach((input, fallbackIdx) => {
      const bIdxAttr = input.getAttribute('data-blank-idx');
      const bIdx = (bIdxAttr !== null && !isNaN(parseInt(bIdxAttr, 10))) ? parseInt(bIdxAttr, 10) : fallbackIdx;
      const next = input.value;
      if (targetStn.userAnswers[bIdx] !== next) {
        targetStn.userAnswers[bIdx] = next;
        changed = true;
      }
    });

    if (changed && typeof projectService !== 'undefined' && projectService.markDirty) {
      projectService.markDirty();
    }
  }

  async loadSentence(idx) {
    this.saveCurrentSentenceAnswers();
    if (!appState.sentenceList || idx < 0 || idx >= appState.sentenceList.length) return;
    appState.activeSentenceIndex = idx;
    const targetStn = appState.sentenceList[idx];
    const loadToken = (this.sentenceLoadToken = (this.sentenceLoadToken || 0) + 1);

    // Compute or fetch 3x1 chunk result
    if (!targetStn.result) {
      if (aiService.hasKey()) {
        try {
          toast.show(`🤖 문장 S${idx + 1} AI 3x1 해석 생성 중...`);
          const translated = await aiService.translate(targetStn.text);
          if (loadToken !== this.sentenceLoadToken) return;
          targetStn.result = translated || this.ruleEngine.process(targetStn.text);
        } catch (e) {
          if (loadToken !== this.sentenceLoadToken) return;
          console.warn('AI translation failed, using rule engine:', e);
          if (e.isQuotaExceeded || (e.message && (e.message.includes('Quota') || e.message.includes('429')))) {
            toast.show('⚠️ Gemini API 사용량 한도가 일시 초과되어 내장 규칙 엔진 결과를 적용합니다.');
          }
          targetStn.result = this.ruleEngine.process(targetStn.text);
        }
      } else {
        targetStn.result = this.ruleEngine.process(targetStn.text);
      }
    }
    if (loadToken !== this.sentenceLoadToken) return;
    if (!targetStn.result) {
      targetStn.result = this.ruleEngine.process(targetStn.text);
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

    // Update Natural Korean Text in Translation Modal
    if (this.txtNatural) {
      const naturalText = (targetStn.result?.natural || '').trim()
        || (targetStn.result?.chunks ? targetStn.result.chunks.map(c => c.ko).filter(Boolean).join(' ') : '')
        || '';
      this.txtNatural.textContent = naturalText;
    }
    if (this.isTranslationModalOpen()) {
      if (this.translationModalBadge) this.translationModalBadge.textContent = `S${idx + 1}`;
    } else {
      this.setRowNaturalVisibility(false);
    }

    // Render Cards in Top Section
    this.renderChunkCards(targetStn.result.chunks || [], targetStn);

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

  resetPracticeScaling() {
    if (!this.chunksContainer) return;
    const setCssVar = (prop, val) => {
      if (typeof this.chunksContainer.style.setProperty === 'function') {
        this.chunksContainer.style.setProperty(prop, val);
      } else if (this.chunksContainer.style) {
        this.chunksContainer.style[prop] = val;
      }
    };
    setCssVar('--practice-font-size', '0.95rem');
    setCssVar('--practice-blank-font-size', '0.92rem');
    setCssVar('--practice-ko-font-size', '0.88rem');
    setCssVar('--practice-card-pad-x', '8px');
    setCssVar('--practice-chunk-gap', '5px');
    setCssVar('--practice-input-pad-x', '3px');
    setCssVar('--practice-token-gap', '4px');
  }

  renderChunkCards(chunks, targetStn = null) {
    if (!this.chunksContainer) return;
    this.resetPracticeScaling();
    this.chunksContainer.innerHTML = '';
    this.felsBlanks = [];
    appState.areAllCardsFlipped = false;
    this.updateFlipAllButtonUI();

    const activeStn = targetStn || appState.sentenceList?.[appState.activeSentenceIndex] || appState.getActiveSentence();
    const stnIdx = (activeStn && typeof activeStn.index === 'number') ? activeStn.index : appState.activeSentenceIndex;
    this.currentRenderedSentenceIndex = stnIdx;

    if (!chunks || !chunks.length) {
      this.chunksContainer.innerHTML = '<span class="placeholder-text">청크 정보가 없습니다.</span>';
      return;
    }

    if (activeStn && !activeStn.userAnswers) {
      activeStn.userAnswers = {};
    }

    let blankIdx = 0;

    chunks.forEach((chunk, idx) => {
      // 3D Flip Card (Compact, Headerless, Single-Row)
      const card = document.createElement('div');
      card.className = 'chunk-card-3d';
      card.setAttribute('data-idx', idx);

      const initialWidth = this.estimateCardWidth(chunk);
      card._chunkData = chunk;
      card._initialEstimatedWidth = initialWidth;
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
          const currentBlankIdx = blankIdx++;
          const inputWrap = document.createElement('div');
          inputWrap.className = 'fels-input-wrap';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'fels-input fels-blank-input';
          input.setAttribute('data-answer', felsInfo.clean);
          input.setAttribute('data-original', word);
          input.setAttribute('data-category', felsInfo.label);
          input.setAttribute('data-blank-idx', currentBlankIdx);
          input.placeholder = '[ ]';
          const baseInpW = Math.min(76, Math.max(34, felsInfo.clean.length * 9 + 20));
          input._baseWidth = baseInpW;
          input.style.width = `${baseInpW}px`;
          input.style.maxWidth = '80px';
          input.spellcheck = false;
          input.autocomplete = 'off';

          // Restore previously typed answer
          const savedAnswer = activeStn?.userAnswers?.[currentBlankIdx];
          if (typeof savedAnswer === 'string') {
            input.value = savedAnswer;
          }
          if (activeStn?.userChecked) {
            const currentVal = (input.value || '').trim().toLowerCase();
            const expectedVal = (felsInfo.clean || '').toLowerCase();
            const isCorrect = currentVal.length > 0 && currentVal === expectedVal;
            input.classList.toggle('is-correct', isCorrect);
            input.classList.toggle('is-wrong', !isCorrect);
          }

          input.addEventListener('input', () => {
            const currentStn = (this.currentRenderedSentenceIndex !== null && appState.sentenceList?.[this.currentRenderedSentenceIndex])
              ? appState.sentenceList[this.currentRenderedSentenceIndex]
              : activeStn;
            if (currentStn) {
              if (!currentStn.userAnswers) currentStn.userAnswers = {};
              currentStn.userAnswers[currentBlankIdx] = input.value;
            }
            input.classList.remove('is-correct', 'is-wrong');
            if (typeof projectService !== 'undefined' && projectService.markDirty) {
              projectService.markDirty();
            }
          });

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
              this.handleFelsInputEnter();
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
        card.appendChild(keyBadge);
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
      const measuredCardWidth = Math.ceil(effectiveContentW + 16);
      const naturalCardWidth = Math.max(card._initialEstimatedWidth || 0, currentW, 56, measuredCardWidth);
      const contentW = Math.max(20, naturalCardWidth - 16);

      if (!card._baseNaturalWidth) {
        card._baseNaturalWidth = naturalCardWidth;
        card._baseContentWidth = contentW;
      }

      cardMeasurements.push({
        card,
        baseContentWidth: card._baseContentWidth || contentW,
        naturalWidth: card._baseNaturalWidth || naturalCardWidth
      });
    });

    const setCssVar = (prop, val) => {
      if (this.chunksContainer && typeof this.chunksContainer.style.setProperty === 'function') {
        this.chunksContainer.style.setProperty(prop, val);
      } else if (this.chunksContainer && this.chunksContainer.style) {
        this.chunksContainer.style[prop] = val;
      }
    };

    const baseGap = 5;
    const totalNaturalWidth = cardMeasurements.reduce((sum, item) => sum + item.naturalWidth, 0);
    const totalGap = (cardMeasurements.length - 1) * baseGap;
    const requiredTotal = totalNaturalWidth + totalGap;

    if (containerWidth > 0) {
      const availTotal = Math.max(20, containerWidth - 4);
      const rawScale = availTotal / requiredTotal;

      if (rawScale < 1.0) {
        // Sentence exceeds row: scale down font size, padding, and gaps so it fits in 1 row
        const cardPadX = Math.max(2, Math.min(8, Math.round(8 * rawScale)));
        const chunkGap = Math.max(2, Math.min(5, Math.round(baseGap * rawScale)));
        const inputPadX = Math.max(1, Math.min(3, Math.round(3 * rawScale)));
        const tokenGap = Math.max(2, Math.min(4, Math.round(4 * rawScale)));

        const totalPaddings = cardMeasurements.length * (cardPadX * 2);
        const totalGaps = (cardMeasurements.length - 1) * chunkGap;
        const availForContent = Math.max(20, availTotal - totalPaddings - totalGaps);

        const totalBaseContent = cardMeasurements.reduce((sum, item) => sum + item.baseContentWidth, 0);
        const fontScale = totalBaseContent > 0 ? (availForContent / totalBaseContent) : rawScale;
        const clampedFontScale = Math.max(0.48, Math.min(1.0, fontScale));

        const scaledFontRem = (0.95 * clampedFontScale).toFixed(3);
        const scaledBlankFontRem = (0.92 * clampedFontScale).toFixed(3);
        const scaledKoFontRem = (0.88 * clampedFontScale).toFixed(3);

        setCssVar('--practice-font-size', `${scaledFontRem}rem`);
        setCssVar('--practice-blank-font-size', `${scaledBlankFontRem}rem`);
        setCssVar('--practice-ko-font-size', `${scaledKoFontRem}rem`);
        setCssVar('--practice-card-pad-x', `${cardPadX}px`);
        setCssVar('--practice-chunk-gap', `${chunkGap}px`);
        setCssVar('--practice-input-pad-x', `${inputPadX}px`);
        setCssVar('--practice-token-gap', `${tokenGap}px`);

        let remainingContentSpace = availForContent;
        cardMeasurements.forEach(({ card, baseContentWidth }, idx) => {
          let allocatedContentW;
          if (idx === cardMeasurements.length - 1) {
            allocatedContentW = Math.max(10, remainingContentSpace);
          } else {
            allocatedContentW = Math.max(10, Math.floor(baseContentWidth * clampedFontScale));
            remainingContentSpace -= allocatedContentW;
          }
          const targetCardW = allocatedContentW + (cardPadX * 2);
          card.style.flex = '0 0 auto';
          card.style.width = `${targetCardW}px`;
          card.style.minWidth = `${Math.min(targetCardW, 56)}px`;
          card.style.maxWidth = 'none';

          const inputs = card.querySelectorAll('.fels-blank-input');
          inputs.forEach(inp => {
            if (!inp._baseWidth) {
              inp._baseWidth = parseFloat(inp.style.width) || 40;
            }
            const scaledInpW = Math.max(20, Math.round(inp._baseWidth * clampedFontScale));
            inp.style.width = `${scaledInpW}px`;
          });
        });
      } else {
        // Sentence fits comfortably: utilize the horizontal length of 1 row as much as possible!
        // Scale up font size dynamically up to 1.35rem, scale up padding, and allocate proportional card widths
        const upScale = Math.min(1.35, 1.0 + (rawScale - 1.0) * 0.35);
        const cardPadX = Math.min(18, Math.max(8, Math.round(8 * Math.sqrt(rawScale))));
        const chunkGap = Math.min(10, Math.max(5, Math.round(baseGap * Math.sqrt(rawScale))));
        const inputPadX = Math.min(6, Math.max(3, Math.round(3 * upScale)));
        const tokenGap = Math.min(8, Math.max(4, Math.round(4 * upScale)));

        const scaledFontRem = (0.95 * upScale).toFixed(3);
        const scaledBlankFontRem = (0.92 * upScale).toFixed(3);
        const scaledKoFontRem = (0.88 * upScale).toFixed(3);

        setCssVar('--practice-font-size', `${scaledFontRem}rem`);
        setCssVar('--practice-blank-font-size', `${scaledBlankFontRem}rem`);
        setCssVar('--practice-ko-font-size', `${scaledKoFontRem}rem`);
        setCssVar('--practice-card-pad-x', `${cardPadX}px`);
        setCssVar('--practice-chunk-gap', `${chunkGap}px`);
        setCssVar('--practice-input-pad-x', `${inputPadX}px`);
        setCssVar('--practice-token-gap', `${tokenGap}px`);

        const totalBaseContent = cardMeasurements.reduce((sum, item) => sum + item.baseContentWidth, 0);
        const availForCards = Math.max(20, availTotal - (cardMeasurements.length - 1) * chunkGap);

        let remainingSpace = availForCards;
        cardMeasurements.forEach(({ card, baseContentWidth }, idx) => {
          let targetCardW;
          if (idx === cardMeasurements.length - 1) {
            targetCardW = Math.max(56, remainingSpace);
          } else {
            targetCardW = Math.max(56, Math.floor(availForCards * (baseContentWidth / Math.max(1, totalBaseContent))));
            remainingSpace -= targetCardW;
          }
          card.style.flex = '0 0 auto';
          card.style.width = `${targetCardW}px`;
          card.style.minWidth = '0px';
          card.style.maxWidth = 'none';

          const inputs = card.querySelectorAll('.fels-blank-input');
          inputs.forEach(inp => {
            if (!inp._baseWidth) {
              inp._baseWidth = parseFloat(inp.style.width) || 40;
            }
            const scaledInpW = Math.min(110, Math.round(inp._baseWidth * upScale));
            inp.style.width = `${scaledInpW}px`;
          });
        });
      }
    } else {
      setCssVar('--practice-font-size', '0.95rem');
      setCssVar('--practice-blank-font-size', '0.92rem');
      setCssVar('--practice-ko-font-size', '0.88rem');
      setCssVar('--practice-card-pad-x', '8px');
      setCssVar('--practice-chunk-gap', '5px');
      setCssVar('--practice-input-pad-x', '3px');
      setCssVar('--practice-token-gap', '4px');

      cardMeasurements.forEach(({ card, naturalWidth }) => {
        card.style.flex = '0 0 auto';
        card.style.width = `${naturalWidth}px`;
        card.style.minWidth = `${naturalWidth}px`;
        card.style.maxWidth = 'none';

        const inputs = card.querySelectorAll('.fels-blank-input');
        inputs.forEach(inp => {
          if (inp._baseWidth) {
            inp.style.width = `${inp._baseWidth}px`;
          }
        });
      });
    }
  }

  // --- Shortcut & UI Actions ---

  togglePlayPause() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    if (this.isPlayingAllSentences) {
      this.stopPlayAllSentences();
      return;
    }

    if (this.nativeAudioPlayer.paused) {
      playbackController.claim('practice');
      const activeStn = appState.getActiveSentence();
      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : this.nativeAudioPlayer.duration;

      const hasCustomLoop = (appState.loopStart !== null && appState.loopEnd !== null);
      const minBound = hasCustomLoop ? appState.loopStart : stnStart;
      const maxBound = hasCustomLoop ? appState.loopEnd : stnEnd;

      const rewindSec = (typeof this.rewindSeconds === 'number') ? this.rewindSeconds : 0.5;

      if (this.nativeAudioPlayer.currentTime < minBound || this.nativeAudioPlayer.currentTime >= maxBound) {
        this.nativeAudioPlayer.currentTime = minBound;
        appState.currentLoopCount = 0;
        this.updateLoopBadge();
      } else if (appState.targetLoopCount !== Infinity && appState.currentLoopCount >= appState.targetLoopCount) {
        this.nativeAudioPlayer.currentTime = minBound;
        appState.currentLoopCount = 0;
        this.updateLoopBadge();
      } else {
        // Space 일시정지 후 재생 시 자동 되감기 적용 (최소 경계 보호)
        if (rewindSec > 0) {
          const targetTime = Math.max(minBound, this.nativeAudioPlayer.currentTime - rewindSec);
          this.nativeAudioPlayer.currentTime = targetTime;
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
    this.updateLoopBadge();
    this.drawWaveform();
  }

  setSectionSilentSeconds(sec) {
    this.sectionSilentSeconds = sec;
    if (this.looperEngine) {
      this.looperEngine.setSectionSilentSeconds(sec);
    }
    if (typeof StorageService !== 'undefined' && StorageService.setSectionSilentSeconds) {
      StorageService.setSectionSilentSeconds(sec);
    }
    if (this.selectSectionSilent) {
      this.selectSectionSilent.value = String(sec);
    }
    toast.show(`⏱️ 섹션 간격(반복 시 무음)이 ${sec}초로 설정되었습니다.`);
  }

  setRewindSeconds(sec) {
    this.rewindSeconds = sec;
    if (typeof StorageService !== 'undefined' && StorageService.setReplaySeconds) {
      StorageService.setReplaySeconds(sec);
    }
    if (this.selectRewindSeconds) {
      this.selectRewindSeconds.value = String(sec);
    }
    toast.show(`⏪ 되감기 시간이 ${sec}초로 설정되었습니다. (Space 재생 시 자동 적용)`);
  }

  setTargetLoopCount(count) {
    appState.targetLoopCount = count;
    if (typeof StorageService !== 'undefined' && StorageService.setTargetLoopCount) {
      StorageService.setTargetLoopCount(count);
    }
    if (this.selectLoopCount) {
      this.selectLoopCount.value = (count === Infinity) ? 'infinite' : String(count);
    }
    this.updateLoopBadge();
    const str = count === Infinity ? '무한' : `${count}회`;
    toast.show(`반복 횟수가 ${str}로 변경되었습니다.`);
  }

  togglePlayAllSentences() {
    if (this.isPlayingAllSentences) {
      this.stopPlayAllSentences();
    } else {
      this.startPlayAllSentences();
    }
  }

  startPlayAllSentences() {
    const list = appState.sentenceList;
    if (!list || list.length === 0) {
      toast.show('⚠️ 재생할 문장이 없습니다.');
      return;
    }

    this.isPlayingAllSentences = true;
    this.updatePlayAllSentencesButtonUI(true);
    toast.show('▶ 전체 문장 연속 재생을 시작합니다. (F11로 정지)');
    this.playAllSentenceSequence(0);
  }

  stopPlayAllSentences() {
    this.isPlayingAllSentences = false;
    clearTimeout(this.playAllTimer);
    if (this.playAllEndHandler && this.nativeAudioPlayer) {
      this.nativeAudioPlayer.removeEventListener('timeupdate', this.playAllEndHandler);
      this.playAllEndHandler = null;
    }
    this.updatePlayAllSentencesButtonUI(false);
    if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused) {
      this.nativeAudioPlayer.pause();
      this.updatePlayPauseIcon(false);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    toast.show('전체 문장 재생이 정지되었습니다.');
  }

  updatePlayAllSentencesButtonUI(isPlaying) {
    if (!this.btnTogglePlayAllSentences) return;
    this.btnTogglePlayAllSentences.classList.toggle('playing', isPlaying);
    const icon = this.btnTogglePlayAllSentences.querySelector('#playAllIcon');
    const text = this.btnTogglePlayAllSentences.querySelector('#playAllText');
    if (icon) icon.textContent = isPlaying ? '⏹' : '▶';
    if (text) text.textContent = isPlaying ? '재생 중지' : '전체 재생';
  }

  playAllSentenceSequence(idx) {
    if (!this.isPlayingAllSentences) return;
    const list = appState.sentenceList;
    if (idx >= list.length) {
      this.isPlayingAllSentences = false;
      this.updatePlayAllSentencesButtonUI(false);
      this.updatePlayPauseIcon(false);
      toast.show('🎉 전체 문장 재생이 완료되었습니다!');
      return;
    }

    this.loadSentence(idx);

    const stn = list[idx];
    const start = (stn && stn.audioStart !== null) ? stn.audioStart : 0;
    const end = (stn && stn.audioEnd !== null) ? stn.audioEnd : this.nativeAudioPlayer.duration;

    playbackController.claim('practice');

    if (appState.isSynthesizedAudio || !this.nativeAudioPlayer.src) {
      this.updatePlayPauseIcon(true);
      speakText(stn.text, {
        onEnd: () => {
          if (!this.isPlayingAllSentences) return;
          const waitSec = (typeof this.sectionSilentSeconds === 'number') ? this.sectionSilentSeconds : 1.0;
          this.playAllTimer = setTimeout(() => {
            this.playAllSentenceSequence(idx + 1);
          }, Math.max(100, waitSec * 1000));
        }
      });
      return;
    }

    this.nativeAudioPlayer.currentTime = start;
    this.nativeAudioPlayer.play().then(() => {
      this.updatePlayPauseIcon(true);
      this.startWaveformPlaybackLoop();

      if (this.playAllEndHandler) {
        this.nativeAudioPlayer.removeEventListener('timeupdate', this.playAllEndHandler);
      }

      this.playAllEndHandler = () => {
        if (!this.isPlayingAllSentences) {
          this.nativeAudioPlayer.removeEventListener('timeupdate', this.playAllEndHandler);
          this.playAllEndHandler = null;
          return;
        }
        if (this.nativeAudioPlayer.currentTime >= end) {
          this.nativeAudioPlayer.removeEventListener('timeupdate', this.playAllEndHandler);
          this.playAllEndHandler = null;
          this.nativeAudioPlayer.pause();
          this.updatePlayPauseIcon(false);

          const waitSec = (typeof this.sectionSilentSeconds === 'number') ? this.sectionSilentSeconds : 1.0;
          this.playAllTimer = setTimeout(() => {
            this.playAllSentenceSequence(idx + 1);
          }, Math.max(100, waitSec * 1000));
        }
      };

      this.nativeAudioPlayer.addEventListener('timeupdate', this.playAllEndHandler);
    }).catch(e => {
      console.error(e);
      this.stopPlayAllSentences();
    });
  }

  rewindAndPlay(customSec) {
    if (!this.nativeAudioPlayer || !this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    const sec = (typeof customSec === 'number' && customSec > 0) ? customSec : (this.rewindSeconds || 0.5);
    const cur = this.nativeAudioPlayer.currentTime || 0;
    const activeStn = appState.getActiveSentence();
    const minBound = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;

    const targetTime = Math.max(minBound, cur - sec);

    playbackController.claim('practice');
    this.nativeAudioPlayer.currentTime = targetTime;

    appState.clearLoop();
    this.looperEngine.reset();
    this.updateLoopBadge();

    this.nativeAudioPlayer.play().then(() => {
      this.updatePlayPauseIcon(true);
      this.startWaveformPlaybackLoop();
      if (appState.isSynthesizedAudio && activeStn) {
        speakText(activeStn.text);
      }
    }).catch(e => console.error(e));

    this.drawWaveform();
    toast.show(`⏪ ${sec}초 되감기 재생 (${formatPreciseTime(targetTime)})`);
  }

  startRegionLoop() {
    this.rewindAndPlay();
  }

  prevSentence() {
    this.saveCurrentSentenceAnswers();
    if (appState.activeSentenceIndex > 0) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex - 1);
      toast.show(`⬅️ 이전 문장 (S${appState.activeSentenceIndex + 1}/${appState.sentenceList.length})`);
    } else {
      toast.show('첫 번째 문장입니다.');
    }
  }

  nextSentence() {
    this.saveCurrentSentenceAnswers();
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

    this.computeAndApplyStabilizedWidths();
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

    const activeStn = (this.currentRenderedSentenceIndex !== null && appState.sentenceList?.[this.currentRenderedSentenceIndex])
      ? appState.sentenceList[this.currentRenderedSentenceIndex]
      : appState.getActiveSentence();

    if (activeStn) {
      activeStn.userChecked = true;
      if (!activeStn.userAnswers) activeStn.userAnswers = {};
      if (typeof projectService !== 'undefined' && projectService.markDirty) {
        projectService.markDirty();
      }
    }

    let correctCount = 0;
    const totalCount = this.felsBlanks.length;

    this.felsBlanks.forEach((item, idx) => {
      if (!item.inputEl) return;
      const bIdxAttr = item.inputEl.getAttribute('data-blank-idx');
      const bIdx = (bIdxAttr !== null && !isNaN(parseInt(bIdxAttr, 10))) ? parseInt(bIdxAttr, 10) : idx;
      const userVal = (item.inputEl.value || '').trim().toLowerCase();
      const expected = (item.answer || '').toLowerCase();

      if (activeStn) {
        activeStn.userAnswers[bIdx] = item.inputEl.value;
      }

      // Remove any previously rendered answer reveal badges
      const parent = item.inputEl.parentElement;
      if (parent && typeof parent.querySelector === 'function') {
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      }

      if (userVal.length > 0 && userVal === expected) {
        correctCount++;
        item.inputEl.classList.remove('is-wrong');
        item.inputEl.classList.add('is-correct');
      } else {
        item.inputEl.classList.remove('is-correct');
        item.inputEl.classList.add('is-wrong');
        // Do NOT show answer reveal badge underneath per user requirement
      }
    });

    // Do NOT show score banner per user requirement
    if (this.felsScoreBar) {
      this.felsScoreBar.classList.add('hidden');
    }

    if (correctCount === totalCount) {
      toast.show(`🎉 축하합니다! 모든 빈칸(${totalCount}개) 정답입니다! (Enter: 다음 문장)`);
      return true;
    } else {
      toast.show(`✓ 정답 확인: 맞은 빈칸은 초록색, 틀린 빈칸은 빨간색으로 표시됩니다.`);
      return false;
    }
  }

  areAllFelsAnswersCorrect() {
    if (!this.felsBlanks || !this.felsBlanks.length) return false;
    return this.felsBlanks.every(item => {
      if (!item.inputEl) return false;
      const isMarkedCorrect = item.inputEl.classList && item.inputEl.classList.contains('is-correct');
      const val = (item.inputEl.value || '').trim().toLowerCase();
      const exp = (item.answer || '').toLowerCase();
      return isMarkedCorrect && val.length > 0 && val === exp;
    });
  }

  focusFirstFelsBlank() {
    if (!this.chunksContainer) return;
    const blanks = Array.from(this.chunksContainer.querySelectorAll('.fels-blank-input'));
    if (blanks.length > 0) {
      const target = blanks.find(b => !(b.value || '').trim()) || blanks[0];
      target.focus();
      if (typeof target.select === 'function') target.select();
    }
  }

  handleFelsInputEnter() {
    // If all answers in the current sentence are already verified and correct, pressing Enter moves to the next sentence
    if (this.areAllFelsAnswersCorrect()) {
      if (appState.sentenceList && appState.activeSentenceIndex < appState.sentenceList.length - 1) {
        this.nextSentence();
        if (appState.isFelsMode) {
          requestAnimationFrame(() => {
            this.focusFirstFelsBlank();
          });
        }
      } else {
        toast.show('🎉 마지막 문장입니다! 모든 약형 빈칸 연습을 완료했습니다.');
      }
      return;
    }

    // Otherwise, evaluate and grade the answers
    this.checkFelsAnswers();
  }

  resetFelsInputs() {
    const activeStn = (this.currentRenderedSentenceIndex !== null && appState.sentenceList?.[this.currentRenderedSentenceIndex])
      ? appState.sentenceList[this.currentRenderedSentenceIndex]
      : appState.getActiveSentence();
    if (activeStn) {
      activeStn.userAnswers = {};
      delete activeStn.userChecked;
      if (typeof projectService !== 'undefined' && projectService.markDirty) {
        projectService.markDirty();
      }
    }

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
    toast.show('현재 문장의 [ ] 빈칸이 초기화되었습니다. 다시 입력해 보세요.');
  }

  resetAllFelsInputs() {
    if (!appState.sentenceList || appState.sentenceList.length === 0) {
      toast.show('💡 초기화할 문장 데이터가 없습니다.');
      return;
    }

    if (typeof confirm === 'function' && !confirm('모든 문장의 [ ] 빈칸 입력 데이터를 전체 초기화하시겠습니까?')) {
      return;
    }

    appState.sentenceList.forEach(stn => {
      stn.userAnswers = {};
      delete stn.userChecked;
    });

    if (typeof projectService !== 'undefined' && projectService.markDirty) {
      projectService.markDirty();
    }

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
    toast.show('🔄 모든 문장의 [ ] 빈칸이 전체 초기화되었습니다.');
  }

  toggleTextInputMode() {
    if (!appState.isFelsMode) {
      this.toggleFelsMode();
    }

    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const isInsideBlank = activeEl && activeEl.classList && activeEl.classList.contains('fels-blank-input');

    if (isInsideBlank) {
      activeEl.blur();
      toast.show('⌨️ 빈칸 입력 해제 (전역 단축키 활성화)');
    } else {
      const blanks = Array.from(this.chunksContainer ? this.chunksContainer.querySelectorAll('.fels-blank-input') : []);
      if (blanks.length > 0) {
        const target = blanks.find(b => !(b.value || '').trim()) || blanks[0];
        target.focus();
        target.select();
        toast.show('✏️ 빈칸 입력 모드 (Space: 재생/정지, Enter: 정답확인, F6/F7: 문장이동, F5/Esc: 해제)');
      } else {
        toast.show('💡 현재 문장에는 약형 빈칸이 없습니다.');
      }
    }
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

  // --- Natural Korean Translation Modal Methods ---

  openTranslationModal() {
    const list = appState.sentenceList;
    const idx = appState.activeSentenceIndex;
    if (!list || idx < 0 || idx >= list.length) return;
    const targetStn = list[idx];
    if (this.translationModalBadge) {
      this.translationModalBadge.textContent = `S${idx + 1}`;
    }
    if (this.txtNatural) {
      const naturalText = (targetStn.result?.natural || '').trim()
        || (targetStn.result?.chunks ? targetStn.result.chunks.map(c => c.ko).filter(Boolean).join(' ') : '')
        || '등록된 우리말 해석이 없습니다.';
      this.txtNatural.textContent = naturalText;
    }
    if (this.translationModal) {
      this.translationModal.classList.remove('hidden');
    }
    appState.naturalVisible = true;
    window.addEventListener('keydown', this.boundTranslationKeyHandler);
  }

  closeTranslationModal() {
    if (this.translationModal) {
      this.translationModal.classList.add('hidden');
    }
    appState.naturalVisible = false;
    window.removeEventListener('keydown', this.boundTranslationKeyHandler);
  }

  isTranslationModalOpen() {
    return this.translationModal && !this.translationModal.classList.contains('hidden');
  }

  toggleTranslationModal() {
    if (this.isTranslationModalOpen()) {
      this.closeTranslationModal();
    } else {
      this.openTranslationModal();
    }
  }

  handleTranslationKeyDown(e) {
    if (!this.isTranslationModalOpen()) return;
    if (e.key === 'Escape' || e.key === 't' || e.key === 'T' || e.key === 'ㅅ') {
      e.preventDefault();
      e.stopPropagation();
      this.closeTranslationModal();
    }
  }

  toggleRowNaturalVisibility() {
    this.toggleTranslationModal();
  }

  setRowNaturalVisibility(makeVisible) {
    if (makeVisible) {
      this.openTranslationModal();
    } else {
      this.closeTranslationModal();
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
          this.saveCurrentSentenceAnswers();
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
    const activeStn = appState.getActiveSentence();
    const hasCustomLoop = appState.loopStart !== null && appState.loopEnd !== null;

    if (hasCustomLoop) {
      this.loopStatusBadge.classList.remove('hidden');
      if (this.loopRangeLabel) {
        this.loopRangeLabel.textContent = `구간 루프: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)}`;
      }
      if (this.loopCountLabel) {
        const targetStr = appState.targetLoopCount === Infinity ? '∞' : appState.targetLoopCount;
        this.loopCountLabel.textContent = `(${Math.min(appState.currentLoopCount + 1, appState.targetLoopCount || 1)}/${targetStr}회)`;
      }
    } else if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null && (appState.targetLoopCount > 1 || appState.targetLoopCount === Infinity)) {
      this.loopStatusBadge.classList.remove('hidden');
      if (this.loopRangeLabel) {
        this.loopRangeLabel.textContent = `문장 S${appState.activeSentenceIndex + 1} 루프: ${formatPreciseTime(activeStn.audioStart)} ~ ${formatPreciseTime(activeStn.audioEnd)}`;
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

  getSmoothCurrentTime() {
    if (!this.nativeAudioPlayer) return 0;
    if (this.nativeAudioPlayer.paused || this.nativeAudioPlayer.ended) {
      return this.nativeAudioPlayer.currentTime || 0;
    }

    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const actualTime = this.nativeAudioPlayer.currentTime || 0;

    // Re-anchor when HTMLAudioElement reports an updated timestamp tick
    if (actualTime !== this.lastAudioAnchorTime) {
      this.lastAudioAnchorTime = actualTime;
      this.lastAudioAnchorWallTime = now;
    }

    const playbackRate = this.nativeAudioPlayer.playbackRate || 1.0;
    const elapsedSec = ((now - this.lastAudioAnchorWallTime) / 1000) * playbackRate;
    let smoothTime = this.lastAudioAnchorTime + elapsedSec;

    // Safety guard against seek or drift: if interpolated time drifts > 0.12s from actual audio, snap back
    if (Math.abs(smoothTime - actualTime) > 0.12) {
      smoothTime = actualTime;
      this.lastAudioAnchorTime = actualTime;
      this.lastAudioAnchorWallTime = now;
    }

    return smoothTime;
  }

  startWaveformPlaybackLoop() {
    if (this.isWaveformLoopRunning) return;
    this.isWaveformLoopRunning = true;

    if (this.nativeAudioPlayer) {
      this.lastAudioAnchorTime = this.nativeAudioPlayer.currentTime || 0;
      this.lastAudioAnchorWallTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    const loop = () => {
      const onPractice = !this.router || typeof this.router.getCurrentPage !== 'function'
        || this.router.getCurrentPage() === 'practice';
      if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
        if (onPractice) {
          this.updateAudioProgress();
          if (this.isLooperActive()) this.looperEngine.checkBoundary();
          this.drawWaveform();
        }
        this.waveformRafId = requestAnimationFrame(loop);
      } else {
        this.isWaveformLoopRunning = false;
        this.waveformRafId = null;
        if (onPractice) {
          this.updateAudioProgress();
          this.drawWaveform();
        }
      }
    };
    this.waveformRafId = requestAnimationFrame(loop);
  }

  stopWaveformPlaybackLoop() {
    if (this.waveformRafId) {
      cancelAnimationFrame(this.waveformRafId);
      this.waveformRafId = null;
    }
    this.isWaveformLoopRunning = false;
  }

  drawWaveform() {
    const activeStn = appState.getActiveSentence();
    const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
      ? this.nativeAudioPlayer.duration
      : (appState.audioBuffer ? appState.audioBuffer.duration : 1);

    const currentTime = this.getSmoothCurrentTime();

    this.waveformRenderer.draw({
      activeSentence: activeStn,
      audioBuffer: appState.audioBuffer,
      sentenceIndex: appState.activeSentenceIndex,
      totalSentences: appState.sentenceList.length,
      currentTime: currentTime,
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
    this.saveCurrentSentenceAnswers();

    // Silently tear down every timer that could restart playback on another page
    if (this.isPlayingAllSentences) {
      this.isPlayingAllSentences = false;
      this.updatePlayAllSentencesButtonUI(false);
    }
    clearTimeout(this.playAllTimer);
    this.playAllTimer = null;
    if (this.playAllEndHandler && this.nativeAudioPlayer) {
      this.nativeAudioPlayer.removeEventListener('timeupdate', this.playAllEndHandler);
      this.playAllEndHandler = null;
    }
    if (this.looperEngine && typeof this.looperEngine.reset === 'function') {
      this.looperEngine.reset();
    }
    if (typeof this.closeTranslationModal === 'function') {
      this.closeTranslationModal();
    }
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
