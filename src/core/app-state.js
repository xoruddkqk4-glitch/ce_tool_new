/**
 * Centralized Application State (AppState)
 * Shared across Page 1 (Input), Page 2 (Practice), and Page 3 (Memorization).
 * Preserves Web Audio Context, decoded audio buffer, and sentence structures without reload.
 */

export class AppState {
  constructor() {
    this.listeners = new Map();

    // Input mode: 'both' | 'audio' | 'text'
    this.currentMode = 'text';

    // Audio & Web Audio
    this.uploadedAudioFile = null;
    this.uploadedAudioUrl = null;
    this.audioBuffer = null;
    this.isSynthesizedAudio = false;
    this.synthesizedWavBlob = null;
    this.playbackSpeed = 1.0;

    // Script & Sentence classification
    this.scriptText = '';
    this.sentenceList = [];
    this.activeSentenceIndex = 0;

    // A-B Looper & Shadowing
    this.loopStart = null;
    this.loopEnd = null;
    this.targetLoopCount = 3;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.isAutoAdvance = false;

    // Practice View Card State
    this.isFelsMode = true; // true: blanks, false: original english
    this.areAllCardsFlipped = false;
    this.felsBlanks = [];
    this.naturalVisible = false; // default false

    // Memorization View State
    this.memorizeMode = 'all'; // 'all' | 'en' | 'ko' | 'cloze'
    this.isMemorizePlaying = false;
    this.memorizeAllFlipped = false;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event).filter(h => h !== handler);
    this.listeners.set(event, list);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  setUploadMode(mode) {
    this.currentMode = mode;
    this.emit('modeChanged', mode);
  }

  setSentenceList(list) {
    this.sentenceList = list || [];
    this.activeSentenceIndex = 0;
    this.clearLoop();
    this.emit('sentencesLoaded', this.sentenceList);
  }

  setActiveSentenceIndex(idx) {
    if (idx < 0 || idx >= this.sentenceList.length) return;
    this.activeSentenceIndex = idx;
    this.clearLoop();
    this.emit('activeSentenceChanged', {
      index: idx,
      sentence: this.sentenceList[idx]
    });
  }

  getActiveSentence() {
    if (!this.sentenceList || this.sentenceList.length === 0) return null;
    return this.sentenceList[this.activeSentenceIndex] || null;
  }

  setLoopRange(start, end) {
    this.loopStart = start;
    this.loopEnd = end;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.emit('loopChanged', { start, end, count: this.targetLoopCount });
  }

  clearLoop() {
    this.loopStart = null;
    this.loopEnd = null;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.emit('loopChanged', { start: null, end: null, count: this.targetLoopCount });
  }

  resetAll() {
    this.uploadedAudioFile = null;
    if (this.uploadedAudioUrl) {
      URL.revokeObjectURL(this.uploadedAudioUrl);
      this.uploadedAudioUrl = null;
    }
    this.audioBuffer = null;
    this.isSynthesizedAudio = false;
    this.synthesizedWavBlob = null;
    this.scriptText = '';
    this.sentenceList = [];
    this.activeSentenceIndex = 0;
    this.clearLoop();
    this.emit('reset');
  }
}

// Global Singleton Instance
export const appState = new AppState();
