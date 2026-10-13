/**
 * Looper Engine & Playback Boundary Controller
 * Manages A-B section repeat, 0.5s shadowing delay timer, and sentence-bounded playback.
 */

import { CONSTANTS } from '../config/constants.js';

export function formatPreciseTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class LooperEngine {
  constructor(audioPlayer, appState) {
    this.audioPlayer = audioPlayer;
    this.appState = appState;
    this.shadowTimer = null;
    this.callbacks = {
      onLoopCountUpdate: () => {},
      onLoopComplete: () => {},
      onShadowingWait: () => {},
      onAutoAdvance: () => {},
      onPlayStateChange: () => {},
      onLoopRestart: () => {}
    };
  }

  setCallbacks(cbs) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  /**
   * Called during animation frame / timeupdate to enforce loop and sentence boundaries
   */
  checkBoundary() {
    const player = this.audioPlayer;
    if (!player || player.paused || player.ended) return;

    const cur = player.currentTime;
    const { loopStart, loopEnd, targetLoopCount, isShadowingWaiting } = this.appState;

    if (isShadowingWaiting) return;

    const activeStn = this.appState.getActiveSentence();
    const hasCustomLoop = (loopStart !== null && loopEnd !== null);

    let effectiveStart = null;
    let effectiveEnd = null;

    if (hasCustomLoop) {
      effectiveStart = loopStart;
      effectiveEnd = loopEnd;
    } else if (activeStn && activeStn.audioEnd !== null) {
      effectiveStart = (activeStn.audioStart !== null ? activeStn.audioStart : 0);
      effectiveEnd = activeStn.audioEnd;
    }

    if (effectiveStart === null || effectiveEnd === null) return;

    if (cur >= effectiveEnd) {
      player.pause();
      this.appState.currentLoopCount++;
      this.callbacks.onLoopCountUpdate(this.appState.currentLoopCount, targetLoopCount);

      if (targetLoopCount !== Infinity && this.appState.currentLoopCount >= targetLoopCount) {
        const typeStr = hasCustomLoop ? '선택 구간' : `문장 S${this.appState.activeSentenceIndex + 1}`;
        this.callbacks.onLoopComplete(targetLoopCount, typeStr);
        this.callbacks.onPlayStateChange(false);
      } else {
        // 0.5s shadowing pause delay between loop iterations
        this.appState.isShadowingWaiting = true;
        this.callbacks.onShadowingWait(true);

        clearTimeout(this.shadowTimer);
        this.shadowTimer = setTimeout(() => {
          this.appState.isShadowingWaiting = false;
          this.callbacks.onShadowingWait(false);

          const curCustom = (this.appState.loopStart !== null && this.appState.loopEnd !== null);
          const curStn = this.appState.getActiveSentence();
          const restartTime = curCustom
            ? this.appState.loopStart
            : (curStn && curStn.audioStart !== null ? curStn.audioStart : effectiveStart);

          if (restartTime !== null && this.audioPlayer) {
            this.audioPlayer.currentTime = restartTime;
            this.audioPlayer.play().then(() => {
              this.callbacks.onPlayStateChange(true);
              // Lets the view re-trigger TTS for synthesized (silent WAV) sessions on every repeat
              this.callbacks.onLoopRestart();
            }).catch(e => console.error(e));
          }
        }, CONSTANTS.SHADOWING_PAUSE_MS);
      }
    }
  }

  reset() {
    clearTimeout(this.shadowTimer);
    this.appState.isShadowingWaiting = false;
    this.callbacks.onShadowingWait(false);
  }
}
