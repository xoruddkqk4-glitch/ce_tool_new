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
    const { loopStart, loopEnd, targetLoopCount, isShadowingWaiting, isAutoAdvance } = this.appState;

    if (loopStart !== null && loopEnd !== null && !isShadowingWaiting) {
      if (cur >= loopEnd) {
        player.pause();
        this.appState.currentLoopCount++;
        this.callbacks.onLoopCountUpdate(this.appState.currentLoopCount, targetLoopCount);

        if (targetLoopCount !== Infinity && this.appState.currentLoopCount >= targetLoopCount) {
          this.callbacks.onLoopComplete(targetLoopCount);
          this.callbacks.onPlayStateChange(false);

          if (isAutoAdvance) {
            setTimeout(() => {
              this.callbacks.onAutoAdvance();
            }, 800);
          }
        } else {
          // 0.5s shadowing pause delay
          this.appState.isShadowingWaiting = true;
          this.callbacks.onShadowingWait(true);

          clearTimeout(this.shadowTimer);
          this.shadowTimer = setTimeout(() => {
            this.appState.isShadowingWaiting = false;
            this.callbacks.onShadowingWait(false);

            if (this.appState.loopStart !== null) {
              player.currentTime = this.appState.loopStart;
              player.play().then(() => {
                this.callbacks.onPlayStateChange(true);
                // Lets the view re-trigger TTS for synthesized (silent WAV) sessions on every repeat
                this.callbacks.onLoopRestart();
              }).catch(e => console.error(e));
            }
          }, CONSTANTS.SHADOWING_PAUSE_MS);
        }
      }
    } else {
      // Bound strictly to current sentence
      const activeStn = this.appState.getActiveSentence();
      if (activeStn && activeStn.audioEnd !== null && !isShadowingWaiting) {
        if (cur >= activeStn.audioEnd) {
          player.pause();
          this.callbacks.onPlayStateChange(false);
          if (isAutoAdvance) {
            setTimeout(() => {
              this.callbacks.onAutoAdvance();
            }, 600);
          }
        }
      }
    }
  }

  reset() {
    clearTimeout(this.shadowTimer);
    this.appState.isShadowingWaiting = false;
    this.callbacks.onShadowingWait(false);
  }
}
