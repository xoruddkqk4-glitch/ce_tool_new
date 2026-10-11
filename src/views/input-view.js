/**
 * Page 1: Data Input View (InputView)
 * - 3 Input Modes: Both (Audio + Script), Audio Only (STT), Script Only (Default)
 * - MP3 drag & drop file upload
 * - Script textarea with character count & clear button
 * - Preset chips for instant evaluation
 * - Instant parsing results on Page 1 (sentence list, chunk display, Korean translation)
 * - Manual chunk splitting/merging (interactive word dividers + text edit)
 * - Editable Korean translation in real-time
 * - A4 Portrait Student/Teacher Printable & Downloadable Handout
 * - Direct transition to Page 2 (Practice) with verified chunks
 */

import { appState } from '../core/app-state.js';
import { splitIntoSentences, distributeChunksSequentially } from '../core/text-splitter.js';
import { aiService } from '../services/ai-service.js';
import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
import { decodeAudioFile, getAudioContext } from '../audio/audio-context.js';
import { detectAudioSentenceBoundaries } from '../audio/silence-detector.js';
import { synthesizeSilentAudioForScript, speakText } from '../audio/tts-synthesizer.js';
import { getFelsInfo } from '../config/fels-dict.js';
import { toast } from '../ui/toast-manager.js';

