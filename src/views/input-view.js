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
import { splitIntoSentences, distributeChunksSequentially, cleanPracticeSentence } from '../core/text-splitter.js';
import { aiService } from '../services/ai-service.js';
import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
import { decodeAudioFile, getAudioContext } from '../audio/audio-context.js';
import { detectAudioSentenceBoundaries } from '../audio/silence-detector.js';
import { resolveSentenceBoundaries } from '../audio/boundary-utils.js';
import { playbackController } from '../audio/playback-controller.js';
import { synthesizeSilentAudioForScript, speakText } from '../audio/tts-synthesizer.js';
import { getFelsInfo } from '../config/fels-dict.js';
import { toast } from '../ui/toast-manager.js';
import { escapeHtml } from '../utils/dom.js';
import { projectService } from '../services/project-service.js';
import { MasterWaveformTimeline } from '../audio/master-waveform.js';
import { SentenceTrimmerModal } from '../ui/sentence-trimmer-modal.js';
import { WAVEFORM_SEGMENT_COLORS } from '../config/constants.js';

// Placeholder kept in the 직독직해 slash string for empty chunks so slot positions never shift
const DIRECT_EMPTY_PLACEHOLDER = '—';
// Inline base64 audio requests above this size are rejected by Gemini (≈20MB request limit)
const MAX_AI_INLINE_AUDIO_BYTES = 15 * 1024 * 1024;
// Some OSes report an empty MIME type on drag & drop, so also accept by extension
const AUDIO_FILE_EXT_RE = /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i;

