/**
 * Looper Engine & Playback Boundary Controller
 * Manages A-B section repeat, 0.5s shadowing delay timer, and sentence-bounded playback.
 */

import { CONSTANTS } from '../config/constants.js';

export function formatPreciseTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const totalTenths = Math.round(seconds * 10);
  const mins = Math.floor(totalTenths / 600);
  const secs = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class LooperEngine {
  constructor(audioPlayer, appState) {
    this.audioPlayer = audioPlayer;
    this.appState = appState;
    this.shadowTimer = null;
    this.sectionSilentMs = CONSTANTS.SHADOWING_PAUSE_MS || 1000;
    this.callbacks = {
      onLoopCountUpdate: () => {},
      onLoopComplete: () => {},
      onShadowingWait: () => {},
      onAutoAdvance: () => {},
      onPlayStateChange: () => {},
      onLoopRestart: () => {}
    };
  }

  setSectionSilentSeconds(sec) {
    const s = (typeof sec === 'number' && sec >= 0) ? sec : 1.0;
    this.sectionSilentMs = Math.round(s * 1000);
  }

  setCallbacks(cbs) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  /**
   * Called during animation frame / timeupdate to enforce loop and sentence boundaries
   */
  checkBoundary() {
    const player = this.audioPlayer;
    // `ended` must still run boundary logic (last sentence often ends at media duration).
    // When media ends, `paused` is also true — so allow `ended` through.
    if (!player) return;
    if (player.paused && !player.ended) return;

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

    // Keep the loop end just short of media duration so `ended` and the boundary agree
    if (Number.isFinite(player.duration) && player.duration > 0) {
      effectiveEnd = Math.min(effectiveEnd, Math.max(effectiveStart, player.duration - 0.05));
    }

    if (player.ended || cur >= effectiveEnd) {
      player.pause();
      this.appState.currentLoopCount++;
      this.callbacks.onLoopCountUpdate(this.appState.currentLoopCount, targetLoopCount);

      if (targetLoopCount !== Infinity && this.appState.currentLoopCount >= targetLoopCount) {
        const typeStr = hasCustomLoop ? '선택 구간' : `문장 S${this.appState.activeSentenceIndex + 1}`;
        this.callbacks.onLoopComplete(targetLoopCount, typeStr);
        this.callbacks.onPlayStateChange(false);
      } else {
        // Configurable section silent delay (0.0s ~ 4.0s)
        const delayMs = (typeof this.sectionSilentMs === 'number') ? this.sectionSilentMs : CONSTANTS.SHADOWING_PAUSE_MS;
        if (delayMs <= 0) {
          this.restartLoop(effectiveStart);
        } else {
          this.appState.isShadowingWaiting = true;
          this.callbacks.onShadowingWait(true);

          clearTimeout(this.shadowTimer);
          this.shadowTimer = setTimeout(() => {
            // reset()/setLoopRange() may have cancelled the wait in the meantime
            if (!this.appState.isShadowingWaiting) return;
            this.appState.isShadowingWaiting = false;
            this.callbacks.onShadowingWait(false);
            this.restartLoop(effectiveStart);
          }, delayMs);
        }
      }
    }
  }

  restartLoop(effectiveStart) {
    const curCustom = (this.appState.loopStart !== null && this.appState.loopEnd !== null);
    const curStn = this.appState.getActiveSentence();
    const fallbackStart = (curStn && curStn.audioStart !== null) ? curStn.audioStart : 0;
    const restartTime = curCustom
      ? this.appState.loopStart
      : (curStn && curStn.audioStart !== null ? curStn.audioStart : (effectiveStart !== null ? effectiveStart : fallbackStart));

    if (restartTime !== null && this.audioPlayer) {
      this.audioPlayer.currentTime = restartTime;
      this.audioPlayer.play().then(() => {
        this.callbacks.onPlayStateChange(true);
        this.callbacks.onLoopRestart();
      }).catch(e => console.error(e));
    }
  }

  reset() {
    clearTimeout(this.shadowTimer);
    this.appState.isShadowingWaiting = false;
    this.callbacks.onShadowingWait(false);
  }
}
