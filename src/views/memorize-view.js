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
import { toast } from '../ui/toast-manager.js';

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
    this.classroomFullText = document.getElementById('classroomFullText');
    this.classroomChunksContainer = document.getElementById('classroomChunksContainer');
    this.classroomNaturalSection = document.getElementById('classroomNaturalSection');
    this.classroomNaturalText = document.getElementById('classroomNaturalText');
    this.btnToggleClassroomNatural = document.getElementById('btnToggleClassroomNatural');
    this.btnClassroomPlay = document.getElementById('btnClassroomPlay');
    this.btnClassroomFlipAll = document.getElementById('btnClassroomFlipAll');
    this.btnClassroomPrev = document.getElementById('btnClassroomPrev');
    this.btnClassroomNext = document.getElementById('btnClassroomNext');
    this.btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
    this.classroomIndex = 0;
    this.isClassroomNaturalHidden = false;
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
    if (this.btnToggleClassroomNatural) {
      this.btnToggleClassroomNatural.addEventListener('click', () => this.toggleClassroomNatural());
    }
  }

  setMemorizeMode(mode) {
    appState.memorizeMode = mode;
    this.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-memorize-mode') === mode);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', mode);
    }

    toast.show(`암기 모드: ${this.getModeLabel(mode)}`);
  }

  getModeLabel(mode) {
    switch (mode) {
      case 'en': return '영어만 보기';
      case 'ko': return '한국어만 보기';
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
        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${stn.text}</span>
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

        // Shortcut Key Badge (1 to 9)
        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="memorize-key-badge" title="숫자키 [${keyNum}] 뒤집기">${keyNum}</span>` : '';

        // Dynamic width per card based on content length with minimal padding
        const enLen = (chunk.en || '').trim().length;
        const koLen = (chunk.ko || '').trim().length;
        const estContentWidth = Math.max(enLen * 11, koLen * 16);
        const cardWidth = Math.max(48, Math.round(estContentWidth + 24));
        cCard.style.width = `${cardWidth}px`;
        cCard.style.flex = '0 0 auto';

        cCard.innerHTML = `
          <div class="memorize-card-inner">
            ${keyBadge}
            <div class="memorize-face memorize-face-en">
              <span class="chunk-en-text">${chunk.en}</span>
            </div>
            <div class="memorize-face memorize-face-ko">
              <span class="chunk-ko-text">${chunk.ko}</span>
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

      // Precise measurement to prevent any text clipping on proportional fonts
      requestAnimationFrame(() => {
        if (!this.canvasContainer) return;
        const cards = this.canvasContainer.querySelectorAll('.memorize-chunk-card');
        cards.forEach(c => {
          const enEl = c.querySelector('.chunk-en-text');
          const koEl = c.querySelector('.chunk-ko-text');
          const wEn = enEl ? enEl.scrollWidth : 0;
          const wKo = koEl ? koEl.scrollWidth : 0;
          const maxW = Math.max(wEn, wKo);
          if (maxW > 0) {
            const targetW = Math.max(48, maxW + 24);
            const currentW = parseFloat(c.style.width || '0');
            if (targetW > currentW) {
              c.style.width = `${targetW}px`;
              c.style.minWidth = `${targetW}px`;
            }
          }
        });
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
    if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused) {
      this.nativeAudioPlayer.pause();
    }
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

    // Real audio play
    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;

      this.nativeAudioPlayer.currentTime = stnStart;
      this.nativeAudioPlayer.play().catch(e => console.error(e));

      const checkEnd = () => {
        if (!this.isPlayingAll) return;
        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
          // 0.4s pause between sentences
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        } else {
          requestAnimationFrame(checkEnd);
        }
      };
      requestAnimationFrame(checkEnd);
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

  playSingleSentence(idx) {
    const list = appState.sentenceList;
    if (!list || idx < 0 || idx >= list.length) return;

    this.highlightActiveSentenceRow(idx);
    const targetStn = list[idx];

    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;

      this.nativeAudioPlayer.currentTime = stnStart;
      this.nativeAudioPlayer.play().catch(e => console.error(e));

      const checkEnd = () => {
        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
          this.nativeAudioPlayer.pause();
        } else {
          requestAnimationFrame(checkEnd);
        }
      };
      requestAnimationFrame(checkEnd);
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
    this.isClassroomNaturalHidden = false;
    this.areClassroomCardsFlipped = false;

    this.renderClassroomModal();
    if (this.classroomModal) {
      this.classroomModal.classList.remove('hidden');
    }
    window.addEventListener('keydown', this.boundClassroomKeyHandler);
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
    toast.show(this.areClassroomCardsFlipped ? '🔄 모든 청크 뒷면(해석)으로 뒤집기' : '🔄 모든 청크 앞면(영어)으로 뒤집기');
  }

  toggleClassroomNatural() {
    this.isClassroomNaturalHidden = !this.isClassroomNaturalHidden;
    if (this.classroomNaturalSection) {
      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
    }
    toast.show(this.isClassroomNaturalHidden ? '우리말 해석 가림' : '우리말 해석 표시');
  }

  flipClassroomCardByIndex(cIdx) {
    if (!this.classroomChunksContainer) return;
    const card = this.classroomChunksContainer.querySelector(`.classroom-chunk-card[data-c-idx="${cIdx}"]`);
    if (card) {
      card.classList.toggle('flipped');
      toast.show(`청크 #${cIdx + 1} 뒤집기`);
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

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleClassroomNatural();
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
    const stn = list[this.classroomIndex];

    if (this.classroomStnBadge) {
      this.classroomStnBadge.textContent = `S${this.classroomIndex + 1}`;
    }
    if (this.classroomStnCounter) {
      this.classroomStnCounter.textContent = `${this.classroomIndex + 1} / ${list.length} 문장`;
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.disabled = (this.classroomIndex <= 0);
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.disabled = (this.classroomIndex >= list.length - 1);
    }

    if (this.classroomFullText) {
      this.classroomFullText.textContent = stn.text || '';
    }

    if (this.classroomNaturalText) {
      this.classroomNaturalText.textContent = stn.result?.natural || '';
    }
    if (this.classroomNaturalSection) {
      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
    }

    if (this.classroomChunksContainer) {
      this.classroomChunksContainer.innerHTML = '';
      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];

      chunks.forEach((chunk, cIdx) => {
        const card = document.createElement('div');
        card.className = 'classroom-chunk-card';
        card.setAttribute('data-c-idx', cIdx);
        if (this.areClassroomCardsFlipped) {
          card.classList.add('flipped');
        }

        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="classroom-key-badge">${keyNum}</span>` : '';
        const enText = (chunk.en || '').trim();
        const koText = (chunk.ko || '').trim();
        const longestText = enText.length >= koText.length ? enText : koText;

        // Dynamic initial estimation based on 1.75rem bold font
        const estEn = enText.length * 20;
        const estKo = koText.length * 28;
        const estW = Math.max(estEn, estKo) + 64;
        const initialWidth = Math.max(90, Math.ceil(estW));
        card.style.width = `${initialWidth}px`;
        card.style.flex = '0 0 auto';

        card.innerHTML = `
          <div class="classroom-card-inner">
            <div class="classroom-card-sizer" aria-hidden="true">${longestText}</div>
            ${keyBadge}
            <div class="classroom-face classroom-face-en">
              <span class="classroom-chunk-text">${enText}</span>
            </div>
            <div class="classroom-face classroom-face-ko">
              <span class="classroom-chunk-text">${koText}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          card.classList.toggle('flipped');
        });

        this.classroomChunksContainer.appendChild(card);
      });

      // Precise DOM measurement after render to guarantee ZERO overflow/clipping
      requestAnimationFrame(() => {
        if (!this.classroomChunksContainer) return;
        const cards = this.classroomChunksContainer.querySelectorAll('.classroom-chunk-card');
        cards.forEach(c => {
          const enEl = c.querySelector('.classroom-face-en .classroom-chunk-text');
          const koEl = c.querySelector('.classroom-face-ko .classroom-chunk-text');
          const wEn = enEl ? enEl.scrollWidth : 0;
          const wKo = koEl ? koEl.scrollWidth : 0;
          const maxTextW = Math.max(wEn, wKo);
          if (maxTextW > 0) {
            const targetW = Math.max(90, maxTextW + 64);
            c.style.width = `${targetW}px`;
            c.style.minWidth = `${targetW}px`;
          }
        });
      });
    }
  }

  onActivated() {
    this.activeRowIndex = appState.activeSentenceIndex || 0;
    this.renderFullScriptCanvas();
    this.setActiveRow(this.activeRowIndex);
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
