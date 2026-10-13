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
        if (e.target.closest('.memorize-stn-badge') || e.target.closest('.memorize-stn-play')) return;
        this.setActiveRow(sIdx);
      });

      // Sentence Header (S1, S2, jump to practice, expand classroom modal)
      const sHeader = document.createElement('div');
      sHeader.className = 'memorize-sentence-header';
      sHeader.innerHTML = `
        <button class="memorize-stn-badge" title="문장 S${sIdx + 1} 2페이지 약형 연습으로 이동">
          <span>S${sIdx + 1}</span>
          <span class="jump-icon">↗</span>
        </button>
        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${escapeHtml(stn.text)}</span>
        <button class="memorize-stn-expand-btn" title="교실 대형 화면으로 크게 보기 (모달)">🔍 크게 보기</button>
        <button class="memorize-stn-play" title="이 문장 듣기">▶</button>
      `;

      // Jump to practice
      const badgeBtn = sHeader.querySelector('.memorize-stn-badge');
      if (badgeBtn) {
        badgeBtn.addEventListener('click', () => {
          appState.setActiveSentenceIndex(sIdx);
          this.router.navigateTo('practice');
        });
      }

      // Expand to classroom modal
      const expandBtn = sHeader.querySelector('.memorize-stn-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClassroomModal(sIdx);
        });
      }

      const previewSpan = sHeader.querySelector('.memorize-stn-preview');
      if (previewSpan) {
        previewSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClassroomModal(sIdx);
        });
      }

      // Double-click row to open classroom modal
      sRow.addEventListener('dblclick', () => {
        this.openClassroomModal(sIdx);
      });

      // Play this sentence
      const playBtn = sHeader.querySelector('.memorize-stn-play');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          this.playSingleSentence(sIdx);
        });
      }

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

      sRow.appendChild(sHeader);
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

    const gap = 4; // matches CSS gap: 4px
    const totalGaps = (cards.length - 1) * gap;

    // Fixed horizontal overhead per card: 4px left + 4px right padding + 2px border + 2px safety buffer = 12px
    const fixedCardExtra = 12;
    const totalFixedOverhead = cards.length * fixedCardExtra + totalGaps;
    const availTextWidth = Math.max(20, gridWidth - totalFixedOverhead - 4);

    // Measure raw unscaled text width of each card at base font size (0.92rem)
    const rawTextWidths = [];
    cards.forEach(card => {
      const enText = card._chunkEn || (card.querySelector('.chunk-en-text')?.textContent || '');
      const koText = card._chunkKo || (card.querySelector('.chunk-ko-text')?.textContent || '');

      const wEn = this.measureTextWidth(enText, false);
      const wKo = this.measureTextWidth(koText, true);
      const maxTextW = Math.max(wEn, wKo, 10);
      rawTextWidths.push(maxTextW);
    });

    const totalRawTextWidth = rawTextWidths.reduce((sum, w) => sum + w, 0);

    if (totalRawTextWidth > availTextWidth) {
      // Must scale down font size so that the text of ALL cards fits without clipping or ellipsis
      const scale = availTextWidth / totalRawTextWidth;
      // Allow scaling down smoothly (down to 0.45rem if needed for very long sentences)
      const scaledFontRem = Math.max(0.45, Math.min(0.92, 0.92 * scale));
      if (typeof chunkGrid.style.setProperty === 'function') {
        chunkGrid.style.setProperty('--row-chunk-font-size', `${scaledFontRem.toFixed(3)}rem`);
      } else {
        chunkGrid.style['--row-chunk-font-size'] = `${scaledFontRem.toFixed(3)}rem`;
      }

      // Allocate card widths: exactly textWidth * scale + fixedCardExtra!
      let remainingTextSpace = availTextWidth;
      cards.forEach((card, idx) => {
        let allocatedTextW;
        if (idx === cards.length - 1) {
          allocatedTextW = Math.max(10, remainingTextSpace);
        } else {
          allocatedTextW = Math.max(10, Math.floor(rawTextWidths[idx] * scale));
          remainingTextSpace -= allocatedTextW;
        }
        const cardW = allocatedTextW + fixedCardExtra;
        card.style.flex = '0 0 auto';
        card.style.width = `${cardW}px`;
        card.style.minWidth = '0px';
        card.style.maxWidth = 'none'; // NEVER clamp maxWidth so text is never cut off
      });
    } else {
      // Fits comfortably at standard font size
      if (typeof chunkGrid.style.setProperty === 'function') {
        chunkGrid.style.setProperty('--row-chunk-font-size', '0.92rem');
      } else {
        chunkGrid.style['--row-chunk-font-size'] = '0.92rem';
      }
      cards.forEach((card, idx) => {
        const cardW = rawTextWidths[idx] + fixedCardExtra;
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
    this.playCurrentSentenceIndex = 0;
    this.updatePlayAllButtonUI(true);
    toast.show('▶ 전체 스크립트 연속 낭독 재생을 시작합니다.');
    this.playSentenceInSequence(0);
  }

  stopPlayAllScript() {
    this.isPlayingAll = false;
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

  playSentenceInSequence(idx) {
    if (!this.isPlayingAll) return;
    const list = appState.sentenceList;
    if (idx >= list.length) {
      this.stopPlayAllScript();
      toast.show('🎉 전체 스크립트 낭독이 완료되었습니다!');
      return;
    }

    this.playCurrentSentenceIndex = idx;
    this.highlightActiveSentenceRow(idx);

    const targetStn = list[idx];

    // Real audio play (owner 'memorize' → the Practice looper no longer pauses it at S1's boundary)
    if (this.canPlayUploadedAudio()) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null; // null → play to media end

      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
      playbackController.playSegment(stnStart, stnEnd, {
        owner: 'memorize',
        onEnd: () => {
          // 0.4s pause between sentences
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        }
      }).catch(e => {
        console.error(e);
        if (this.isPlayingAll) this.stopPlayAllScript();
      });
    } else {
      // Speech Synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(targetStn.text);
        utter.lang = 'en-US';
        utter.rate = 0.95;
        utter.onend = () => {
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        };
        utter.onerror = () => {
          if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
        };
        window.speechSynthesis.speak(utter);
      }
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
    // Synchronize flip state: if Korean is on front in Page 3 canvas, show Korean in classroom modal
    this.areClassroomCardsFlipped = !!appState.memorizeAllFlipped;

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
      this.renderClassroomModal();
    }
  }

  nextClassroomSentence() {
    const list = appState.sentenceList;
    if (list && this.classroomIndex < list.length - 1) {
      this.classroomIndex++;
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
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }
    toast.show(this.areClassroomCardsFlipped ? '🔄 모든 청크 뒷면(해석)으로 뒤집기' : '🔄 모든 청크 앞면(영어)으로 뒤집기');
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
      this.classroomStnCounter.textContent = `${currentIdx + 1} / ${list.length} 문장 (선택 문장 가운데 표시)`;
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.disabled = (currentIdx <= 0);
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.disabled = (currentIdx >= list.length - 1);
    }
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.innerHTML = this.areClassroomCardsFlipped
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }

    if (!this.classroomChunksContainer) return;
    this.classroomChunksContainer.innerHTML = '';

    // Render 3 sentences: Prev (i - 1), Active Center (i), Next (i + 1)
    const rowsToRender = [
      { type: 'prev', idx: currentIdx - 1, label: '이전 문장' },
      { type: 'active', idx: currentIdx, label: '현재 문장 (중심)' },
      { type: 'next', idx: currentIdx + 1, label: '다음 문장' }
    ];

    rowsToRender.forEach(rowDef => {
      const rowEl = document.createElement('div');
      rowEl.className = `classroom-sentence-row row-${rowDef.type}`;

      if (rowDef.idx < 0) {
        rowEl.classList.add('is-placeholder');
        rowEl.innerHTML = `
          <div class="classroom-row-header placeholder-header">
            <span class="classroom-row-badge dimmed">S0</span>
            <span class="classroom-row-preview">시작 문장입니다 (이전 문장 없음)</span>
          </div>
        `;
        this.classroomChunksContainer.appendChild(rowEl);
        return;
      }

      if (rowDef.idx >= list.length) {
        rowEl.classList.add('is-placeholder');
        rowEl.innerHTML = `
          <div class="classroom-row-header placeholder-header">
            <span class="classroom-row-badge dimmed">S${list.length + 1}</span>
            <span class="classroom-row-preview">마지막 문장입니다 (다음 문장 없음)</span>
          </div>
        `;
        this.classroomChunksContainer.appendChild(rowEl);
        return;
      }

      const sIdx = rowDef.idx;
      const stnData = list[sIdx];
      const isActive = (rowDef.type === 'active');

      if (isActive) {
        rowEl.classList.add('is-active');
      } else {
        rowEl.classList.add('is-context');
        rowEl.addEventListener('click', (e) => {
          if (e.target.closest('.classroom-chunk-card') || e.target.closest('button')) return;
          this.classroomIndex = sIdx;
          this.renderClassroomModal();
        });
      }

      // Sentence Header inside row
      const headerEl = document.createElement('div');
      headerEl.className = 'classroom-row-header';

      const badgeBtn = document.createElement('button');
      badgeBtn.className = `classroom-row-badge ${isActive ? 'active-badge' : ''}`;
      badgeBtn.textContent = `S${sIdx + 1}`;
      badgeBtn.title = isActive ? '현재 선택 문장' : `문장 S${sIdx + 1}로 이동`;
      if (!isActive) {
        badgeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.classroomIndex = sIdx;
          this.renderClassroomModal();
        });
      }

      const previewText = document.createElement('span');
      previewText.className = 'classroom-row-preview';
      previewText.textContent = stnData.text || '';
      previewText.title = stnData.result?.natural || '';

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
        card.className = `classroom-chunk-card ${isActive ? 'active-card' : 'context-card'}`;
        card.setAttribute('data-c-idx', cIdx);
        card.setAttribute('data-s-idx', sIdx);
        if (this.areClassroomCardsFlipped) {
          card.classList.add('flipped');
        }

        const keyNum = cIdx + 1;
        // Key badges only on active center row (1~9)
        const keyBadge = (isActive && keyNum <= 9) ? `<span class="classroom-key-badge">${keyNum}</span>` : '';

        const enText = (chunk.en || '').trim();
        const koText = (chunk.ko || '').trim();

        // Calculate sleek compact width so sentence stays strictly on 1 line
        const charLen = Math.max(enText.length, Math.ceil(koText.length * 1.3));
        const estCardW = Math.max(isActive ? 36 : 28, charLen * (isActive ? 9 : 7) + (isActive ? 14 : 10));
        card.style.width = `${estCardW}px`;
        card.style.flex = '0 1 auto';

        card.innerHTML = `
          ${keyBadge}
          <div class="classroom-card-inner">
            <div class="classroom-face classroom-face-en">
              <span class="classroom-chunk-text">${escapeHtml(enText)}</span>
            </div>
            <div class="classroom-face classroom-face-ko">
              <span class="classroom-chunk-text">${escapeHtml(koText)}</span>
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

    // Precise fitting to prevent any horizontal overflow and scrollbars
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
        if (this.classroomChunksContainer.clientWidth) {
          availWidth = this.classroomChunksContainer.clientWidth - 32;
        } else if (this.classroomModal && this.classroomModal.clientWidth) {
          availWidth = this.classroomModal.clientWidth - 80;
        } else {
          availWidth = 1100;
        }
      }

      const isActive = row.classList.contains('is-active');
      const gap = 6;
      const totalGaps = (cards.length - 1) * gap;
      // Active: 4px*2 padding + 2px border + 2px buffer = 16px (padding is 4px 7px)
      // Context: 2px*2 padding + 2px border + 2px buffer = 12px (padding is 2px 5px)
      const fixedCardExtra = isActive ? 16 : 12;
      const totalFixedOverhead = (cards.length * fixedCardExtra) + totalGaps;
      const availTextWidth = Math.max(20, availWidth - totalFixedOverhead - 4);

      const baseFontRem = isActive ? 1.05 : 0.88;
      const fontScaleFactor = (baseFontRem * 16) / 14.72;

      const rawTextWidths = [];
      cards.forEach(card => {
        const enEl = card.querySelector('.classroom-face-en .classroom-chunk-text');
        const koEl = card.querySelector('.classroom-face-ko .classroom-chunk-text');
        const enText = enEl ? enEl.textContent.trim() : '';
        const koText = koEl ? koEl.textContent.trim() : '';

        const wEn = this.measureTextWidth(enText, false) * fontScaleFactor;
        const wKo = this.measureTextWidth(koText, true) * fontScaleFactor;
        const maxTextW = Math.max(wEn, wKo, 10);
        rawTextWidths.push(maxTextW);
      });

      const totalRawTextWidth = rawTextWidths.reduce((sum, w) => sum + w, 0);

      if (totalRawTextWidth > availTextWidth) {
        const scale = availTextWidth / totalRawTextWidth;
        const scaledFontRem = Math.max(0.55, Math.min(baseFontRem, baseFontRem * scale));

        if (isActive) {
          if (typeof chunksWrap.style.setProperty === 'function') {
            chunksWrap.style.setProperty('--classroom-font-size', `${scaledFontRem.toFixed(3)}rem`);
          } else {
            chunksWrap.style['--classroom-font-size'] = `${scaledFontRem.toFixed(3)}rem`;
          }
        } else {
          if (typeof chunksWrap.style.setProperty === 'function') {
            chunksWrap.style.setProperty('--classroom-context-font-size', `${scaledFontRem.toFixed(3)}rem`);
          } else {
            chunksWrap.style['--classroom-context-font-size'] = `${scaledFontRem.toFixed(3)}rem`;
          }
        }

        let remaining = availTextWidth;
        cards.forEach((card, idx) => {
          let allocated;
          if (idx === cards.length - 1) {
            allocated = Math.max(8, remaining);
          } else {
            allocated = Math.max(8, Math.floor(rawTextWidths[idx] * scale));
            remaining -= allocated;
          }
          const cardW = allocated + fixedCardExtra;
          card.style.flex = '0 0 auto';
          card.style.width = `${cardW}px`;
          card.style.minWidth = '0px';
          card.style.maxWidth = 'none';
        });
      } else {
        if (isActive) {
          if (typeof chunksWrap.style.removeProperty === 'function') {
            chunksWrap.style.removeProperty('--classroom-font-size');
          } else {
            delete chunksWrap.style['--classroom-font-size'];
          }
        } else {
          if (typeof chunksWrap.style.removeProperty === 'function') {
            chunksWrap.style.removeProperty('--classroom-context-font-size');
          } else {
            delete chunksWrap.style['--classroom-context-font-size'];
          }
        }
        cards.forEach((card, idx) => {
          const cardW = Math.max(isActive ? 36 : 28, Math.round(rawTextWidths[idx]) + fixedCardExtra);
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