export class InputView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();
    this.handoutMode = 'student'; // 'student' | 'teacher'

    // DOM Elements - Input Form
    this.container = document.getElementById('view-input');
    this.modeTabs = document.querySelectorAll('.mode-tab');
    this.audioUploadSection = document.getElementById('audioUploadSection');
    this.dropArea = document.getElementById('dropArea');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.inputEnglish = document.getElementById('inputEnglish');
    this.charCount = document.getElementById('charCount');
    this.btnClear = document.getElementById('btnClear');
    this.btnTranslate = document.getElementById('btnTranslate');
    this.btnTranslateText = document.getElementById('btnTranslateText');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // DOM Elements - Parsed Results Section
    this.parsedResultsSection = document.getElementById('parsedResultsSection');
    this.parsedSentenceList = document.getElementById('parsedSentenceList');
    this.resultsCountBadge = document.getElementById('resultsCountBadge');
    this.btnPrintHandout = document.getElementById('btnPrintHandout');
    this.btnStartPractice = document.getElementById('btnStartPractice');
    this.btnHeaderStartPractice = document.getElementById('btnHeaderStartPractice');
    this.btnBottomPrintHandout = document.getElementById('btnBottomPrintHandout');
    this.btnBottomStartPractice = document.getElementById('btnBottomStartPractice');

    // DOM Elements - Handout Modal
    this.handoutModal = document.getElementById('handoutModal');
    this.btnCloseHandout = document.getElementById('btnCloseHandout');
    this.btnDoPrint = document.getElementById('btnDoPrint');
    this.btnDownloadHtml = document.getElementById('btnDownloadHtml');
    this.printableSheet = document.getElementById('printableSheet');
    this.btnHandoutTypeStudent = document.getElementById('btnHandoutTypeStudent');
    this.btnHandoutTypeTeacher = document.getElementById('btnHandoutTypeTeacher');

    // Audio Singleton
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    this.initEvents();
    this.setMode('text'); // default: script only
  }

  initEvents() {
    // Mode tabs
    this.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // File Drag & Drop
    if (this.dropArea) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dropArea.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dropArea.classList.remove('drag-over');
        });
      });

      this.dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('audio/')) {
          this.handleAudioFile(files[0]);
        } else {
          toast.show('⚠️ 오디오 파일(.mp3, .wav 등)만 업로드 가능합니다.');
        }
      });

      this.dropArea.addEventListener('click', (e) => {
        if (e.target.closest('#btnRemoveAudio') || e.target.closest('.audio-file-info')) return;
        if (this.audioFileInput) this.audioFileInput.click();
      });
    }

    if (this.audioFileInput) {
      this.audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleAudioFile(e.target.files[0]);
        }
      });
    }

    // Text Area & Char Counter
    if (this.inputEnglish) {
      this.inputEnglish.addEventListener('input', () => {
        const len = this.inputEnglish.value.length;
        if (this.charCount) this.charCount.textContent = `${len}자`;
      });

      this.inputEnglish.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.handleTranslate();
        }
      });
    }

    // Clear Button
    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        if (this.inputEnglish) {
          this.inputEnglish.value = '';
          if (this.charCount) this.charCount.textContent = '0자';
          this.inputEnglish.focus();
        }
        if (this.parsedResultsSection) {
          this.parsedResultsSection.classList.add('hidden');
        }
      });
    }

    // Preset Chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        if (text && this.inputEnglish) {
          if (appState.currentMode === 'audio') {
            this.setMode('text');
          }
          this.inputEnglish.value = text;
          if (this.charCount) this.charCount.textContent = `${text.length}자`;
          this.handleTranslate();
        }
      });
    });

    // Translate Trigger
    if (this.btnTranslate) {
      this.btnTranslate.addEventListener('click', () => this.handleTranslate());
    }

    // Handout Modal Triggers
    if (this.btnPrintHandout) {
      this.btnPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnBottomPrintHandout) {
      this.btnBottomPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }

    // Transition to Page 2
    const startPracticeHandler = () => {
      if (!appState.sentenceList || appState.sentenceList.length === 0) {
        if (this.inputEnglish && this.inputEnglish.value.trim()) {
          this.handleTranslate();
        }
      }
      this.router.navigateTo('practice');
    };
    if (this.btnStartPractice) {
      this.btnStartPractice.addEventListener('click', startPracticeHandler);
    }
    if (this.btnHeaderStartPractice) {
      this.btnHeaderStartPractice.addEventListener('click', startPracticeHandler);
    }
    if (this.btnBottomStartPractice) {
      this.btnBottomStartPractice.addEventListener('click', startPracticeHandler);
    }

    // Handout Modal Controls
    if (this.btnCloseHandout) {
      this.btnCloseHandout.addEventListener('click', () => this.closeHandoutModal());
    }
    if (this.handoutModal) {
      this.handoutModal.addEventListener('click', (e) => {
        if (e.target === this.handoutModal) this.closeHandoutModal();
      });
    }
    if (this.btnDoPrint) {
      this.btnDoPrint.addEventListener('click', () => {
        toast.show('🖨️ 인쇄 대화상자가 열립니다. [대상: PDF로 저장]을 선택하시면 A4 양면 PDF로 저장됩니다.');
        setTimeout(() => window.print(), 150);
      });
    }
    if (this.btnDownloadHtml) {
      this.btnDownloadHtml.addEventListener('click', () => this.downloadHandoutHtml());
    }
    if (this.btnHandoutTypeStudent) {
      this.btnHandoutTypeStudent.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnHandoutTypeTeacher) {
      this.btnHandoutTypeTeacher.addEventListener('click', () => this.openHandoutModal('teacher'));
    }
  }

  setMode(mode) {
    appState.setUploadMode(mode);

    this.modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    const scriptInputSection = document.getElementById('scriptInputSection');

    if (mode === 'both') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 생성 및 음성 연동';
    } else if (mode === 'audio') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.add('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
    } else {
      // text only
      if (this.audioUploadSection) this.audioUploadSection.classList.add('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 해석 및 FELS 생성';
    }
  }

  async handleAudioFile(file) {
    appState.uploadedAudioFile = file;
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
    }
    appState.uploadedAudioUrl = URL.createObjectURL(file);
    appState.isSynthesizedAudio = false;

    // Decode PCM buffer
    try {
      toast.show('⏳ 오디오 파형 분석 중...');
      const audioBuffer = await decodeAudioFile(file);
      appState.audioBuffer = audioBuffer;
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    } catch (err) {
      console.warn('Audio decoding fallback:', err);
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    }

    this.renderDropAreaPreview(file);
  }

  renderDropAreaPreview(file) {
    if (!this.dropArea) return;
    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    this.dropArea.innerHTML = `
      <div class="audio-file-info">
        <div class="audio-file-icon">🎵</div>
        <div class="audio-file-details">
          <div class="audio-file-name">${file.name}</div>
          <div class="audio-file-meta">${formatSize(file.size)} • ${file.type || 'audio/mp3'}</div>
        </div>
        <button id="btnRemoveAudio" class="icon-btn remove-btn" title="오디오 삭제">✕</button>
      </div>
    `;

    const btnRemove = this.dropArea.querySelector('#btnRemoveAudio');
    if (btnRemove) {
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetAudioFile();
      });
    }
  }

  resetAudioFile() {
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
      appState.uploadedAudioUrl = null;
    }
    appState.uploadedAudioFile = null;
    appState.audioBuffer = null;
    appState.isSynthesizedAudio = false;

    if (this.audioFileInput) this.audioFileInput.value = '';
    if (this.dropArea) {
      this.dropArea.innerHTML = `
        <div class="drop-icon">📁</div>
        <p class="drop-title">MP3 음성 파일을 여기에 드래그하거나 클릭하여 업로드</p>
        <p class="drop-hint">지원 형식: MP3, WAV, M4A, OGG (수능/교재 듣기 음성)</p>
      `;
    }
    toast.show('오디오 파일이 제거되었습니다.');
  }

  async handleTranslate() {
    const mode = appState.currentMode;

    // Mode 2: Audio Only (STT)
    if (mode === 'audio') {
      if (!appState.uploadedAudioFile) {
        toast.show('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
        return;
      }
      if (!aiService.hasKey()) {
        toast.show('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 AI API 키를 입력하세요.');
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.click();
        return;
      }

      this.setLoading(true);
      try {
        const base64Audio = await this.readFileAsBase64(appState.uploadedAudioFile);
        const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
        const aiResult = await aiService.transcribeAndTranslateAudio(base64Audio, mimeType);

        const scriptText = aiResult.script || '';
        if (this.inputEnglish) {
          this.inputEnglish.value = scriptText;
          if (this.charCount) this.charCount.textContent = `${scriptText.length}자`;
        }

        const rawSentences = splitIntoSentences(scriptText);
        const boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);

        // Partition AI chunks sequentially across each sentence so S1 never contains S2/S3 chunks
        const distributedChunks = distributeChunksSequentially(rawSentences, aiResult.chunks || []);

        const sentenceList = rawSentences.map((stnText, idx) => {
          let result;
          const directStn = aiResult.sentences && aiResult.sentences[idx];
          if (directStn && directStn.chunks && directStn.chunks.length > 0) {
            result = {
              natural: directStn.natural || this.ruleEngine.process(stnText).natural || '',
              chunk_text: directStn.chunks.map(c => c.ko).join(' || '),
              direct: directStn.chunks.map(c => c.ko).join(' / '),
              chunks: directStn.chunks
            };
          } else {
            const stnChunks = distributedChunks[idx] || [];
            if (stnChunks.length > 0) {
              result = {
                natural: (idx === 0 && rawSentences.length === 1 ? aiResult.natural : this.ruleEngine.process(stnText).natural) || '',
                chunk_text: stnChunks.map(c => c.ko).join(' || '),
                direct: stnChunks.map(c => c.ko).join(' / '),
                chunks: stnChunks
              };
            } else {
              result = this.ruleEngine.process(stnText);
            }
          }
          return {
            index: idx,
            text: stnText,
            audioStart: boundaries[idx]?.start ?? null,
            audioEnd: boundaries[idx]?.end ?? null,
            result
          };
        });

        appState.scriptText = scriptText;
        appState.setSentenceList(sentenceList);

        // Render Results Panel on Page 1
        this.renderParsedResults();
        toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 완료! 아래에서 청크와 해석을 확인하세요.`);
      } catch (err) {
        console.error(err);
        toast.show(`❌ 음성 추출 오류: ${err.message}`);
      } finally {
        this.setLoading(false);
      }
      return;
    }

    // Mode 1 (Both) or Mode 3 (Text)
    const text = this.inputEnglish ? this.inputEnglish.value.trim() : '';
    if (!text) {
      toast.show('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
      if (this.inputEnglish) this.inputEnglish.focus();
      return;
    }

    this.setLoading(true);

    try {
      // If no authentic uploaded MP3, synthesize clean silent WAV for visual waveform
      if (!appState.uploadedAudioFile || appState.isSynthesizedAudio) {
        try {
          const audioCtx = getAudioContext();
          if (audioCtx && typeof audioCtx.createBuffer === 'function') {
            const synthData = synthesizeSilentAudioForScript(text, audioCtx);
            if (synthData) {
              if (appState.uploadedAudioUrl) URL.revokeObjectURL(appState.uploadedAudioUrl);
              appState.uploadedAudioUrl = URL.createObjectURL(synthData.wavBlob);
              appState.audioBuffer = synthData.audioBuffer;
              appState.isSynthesizedAudio = true;
              appState.uploadedAudioFile = new File([synthData.wavBlob], 'tts_synthesized.wav', { type: 'audio/wav' });
            }
          }
        } catch (audioErr) {
          console.warn('Audio synthesis fallback notice:', audioErr);
        }
      }

      // Sentence splitting
      let rawSentences = splitIntoSentences(text);
      if (rawSentences.length === 0) rawSentences.push(text);

      const boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);

      const sentenceList = rawSentences.map((stnText, idx) => ({
        index: idx,
        text: stnText,
        audioStart: boundaries[idx]?.start ?? null,
        audioEnd: boundaries[idx]?.end ?? null,
        result: this.ruleEngine.process(stnText)
      }));

      appState.scriptText = text;
      appState.setSentenceList(sentenceList);

      // Render Results Panel on Page 1
      this.renderParsedResults();
      toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 및 청크 분석 완료! 아래에서 검토 및 수정할 수 있습니다.`);
    } catch (err) {
      console.error('Translation error:', err);
      toast.show(`❌ 오류: ${err.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  renderParsedResults() {
    if (!this.parsedResultsSection || !this.parsedSentenceList) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.parsedResultsSection.classList.add('hidden');
      return;
    }

    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = `총 ${sentences.length}개 문장`;
    }

    this.parsedSentenceList.innerHTML = '';

    sentences.forEach((stn, idx) => {
      // Ensure stn.result exists
      if (!stn.result) {
        stn.result = this.ruleEngine.process(stn.text);
      }

      const itemCard = document.createElement('div');
      itemCard.className = 'parsed-sentence-item';
      itemCard.setAttribute('data-stn-idx', idx);

      const hasAudioTime = stn.audioStart !== null && stn.audioEnd !== null;
      const timeStr = hasAudioTime 
        ? `${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}` 
        : '';

      itemCard.innerHTML = `
        <div class="sentence-item-header">
          <div class="stn-header-meta">
            <span class="stn-badge-pill">문장 ${idx + 1} (S${idx + 1})</span>
            ${hasAudioTime ? `<span class="stn-audio-time">⏱ ${timeStr}</span>` : ''}
          </div>
          <button class="stn-speak-btn" type="button" title="문장 음성 듣기">
            <span>🔊 문장 듣기</span>
          </button>
        </div>

        <!-- Interactive Clickable Word-Divider Track -->
        <div class="word-divider-track"></div>

        <!-- Editable Fields Grid -->
        <div class="sentence-edit-grid">
          <div class="sentence-edit-field full-width-field">
            <label class="edit-field-label">
              <span>📝 영어 문장 원문 (Script):</span>
              <span style="font-weight: 400; opacity: 0.7;">오탈자나 단어를 직접 수정하면 청크 분석 및 음성이 즉시 동기화됩니다</span>
            </label>
            <input type="text" class="sentence-script-input" value="${this.escapeHtml(stn.text || '')}">
          </div>
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✂️ 청크 구분(||) 텍스트 편집:</span>
              <span style="font-weight: 400; opacity: 0.7;">단어 사이에 '||'를 직접 입력하거나 위 구분자를 클릭하세요</span>
            </label>
            <input type="text" class="chunk-text-input" value="${this.escapeHtml(this.getChunkString(stn.result.chunks))}">
          </div>
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✍️ 우리말 자연스러운 해석:</span>
              <span style="font-weight: 400; opacity: 0.7;">학생 학습지 및 카드 뒷면에 반영됩니다</span>
            </label>
            <input type="text" class="sentence-natural-input" value="${this.escapeHtml(stn.result.natural || '')}">
          </div>
        </div>
      `;

      // 1. Hook up Speak/Play button
      const speakBtn = itemCard.querySelector('.stn-speak-btn');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => {
          this.playOrSpeakSentence(stn, speakBtn);
        });
      }

      // 2. Render Interactive Word-Divider Track
      const track = itemCard.querySelector('.word-divider-track');
      const scriptInput = itemCard.querySelector('.sentence-script-input');
      const chunkInput = itemCard.querySelector('.chunk-text-input');
      const naturalInput = itemCard.querySelector('.sentence-natural-input');

      if (track) {
        this.renderWordDividerTrack(track, stn, chunkInput);
      }

      // 3. Hook up Script Input
      if (scriptInput) {
        scriptInput.addEventListener('change', () => {
          this.updateSentenceScript(stn, scriptInput.value, chunkInput, track);
        });
        scriptInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.updateSentenceScript(stn, scriptInput.value, chunkInput, track);
          }
        });
      }

      // 4. Hook up Chunk Text Input
      if (chunkInput) {
        chunkInput.addEventListener('change', () => {
          this.updateChunksFromTextInput(stn, chunkInput.value, track);
        });
        chunkInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.updateChunksFromTextInput(stn, chunkInput.value, track);
          }
        });
      }

      // 5. Hook up Natural Korean Input
      if (naturalInput) {
        naturalInput.addEventListener('input', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
        });
      }

      this.parsedSentenceList.appendChild(itemCard);
    });

    this.parsedResultsSection.classList.remove('hidden');
    setTimeout(() => {
      this.parsedResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  renderWordDividerTrack(track, stn, chunkInput) {
    if (!track) return;
    track.innerHTML = '';

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    // Determine current boundary word indices
    const boundaryWordIndices = new Set();
    let runningWordCount = 0;
    (stn.result.chunks || []).forEach((c, cIdx) => {
      const cWords = (c.en || '').trim().split(/\s+/).filter(Boolean);
      runningWordCount += cWords.length;
      if (cIdx < (stn.result.chunks || []).length - 1 && runningWordCount > 0 && runningWordCount < words.length) {
        boundaryWordIndices.add(runningWordCount - 1);
      }
    });

    words.forEach((w, idx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word-token';
      wordSpan.textContent = w;
      track.appendChild(wordSpan);

      // Divider slot between words
      if (idx < words.length - 1) {
        const isBoundary = boundaryWordIndices.has(idx);
        const dividerSlot = document.createElement('span');
        dividerSlot.className = `divider-slot ${isBoundary ? 'active' : ''}`;
        dividerSlot.setAttribute('data-word-idx', idx);
        dividerSlot.title = isBoundary ? "클릭하여 청크 합치기" : "클릭하여 청크 분리하기 (|| 추가)";
        dividerSlot.textContent = isBoundary ? '||' : '+';

        dividerSlot.addEventListener('click', () => {
          if (boundaryWordIndices.has(idx)) {
            boundaryWordIndices.delete(idx);
          } else {
            boundaryWordIndices.add(idx);
          }
          this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);
          if (chunkInput) {
            chunkInput.value = this.getChunkString(stn.result.chunks);
          }
          this.renderWordDividerTrack(track, stn, chunkInput);
          toast.show('✂️ 청크 구분이 업데이트되었습니다.');
        });

        track.appendChild(dividerSlot);
      }
    });
  }

  rebuildChunksFromBoundaries(stn, words, boundaryWordIndices) {
    const newChunks = [];
    let curWords = [];

    words.forEach((w, idx) => {
      curWords.push(w);
      if (boundaryWordIndices.has(idx) || idx === words.length - 1) {
        const enStr = curWords.join(' ');
        const existingChunk = (stn.result?.chunks || []).find(c => c.en.trim() === enStr.trim());
        const koStr = existingChunk ? existingChunk.ko : this.ruleEngine.translateChunkText(enStr);
        newChunks.push({ en: enStr, ko: koStr });
        curWords = [];
      }
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
  }

  updateChunksFromTextInput(stn, chunkedText, track) {
    const parts = (chunkedText || '').split('||').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const newChunks = parts.map(part => {
      const existing = (stn.result?.chunks || []).find(c => c.en.trim() === part);
      return {
        en: part,
        ko: existing ? existing.ko : this.ruleEngine.translateChunkText(part)
      };
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');

    if (track) {
      this.renderWordDividerTrack(track, stn, null);
    }
    toast.show('✂️ 청크 구분이 저장되었습니다.');
  }

  updateSentenceScript(stn, newText, chunkInput, track) {
    const cleanText = (newText || '').trim();
    if (!cleanText || cleanText === stn.text) return;
    stn.text = cleanText;

    // Re-process chunks with rule engine
    const newResult = this.ruleEngine.process(cleanText);
    if (!stn.result) stn.result = {};
    stn.result.chunks = newResult.chunks;
    stn.result.direct = newResult.direct;
    if (!stn.result.natural) stn.result.natural = newResult.natural;
    stn.cachedPeaks = null;

    if (chunkInput) {
      chunkInput.value = this.getChunkString(stn.result.chunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, chunkInput);
    }

    // Sync global script text
    appState.scriptText = (appState.sentenceList || []).map(s => s.text).join(' ');
    toast.show(`📝 문장 S${stn.index + 1} 원문이 수정되었습니다.`);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    return chunks.map(c => (c.en || '').trim()).filter(Boolean).join(' || ');
  }

  playOrSpeakSentence(stn, speakBtn) {
    if (speakBtn) {
      const origHtml = speakBtn.innerHTML;
      speakBtn.innerHTML = '<span>🔊 재생 중...</span>';
      setTimeout(() => {
        if (speakBtn) speakBtn.innerHTML = origHtml;
      }, 1500);
    }

    // 1. If authentic uploaded audio exists, play slice
    if (appState.uploadedAudioUrl && this.nativeAudioPlayer && !appState.isSynthesizedAudio) {
      if (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl) {
        this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
      }
      if (stn.audioStart !== null && stn.audioEnd !== null) {
        try {
          this.nativeAudioPlayer.currentTime = stn.audioStart;
          this.nativeAudioPlayer.play().catch(e => {
            console.warn('Audio play error, falling back to TTS:', e);
            speakText(stn.text, 'en-US');
          });

          if (this.currentStopHandler) {
            this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
          }
          this.currentStopHandler = () => {
            if (this.nativeAudioPlayer.currentTime >= stn.audioEnd) {
              this.nativeAudioPlayer.pause();
              this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
              this.currentStopHandler = null;
            }
          };
          this.nativeAudioPlayer.addEventListener('timeupdate', this.currentStopHandler);
          return;
        } catch (e) {
          console.warn('Audio playback error, fallback to TTS:', e);
        }
      }
    }

    // 2. High-reliability TTS Fallback
    speakText(stn.text, 'en-US');
  }

  // =========================================================================
  // A4 Printable Handout Modal Functions
  // =========================================================================

  openHandoutModal(mode = 'student') {
    this.handoutMode = mode;
    if (this.btnHandoutTypeStudent && this.btnHandoutTypeTeacher) {
      this.btnHandoutTypeStudent.classList.toggle('active', mode === 'student');
      this.btnHandoutTypeTeacher.classList.toggle('active', mode === 'teacher');
    }

    this.renderHandoutSheet();
    if (this.handoutModal) {
      this.handoutModal.classList.remove('hidden');
      const modalBody = this.handoutModal.querySelector('.handout-modal-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
      setTimeout(() => {
        if (modalBody) modalBody.scrollTop = 0;
      }, 50);
    }
  }

  closeHandoutModal() {
    if (this.handoutModal) {
      this.handoutModal.classList.add('hidden');
    }
  }

  renderHandoutSheet() {
    if (!this.printableSheet) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.printableSheet.innerHTML = `
        <div style="padding: 60px; text-align: center; color: #64748b; font-size: 11pt;">
          출력할 문장 데이터가 없습니다. 먼저 스크립트를 입력하고 해석을 생성하세요.
        </div>
      `;
      return;
    }

    const isTeacher = this.handoutMode === 'teacher';

    // 1. FRONT PAGE (앞면: 오직 소리 청취 약형드랩만 - 청크 분리 표시 '||' 일체 없음!)
    let frontSentencesHtml = '';
    sentences.forEach((stn, idx) => {
      // Natural continuous English sentence with FELS blanks, NO chunk divider (' || ')
      const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
      const wordParts = words.map(w => {
        const fels = getFelsInfo(w);
        if (fels) {
          if (isTeacher) {
            return `<span class="handout-fels-blank answer-mode">[ ${w} ]</span>`;
          } else {
            return `<span class="handout-fels-blank">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</span>`;
          }
        } else {
          return `<span>${w}</span>`;
        }
      });

      const naturalSentenceHtml = wordParts.join(' ');

      frontSentencesHtml += `
        <div class="handout-stn-item">
          <div class="handout-stn-main-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-stn-text">${naturalSentenceHtml}</div>
          </div>
          <div class="handout-dictation-line">
            <span>✍️ 받아쓰기 / 메모:</span>
            <span class="handout-line-filler"></span>
          </div>
        </div>
      `;
    });

    // 2. BACK PAGE (뒷면: 직독직해 우리말 해석만 - 학생들이 보며 영어 문장 말하기 연습)
    let backSentencesHtml = '';
    sentences.forEach((stn, idx) => {
      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];

      const chunkedKoSegments = chunks.map(c => {
        const koText = (c.ko || '').trim() || (c.en || '').trim();
        return `<span class="handout-chunk-box">[ ${koText} ]</span>`;
      });
      const chunkedKoHtml = chunkedKoSegments.join('<span class="handout-chunk-divider"> || </span>');

      backSentencesHtml += `
        <div class="handout-stn-item handout-speaking-item">
          <div class="handout-speaking-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-direct-ko">${chunkedKoHtml}</div>
          </div>
          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${stn.text}</div>` : ''}
          <div class="handout-speaking-check-row">
            <span class="speaking-check-label">🗣️ 말하기 훈련 체크:</span>
            <span class="check-box-pill">☐ 1차: 청크별 낭독</span>
            <span class="check-box-pill">☐ 2차: 직독직해 스피킹</span>
            <span class="check-box-pill">☐ 3차: 유창성 통과</span>
          </div>
        </div>
      `;
    });

    this.printableSheet.innerHTML = `
      <!-- ========================================================================= -->
      <!-- [A4 1페이지 - 앞면: 약형드랩 듣기 훈련지 (우리말 해석 없음 / 소리만 듣고 빈칸 채우기)] -->
      <!-- ========================================================================= -->
      <div class="a4-page-sheet a4-page-front">
        <div class="handout-sheet-label no-print">📄 [A4 1페이지 - 앞면: 약형드랩 듣기 훈련지] (우리말 해석 없음 / 소리 듣고 빈칸 채우기)</div>
        <div>
          <!-- Front Header -->
          <div class="handout-page-header">
            <div class="handout-title-area">
              <h2>CE Tool 문장 단위 약형드랩(FELS) 청크 학습지 [앞면]</h2>
              <div class="handout-subtitle">
                ${isTeacher ? '★ [교사용 정답지] 기능어 정답 확인용' : '★ [학생용 듣기 훈련지] 원어민 음성 청취 빈칸 채우기 (소리 집중 훈련)'}
              </div>
            </div>
            <table class="handout-score-table">
              <tr>
                <th>학 번</th>
                <th>이 름</th>
                <th>날 짜</th>
                <th>점 수</th>
              </tr>
              <tr>
                <td style="width: 55px; height: 22px;"></td>
                <td style="width: 65px;"></td>
                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                <td style="width: 60px; font-weight: 700;">&nbsp;&nbsp;&nbsp;&nbsp; / 100</td>
              </tr>
            </table>
          </div>

          <!-- Front Instructions -->
          <div class="handout-instructions-box">
            <strong>※ [앞면 학습 지침]</strong> 
            ① 원어민 음성을 집중 청취하고 <strong>[ &nbsp;&nbsp;&nbsp;&nbsp; ]</strong> 빈칸에 들리는 약형 기능어(전치사, 관사, 대명사, 조동사, be동사 등)를 소리만 듣고 바르게 적으세요. 
            ② 우리말 해석이나 청크 끊기 표시 없이 자연스러운 영어 문장의 소리에만 집중하는 훈련입니다.
          </div>

          <!-- Front Sentences -->
          <div class="handout-sentences-container">
            ${frontSentencesHtml}
          </div>
        </div>

        <!-- Front Footer -->
        <div class="handout-page-footer">
          <div class="handout-rules-bar">
            <strong>[FELS 약형 7대 영역]</strong>
            <span>①관사(a, an, the)</span>
            <span>②전치사(to, of, in, at, for, on, with)</span>
            <span>③대명사(it, you, him, her, them, that)</span>
            <span>④조동사(can, will, would, should)</span>
            <span>⑤접속사(and, but, that)</span>
            <span>⑥be동사(is, are, was, were)</span>
            <span>⑦축약형/부정(n't, 's, 've)</span>
          </div>
          <div class="handout-footer-meta">
            <span>CE Tool • Function-Embedded Listening Skills (FELS) System</span>
            <span>A4 양면 유인물 • 앞면 (Page 1 of 2)</span>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- [A4 2페이지 - 뒷면: 직독직해 말하기 훈련지 (우리말 해석 보며 영어 문장 말하기)] -->
      <!-- ========================================================================= -->
      <div class="a4-page-sheet a4-page-back">
        <div class="handout-sheet-label no-print">📄 [A4 2페이지 - 뒷면: 직독직해 말하기 훈련지] (우리말 해석 보며 영어 문장 말하기 연습)</div>
        <div>
          <!-- Back Header -->
          <div class="handout-page-header">
            <div class="handout-title-area">
              <h2>CE Tool 문장 단위 직독직해 말하기 훈련지 [뒷면]</h2>
              <div class="handout-subtitle">
                ${isTeacher ? '★ [교사용 가이드] 직독직해 청크 및 영작 모범 답안' : '★ [학생용 스피킹 훈련지] 직독직해 우리말 청크를 보면서 영어 문장 구두 발화하기'}
              </div>
            </div>
            <table class="handout-score-table">
              <tr>
                <th>학 번</th>
                <th>이 름</th>
                <th>날 짜</th>
                <th>말하기 평가</th>
              </tr>
              <tr>
                <td style="width: 55px; height: 22px;"></td>
                <td style="width: 65px;"></td>
                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                <td style="width: 60px; font-weight: 700; font-size: 8pt;">[ &nbsp; 통과 &nbsp; ]</td>
              </tr>
            </table>
          </div>

          <!-- Back Instructions -->
          <div class="handout-instructions-box">
            <strong>※ [뒷면 학습 지침]</strong> 
            ① 청크 단위('||')로 제시된 직독직해 우리말 어순을 보며, 지체 없이 영어 문장을 큰 소리로 말해보세요(직독직해 영작 및 스피킹 훈련). 
            ② 학생들은 직독직해를 보면서 영어 문장을 구두로 유창하게 말하는 연습을 합니다.
          </div>

          <!-- Back Sentences -->
          <div class="handout-sentences-container">
            ${backSentencesHtml}
          </div>
        </div>

        <!-- Back Footer -->
        <div class="handout-page-footer">
          <div class="handout-rules-bar">
            <strong>[직독직해 스피킹 3원칙]</strong>
            <span>① 우리말 어순 그대로 끊어 읽기</span>
            <span>② 청크를 보는 즉시 0.5초 내 영어 발화</span>
            <span>③ 막힘없이 연결하여 전체 영어 문장 완성</span>
          </div>
          <div class="handout-footer-meta">
            <span>CE Tool • Chunk Direct Translation & Speaking System</span>
            <span>A4 양면 유인물 • 뒷면 (Page 2 of 2)</span>
          </div>
        </div>
      </div>
    `;
  }

  downloadHandoutHtml() {
    const sheetHtml = this.printableSheet ? this.printableSheet.innerHTML : '';
    if (!sheetHtml) {
      toast.show('⚠️ 다운로드할 유인물 내용이 없습니다.');
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>CE Tool - A4 양면 약형드랩 & 직독직해 유인물</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pretendard", sans-serif; margin: 0; padding: 24px; background: #2b303a; color: #111827; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
    .a4-printable-sheet { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 32px; width: 100%; max-width: 210mm; margin: 0 auto; }
    .a4-page-sheet { width: 100%; min-height: 297mm; background: #ffffff; color: #111827; padding: 14mm 16mm; box-shadow: 0 10px 35px rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: flex-start; position: relative; box-sizing: border-box; }
    .handout-sheet-label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 800; color: #4338ca; background: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 9999px; padding: 4px 14px; margin-bottom: 12px; }
    .handout-page-header { border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
    .handout-title-area h2 { font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
    .handout-subtitle { font-size: 8.5pt; color: #475569; font-weight: 600; }
    .handout-score-table { border-collapse: collapse; font-size: 8.5pt; }
    .handout-score-table th, .handout-score-table td { border: 1px solid #64748b; padding: 3px 8px; text-align: center; }
    .handout-score-table th { background: #f1f5f9; font-weight: 700; }
    .handout-instructions-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; font-size: 8.5pt; line-height: 1.35; color: #334155; margin-bottom: 12px; }
    .handout-sentences-container { display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .handout-stn-item { border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 10px; background: #ffffff; }
    .handout-stn-main-row { margin-bottom: 4px; }
    .handout-stn-num { display: inline-block; font-weight: 800; font-size: 9pt; background: #0f172a; color: #ffffff; padding: 1px 6px; border-radius: 3px; margin-right: 6px; }
    .handout-stn-text { font-size: 10.5pt; font-weight: 600; color: #0f172a; line-height: 1.5; display: inline; }
    .handout-chunk-divider { display: inline-block; color: #0284c7; font-weight: 800; font-family: monospace; margin: 0 4px; }
    .handout-fels-blank { display: inline-block; min-width: 48px; border-bottom: 1.5px solid #0f172a; text-align: center; font-weight: 700; padding: 0 4px; margin: 0 2px; }
    .handout-fels-blank.answer-mode { color: #2563eb; background: #eff6ff; border-bottom: 2px solid #2563eb; }
    .handout-dictation-line { margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 3px; font-size: 8pt; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
    .handout-line-filler { flex: 1; border-bottom: 1px dashed #94a3b8; height: 12px; display: inline-block; }
    .handout-speaking-item { background: #f8fafc; border-left: 4px solid #0284c7; }
    .handout-speaking-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .handout-direct-ko { font-size: 10.5pt; font-weight: 700; color: #0f172a; line-height: 1.5; flex: 1; }
    .handout-chunk-box { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 1px 6px; border-radius: 3px; font-weight: 700; margin: 1px 2px; }
    .handout-teacher-en-ref { font-size: 8.5pt; color: #475569; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 3px 8px; border-radius: 4px; margin-bottom: 6px; }
    .handout-speaking-check-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 8pt; color: #64748b; }
    .speaking-check-label { font-weight: 700; color: #0f172a; }
    .check-box-pill { display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 6px; }
    .handout-page-footer { border-top: 1.5px solid #111827; padding-top: 6px; margin-top: auto; }
    .handout-rules-bar { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 7.8pt; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; }
    .handout-footer-meta { display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }
    @media print {
      body { padding: 0 !important; background: #ffffff !important; }
      .a4-printable-sheet { max-width: 100% !important; gap: 0 !important; }
      .a4-page-sheet { box-shadow: none !important; min-height: 275mm !important; padding: 4mm 6mm !important; page-break-after: always !important; break-after: page !important; }
      .a4-page-sheet.a4-page-back { page-break-after: auto !important; break-after: auto !important; }
      .no-print, .handout-sheet-label { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="a4-printable-sheet">
    ${sheetHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CE_Tool_약형드랩_양면유인물_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show('📥 A4 양면 유인물 HTML 파일이 다운로드되었습니다.');
  }

  formatSec(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  setLoading(isLoading) {
    if (!this.btnTranslate) return;
    if (isLoading) {
      this.btnTranslate.disabled = true;
      this.btnTranslate.innerHTML = `
        <svg class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <span>처리 중...</span>
      `;
    } else {
      this.btnTranslate.disabled = false;
      const mode = appState.currentMode;
      const btnLabel = mode === 'audio' 
        ? '🎙️ 음성에서 스크립트 추출 및 3x1 생성' 
        : (mode === 'both' ? '3x1 생성 및 음성 연동' : '3x1 해석 및 FELS 생성');
      this.btnTranslate.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
        <span id="btnTranslateText">${btnLabel}</span>
        <kbd class="btn-kbd">Ctrl+↵</kbd>
      `;
    }
  }

  onActivated() {
    // Re-render results if sentence list exists
    if (appState.sentenceList.length > 0) {
      this.renderParsedResults();
    } else if (this.inputEnglish && !this.inputEnglish.value) {
      this.inputEnglish.focus();
    }
  }

  onDeactivated() {}
}