export class InputView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();
    this.handoutMode = 'student'; // 'student' | 'teacher'
    this.isStartingPractice = false;     // re-entrancy guard for the 3 "start practice" buttons
    this.busySentences = new WeakSet();   // sentences with an in-flight chunk re-translation
    this.cachedBase64 = null;             // { file, base64 } — avoid re-encoding the same upload
    this.activeSentenceIndex = null;      // Currently active sentence being edited/previewed

    // DOM Elements - Input Form
    this.container = document.getElementById('view-input');
    this.modeTabs = document.querySelectorAll('.mode-tab');
    this.audioUploadSection = document.getElementById('audioUploadSection');
    this.dropArea = document.getElementById('dropArea');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.inputEnglish = document.getElementById('inputEnglish');
    this.charCount = document.getElementById('charCount');
    this.btnClear = document.getElementById('btnClear');
    this.btnResetAllData = document.getElementById('btnResetAllData');
    this.btnTranslate = document.getElementById('btnTranslate');
    this.btnTranslateText = document.getElementById('btnTranslateText');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // DOM Elements - Parsed Results Section
    this.parsedResultsSection = document.getElementById('parsedResultsSection');
    this.parsedSentenceList = document.getElementById('parsedSentenceList');
    this.resultsCountBadge = document.getElementById('resultsCountBadge');
    this.btnAutoSyncAudio = document.getElementById('btnAutoSyncAudio');
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

    // DOM Elements - Master Waveform & Trimmer
    this.masterWaveformSection = document.getElementById('masterWaveformSection');
    this.masterWaveformCanvas = document.getElementById('masterWaveformCanvas');
    this.btnMasterPlayPause = document.getElementById('btnMasterPlayPause');
    this.masterPlayIcon = document.getElementById('masterPlayIcon');
    this.masterPlayLabel = document.getElementById('masterPlayLabel');
    this.masterTimeHud = document.getElementById('masterTimeHud');
    this.btnSnapSilence = document.getElementById('btnSnapSilence');
    this.btnMasterZoomOut = document.getElementById('btnMasterZoomOut');
    this.masterZoomLabel = document.getElementById('masterZoomLabel');
    this.btnMasterZoomIn = document.getElementById('btnMasterZoomIn');

    // Master Waveform 60FPS Playback Loop & Interpolation State
    this.isMasterPlaybackLoopRunning = false;
    this.masterPlaybackRafId = null;
    this.masterAudioAnchorTime = 0;
    this.masterAudioAnchorWallTime = 0;

    this.masterWaveform = null;
    if (this.masterWaveformCanvas) {
      this.masterWaveform = new MasterWaveformTimeline(this.masterWaveformCanvas, {
        onZoomChange: (zoom) => {
          if (this.masterZoomLabel) {
            this.masterZoomLabel.textContent = `${Math.round(zoom * 100)}%`;
          }
        },
        onSegmentChange: (idx, start, end, isFinal, adjInfo) => {
          const updateStn = (stnIdx, sStart, sEnd) => {
            const stn = appState.sentenceList ? appState.sentenceList.find(s => s.index === stnIdx) : null;
            if (stn) {
              stn.audioStart = sStart;
              stn.audioEnd = sEnd;
              stn.cachedPeaks = null;
              const timeBadge = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${stnIdx}"] .stn-audio-time`) : null;
              if (timeBadge) {
                timeBadge.textContent = `⏱ ${this.formatSec(sStart)} ~ ${this.formatSec(sEnd)}`;
              }
            }
          };

          updateStn(idx, start, end);
          if (adjInfo) {
            updateStn(adjInfo.index, adjInfo.audioStart, adjInfo.audioEnd);
          }

          if (isFinal) {
            projectService.markDirty();
            if (adjInfo) {
              toast.show(`⏱ 문장 S${idx + 1} & S${adjInfo.index + 1} 구간 자동 연동 완료!`);
            } else {
              toast.show(`⏱ 문장 S${idx + 1} 구간: ${start}s ~ ${end}s`);
            }
          }
          this.setActiveSentence(idx);
        },
        onSegmentSelect: (idx) => {
          this.setActiveSentence(idx, { scrollToCard: true });
        }
      });
    }

    this.trimmerModal = new SentenceTrimmerModal();

    this.initEvents();
    this.setMode('text'); // default: script only
  }

  /**
   * Sets the currently active sentence being edited, listened to, or dragged.
   * Keeps persistent waveform-matched emphasis highlight on the card without disappearing.
   */
  setActiveSentence(idx, { scrollToCard = false } = {}) {
    if (typeof idx !== 'number' || idx < 0) return;
    this.activeSentenceIndex = idx;

    if (this.parsedSentenceList && typeof this.parsedSentenceList.querySelectorAll === 'function') {
      const cards = this.parsedSentenceList.querySelectorAll('.parsed-sentence-item');
      if (cards && typeof cards.forEach === 'function') {
        cards.forEach((card) => {
          if (!card || typeof card.getAttribute !== 'function') return;
          const cIdx = parseInt(card.getAttribute('data-stn-idx'), 10);
          const isActive = (cIdx === idx);
          if (card.classList && typeof card.classList.toggle === 'function') {
            card.classList.toggle('is-active', isActive);
          }
          if (isActive && scrollToCard && typeof card.scrollIntoView === 'function') {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      }
    }

    if (this.masterWaveform && typeof this.masterWaveform.setSelectedSentence === 'function') {
      this.masterWaveform.setSelectedSentence(idx);
    }
  }

  /**
   * Toggles play/pause for Stage 1 master waveform & segment preview.
   * Bound to Spacebar shortcut when on Stage 1 input view.
   */
  togglePlayPauseWaveform() {
    const player = this.nativeAudioPlayer || (playbackController && playbackController.getPlayer());
    const isPlaying = player && !player.paused;

    if (isPlaying) {
      playbackController.stop();
      if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
      if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
      return;
    }

    // If whole-track master playback was previously active, resume whole-track
    if (playbackController && playbackController.owner === 'input-master') {
      if (this.btnMasterPlayPause) {
        this.btnMasterPlayPause.click();
        return;
      }
    }

    const curTime = (player && typeof player.currentTime === 'number') ? player.currentTime : 0;

    // If currently paused, play active sentence segment (resuming from paused position if within sentence)
    if (typeof this.activeSentenceIndex === 'number' && appState.sentenceList) {
      const stn = appState.sentenceList.find(s => s.index === this.activeSentenceIndex);
      if (stn && stn.audioStart !== null && stn.audioEnd !== null) {
        let startTime = stn.audioStart;
        if (curTime >= stn.audioStart && curTime < (stn.audioEnd - 0.05)) {
          startTime = curTime;
        }
        playbackController.playSegment(startTime, stn.audioEnd, { owner: 'master-waveform' });
        return;
      }
    }

    if (this.btnMasterPlayPause) {
      this.btnMasterPlayPause.click();
    }
  }

  initEvents() {
    // Data Reset Button (All data clear)
    if (this.btnResetAllData) {
      this.btnResetAllData.addEventListener('click', () => {
        this.resetAllData();
      });
    }

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
        const f = files.length > 0 ? files[0] : null;
        if (f && ((f.type || '').startsWith('audio/') || AUDIO_FILE_EXT_RE.test(f.name || ''))) {
          this.handleAudioFile(f);
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
        projectService.markDirty();
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
        projectService.markDirty();
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

    // Auto Audio-Script Sync Trigger
    if (this.btnAutoSyncAudio) {
      this.btnAutoSyncAudio.addEventListener('click', () => this.autoSyncAudioScript());
    }

    // Master Waveform Controls
    if (this.btnMasterPlayPause) {
      this.btnMasterPlayPause.addEventListener('click', () => {
        if (!this.nativeAudioPlayer || !this.nativeAudioPlayer.src) {
          toast.show('⚠️ 재생 가능한 오디오 파일이 없습니다.');
          return;
        }
        if (this.nativeAudioPlayer.paused) {
          playbackController.claim('input-master');
          this.nativeAudioPlayer.play().then(() => {
            if (this.masterPlayIcon) this.masterPlayIcon.textContent = '⏸';
            if (this.masterPlayLabel) this.masterPlayLabel.textContent = '일시정지';
          }).catch(e => console.error(e));
        } else {
          this.nativeAudioPlayer.pause();
          if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
          if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
        }
      });
    }

    if (this.btnSnapSilence) {
      this.btnSnapSilence.addEventListener('click', () => {
        const isActive = this.btnSnapSilence.classList.toggle('active');
        if (this.masterWaveform) {
          this.masterWaveform.setSnapEnabled(isActive);
        }
        const span = this.btnSnapSilence.querySelector('span');
        if (span) span.textContent = isActive ? '🧲 묵음 스냅 ON' : '🧲 묵음 스냅 OFF';
        toast.show(isActive ? '🧲 묵음 구간 자동 스냅이 활성화되었습니다.' : '묵음 구간 스냅이 비활성화되었습니다.');
      });
    }

    // Master Waveform Zoom Controls
    if (this.btnMasterZoomOut) {
      this.btnMasterZoomOut.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(this.masterWaveform.zoomLevel - 0.5);
        }
      });
    }

    if (this.btnMasterZoomIn) {
      this.btnMasterZoomIn.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(this.masterWaveform.zoomLevel + 0.5);
        }
      });
    }

    if (this.masterZoomLabel) {
      this.masterZoomLabel.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(1.0);
          toast.show('🔍 파형 배율이 100% 원본으로 리셋되었습니다.');
        }
      });
    }

    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        const cur = this.nativeAudioPlayer.currentTime;
        const dur = this.nativeAudioPlayer.duration || 1;
        // While the 60FPS loop is running, masterWaveform and HUD are already smoothly updated
        if (!this.isMasterPlaybackLoopRunning) {
          if (this.masterWaveform) {
            this.masterWaveform.setPlayheadTime(cur);
          }
          if (this.masterTimeHud) {
            this.masterTimeHud.textContent = `${this.formatSec(cur)} / ${this.formatSec(dur)}`;
          }
        }
      });

      this.nativeAudioPlayer.addEventListener('pause', () => {
        if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
        if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
        this.stopMasterPlaybackLoop();
        if (this.masterWaveform) {
          this.masterWaveform.setPlayheadTime(this.nativeAudioPlayer.currentTime || 0);
        }
      });

      this.nativeAudioPlayer.addEventListener('play', () => {
        if (this.masterPlayIcon) this.masterPlayIcon.textContent = '⏸';
        if (this.masterPlayLabel) this.masterPlayLabel.textContent = '일시정지';
        this.startMasterPlaybackLoop();
      });

      this.nativeAudioPlayer.addEventListener('ended', () => {
        if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
        if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
        this.stopMasterPlaybackLoop();
        if (this.masterWaveform) {
          this.masterWaveform.setPlayheadTime(0);
        }
      });
    }

    // Handout Modal Triggers
    if (this.btnPrintHandout) {
      this.btnPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnBottomPrintHandout) {
      this.btnBottomPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }

    // Transition to Page 2
    // Waits for the translation to finish before navigating (previously raced: Page 2 opened with stale/demo data)
    const startPracticeHandler = async () => {
      if (this.isStartingPractice) return;
      this.isStartingPractice = true;
      try {
        if (!appState.sentenceList || appState.sentenceList.length === 0) {
          if (this.inputEnglish && this.inputEnglish.value.trim()) {
            const ok = await this.handleTranslate();
            if (!ok) return;
          }
        }
        this.router.navigateTo('practice');
      } finally {
        this.isStartingPractice = false;
      }
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

    // Escape closes the handout modal (settings modal handles its own Escape)
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.handoutModal && !this.handoutModal.classList.contains('hidden')) {
          this.closeHandoutModal();
        }
      });
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
    } else if (mode === 'audio') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.add('hidden');
    } else {
      // text only
      if (this.audioUploadSection) this.audioUploadSection.classList.add('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
    }
    if (this.btnTranslateText) this.btnTranslateText.textContent = this.getTranslateButtonLabel(mode);
  }

  getTranslateButtonLabel(mode = appState.currentMode) {
    return '약형드랩 생성';
  }

  /** Gemini inline audio is only attempted for real uploads within the size limit. */
  canSendAudioToAI(file) {
    return !!file && typeof file.size === 'number' && file.size <= MAX_AI_INLINE_AUDIO_BYTES;
  }

  shouldUseAiAlignment() {
    const file = appState.uploadedAudioFile;
    return !!file && !appState.isSynthesizedAudio && aiService.hasKey() &&
      aiService.provider === 'gemini' && this.canSendAudioToAI(file);
  }

  /** Base64-encodes the upload once and reuses it for STT / alignment / re-sync. */
  async getAudioBase64(file) {
    if (this.cachedBase64 && this.cachedBase64.file === file) return this.cachedBase64.base64;
    const base64 = await this.readFileAsBase64(file);
    this.cachedBase64 = { file, base64 };
    return base64;
  }

  /** Shared boundary resolution for handleTranslate() and autoSyncAudioScript(). */
  async computeSentenceBoundaries(rawSentences) {
    const file = appState.uploadedAudioFile;
    const aiAlign = this.shouldUseAiAlignment()
      ? async () => aiService.alignAudioWithScript(await this.getAudioBase64(file), file.type || 'audio/mp3', rawSentences)
      : null;
    return resolveSentenceBoundaries({ audioBuffer: appState.audioBuffer, sentences: rawSentences, aiAlign });
  }

  async handleAudioFile(file) {
    // Invalidate any in-flight analysis so a late translate cannot overwrite this upload
    this.analysisGen = (this.analysisGen || 0) + 1;
    // Stop whatever is playing before the old source is released
    playbackController.stop();

    appState.uploadedAudioFile = file;
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
    }
    appState.uploadedAudioUrl = URL.createObjectURL(file);
    appState.isSynthesizedAudio = false;

    // Point the shared <audio> at the new file (never leave it on a revoked/old URL)
    playbackController.setSource(appState.uploadedAudioUrl, { muted: false });

    // A previous file's PCM must never survive a new upload (or a failed decode)
    appState.audioBuffer = null;
    const loadToken = (this.audioLoadToken = (this.audioLoadToken || 0) + 1);

    // Decode PCM buffer
    try {
      toast.show('⏳ 오디오 파형 분석 중...');
      const audioBuffer = await decodeAudioFile(file);
      if (loadToken !== this.audioLoadToken) return; // a newer upload superseded this decode
      appState.audioBuffer = audioBuffer;
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    } catch (err) {
      if (loadToken !== this.audioLoadToken) return;
      console.warn('Audio decoding fallback:', err);
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    }

    this.renderDropAreaPreview(file);
    if (this.masterWaveform && appState.audioBuffer) {
      this.masterWaveform.setAudioBuffer(appState.audioBuffer);
      if (appState.sentenceList && appState.sentenceList.length > 0) {
        if (this.masterWaveformSection) this.masterWaveformSection.classList.remove('hidden');
        this.masterWaveform.setSentenceList(appState.sentenceList);
      }
    }
    projectService.markDirty();
  }

  renderDropAreaPreview(file) {
    if (!this.dropArea) return;
    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    this.dropArea.innerHTML = `
      <div class="audio-file-info">
        <div class="audio-file-icon">🎵</div>
        <div class="audio-file-details">
          <div class="audio-file-name">${escapeHtml(file.name)}</div>
          <div class="audio-file-meta">${formatSize(file.size)} • ${escapeHtml(file.type || 'audio/mp3')}</div>
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
    // Invalidate any in-flight decode and stop playback before releasing the source
    this.audioLoadToken = (this.audioLoadToken || 0) + 1;
    playbackController.stop();
    if (this.nativeAudioPlayer) {
      if (typeof this.nativeAudioPlayer.removeAttribute === 'function') this.nativeAudioPlayer.removeAttribute('src');
      if (typeof this.nativeAudioPlayer.load === 'function') this.nativeAudioPlayer.load();
    }
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
      appState.uploadedAudioUrl = null;
    }
    appState.uploadedAudioFile = null;
    appState.audioBuffer = null;
    appState.isSynthesizedAudio = false;
    projectService.markDirty();

    if (this.masterWaveformSection) {
      this.masterWaveformSection.classList.add('hidden');
    }
    if (this.masterWaveform) {
      this.masterWaveform.setAudioBuffer(null);
      this.masterWaveform.setSentenceList([]);
    }

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

  /**
   * Reset and clear all loaded/saved data across the application
   */
  resetAllData() {
    const hasData = (this.inputEnglish && this.inputEnglish.value.trim().length > 0) ||
                    (appState.sentenceList && appState.sentenceList.length > 0) ||
                    appState.uploadedAudioFile || appState.audioBuffer;

    if (hasData) {
      if (typeof confirm === 'function' && !confirm('현재 입력 및 불러온 모든 데이터(스크립트, 음성, 문장 구간)를 삭제하고 초기화하시겠습니까?')) {
        return;
      }
    }

    // Cancel in-flight translate / auto-sync so their results are discarded
    this.analysisGen = (this.analysisGen || 0) + 1;
    this.isAutoSyncing = false;

    // 1. Stop any active audio playback
    playbackController.stopAll();
    if (this.nativeAudioPlayer) {
      if (typeof this.nativeAudioPlayer.pause === 'function') this.nativeAudioPlayer.pause();
      if (typeof this.nativeAudioPlayer.removeAttribute === 'function') this.nativeAudioPlayer.removeAttribute('src');
      if (typeof this.nativeAudioPlayer.load === 'function') this.nativeAudioPlayer.load();
    }

    // 2. Reset Audio State & Drop Area
    this.resetAudioFile();

    // 3. Reset AppState
    if (typeof appState.reset === 'function') {
      appState.reset();
    } else {
      appState.uploadedAudioFile = null;
      appState.uploadedAudioUrl = null;
      appState.audioBuffer = null;
      appState.isSynthesizedAudio = false;
      appState.synthesizedWavBlob = null;
      appState.scriptText = '';
      appState.setSentenceList([]);
    }

    // 4. Reset Project Service
    if (typeof projectService.resetProject === 'function') {
      projectService.resetProject();
    } else {
      projectService.currentFileHandle = null;
      projectService.currentProjectName = '새 프로젝트';
      projectService.isDirty = false;
      projectService.notifyStateChange();
    }

    // 5. Reset Script Input Area
    if (this.inputEnglish) {
      this.inputEnglish.value = '';
      this.inputEnglish.focus();
    }
    if (this.charCount) {
      this.charCount.textContent = '0자';
    }

    // 6. Reset Master Waveform Timeline
    if (this.masterWaveform) {
      this.masterWaveform.setAudioBuffer(null);
      this.masterWaveform.setSentenceList([]);
      this.masterWaveform.setZoom(1.0);
    }
    if (this.masterWaveformSection) {
      this.masterWaveformSection.classList.add('hidden');
    }
    if (this.masterTimeHud) {
      this.masterTimeHud.textContent = '00:00.0 / 00:00.0';
    }
    if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
    if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';

    // 7. Hide Parsed Results Section
    if (this.parsedResultsSection) {
      this.parsedResultsSection.classList.add('hidden');
    }
    if (this.parsedSentenceList) {
      this.parsedSentenceList.innerHTML = '';
    }
    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = '0개 문장';
    }

    toast.show('🔄 모든 데이터가 성공적으로 삭제되고 초기화되었습니다.');
  }

  /**
   * @returns {Promise<boolean>} true when appState.sentenceList was (re)built successfully
   */
  async handleTranslate() {
    // Ctrl+Enter / preset chips can fire while a request is already running (button is disabled then)
    if (this.btnTranslate && this.btnTranslate.disabled === true) return false;
    const mode = appState.currentMode;
    const analysisGen = (this.analysisGen = (this.analysisGen || 0) + 1);

    // Mode 2: Audio Only (STT)
    if (mode === 'audio') {
      if (!appState.uploadedAudioFile) {
        toast.show('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
        return false;
      }
      if (!aiService.hasKey()) {
        toast.show('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 AI API 키를 입력하세요.');
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.click();
        return false;
      }
      if (!this.canSendAudioToAI(appState.uploadedAudioFile)) {
        toast.show('⚠️ 15MB를 초과하는 음성 파일은 AI 음성 인식을 지원하지 않습니다. 파일을 나눠 업로드하거나 스크립트를 직접 입력하세요.');
        return false;
      }

      let success = false;
      this.setLoading(true);
      try {
        const base64Audio = await this.getAudioBase64(appState.uploadedAudioFile);
        if (analysisGen !== this.analysisGen) return false;
        const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
        const aiResult = await aiService.transcribeAndTranslateAudio(base64Audio, mimeType);
        if (analysisGen !== this.analysisGen) return false;

        const scriptText = aiResult.script || '';
        if (this.inputEnglish) {
          this.inputEnglish.value = scriptText;
          if (this.charCount) this.charCount.textContent = `${scriptText.length}자`;
        }

        const rawSentences = splitIntoSentences(scriptText, { filterKorean: true });
        // Prefer shared boundary path (AI align → VAD → intro skip → end padding)
        const boundaries = await this.computeSentenceBoundaries(rawSentences);
        if (analysisGen !== this.analysisGen) return false;

        // Partition AI chunks sequentially across each sentence so S1 never contains S2/S3 chunks
        const distributedChunks = distributeChunksSequentially(rawSentences, aiResult.chunks || []);

        const sentenceList = rawSentences.map((stnText, idx) => {
          let result;
          const directStn = aiResult.sentences && aiResult.sentences[idx];
          // Only trust per-index AI sentence results when the text roughly matches
          const directTextOk = directStn && typeof directStn.text === 'string'
            ? directStn.text.trim().toLowerCase() === stnText.trim().toLowerCase()
            : !!(directStn && directStn.chunks && directStn.chunks.length > 0 &&
                 rawSentences.length === (aiResult.sentences || []).length);
          if (directTextOk && directStn.chunks && directStn.chunks.length > 0) {
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

        if (analysisGen !== this.analysisGen) return false;
        appState.scriptText = scriptText;
        appState.setSentenceList(sentenceList);
        success = true; // data is ready even if a later UI render step fails

        // Render Results Panel on Page 1
        this.renderParsedResults({ scrollToSection: true });
        toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 완료! 아래에서 청크와 해석을 확인하세요.`);
      } catch (err) {
        if (analysisGen !== this.analysisGen) return false;
        console.error(err);
        if (err.isQuotaExceeded || (err.message && (err.message.includes('Quota') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')))) {
          toast.show('⚠️ Gemini API 사용량 한도(Quota / 분당 요청수)가 초과되었습니다. 잠시 후(약 1분 뒤) 다시 시도하시거나, 스크립트 직접 입력 모드를 이용해 주세요.');
        } else {
          toast.show(`❌ 음성 추출 오류: ${err.message}`);
        }
      } finally {
        if (analysisGen === this.analysisGen) this.setLoading(false);
      }
      return success;
    }

    // Mode 1 (Both) or Mode 3 (Text)
    const text = this.inputEnglish ? this.inputEnglish.value.trim() : '';
    if (!text) {
      toast.show('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
      if (this.inputEnglish) this.inputEnglish.focus();
      return false;
    }

    let success = false;
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

      // Sentence splitting - strictly exclude Korean sentences from practice drill
      let rawSentences = splitIntoSentences(text, { filterKorean: true });
      if (rawSentences.length === 0) rawSentences.push(cleanPracticeSentence(text) || text);

      // AI alignment (optional) → VAD fallback → Korean intro check → end padding (see audio/boundary-utils.js)
      const boundaries = await this.computeSentenceBoundaries(rawSentences);
      if (analysisGen !== this.analysisGen) return false;

      // Fetch natural Korean with a small concurrency pool (avoids bursting into 429 on long scripts)
      const naturalTranslations = new Array(rawSentences.length);
      {
        const CONCURRENCY = 3;
        let nextIdx = 0;
        const worker = async () => {
          while (nextIdx < rawSentences.length) {
            const i = nextIdx++;
            naturalTranslations[i] = await aiService.translateNatural(rawSentences[i]).catch(() => null);
            if (analysisGen !== this.analysisGen) return;
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rawSentences.length) }, () => worker()));
      }
      if (analysisGen !== this.analysisGen) return false;

      const sentenceList = rawSentences.map((stnText, idx) => {
        const natural = naturalTranslations[idx];
        const res = this.ruleEngine.process(stnText, natural);
        if (natural) {
          res.natural = natural;
        }
        return {
          index: idx,
          text: stnText,
          audioStart: boundaries[idx]?.start ?? null,
          audioEnd: boundaries[idx]?.end ?? null,
          result: res
        };
      });

      // Refine 직독직해 chunks based strictly on natural Korean translation
      await Promise.all(
        sentenceList.map(async (stn) => {
          if (stn.result && stn.result.chunks && stn.result.natural) {
            try {
              const directKoChunks = await aiService.generateDirectChunks(
                stn.result.chunks,
                stn.result.natural,
                stn.text
              );
              if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
                directKoChunks.forEach((ko, i) => {
                  stn.result.chunks[i].ko = ko;
                });
                stn.result.chunk_text = directKoChunks.join(' || ');
                stn.result.direct = directKoChunks.join(' / ');
              }
            } catch (chunkErr) {
              console.warn('Chunk direct translation error:', chunkErr);
            }
          }
        })
      );

      if (analysisGen !== this.analysisGen) return false;
      appState.scriptText = text;
      appState.setSentenceList(sentenceList);
      success = true; // data is ready even if a later UI render step fails

      // Render Results Panel on Page 1
      this.renderParsedResults({ scrollToSection: true });
      if (aiService.isQuotaExceededCoolingDown()) {
        toast.show('ℹ️ Gemini API 사용량 일시 초과로 내장 규칙 엔진 및 무료 번역으로 자동 전환하여 생성을 완료했습니다.');
      } else {
        toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 및 자연스러운 직독직해 분석 완료!`);
      }
    } catch (err) {
      if (analysisGen !== this.analysisGen) return false;
      console.error('Translation error:', err);
      if (err.isQuotaExceeded || (err.message && (err.message.includes('Quota') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')))) {
        toast.show('⚠️ Gemini API 사용량 한도가 초과되어 내장 규칙 엔진 결과로 자동 전환합니다.');
      } else {
        toast.show(`❌ 오류: ${err.message}`);
      }
    } finally {
      if (analysisGen === this.analysisGen) this.setLoading(false);
    }
    return success;
  }

  /**
   * One-click Audio and Script Auto Sync
   */
  async autoSyncAudioScript() {
    if (!appState.uploadedAudioFile || !appState.sentenceList || appState.sentenceList.length === 0) {
      toast.show('⚠️ 먼저 MP3 음성 파일과 스크립트를 입력해주세요.');
      return;
    }
    if (this.isAutoSyncing) {
      toast.show('⏳ 이미 오디오 동기화 중입니다...');
      return;
    }

    this.isAutoSyncing = true;
    const syncGen = (this.analysisGen = (this.analysisGen || 0) + 1);
    const listSnapshot = appState.sentenceList;
    toast.show('⚡ 음성과 스크립트 자동 Sync 계산 중...');
    try {
      const rawSentences = listSnapshot.map(s => s.text);
      const boundaries = await this.computeSentenceBoundaries(rawSentences);
      if (syncGen !== this.analysisGen || appState.sentenceList !== listSnapshot) return;

      if (boundaries && boundaries.length === listSnapshot.length) {
        listSnapshot.forEach((stn, i) => {
          stn.audioStart = boundaries[i]?.start ?? stn.audioStart;
          stn.audioEnd = boundaries[i]?.end ?? stn.audioEnd;
          stn.cachedPeaks = null;
        });
        if (typeof projectService !== 'undefined' && projectService.markDirty) {
          projectService.markDirty();
        }
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        this.renderParsedResults({ scrollContext: { scrollYBefore: scrollY } });
        toast.show('✨ 음성-스크립트 자동 Sync 완료! 문장별 재생 구간이 최적화되었습니다.');
      }
    } catch (err) {
      console.error('Auto sync error:', err);
      if (err.isQuotaExceeded || (err.message && (err.message.includes('Quota') || err.message.includes('429')))) {
        toast.show('⚠️ Gemini API 사용량 한도로 인해 로컬 오디오 분석(VAD) 알고리즘으로 동기화했습니다.');
      } else {
        toast.show(`❌ 자동 Sync 오류: ${err.message}`);
      }
    } finally {
      this.isAutoSyncing = false;
    }
  }

  /**
   * Merge sentence with previous sentence
   */
  mergeWithPreviousSentence(idx) {
    if (idx <= 0 || !appState.sentenceList || idx >= appState.sentenceList.length) return;

    const targetIdx = idx - 1;
    const scrollYBefore = window.scrollY || document.documentElement.scrollTop || 0;
    const prevCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"]`) : null;
    const curCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"]`) : null;
    const refCard = prevCardBefore || curCardBefore;
    const cardTopBefore = refCard ? refCard.getBoundingClientRect().top : null;

    const prev = appState.sentenceList[targetIdx];
    const cur = appState.sentenceList[idx];

    const mergedText = `${prev.text} ${cur.text}`.trim();
    const mergedStart = prev.audioStart !== null ? prev.audioStart : cur.audioStart;
    const mergedEnd = cur.audioEnd !== null ? cur.audioEnd : prev.audioEnd;
    const mergedChunks = [...(prev.result?.chunks || []), ...(cur.result?.chunks || [])];
    const mergedNatural = `${prev.result?.natural || ''} ${cur.result?.natural || ''}`.trim();

    prev.text = mergedText;
    prev.audioStart = mergedStart;
    prev.audioEnd = mergedEnd;
    prev.result = {
      ...(prev.result || {}),
      chunks: mergedChunks,
      natural: mergedNatural,
      chunk_text: mergedChunks.map(c => c.ko).join(' || '),
      direct: mergedChunks.map(c => c.ko).join(' / ')
    };
    prev.cachedPeaks = null;

    appState.sentenceList.splice(idx, 1);
    appState.sentenceList.forEach((s, i) => { s.index = i; });
    appState.scriptText = appState.sentenceList.map(s => s.text).join(' ');
    appState.dataVersion++;
    if (appState.activeSentenceIndex >= appState.sentenceList.length) {
      appState.activeSentenceIndex = Math.max(0, appState.sentenceList.length - 1);
    }
    projectService.markDirty();

    this.renderParsedResults({
      targetIdx,
      scrollContext: { scrollYBefore, cardTopBefore }
    });
    toast.show(`🔗 문장 S${idx}와 S${idx + 1}이 하나로 결합되었습니다.`);

    aiService.translateNatural(mergedText).then(natural => {
      if (natural) {
        prev.result.natural = natural;
        const naturalInput = this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"] .sentence-natural-input`);
        if (naturalInput) naturalInput.value = natural;
      }
    }).catch(() => {});
  }

  /**
   * Split sentence into two sentences at given word index
   */
  splitSentence(idx, splitWordIndex) {
    if (!appState.sentenceList || idx < 0 || idx >= appState.sentenceList.length) return;
    const cur = appState.sentenceList[idx];
    const words = (cur.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1 || splitWordIndex < 0 || splitWordIndex >= words.length - 1) {
      toast.show('⚠️ 분리할 위치를 올바르게 선택하세요.');
      return;
    }

    const scrollYBefore = window.scrollY || document.documentElement.scrollTop || 0;
    const targetCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"]`) : null;
    const cardTopBefore = targetCardBefore ? targetCardBefore.getBoundingClientRect().top : null;

    const wordsPart1 = words.slice(0, splitWordIndex + 1);
    const wordsPart2 = words.slice(splitWordIndex + 1);

    let text1 = wordsPart1.join(' ').trim();
    let text2 = wordsPart2.join(' ').trim();

    if (!/[.!?]$/.test(text1) && /[.!?]$/.test(cur.text)) {
      text1 += '.';
    }

    const hasAudioRange = (cur.audioStart !== null && cur.audioEnd !== null &&
      Number.isFinite(cur.audioStart) && Number.isFinite(cur.audioEnd) && cur.audioEnd > cur.audioStart);
    const totalDuration = hasAudioRange ? (cur.audioEnd - cur.audioStart) : null;
    let part1Start = cur.audioStart;
    let part1End = null;
    let part2Start = null;
    let part2End = cur.audioEnd;

    if (totalDuration !== null) {
      const fraction1 = wordsPart1.length / words.length;
      let splitTime = Math.round((cur.audioStart + totalDuration * fraction1) * 10) / 10;
      // Keep both halves non-empty and within [audioStart, audioEnd]
      splitTime = Math.min(cur.audioEnd - 0.05, Math.max(cur.audioStart + 0.05, splitTime));
      part1End = splitTime;
      part2Start = splitTime;
    }

    const res1 = this.ruleEngine.process(text1);
    const res2 = this.ruleEngine.process(text2);

    const newStn1 = {
      index: idx,
      text: text1,
      audioStart: part1Start,
      audioEnd: part1End,
      result: res1
    };

    const newStn2 = {
      index: idx + 1,
      text: text2,
      audioStart: part2Start,
      audioEnd: part2End,
      result: res2
    };

    appState.sentenceList.splice(idx, 1, newStn1, newStn2);
    appState.sentenceList.forEach((s, i) => { s.index = i; });
    appState.scriptText = appState.sentenceList.map(s => s.text).join(' ');
    appState.dataVersion++;
    projectService.markDirty();

    this.renderParsedResults({
      targetIdx: idx,
      scrollContext: { scrollYBefore, cardTopBefore }
    });
    toast.show(`✂️ 문장이 S${idx + 1}과 S${idx + 2}로 분리되었습니다.`);

    Promise.all([
      aiService.translateNatural(text1),
      aiService.translateNatural(text2)
    ]).then(([nat1, nat2]) => {
      if (nat1) {
        newStn1.result.natural = nat1;
        const inp1 = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"] .sentence-natural-input`);
        if (inp1) inp1.value = nat1;
      }
      if (nat2) {
        newStn2.result.natural = nat2;
        const inp2 = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx + 1}"] .sentence-natural-input`);
        if (inp2) inp2.value = nat2;
      }
    }).catch(() => {});
  }

  /**
   * Toggle inline interactive sentence split bar
   */
  toggleSplitBar(itemCard, stn, idx) {
    const splitBar = itemCard.querySelector('.sentence-split-bar');
    if (!splitBar) return;

    if (!splitBar.classList.contains('hidden')) {
      splitBar.classList.add('hidden');
      return;
    }

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      toast.show('⚠️ 1개 단어로 된 문장은 더 이상 분리할 수 없습니다.');
      return;
    }

    const container = splitBar.querySelector('.split-words-container');
    container.innerHTML = '';

    words.forEach((w, wIdx) => {
      if (wIdx < words.length - 1) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'split-word-chip';
        chip.innerHTML = `<span class="split-chip-word">${this.escapeHtml(w)}</span><span class="split-chip-cue">✂️ 여기서 분리</span>`;
        chip.title = `'${w}' 뒤에서 문장 분리`;
        chip.addEventListener('click', () => {
          this.splitSentence(idx, wIdx);
        });
        container.appendChild(chip);
      } else {
        const lastWord = document.createElement('span');
        lastWord.className = 'split-last-word';
        lastWord.textContent = w;
        container.appendChild(lastWord);
      }
    });

    const btnCancel = splitBar.querySelector('.btn-cancel-split');
    if (btnCancel) {
      btnCancel.onclick = () => splitBar.classList.add('hidden');
    }

    splitBar.classList.remove('hidden');
  }

  /**
   * Re-fetch natural translation for single sentence and regenerate 직독직해
   */
  async retranslateSentence(stn, naturalInput, directInput) {
    toast.show('🤖 우리말 자연스러운 해석 및 직독직해 가져오는 중...');
    try {
      const natural = await aiService.translateNatural(stn.text);
      if (natural) {
        if (!stn.result) stn.result = {};
        stn.result.natural = natural;
        if (naturalInput) naturalInput.value = natural;

        // Automatically regenerate 직독직해 based on the updated natural translation!
        if (stn.result.chunks && stn.result.chunks.length > 0) {
          try {
            const directKoChunks = await aiService.generateDirectChunks(
              stn.result.chunks,
              natural,
              stn.text
            );
            if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
              directKoChunks.forEach((ko, i) => {
                stn.result.chunks[i].ko = ko;
              });
              stn.result.chunk_text = directKoChunks.join(' || ');
              stn.result.direct = directKoChunks.join(' / ');
              if (directInput) {
                directInput.value = this.getDirectChunkString(stn.result.chunks);
              }
            }
          } catch (chunkErr) {
            console.warn('Chunk direct translation error:', chunkErr);
          }
        }

        if (typeof projectService !== 'undefined' && projectService.markDirty) {
          projectService.markDirty();
        }
        toast.show('✨ 자연스러운 해석 및 직독직해가 업데이트되었습니다!');
      } else {
        toast.show('⚠️ 번역 결과를 가져오지 못했습니다.');
      }
    } catch (e) {
      toast.show(`❌ 재해석 실패: ${e.message}`);
    }
  }

  renderParsedResults(options = {}) {
    if (!this.parsedResultsSection || !this.parsedSentenceList) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.parsedResultsSection.classList.add('hidden');
      return;
    }

    const {
      scrollToSection = false,
      targetIdx = null,
      scrollContext = null
    } = options;

    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = `총 ${sentences.length}개 문장`;
    }

    // 1. Lock container height before innerHTML = '' to prevent document collapse and screen jump to top
    const prevListHeight = this.parsedSentenceList.offsetHeight;
    if (prevListHeight > 0) {
      this.parsedSentenceList.style.minHeight = `${prevListHeight}px`;
    }

    const fallbackScrollY = scrollContext?.scrollYBefore ?? (window.scrollY || document.documentElement.scrollTop || 0);

    this.parsedSentenceList.innerHTML = '';

    sentences.forEach((stn, idx) => {
      // Ensure stn.result exists
      if (!stn.result) {
        stn.result = this.ruleEngine.process(stn.text);
      }

      const itemCard = document.createElement('div');
      itemCard.className = 'parsed-sentence-item';
      itemCard.setAttribute('data-stn-idx', idx);

      const colors = (typeof WAVEFORM_SEGMENT_COLORS !== 'undefined' && Array.isArray(WAVEFORM_SEGMENT_COLORS) && WAVEFORM_SEGMENT_COLORS.length)
        ? WAVEFORM_SEGMENT_COLORS
        : [
            { fill: 'rgba(99, 102, 241, 0.18)', stroke: 'rgba(129, 140, 248, 0.85)', tag: '#818cf8', glow: 'rgba(99, 102, 241, 0.45)', bgTint: 'rgba(99, 102, 241, 0.10)', badgeBg: 'rgba(99, 102, 241, 0.28)' }
          ];
      const color = colors[idx % colors.length];
      if (itemCard.style) {
        if (typeof itemCard.style.setProperty === 'function') {
          itemCard.style.setProperty('--stn-stroke', color.stroke);
          itemCard.style.setProperty('--stn-glow', color.glow || color.stroke);
          itemCard.style.setProperty('--stn-bgtint', color.bgTint || color.fill);
          itemCard.style.setProperty('--stn-badge-bg', color.badgeBg || color.fill);
          itemCard.style.setProperty('--stn-tag', color.tag);
          itemCard.style.setProperty('--stn-fill', color.fill);
        } else {
          itemCard.style['--stn-stroke'] = color.stroke;
          itemCard.style['--stn-glow'] = color.glow || color.stroke;
          itemCard.style['--stn-bgtint'] = color.bgTint || color.fill;
          itemCard.style['--stn-badge-bg'] = color.badgeBg || color.fill;
          itemCard.style['--stn-tag'] = color.tag;
          itemCard.style['--stn-fill'] = color.fill;
        }
      }

      if (typeof itemCard.addEventListener === 'function') {
        itemCard.addEventListener('pointerdown', () => {
          this.setActiveSentence(idx);
        });
        itemCard.addEventListener('focusin', () => {
          this.setActiveSentence(idx);
        });
      }

      const hasAudioTime = stn.audioStart !== null && stn.audioEnd !== null;
      const timeStr = hasAudioTime 
        ? `${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}` 
        : '';

      itemCard.innerHTML = `
        <div class="sentence-item-header">
          <div class="stn-header-meta">
            <span class="stn-badge-pill">문장 ${idx + 1} (S${idx + 1})</span>
            ${hasAudioTime ? `<span class="stn-audio-time" title="클릭하여 오디오 구간 수정">⏱ ${timeStr}</span>` : ''}
          </div>
          <div class="stn-header-btn-group">
            <button class="stn-speak-btn" type="button" title="문장 음성 듣기">
              <span>🔊 문장 듣기</span>
            </button>
            ${idx > 0 ? `
            <button class="stn-merge-btn" type="button" title="이전 문장(S${idx})과 합치기">
              <span>🔗 이전 문장과 결합</span>
            </button>
            ` : ''}
            <button class="stn-split-btn" type="button" title="이 문장을 두 개로 분리하기">
              <span>✂️ 문장 분리</span>
            </button>
          </div>
        </div>

        <!-- Inline Sentence Split Picker Bar -->
        <div class="sentence-split-bar hidden">
          <div class="split-bar-header">
            <span>✂️ <strong>문장 분리:</strong> 분리할 기준 단어를 클릭하세요 (선택 단어 뒤에서 새로운 문장으로 분리):</span>
            <button type="button" class="btn-cancel-split icon-btn" title="취소">✕</button>
          </div>
          <div class="split-words-container"></div>
        </div>

        <!-- Interactive Clickable Word-Divider Track -->
        <div class="word-divider-track"></div>

        <!-- Strict 2x2 Editable Fields Grid -->
        <div class="sentence-edit-grid">
          <!-- Row 1, Col 1: 영어 문장 원문 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>📝 영어 문장 원문 (Script):</span>
            </label>
            <input type="text" class="sentence-script-input" value="${this.escapeHtml(stn.text || '')}" placeholder="영어 문장 원문">
          </div>

          <!-- Row 1, Col 2: 우리말 해석 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✍️ 우리말 자연스러운 해석:</span>
              <button type="button" class="btn-retranslate" title="자연스러운 해석 다시 가져오기">🔄 재해석</button>
            </label>
            <input type="text" class="sentence-natural-input" value="${this.escapeHtml(stn.result?.natural || '')}" placeholder="자연스러운 우리말 해석">
          </div>

          <!-- Row 2, Col 1: 청크 구분 영어 문장 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✂️ 청크 구분(||) 영어 문장:</span>
            </label>
            <input type="text" class="chunk-text-input" value="${this.escapeHtml(this.getChunkString(stn.result?.chunks))}" placeholder="단어 사이에 || 입력">
          </div>

          <!-- Row 2, Col 2: 직독직해 (순차 해석) -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>🧩 직독직해 (순차 해석):</span>
            </label>
            <input type="text" class="chunk-direct-input" value="${this.escapeHtml(this.getDirectChunkString(stn.result?.chunks))}" placeholder="청크별 순차 해석 (|| 로 구분)">
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

      // 2. Hook up Merge button (if idx > 0)
      const mergeBtn = itemCard.querySelector('.stn-merge-btn');
      if (mergeBtn) {
        mergeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.mergeWithPreviousSentence(idx);
        });
      }

      // 3. Hook up Split button
      const splitBtn = itemCard.querySelector('.stn-split-btn');
      if (splitBtn) {
        splitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleSplitBar(itemCard, stn, idx);
        });
      }

      // 4. Hook up Audio Time adjustment on click (Visual Waveform Trimmer Modal)
      const timeBadge = itemCard.querySelector('.stn-audio-time');
      if (timeBadge && hasAudioTime) {
        timeBadge.title = '클릭하여 파형을 보며 오디오 구간을 정밀 조정합니다.';
        timeBadge.style.cursor = 'pointer';
        timeBadge.addEventListener('click', () => {
          if (this.trimmerModal && appState.audioBuffer) {
            this.trimmerModal.open(stn, appState.audioBuffer, (newStart, newEnd) => {
              // Drop stale callbacks if the list was rebuilt while the modal was open
              if (!appState.sentenceList || appState.sentenceList[idx] !== stn) return;
              stn.audioStart = newStart;
              stn.audioEnd = newEnd;
              stn.cachedPeaks = null;
              timeBadge.textContent = `⏱ ${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}`;

              // Synchronize adjacent sentences so no overlap / zero-length ranges occur
              const MIN_SEG = 0.2;
              const prevStn = idx > 0 ? appState.sentenceList[idx - 1] : null;
              const nextStn = idx < appState.sentenceList.length - 1 ? appState.sentenceList[idx + 1] : null;
              if (prevStn && prevStn.audioEnd !== null && Math.abs(prevStn.audioEnd - newStart) > 0.05) {
                const prevStart = (prevStn.audioStart != null) ? prevStn.audioStart : 0;
                prevStn.audioEnd = Math.max(prevStart + MIN_SEG, newStart);
                prevStn.cachedPeaks = null;
                const prevBadge = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx - 1}"] .stn-audio-time`);
                if (prevBadge) prevBadge.textContent = `⏱ ${this.formatSec(prevStn.audioStart)} ~ ${this.formatSec(prevStn.audioEnd)}`;
              }
              if (nextStn && nextStn.audioStart !== null && Math.abs(nextStn.audioStart - newEnd) > 0.05) {
                const nextEnd = (nextStn.audioEnd != null) ? nextStn.audioEnd : newEnd + MIN_SEG;
                nextStn.audioStart = Math.min(nextEnd - MIN_SEG, newEnd);
                nextStn.cachedPeaks = null;
                const nextBadge = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx + 1}"] .stn-audio-time`);
                if (nextBadge) nextBadge.textContent = `⏱ ${this.formatSec(nextStn.audioStart)} ~ ${this.formatSec(nextStn.audioEnd)}`;
              }

              if (this.masterWaveform) {
                this.masterWaveform.draw();
              }
              projectService.markDirty();
              toast.show(`⏱ 문장 S${idx + 1} 구간 수정 및 인접 문장 자동 연동 완료!`);
            });
          } else {
            // Fallback prompt if audio buffer not yet decoded
            const currentStart = stn.audioStart !== null ? stn.audioStart : 0;
            const currentEnd = stn.audioEnd !== null ? stn.audioEnd : 0;
            const inputStr = prompt(`문장 S${idx + 1} 오디오 구간 (초 단위) 수정:\n예: 3.5 ~ 8.2`, `${currentStart} ~ ${currentEnd}`);
            if (inputStr) {
              const parts = inputStr.split('~').map(s => parseFloat(s.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > parts[0]) {
                stn.audioStart = Math.round(parts[0] * 10) / 10;
                stn.audioEnd = Math.round(parts[1] * 10) / 10;
                stn.cachedPeaks = null;
                timeBadge.textContent = `⏱ ${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}`;
                if (this.masterWaveform) this.masterWaveform.draw();
                projectService.markDirty();
                toast.show(`⏱ 문장 S${idx + 1} 구간 수정: ${stn.audioStart}s ~ ${stn.audioEnd}s`);
              }
            }
          }
        });
      }

      // 5. Render Interactive Word-Divider Track & Inputs
      const track = itemCard.querySelector('.word-divider-track');
      const scriptInput = itemCard.querySelector('.sentence-script-input');
      const naturalInput = itemCard.querySelector('.sentence-natural-input');
      const chunkInput = itemCard.querySelector('.chunk-text-input');
      const directInput = itemCard.querySelector('.chunk-direct-input');
      const retransBtn = itemCard.querySelector('.btn-retranslate');

      if (track) {
        this.renderWordDividerTrack(track, stn, chunkInput, directInput);
      }

      // 6. Hook up Retranslate Button
      if (retransBtn) {
        retransBtn.addEventListener('click', () => {
          this.retranslateSentence(stn, naturalInput, directInput);
        });
      }

      // Enter only commits the field (blur → single 'change' event). Previously Enter AND change both ran the
      // update, firing duplicate AI requests. isComposing guard keeps Korean IME composition intact.
      const commitOnEnter = (inputEl) => (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          if (typeof inputEl.blur === 'function') inputEl.blur();
        }
      };

      // 7. Hook up Script Input
      if (scriptInput) {
        scriptInput.addEventListener('change', () => {
          this.updateSentenceScript(stn, scriptInput.value, chunkInput, directInput, naturalInput, track);
        });
        scriptInput.addEventListener('keydown', commitOnEnter(scriptInput));
      }

      // 8. Hook up Chunk Text Input (English ||)
      if (chunkInput) {
        chunkInput.addEventListener('change', () => {
          this.updateChunksFromTextInput(stn, chunkInput.value, directInput, track);
        });
        chunkInput.addEventListener('keydown', commitOnEnter(chunkInput));
      }

      // 9. Hook up Direct Chunk Input (Korean ||)
      if (directInput) {
        directInput.addEventListener('change', () => {
          const ok = this.updateChunksFromDirectInput(stn, directInput.value);
          if (!ok) directInput.value = this.getDirectChunkString(stn.result?.chunks);
        });
        directInput.addEventListener('keydown', commitOnEnter(directInput));
      }

      // 10. Hook up Natural Korean Input
      if (naturalInput) {
        naturalInput.addEventListener('input', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
          if (typeof projectService !== 'undefined' && projectService.markDirty) {
            projectService.markDirty();
          }
        });
        naturalInput.addEventListener('change', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
          // Synchronize 직독직해 instantly when natural interpretation is edited by user
          if (stn.result.chunks && stn.result.chunks.length > 0) {
            this.ruleEngine.alignNaturalToChunks(stn.result.chunks, stn.result.natural);
            stn.result.chunk_text = stn.result.chunks.map(c => c.ko).join(' || ');
            stn.result.direct = stn.result.chunks.map(c => c.ko).join(' / ');
            if (directInput && document.activeElement !== directInput) {
              directInput.value = this.getDirectChunkString(stn.result.chunks);
            }
            this.scheduleDirectChunkAiRefinement(stn, directInput);
          }
          if (typeof projectService !== 'undefined' && projectService.markDirty) {
            projectService.markDirty();
          }
        });
      }

      this.parsedSentenceList.appendChild(itemCard);
    });

    this.parsedResultsSection.classList.remove('hidden');

    // Sync master waveform
    if (this.masterWaveform && appState.audioBuffer) {
      if (this.masterWaveformSection) this.masterWaveformSection.classList.remove('hidden');
      this.masterWaveform.setAudioBuffer(appState.audioBuffer);
      this.masterWaveform.setSentenceList(appState.sentenceList);
    }

    // Ensure active sentence highlight is set (retains working sentence or defaults to 0)
    const initialActiveIdx = (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < sentences.length)
      ? targetIdx
      : ((typeof this.activeSentenceIndex === 'number' && this.activeSentenceIndex >= 0 && this.activeSentenceIndex < sentences.length)
        ? this.activeSentenceIndex
        : 0);
    this.setActiveSentence(initialActiveIdx);

    const schedulePostRender = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (fn) => setTimeout(fn, 0);

    schedulePostRender(() => {
      // Release temporary min-height lock
      if (this.parsedSentenceList) {
        this.parsedSentenceList.style.minHeight = '';
      }

      // If explicit scrollToSection requested (e.g. initial generation or preset load)
      if (scrollToSection) {
        this.parsedResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // If specific sentence index targeted (e.g. after merge or split)
      if (typeof targetIdx === 'number' && targetIdx >= 0) {
        this.setActiveSentence(targetIdx, { scrollToCard: true });
        const targetCard = this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"]`);
        if (targetCard) {
          if (scrollContext && typeof scrollContext.cardTopBefore === 'number') {
            // Keep card at the exact same screen pixel coordinate
            const cardTopAfter = targetCard.getBoundingClientRect().top;
            const delta = cardTopAfter - scrollContext.cardTopBefore;
            if (Math.abs(delta) > 1) {
              window.scrollBy({ top: delta, behavior: 'auto' });
            }
          } else {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
          return;
        }
      }

      // Fallback: restore exact scroll position to prevent jumping to top
      if (fallbackScrollY > 0) {
        window.scrollTo({ top: fallbackScrollY, behavior: 'auto' });
      }
    });
  }

  renderWordDividerTrack(track, stn, chunkInput, directInput) {
    if (!track) return;
    track.innerHTML = '';

    const itemCard = track.closest && typeof track.closest === 'function' ? track.closest('.parsed-sentence-item') : null;
    const resolvedChunkInput = chunkInput || (itemCard && itemCard.querySelector ? itemCard.querySelector('.chunk-text-input') : null);
    const resolvedDirectInput = directInput || (itemCard && itemCard.querySelector ? itemCard.querySelector('.chunk-direct-input') : null);

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    // Determine current boundary word indices
    const boundaryWordIndices = new Set();
    let runningWordCount = 0;
    (stn.result?.chunks || []).forEach((c, cIdx) => {
      const cWords = (c.en || '').trim().split(/\s+/).filter(Boolean);
      runningWordCount += cWords.length;
      if (cIdx < (stn.result?.chunks || []).length - 1 && runningWordCount > 0 && runningWordCount < words.length) {
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

        dividerSlot.addEventListener('click', (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (boundaryWordIndices.has(idx)) {
            boundaryWordIndices.delete(idx);
          } else {
            boundaryWordIndices.add(idx);
          }

          // Instant in-memory chunk rebuilding & local rule semantic alignment (< 1ms)
          this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);

          if (resolvedChunkInput) {
            resolvedChunkInput.value = this.getChunkString(stn.result.chunks);
          }
          if (resolvedDirectInput && document.activeElement !== resolvedDirectInput) {
            resolvedDirectInput.value = this.getDirectChunkString(stn.result.chunks);
          }

          // Instantly refresh the track
          this.renderWordDividerTrack(track, stn, resolvedChunkInput, resolvedDirectInput);
          toast.show('✂️ 청크 구분이 업데이트되었습니다.');

          // Non-blocking debounced AI refinement in the background (if AI configured)
          this.scheduleDirectChunkAiRefinement(stn, resolvedDirectInput);
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
        const koStr = existingChunk ? existingChunk.ko : '';
        newChunks.push({ en: enStr, ko: koStr });
        curWords = [];
      }
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;

    // Instant synchronous semantic alignment using RuleChunkEngine (< 1ms)
    if (stn.result.natural) {
      this.ruleEngine.alignNaturalToChunks(newChunks, stn.result.natural);
    }

    stn.result.chunk_text = newChunks.map(c => c.ko).join(' || ');
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
    projectService.markDirty();
  }

  updateChunksFromTextInput(stn, chunkedText, directInput, track) {
    const parts = (chunkedText || '').split('||').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const newChunks = parts.map(part => {
      const existing = (stn.result?.chunks || []).find(c => c.en.trim() === part);
      return {
        en: part,
        ko: existing ? existing.ko : ''
      };
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;

    // Instant synchronous semantic alignment using RuleChunkEngine (< 1ms)
    if (stn.result.natural) {
      this.ruleEngine.alignNaturalToChunks(newChunks, stn.result.natural);
    }

    stn.result.chunk_text = newChunks.map(c => c.ko).join(' || ');
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
    projectService.markDirty();

    if (directInput && document.activeElement !== directInput) {
      directInput.value = this.getDirectChunkString(newChunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, null, directInput);
    }
    toast.show('✂️ 청크 구분이 저장되었습니다.');

    // Non-blocking debounced AI refinement in the background (if AI configured)
    this.scheduleDirectChunkAiRefinement(stn, directInput);
  }

  /**
   * Debounced, non-blocking background AI refinement for direct chunks.
   * Never delays or blocks user interactions; silently applies higher quality AI mappings when ready.
   */
  scheduleDirectChunkAiRefinement(stn, directInput) {
    if (!aiService.hasKey() || !stn.result?.natural || !stn.result?.chunks?.length) {
      return;
    }

    if (!this.directChunkTimers) {
      this.directChunkTimers = new Map();
    }

    if (this.directChunkTimers.has(stn)) {
      clearTimeout(this.directChunkTimers.get(stn));
    }

    stn._chunkRevision = (stn._chunkRevision || 0) + 1;
    const currentRev = stn._chunkRevision;
    const expectedChunkCount = stn.result.chunks.length;

    const timer = setTimeout(async () => {
      this.directChunkTimers.delete(stn);
      if (stn._chunkRevision !== currentRev) return;

      try {
        const directKoChunks = await aiService.generateDirectChunks(
          stn.result.chunks,
          stn.result.natural,
          stn.text
        );

        if (stn._chunkRevision === currentRev &&
            directKoChunks &&
            directKoChunks.length === expectedChunkCount &&
            directKoChunks.every(Boolean)) {
          directKoChunks.forEach((ko, i) => {
            if (stn.result.chunks[i]) {
              stn.result.chunks[i].ko = ko;
            }
          });
          stn.result.chunk_text = directKoChunks.join(' || ');
          stn.result.direct = directKoChunks.join(' / ');

          if (directInput && document.activeElement !== directInput) {
            directInput.value = this.getDirectChunkString(stn.result.chunks);
          }
        }
      } catch (err) {
        console.warn('Background AI direct chunk refinement skipped:', err);
      }
    }, 700);

    this.directChunkTimers.set(stn, timer);
  }

  /**
   * Applies the "직독직해" input (ko1 || ko2 || ...) slot-by-slot.
   * Empty slots are written as DIRECT_EMPTY_PLACEHOLDER by getDirectChunkString(), so positions never shift.
   * @returns {boolean} false when the slot count does not match the chunk count (nothing is changed)
   */
  updateChunksFromDirectInput(stn, directStr) {
    if (!stn.result) stn.result = {};
    if (!stn.result.chunks) stn.result.chunks = [];
    const chunks = stn.result.chunks;
    const parts = (directStr || '').split('||').map(p => p.trim());

    if (parts.length !== chunks.length) {
      toast.show(`⚠️ 직독직해 칸 수(${parts.length})가 청크 수(${chunks.length})와 다릅니다. '||' 개수를 맞춰주세요.`);
      return false;
    }

    chunks.forEach((chunk, i) => {
      chunk.ko = parts[i] === DIRECT_EMPTY_PLACEHOLDER ? '' : parts[i];
    });

    stn.result.chunk_text = chunks.map(c => c.ko).join(' || ');
    stn.result.direct = chunks.map(c => c.ko).join(' / ');
    if (typeof projectService !== 'undefined' && projectService.markDirty) {
      projectService.markDirty();
    }
    toast.show('🧩 직독직해 해석이 저장되었습니다.');
    return true;
  }

  async updateSentenceScript(stn, newText, chunkInput, directInput, naturalInput, track) {
    const cleanText = (newText || '').trim();
    if (!cleanText || cleanText === stn.text) return;
    stn.text = cleanText;

    // Re-process chunks with rule engine
    const newResult = this.ruleEngine.process(cleanText, stn.result?.natural);
    if (!stn.result) stn.result = {};
    stn.result.chunks = newResult.chunks;
    stn.result.chunk_text = newResult.chunk_text;
    stn.result.direct = newResult.direct;
    stn.cachedPeaks = null;

    if (chunkInput) {
      chunkInput.value = this.getChunkString(stn.result.chunks);
    }
    if (directInput) {
      directInput.value = this.getDirectChunkString(stn.result.chunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, chunkInput, directInput);
    }

    // Sync global script text
    appState.scriptText = (appState.sentenceList || []).map(s => s.text).join(' ');
    if (typeof projectService !== 'undefined' && projectService.markDirty) {
      projectService.markDirty();
    }
    toast.show(`📝 문장 S${stn.index + 1} 원문이 수정되었습니다.`);

    // Auto-translate natural in background and regenerate 직독직해
    try {
      const natural = await aiService.translateNatural(cleanText);
      if (natural) {
        stn.result.natural = natural;
        if (naturalInput) naturalInput.value = natural;
        const directKoChunks = await aiService.generateDirectChunks(stn.result.chunks, natural, cleanText);
        if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
          directKoChunks.forEach((ko, i) => {
            stn.result.chunks[i].ko = ko;
          });
          stn.result.chunk_text = directKoChunks.join(' || ');
          stn.result.direct = directKoChunks.join(' / ');
          if (directInput) {
            directInput.value = this.getDirectChunkString(stn.result.chunks);
          }
        }
      }
    } catch (e) {}
  }

  escapeHtml(str) {
    return escapeHtml(str); // delegates to the shared utils/dom.js implementation
  }

  getChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    return chunks.map(c => (c.en || '').trim()).filter(Boolean).join(' || ');
  }

  /** One slot per chunk (empty → placeholder) so updateChunksFromDirectInput() can map slots 1:1. */
  getDirectChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    const slots = chunks.map(c => (c.ko || '').trim());
    if (slots.every(s => !s)) return '';
    return slots.map(s => s || DIRECT_EMPTY_PLACEHOLDER).join(' || ');
  }

  playOrSpeakSentence(stn, speakBtn) {
    if (stn && typeof stn.index === 'number') {
      this.setActiveSentence(stn.index);
    }

    if (speakBtn) {
      const origHtml = speakBtn.innerHTML;
      speakBtn.innerHTML = '<span>🔊 재생 중...</span>';
      setTimeout(() => {
        if (speakBtn) speakBtn.innerHTML = origHtml;
      }, 1500);
    }

    // 1. If authentic uploaded audio exists, play the slice through the shared playback controller
    //    (owner 'input' → the Practice looper ignores this playback; segment end is enforced by rAF)
    if (appState.uploadedAudioUrl && !appState.isSynthesizedAudio &&
        stn.audioStart !== null && stn.audioEnd !== null) {
      try {
        playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
        playbackController.playSegment(stn.audioStart, stn.audioEnd, { owner: 'input' })
          .catch(e => {
            console.warn('Audio play error, falling back to TTS:', e);
            speakText(stn.text, 'en-US');
          });
        return;
      } catch (e) {
        console.warn('Audio playback error, fallback to TTS:', e);
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
            return `<span class="handout-fels-blank answer-mode">[ ${escapeHtml(w)} ]</span>`;
          } else {
            return `<span class="handout-fels-blank">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</span>`;
          }
        } else {
          return `<span>${escapeHtml(w)}</span>`;
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
        return `<span class="handout-chunk-box">[ ${escapeHtml(koText)} ]</span>`;
      });
      const chunkedKoHtml = chunkedKoSegments.join('<span class="handout-chunk-divider"> || </span>');

      backSentencesHtml += `
        <div class="handout-stn-item handout-speaking-item">
          <div class="handout-speaking-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-direct-ko">${chunkedKoHtml}</div>
          </div>
          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${escapeHtml(stn.text)}</div>` : ''}
          <div class="handout-speaking-check-row">
            <span class="speaking-check-label">🗣️ 말하기 훈련 체크:</span>
            <span class="check-box-pill">☐ 1차: 청크별 낭독</span>
            <span class="check-box-pill">☐ 2차: 직독직해 스피킹</span>
            <span class="check-box-pill">☐ 3차: 유창성 통과</span>
          </div>
        </div>
      `;
    });

    const handoutYear = new Date().getFullYear();

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
                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
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
                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  /**
   * Toggles the busy state WITHOUT rebuilding the button markup.
   * (The previous innerHTML rewrite detached this.btnTranslateText, so later setMode() label updates were lost.)
   */
  setLoading(isLoading) {
    if (!this.btnTranslate) return;
    this.btnTranslate.disabled = !!isLoading;
    if (this.btnTranslateText) {
      this.btnTranslateText.textContent = isLoading ? '처리 중...' : this.getTranslateButtonLabel(appState.currentMode);
    }
    const arrowIcon = this.btnTranslate.querySelector('.btn-icon-arrow');
    const spinnerIcon = this.btnTranslate.querySelector('.btn-icon-spinner');
    if (arrowIcon && spinnerIcon) {
      arrowIcon.classList.toggle('hidden', !!isLoading);
      spinnerIcon.classList.toggle('hidden', !isLoading);
    } else {
      const icon = typeof this.btnTranslate.querySelector === 'function' ? this.btnTranslate.querySelector('svg') : null;
      if (icon && icon.classList) {
        if (isLoading) icon.classList.add('spin-icon');
        else icon.classList.remove('spin-icon');
      }
    }
  }

  onActivated() {
    // Re-render results if sentence list exists
    if (appState.sentenceList.length > 0) {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      this.renderParsedResults({ scrollContext: { scrollYBefore: scrollY } });
    } else if (this.inputEnglish && !this.inputEnglish.value) {
      this.inputEnglish.focus();
    }
  }

  getSmoothMasterCurrentTime() {
    if (!this.nativeAudioPlayer) return 0;
    if (this.nativeAudioPlayer.paused || this.nativeAudioPlayer.ended) {
      return this.nativeAudioPlayer.currentTime || 0;
    }
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const actualTime = this.nativeAudioPlayer.currentTime || 0;

    if (actualTime !== this.masterAudioAnchorTime) {
      this.masterAudioAnchorTime = actualTime;
      this.masterAudioAnchorWallTime = now;
    }

    const playbackRate = this.nativeAudioPlayer.playbackRate || 1.0;
    const elapsedSec = ((now - this.masterAudioAnchorWallTime) / 1000) * playbackRate;
    let smoothTime = this.masterAudioAnchorTime + elapsedSec;

    if (Math.abs(smoothTime - actualTime) > 0.12) {
      smoothTime = actualTime;
      this.masterAudioAnchorTime = actualTime;
      this.masterAudioAnchorWallTime = now;
    }
    return smoothTime;
  }

  startMasterPlaybackLoop() {
    if (this.isMasterPlaybackLoopRunning) return;
    this.isMasterPlaybackLoopRunning = true;

    if (this.nativeAudioPlayer) {
      this.masterAudioAnchorTime = this.nativeAudioPlayer.currentTime || 0;
      this.masterAudioAnchorWallTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    const loop = () => {
      if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
        const cur = this.getSmoothMasterCurrentTime();
        const dur = this.nativeAudioPlayer.duration || 1;
        if (this.masterWaveform) {
          this.masterWaveform.setPlayheadTime(cur);
        }
        if (this.masterTimeHud) {
          this.masterTimeHud.textContent = `${this.formatSec(cur)} / ${this.formatSec(dur)}`;
        }
        this.masterPlaybackRafId = requestAnimationFrame(loop);
      } else {
        this.isMasterPlaybackLoopRunning = false;
        this.masterPlaybackRafId = null;
        if (this.masterWaveform && this.nativeAudioPlayer) {
          this.masterWaveform.setPlayheadTime(this.nativeAudioPlayer.currentTime || 0);
        }
      }
    };
    this.masterPlaybackRafId = requestAnimationFrame(loop);
  }

  stopMasterPlaybackLoop() {
    if (this.masterPlaybackRafId) {
      cancelAnimationFrame(this.masterPlaybackRafId);
      this.masterPlaybackRafId = null;
    }
    this.isMasterPlaybackLoopRunning = false;
  }

  onDeactivated() {
    this.stopMasterPlaybackLoop();
  }
}
