/**
 * Page 3: Full Script Chunk Memorization View (MemorizeView)
 * Displays the entire script on one screen as an interactive chunk card grid for recitation and memorization.
 * 
 * Features:
 * - 4 Memorization Modes: Show All (전체 보기), English Only (영어만), Korean Only (한국어만), Cloze (빈칸 블라인드)
 * - Full Script Continuous Audio Playback with real-time neon sentence row highlight
 * - Batch Flip All Cards (일괄 뒤집기)
 * - Self-directed individual chunk reveal on click
 * - Click sentence tag (S1, S2...) to practice that specific sentence in Page 2
 */

import { appState } from '../core/app-state.js';
import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
import { speakText } from '../audio/tts-synthesizer.js';
import { playbackController } from '../audio/playback-controller.js';
import { toast } from '../ui/toast-manager.js';
import { escapeHtml } from '../utils/dom.js';

export class MemorizeView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();

    // DOM Elements
    this.container = document.getElementById('view-memorize');
    this.canvasContainer = document.getElementById('memorizeCanvas');
    this.modeButtons = document.querySelectorAll('.memorize-mode-btn');
    this.btnPlayAllScript = document.getElementById('btnPlayAllScript');
    this.btnFlipAllMemorize = document.getElementById('btnFlipAllMemorize');
    this.btnOpenClassroomModal = document.getElementById('btnOpenClassroomModal');
    this.memorizeStatsBadge = document.getElementById('memorizeStatsBadge');

    this.isPlayingAll = false;
    this.playCurrentSentenceIndex = 0;
    this.activeRowIndex = 0;
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    // Classroom Large Presentation Modal Elements
    this.classroomModal = document.getElementById('classroomModal');
    this.classroomStnBadge = document.getElementById('classroomStnBadge');
    this.classroomStnCounter = document.getElementById('classroomStnCounter');
    this.classroomChunksContainer = document.getElementById('classroomChunksContainer');
    this.btnClassroomPlay = document.getElementById('btnClassroomPlay');
    this.btnClassroomFlipAll = document.getElementById('btnClassroomFlipAll');
    this.btnClassroomPrev = document.getElementById('btnClassroomPrev');
    this.btnClassroomNext = document.getElementById('btnClassroomNext');
    this.btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
    this.classroomIndex = 0;
    this.areClassroomCardsFlipped = false;
    this.boundClassroomKeyHandler = this.handleClassroomKeyDown.bind(this);

    this.initEvents();
  }

  initEvents() {
    // Mode Buttons
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-memorize-mode');
        this.setMemorizeMode(mode);
      });
    });

    // Play All Script Button
    if (this.btnPlayAllScript) {
      this.btnPlayAllScript.addEventListener('click', () => this.togglePlayAllScript());
    }

    // Flip All Cards Button
    if (this.btnFlipAllMemorize) {
      this.btnFlipAllMemorize.addEventListener('click', () => this.toggleFlipAllCards());
    }

    // Classroom Large Modal Open Button (Next to 전체 뒤집기)
    if (this.btnOpenClassroomModal) {
      this.btnOpenClassroomModal.addEventListener('click', () => {
        const idx = (typeof this.activeRowIndex === 'number' && this.activeRowIndex >= 0)
          ? this.activeRowIndex
          : (appState.activeSentenceIndex || 0);
        this.openClassroomModal(idx);
      });
    }

    // Listen to sentence updates
    appState.on('sentencesLoaded', () => {
      this.renderFullScriptCanvas();
    });

    appState.on('activeSentenceChanged', ({ index }) => {
      this.setActiveRow(index);
    });

    // Classroom Large Modal Events
    if (this.btnCloseClassroomModal) {
      this.btnCloseClassroomModal.addEventListener('click', () => this.closeClassroomModal());
    }
    if (this.classroomModal) {
      this.classroomModal.addEventListener('click', (e) => {
        if (e.target === this.classroomModal) this.closeClassroomModal();
      });
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.addEventListener('click', () => this.prevClassroomSentence());
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.addEventListener('click', () => this.nextClassroomSentence());
    }
    if (this.btnClassroomPlay) {
      this.btnClassroomPlay.addEventListener('click', () => this.playSingleSentence(this.classroomIndex));
    }
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.addEventListener('click', () => this.flipAllClassroomCards());
    }

    // Auto-fit chunk cards into single lines on window or container resize
    const handleResize = () => {
      if (this.canvasContainer && this.canvasContainer.offsetParent !== null) {
        this.fitAllSentenceRows();
      }
      if (this.isClassroomModalOpen()) {
        this.fitClassroomSentenceRows();
      }
    };

    if (typeof ResizeObserver !== 'undefined' && this.canvasContainer) {
      this.resizeObserver = new ResizeObserver(handleResize);
      this.resizeObserver.observe(this.canvasContainer);
      if (this.classroomChunksContainer) {
        this.resizeObserver.observe(this.classroomChunksContainer);
      }
    } else {
      window.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', () => {
      if (this.isClassroomModalOpen()) {
        this.fitClassroomSentenceRows();
      }
    });
  }

  setMemorizeMode(mode) {
    appState.memorizeMode = mode;
    this.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-memorize-mode') === mode);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', mode);
      requestAnimationFrame(() => {
        this.fitAllSentenceRows();
      });
    }

    toast.show(`암기 모드: ${this.getModeLabel(mode)}`);
  }

  getModeLabel(mode) {
    switch (mode) {
      case 'cloze': return '청크 가리기(Cloze)';
      default: return '전체 보기';
    }
  }

  renderFullScriptCanvas() {
    if (!this.canvasContainer) return;
    this.canvasContainer.innerHTML = '';

    const list = appState.sentenceList;
    if (!list || list.length === 0) {
      if (this.memorizeStatsBadge) {
        this.memorizeStatsBadge.textContent = '총 0개 문장';
      }
      this.canvasContainer.innerHTML = `
        <div class="memorize-empty-state">
          <p>📝 아직 입력된 스크립트가 없습니다.</p>
          <button class="primary-btn btn-sm" id="btnGoToInput">1페이지 데이터 입력으로 이동</button>
        </div>
      `;
      const btn = this.canvasContainer.querySelector('#btnGoToInput');
      if (btn) btn.addEventListener('click', () => this.router.navigateTo('input'));
      return;
    }

    if (this.memorizeStatsBadge) {
      this.memorizeStatsBadge.textContent = `총 ${list.length}개 문장 • 암기 훈련 모드`;
    }

    list.forEach((stn, sIdx) => {
      // Ensure result exists
      if (!stn.result) {
        stn.result = this.ruleEngine.process(stn.text);
      }

      const sRow = document.createElement('div');
      sRow.className = 'memorize-sentence-row';
      sRow.setAttribute('data-stn-idx', sIdx);
      if (sIdx === this.activeRowIndex) {
        sRow.classList.add('active-row');
      }

      sRow.addEventListener('click', (e) => {
        if (e.target.closest('.memorize-stn-play')) return;
        this.setActiveRow(sIdx);
      });

      // Double-click row to open classroom modal
      sRow.addEventListener('dblclick', () => {
        this.openClassroomModal(sIdx);
      });

      // Play this sentence button on the SAME row as the script
      const playBtn = document.createElement('button');
      playBtn.className = 'memorize-stn-play';
      playBtn.title = '이 문장 듣기';
      playBtn.textContent = '▶';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveRow(sIdx);
        this.playSingleSentence(sIdx);
      });

      // Chunk Grid for this sentence
      const chunkGrid = document.createElement('div');
      chunkGrid.className = 'memorize-chunk-grid';

      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];
      chunks.forEach((chunk, cIdx) => {
        const cCard = document.createElement('div');
        cCard.className = 'memorize-chunk-card';
        cCard.setAttribute('data-c-idx', cIdx);
        cCard._chunkEn = chunk.en || '';
        cCard._chunkKo = chunk.ko || '';

        // Shortcut Key Badge (1 to 9)
        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="memorize-key-badge" title="숫자키 [${keyNum}] 뒤집기">${keyNum}</span>` : '';

        // Dynamic width per card based on content length with minimal padding
        const enLen = (chunk.en || '').trim().length;
        const koLen = (chunk.ko || '').trim().length;
        const estContentWidth = Math.max(enLen * 8.5, koLen * 12.5);
        const cardWidth = Math.max(20, Math.round(estContentWidth + 6));
        cCard.style.width = `${cardWidth}px`;
        cCard.style.flex = '0 0 auto';
        if (appState.memorizeAllFlipped) {
          cCard.classList.add('flipped');
        }

        cCard.innerHTML = `
          ${keyBadge}
          <div class="memorize-card-inner">
            <div class="memorize-face memorize-face-en">
              <span class="chunk-en-text">${escapeHtml(chunk.en)}</span>
            </div>
            <div class="memorize-face memorize-face-ko">
              <span class="chunk-ko-text">${escapeHtml(chunk.ko)}</span>
            </div>
          </div>
        `;

        // Click to toggle individual flip / unmask
        cCard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActiveRow(sIdx);
          cCard.classList.toggle('flipped');
        });

        chunkGrid.appendChild(cCard);
      });

      sRow.appendChild(playBtn);
      sRow.appendChild(chunkGrid);
      this.canvasContainer.appendChild(sRow);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', appState.memorizeMode || 'all');

      // Auto-fit all sentence rows to fit strictly in a single line without horizontal scrolling
      requestAnimationFrame(() => {
        this.fitAllSentenceRows();
      });
    }
  }

  measureTextWidth(text, isKo = false) {
    if (!text) return 0;
    const str = String(text).trim();
    if (!str) return 0;

    // 1. In browser, try canvas 2D measurement for subpixel font metrics
    if (typeof document !== 'undefined') {
      try {
        if (!this._measureCanvas) {
          this._measureCanvas = document.createElement('canvas');
          this._measureCtx = this._measureCanvas.getContext('2d');
        }
        if (this._measureCtx && typeof this._measureCtx.measureText === 'function') {
          const fontSize = isKo ? 13.5 : 14.72;
          const fontWeight = isKo ? '600' : '700';
          this._measureCtx.font = `${fontWeight} ${fontSize}px "Pretendard Variable", "Pretendard", "Plus Jakarta Sans", sans-serif`;
          const metrics = this._measureCtx.measureText(str);
          if (metrics && metrics.width > 0 && (metrics.width !== 50 || str.length === 5)) {
            return Math.ceil(metrics.width);
          }
        }
      } catch (e) {
        // Fallback below
      }
    }

    // 2. High-precision character metric fallback
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        w += 14.5; // Hangul syllable
      } else if (code >= 0x1100 && code <= 0x11ff || code >= 0x3130 && code <= 0x318f) {
        w += 12; // Hangul Jamo
      } else if (code >= 65 && code <= 90) {
        w += 10.2; // Uppercase Latin
      } else if (code >= 97 && code <= 122) {
        if ('il'.includes(str[i])) w += 4.5;
        else if ('mw'.includes(str[i])) w += 12.8;
        else if ('rftj'.includes(str[i])) w += 6.5;
        else w += 8.5; // Lowercase Latin
      } else if (code === 32) {
        w += 4.8; // Space
      } else if (code >= 48 && code <= 57) {
        w += 8.8; // Digits
      } else {
        w += 6.5; // Symbols/Punctuation
      }
    }
    return Math.ceil(w);
  }

  fitAllSentenceRows() {
    if (!this.canvasContainer) return;
    const grids = this.canvasContainer.querySelectorAll('.memorize-chunk-grid');
    grids.forEach(grid => this.fitSentenceRow(grid));
  }

  fitSentenceRow(chunkGrid) {
    if (!chunkGrid) return;
    const cards = Array.from(chunkGrid.querySelectorAll('.memorize-chunk-card'));
    if (!cards.length) return;

    // Available width of the chunk row
    const gridWidth = chunkGrid.clientWidth;
    if (!gridWidth || gridWidth <= 0) return;

    const baseGap = 5; // matches CSS gap: 5px
    const totalGaps = (cards.length - 1) * baseGap;

    // Measure raw unscaled text width of each card at base font size (0.92rem)
    const rawTextWidths = [];
    cards.forEach(card => {
      const enText = card._chunkEn || (card.querySelector('.chunk-en-text')?.textContent || '');
      const koText = card._chunkKo || (card.querySelector('.chunk-ko-text')?.textContent || '');

      const wEn = this.measureTextWidth(enText, false);
      const wKo = this.measureTextWidth(koText, true);
      const maxTextW = Math.max(wEn, wKo, 14);
      rawTextWidths.push(maxTextW);
    });

    const totalRawTextWidth = rawTextWidths.reduce((sum, w) => sum + w, 0);
    const availTotal = Math.max(20, gridWidth - totalGaps - 4);
    const baseOverhead = cards.length * 16;
    const baseRequired = totalRawTextWidth + baseOverhead;
    const scaleRatio = availTotal / Math.max(1, baseRequired);

    const setCssVar = (prop, val) => {
      if (typeof chunkGrid.style.setProperty === 'function') {
        chunkGrid.style.setProperty(prop, val);
      } else {
        chunkGrid.style[prop] = val;
      }
    };

    if (scaleRatio < 1.0) {
      // Long sentence: scale down font size & padding so that all cards fit in 1 line
      const clampedScale = Math.max(0.48, scaleRatio);
      const scaledFontRem = (0.92 * clampedScale).toFixed(3);
      const padX = Math.max(2, Math.round(6 * clampedScale));
      const chunkGap = Math.max(2, Math.round(baseGap * clampedScale));

      setCssVar('--row-chunk-font-size', `${scaledFontRem}rem`);
      setCssVar('--row-chunk-pad-x', `${padX}px`);
      setCssVar('--row-chunk-gap', `${chunkGap}px`);

      const availForContent = Math.max(20, availTotal - cards.length * (2 * padX));
      let remainingSpace = availForContent;
      cards.forEach((card, idx) => {
        let allocatedTextW;
        if (idx === cards.length - 1) {
          allocatedTextW = Math.max(10, remainingSpace);
        } else {
          allocatedTextW = Math.max(10, Math.floor(availForContent * (rawTextWidths[idx] / Math.max(1, totalRawTextWidth))));
          remainingSpace -= allocatedTextW;
        }
        const cardW = allocatedTextW + (2 * padX);
        card.style.flex = '0 0 auto';
        card.style.width = `${cardW}px`;
        card.style.minWidth = '0px';
        card.style.maxWidth = 'none';
      });
    } else {
      // Short / Normal sentence: utilize the horizontal length of 1 row as much as possible!
      // Scale up font size dynamically up to 1.35rem, scale up padding, and allocate proportional card widths
      const upScale = Math.min(1.35, 1.0 + (scaleRatio - 1.0) * 0.35);
      const scaledFontRem = (0.92 * upScale).toFixed(3);
      const padX = Math.min(18, Math.max(6, Math.round(6 * Math.sqrt(scaleRatio))));
      const chunkGap = Math.min(10, Math.max(4, Math.round(baseGap * Math.sqrt(scaleRatio))));

      setCssVar('--row-chunk-font-size', `${scaledFontRem}rem`);
      setCssVar('--row-chunk-pad-x', `${padX}px`);
      setCssVar('--row-chunk-gap', `${chunkGap}px`);

      const effectiveAvail = Math.max(20, gridWidth - (cards.length - 1) * chunkGap - 4);
      let remainingSpace = effectiveAvail;
      cards.forEach((card, idx) => {
        let cardW;
        if (idx === cards.length - 1) {
          cardW = Math.max(20, remainingSpace);
        } else {
          cardW = Math.max(20, Math.floor(effectiveAvail * (rawTextWidths[idx] / Math.max(1, totalRawTextWidth))));
          remainingSpace -= cardW;
        }
        card.style.flex = '0 0 auto';
        card.style.width = `${cardW}px`;
        card.style.minWidth = '0px';
        card.style.maxWidth = 'none';
      });
    }
  }

  toggleFlipAllCards() {
    if (!this.canvasContainer) return;
    appState.memorizeAllFlipped = !appState.memorizeAllFlipped;

    const cards = this.canvasContainer.querySelectorAll('.memorize-chunk-card');
    cards.forEach(c => {
      c.classList.toggle('flipped', appState.memorizeAllFlipped);
    });

    if (this.btnFlipAllMemorize) {
      this.btnFlipAllMemorize.innerHTML = appState.memorizeAllFlipped
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }

    toast.show(appState.memorizeAllFlipped ? '모든 카드를 해석(뒷면)으로 뒤집었습니다.' : '모든 카드를 영어(앞면)로 뒤집었습니다.');
  }

  togglePlayAllScript() {
    if (this.isPlayingAll) {
      this.stopPlayAllScript();
    } else {
      this.startPlayAllScript();
    }
  }

  startPlayAllScript() {
    const list = appState.sentenceList;
    if (!list || list.length === 0) {
      toast.show('⚠️ 재생할 스크립트 문장이 없습니다.');
      return;
    }

    this.isPlayingAll = true;
    this.playRunId = (this.playRunId || 0) + 1;
    const runId = this.playRunId;
    this.playCurrentSentenceIndex = 0;
    this.updatePlayAllButtonUI(true);
    toast.show('▶ 전체 스크립트 연속 낭독 재생을 시작합니다.');
    this.playSentenceInSequence(0, runId);
  }

  stopPlayAllScript() {
    this.isPlayingAll = false;
    this.playRunId = (this.playRunId || 0) + 1; // invalidate any pending setTimeout / onEnd chain
    this.updatePlayAllButtonUI(false);
    playbackController.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.clearAllRowHighlights();
    toast.show('전체 재생이 일시정지되었습니다.');
  }

  updatePlayAllButtonUI(isPlaying) {
    if (!this.btnPlayAllScript) return;
    if (isPlaying) {
      this.btnPlayAllScript.classList.add('playing');
      this.btnPlayAllScript.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        <span>일시정지</span>
      `;
    } else {
      this.btnPlayAllScript.classList.remove('playing');
      this.btnPlayAllScript.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>전체 스크립트 연속 재생</span>
      `;
    }
  }

  playSentenceInSequence(idx, runId = this.playRunId) {
    if (!this.isPlayingAll || runId !== this.playRunId) return;
    const list = appState.sentenceList;
    if (idx >= list.length) {
      this.stopPlayAllScript();
      toast.show('🎉 전체 스크립트 낭독이 완료되었습니다!');
      return;
    }

    this.playCurrentSentenceIndex = idx;
    this.highlightActiveSentenceRow(idx);

    const targetStn = list[idx];
    const advance = () => {
      setTimeout(() => {
        if (this.isPlayingAll && runId === this.playRunId) {
          this.playSentenceInSequence(idx + 1, runId);
        }
      }, 400);
    };

    // Real audio play (owner 'memorize' → the Practice looper no longer pauses it at S1's boundary)
    if (this.canPlayUploadedAudio()) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null; // null → play to media end

      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
      playbackController.playSegment(stnStart, stnEnd, {
        owner: 'memorize',
        onEnd: advance
      }).catch(e => {
        console.error(e);
        if (this.isPlayingAll && runId === this.playRunId) this.stopPlayAllScript();
      });
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(targetStn.text);
      utter.lang = 'en-US';
      utter.rate = 0.95;
      utter.onend = advance;
      utter.onerror = (ev) => {
        if (ev && (ev.error === 'canceled' || ev.error === 'interrupted')) return;
        if (this.isPlayingAll && runId === this.playRunId) advance();
      };
      window.speechSynthesis.speak(utter);
    } else {
      this.stopPlayAllScript();
      toast.show('⚠️ 이 환경에서는 음성 재생을 지원하지 않습니다.');
    }
  }

  /** Real uploaded audio (not the silent synthesized WAV) is available for segment playback. */
  canPlayUploadedAudio() {
    return !!appState.uploadedAudioUrl && !appState.isSynthesizedAudio;
  }

  playSingleSentence(idx) {
    const list = appState.sentenceList;
    if (!list || idx < 0 || idx >= list.length) return;

    this.highlightActiveSentenceRow(idx);
    const targetStn = list[idx];

    if (this.canPlayUploadedAudio()) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null;

      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
      playbackController.playSegment(stnStart, stnEnd, { owner: 'memorize' })
        .catch(e => {
          console.error(e);
          speakText(targetStn.text, 'en-US');
        });
    } else {
      speakText(targetStn.text, 'en-US');
    }
  }

  highlightActiveSentenceRow(idx) {
    this.clearAllRowHighlights();
    if (!this.canvasContainer) return;
    const row = this.canvasContainer.querySelector(`.memorize-sentence-row[data-stn-idx="${idx}"]`);
    if (row) {
      row.classList.add('playing-active');
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  clearAllRowHighlights() {
    if (!this.canvasContainer) return;
    this.canvasContainer.querySelectorAll('.memorize-sentence-row').forEach(r => {
      r.classList.remove('playing-active');
    });
  }

  setActiveRow(idx) {
    this.activeRowIndex = idx;
    if (!this.canvasContainer) return;
    this.canvasContainer.querySelectorAll('.memorize-sentence-row').forEach((r) => {
      const rowIdx = parseInt(r.getAttribute('data-stn-idx'), 10);
      r.classList.toggle('active-row', rowIdx === idx);
    });
  }

  flipCardByIndex(num) {
    if (!this.canvasContainer || num < 1 || num > 9) return;
    const cardIdx = num - 1;

    // Target the active sentence row, playing row, or first row
    let targetRow = this.canvasContainer.querySelector(`.memorize-sentence-row[data-stn-idx="${this.activeRowIndex}"]`);
    if (!targetRow) {
      targetRow = this.canvasContainer.querySelector('.memorize-sentence-row.playing-active')
        || this.canvasContainer.querySelector('.memorize-sentence-row.active-row')
        || this.canvasContainer.querySelector('.memorize-sentence-row');
    }

    if (!targetRow) return;

    const cards = targetRow.querySelectorAll('.memorize-chunk-card');
    if (cards && cards[cardIdx]) {
      cards[cardIdx].classList.toggle('flipped');
    }
  }

  // --- Classroom Large Presentation Modal Methods ---

  openClassroomModal(sIdx) {
    const list = appState.sentenceList;
    if (!list || sIdx < 0 || sIdx >= list.length) return;

    this.classroomIndex = sIdx;
    // Always start with Korean front cards (English answers hidden until flipped)
    this.areClassroomCardsFlipped = false;

    this.renderClassroomModal();
    if (this.classroomModal) {
      this.classroomModal.classList.remove('hidden');
    }
    window.addEventListener('keydown', this.boundClassroomKeyHandler);
    requestAnimationFrame(() => {
      this.fitClassroomSentenceRows();
    });
    toast.show(`🖥️ 문장 S${sIdx + 1} 교실 대형 화면 열림`);
  }

  closeClassroomModal() {
    if (this.classroomModal) {
      this.classroomModal.classList.add('hidden');
    }
    window.removeEventListener('keydown', this.boundClassroomKeyHandler);
  }

  isClassroomModalOpen() {
    return this.classroomModal && !this.classroomModal.classList.contains('hidden');
  }

  prevClassroomSentence() {
    if (this.classroomIndex > 0) {
      this.classroomIndex--;
      this.areClassroomCardsFlipped = false;
      this.renderClassroomModal();
    }
  }

  nextClassroomSentence() {
    const list = appState.sentenceList;
    if (list && this.classroomIndex < list.length - 1) {
      this.classroomIndex++;
      this.areClassroomCardsFlipped = false;
      this.renderClassroomModal();
    }
  }

  flipAllClassroomCards() {
    this.areClassroomCardsFlipped = !this.areClassroomCardsFlipped;
    if (!this.classroomChunksContainer) return;
    const cards = this.classroomChunksContainer.querySelectorAll('.classroom-chunk-card');
    cards.forEach(card => {
      card.classList.toggle('flipped', this.areClassroomCardsFlipped);
    });
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.innerHTML = this.areClassroomCardsFlipped
        ? '<span>🇰🇷 우리말 앞면</span>'
        : '<span>🔤 정답 영어 보기</span>';
    }
    toast.show(this.areClassroomCardsFlipped ? '🔤 정답 영어로 뒤집었습니다.' : '🇰🇷 우리말 앞면으로 뒤집었습니다.');
  }

  flipClassroomCardByIndex(cIdx) {
    if (!this.classroomChunksContainer) return;
    const card = this.classroomChunksContainer.querySelector(`.classroom-sentence-row.is-active .classroom-chunk-card[data-c-idx="${cIdx}"]`);
    if (card) {
      card.classList.toggle('flipped');
      toast.show(`현재 문장 청크 #${cIdx + 1} 뒤집기`);
    }
  }

  handleClassroomKeyDown(e) {
    if (!this.isClassroomModalOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeClassroomModal();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      this.prevClassroomSentence();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      this.nextClassroomSentence();
      return;
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      this.playSingleSentence(this.classroomIndex);
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      e.stopPropagation();
      this.flipAllClassroomCards();
      return;
    }

    // Number keys 1~9
    let num = null;
    if (e.code && /^Digit([1-9])$/.test(e.code)) {
      num = parseInt(e.code.replace('Digit', ''), 10);
    } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
      num = parseInt(e.code.replace('Numpad', ''), 10);
    } else if (e.key >= '1' && e.key <= '9') {
      num = parseInt(e.key, 10);
    }

    if (num !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.flipClassroomCardByIndex(num - 1);
    }
  }

  renderClassroomModal() {
    const list = appState.sentenceList;
    if (!list || this.classroomIndex < 0 || this.classroomIndex >= list.length) return;
    const currentIdx = this.classroomIndex;

    if (this.classroomStnBadge) {
      this.classroomStnBadge.textContent = `S${currentIdx + 1}`;
    }
    if (this.classroomStnCounter) {
      this.classroomStnCounter.textContent = `${currentIdx + 1} / ${list.length} 문장`;
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.disabled = (currentIdx <= 0);
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.disabled = (currentIdx >= list.length - 1);
    }
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.innerHTML = this.areClassroomCardsFlipped
        ? '<span>🇰🇷 우리말 앞면</span>'
        : '<span>🔤 정답 영어 보기</span>';
    }

    if (!this.classroomChunksContainer) return;
    this.classroomChunksContainer.innerHTML = '';

    // Render ONLY the active single sentence
    const rowsToRender = [
      { type: 'active', idx: currentIdx, label: '현재 문장' }
    ];

    rowsToRender.forEach(rowDef => {
      const rowEl = document.createElement('div');
      rowEl.className = `classroom-sentence-row row-${rowDef.type}`;

      const sIdx = rowDef.idx;
      const stnData = list[sIdx];
      const isActive = true;

      rowEl.classList.add('is-active');

      // Sentence Header inside row
      const headerEl = document.createElement('div');
      headerEl.className = 'classroom-row-header';

      const badgeBtn = document.createElement('button');
      badgeBtn.className = 'classroom-row-badge active-badge';
      badgeBtn.textContent = `S${sIdx + 1}`;
      badgeBtn.title = '현재 선택 문장';

      // 크게 보기 모달창 헤더: 우리말 해석 텍스트 노출 제거 (청크 카드에만 집중)
      const previewText = document.createElement('span');
      previewText.className = 'classroom-row-preview';
      previewText.textContent = '';
      previewText.title = '';

      const playBtn = document.createElement('button');
      playBtn.className = 'classroom-row-mini-play';
      playBtn.innerHTML = '▶';
      playBtn.title = `문장 S${sIdx + 1} 듣기`;
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSingleSentence(sIdx);
      });

      headerEl.appendChild(badgeBtn);
      headerEl.appendChild(previewText);
      headerEl.appendChild(playBtn);
      rowEl.appendChild(headerEl);

      // Chunks container for this sentence (Strict Single-Line)
      const chunksWrap = document.createElement('div');
      chunksWrap.className = 'classroom-row-chunks';

      const chunks = stnData.result?.chunks || [{ en: stnData.text, ko: stnData.result?.natural || '' }];
      chunks.forEach((chunk, cIdx) => {
        const card = document.createElement('div');
        card.className = 'classroom-chunk-card active-card';
        card.setAttribute('data-c-idx', cIdx);
        card.setAttribute('data-s-idx', sIdx);
        if (this.areClassroomCardsFlipped) {
          card.classList.add('flipped');
        }

        const keyNum = cIdx + 1;
        // Key badges on active center row (1~9)
        const keyBadge = (keyNum <= 9) ? `<span class="classroom-key-badge">${keyNum}</span>` : '';

        const enText = (chunk.en || '').trim();
        const koText = (chunk.ko || '').trim();
        card._chunkEn = enText;
        card._chunkKo = koText;

        // Initial flexible card setup (precise fitting applied dynamically in fitClassroomSentenceRows)
        card.style.flex = '0 0 auto';

        // 앞면: 우리말(koText), 뒷면: 정답 영어(enText)
        card.innerHTML = `
          ${keyBadge}
          <div class="classroom-card-inner">
            <div class="classroom-face classroom-face-ko">
              <span class="classroom-chunk-text">${escapeHtml(koText)}</span>
            </div>
            <div class="classroom-face classroom-face-en">
              <span class="classroom-chunk-text">${escapeHtml(enText)}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          card.classList.toggle('flipped');
        });

        chunksWrap.appendChild(card);
      });

      rowEl.appendChild(chunksWrap);
      this.classroomChunksContainer.appendChild(rowEl);
    });

    // Precise fitting to utilize the entire horizontal width of the row and prevent overflow
    requestAnimationFrame(() => {
      this.fitClassroomSentenceRows();
    });
  }

  fitClassroomSentenceRows() {
    if (!this.classroomChunksContainer) return;
    const rows = this.classroomChunksContainer.querySelectorAll('.classroom-sentence-row');
    rows.forEach(row => {
      if (row.classList.contains('is-placeholder')) return;
      const chunksWrap = row.querySelector('.classroom-row-chunks');
      if (!chunksWrap) return;
      const cards = Array.from(chunksWrap.querySelectorAll('.classroom-chunk-card'));
      if (!cards.length) return;

      // Available width inside chunksWrap
      let availWidth = chunksWrap.clientWidth;
      if (!availWidth || availWidth <= 0) {
        const containerW = this.classroomChunksContainer.clientWidth ||
          (this.classroomModal ? this.classroomModal.clientWidth - 80 : 1100);
        availWidth = Math.max(300, containerW - 28);
      }

      const isActive = row.classList.contains('is-active');
      const baseGap = 6;
      const basePadX = 10;
      const baseFontRem = isActive ? 1.15 : 0.92;
      const fontScaleFactor = baseFontRem;

      const rawTextWidths = [];
      cards.forEach(card => {
        const enText = card._chunkEn || card.querySelector('.classroom-face-en .classroom-chunk-text')?.textContent.trim() || '';
        const koText = card._chunkKo || card.querySelector('.classroom-face-ko .classroom-chunk-text')?.textContent.trim() || '';

        const wEn = this.measureTextWidth(enText, false) * fontScaleFactor;
        const wKo = this.measureTextWidth(koText, true) * fontScaleFactor;
        const maxTextW = Math.max(wEn, wKo, 14);
        rawTextWidths.push(maxTextW);
      });

      const totalRawTextWidth = rawTextWidths.reduce((sum, w) => sum + w, 0);
      const totalBaseGaps = (cards.length - 1) * baseGap;
      const baseOverhead = cards.length * (basePadX * 2);
      const baseRequired = totalRawTextWidth + totalBaseGaps + baseOverhead;
      const scaleRatio = Math.max(20, availWidth - 4) / Math.max(1, baseRequired);

      const setCssVar = (prop, val) => {
        if (typeof chunksWrap.style.setProperty === 'function') {
          chunksWrap.style.setProperty(prop, val);
        } else {
          chunksWrap.style[prop] = val;
        }
      };

      if (scaleRatio < 1.0) {
        // Long sentence: scale down font size & padding to strictly fit in 1 line without wrapping
        const clampedScale = Math.max(0.50, scaleRatio);
        const scaledFontRem = (baseFontRem * clampedScale).toFixed(3);
        const padX = Math.max(3, Math.round(basePadX * clampedScale));
        const chunkGap = Math.max(2, Math.round(baseGap * clampedScale));

        setCssVar('--classroom-font-size', `${scaledFontRem}rem`);
        setCssVar('--classroom-card-pad-x', `${padX}px`);
        setCssVar('--classroom-chunk-gap', `${chunkGap}px`);

        const totalPaddingsAndGaps = (cards.length * padX * 2) + ((cards.length - 1) * chunkGap);
        const availForContent = Math.max(20, availWidth - totalPaddingsAndGaps - 4);
        let remainingSpace = availForContent;

        cards.forEach((card, idx) => {
          let allocated;
          if (idx === cards.length - 1) {
            allocated = Math.max(10, remainingSpace);
          } else {
            allocated = Math.max(10, Math.floor(availForContent * (rawTextWidths[idx] / Math.max(1, totalRawTextWidth))));
            remainingSpace -= allocated;
          }
          const cardW = allocated + (padX * 2);
          card.style.flex = '0 0 auto';
          card.style.width = `${cardW}px`;
          card.style.minWidth = '0px';
          card.style.maxWidth = 'none';
        });
      } else {
        // Normal / Short sentence: utilize the FULL horizontal width of the row!
        // Scale font up dynamically up to 1.45rem, scale padding up to 24px, and expand card widths to fill 100% of row width
        const upScale = Math.min(1.45, 1.0 + (scaleRatio - 1.0) * 0.35);
        const scaledFontRem = (baseFontRem * upScale).toFixed(3);
        const padX = Math.min(24, Math.max(basePadX, Math.round(basePadX * Math.sqrt(scaleRatio))));
        const chunkGap = Math.min(12, Math.max(baseGap, Math.round(baseGap * Math.sqrt(scaleRatio))));

        setCssVar('--classroom-font-size', `${scaledFontRem}rem`);
        setCssVar('--classroom-card-pad-x', `${padX}px`);
        setCssVar('--classroom-chunk-gap', `${chunkGap}px`);

        const totalGaps = (cards.length - 1) * chunkGap;
        const effectiveAvail = Math.max(20, availWidth - totalGaps - 4);
        let remainingSpace = effectiveAvail;

        cards.forEach((card, idx) => {
          let cardW;
          if (idx === cards.length - 1) {
            cardW = Math.max(24, remainingSpace);
          } else {
            cardW = Math.max(24, Math.floor(effectiveAvail * (rawTextWidths[idx] / Math.max(1, totalRawTextWidth))));
            remainingSpace -= cardW;
          }
          card.style.flex = '0 0 auto';
          card.style.width = `${cardW}px`;
          card.style.minWidth = '0px';
          card.style.maxWidth = 'none';
        });
      }
    });
  }

  onActivated() {
    this.activeRowIndex = appState.activeSentenceIndex || 0;
    this.renderFullScriptCanvas();
    this.setActiveRow(this.activeRowIndex);
    requestAnimationFrame(() => {
      this.fitAllSentenceRows();
    });
  }

  onDeactivated() {
    if (this.isPlayingAll) {
      this.stopPlayAllScript();
    }
    if (this.isClassroomModalOpen()) {
      this.closeClassroomModal();
    }
  }
}
