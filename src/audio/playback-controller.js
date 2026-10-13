/**
 * Playback Controller — single owner of the shared <audio id="nativeAudioPlayer">.
 *
 * Why: Page 1 (Input), Page 2 (Practice) and Page 3 (Memorize) share one audio element.
 * Previously Page 2's looper enforced *its* sentence boundary on every timeupdate regardless of
 * which page started playback, which instantly paused Page 1 "문장 듣기" (S2+) and stalled Page 3
 * "전체 스크립트 연속 재생". This controller tracks the current owner and cancels stale segment
 * watchers with a token so only one segment is ever enforced.
 *
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

function scheduleFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 16);
}

function cancelFrame(id) {
  if (id === null || id === undefined) return;
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

export class PlaybackController {
  constructor() {
    this.player = null;
    this.owner = null; // 'input' | 'practice' | 'memorize' | null
    this.segmentToken = 0;
    this.segmentFrame = null;
  }

  getPlayer() {
    if (!this.player && typeof document !== 'undefined' && document.getElementById) {
      this.player = document.getElementById('nativeAudioPlayer');
    }
    return this.player;
  }

  /**
   * Sets the audio source (only when changed) and ALWAYS re-applies the muted flag,
   * so a previous synthesized (muted) session never silences a real MP3.
   */
  setSource(url, { muted = false } = {}) {
    const player = this.getPlayer();
    if (!player) return;
    if (url && player.src !== url) {
      player.src = url;
    }
    player.muted = !!muted;
  }

  /** Marks `owner` as the active playback owner. Cancels any segment watcher of a previous owner. */
  claim(owner) {
    if (this.owner !== owner) {
      this.cancelSegment();
      this.owner = owner || null;
    }
  }

  isOwnedBy(owner) {
    return this.owner === owner;
  }

  cancelSegment() {
    this.segmentToken++;
    cancelFrame(this.segmentFrame);
    this.segmentFrame = null;
  }

  /**
   * Plays [start, end) and pauses at `end`. A newer playSegment()/stop()/claim() call invalidates
   * this watcher. If `end` is null/NaN the segment plays until the media ends.
   * onEnd fires only when the segment finishes naturally (not when cancelled or paused externally).
   * @returns {Promise<boolean>} resolves true when playback started for this (still-valid) segment
   */
  playSegment(start, end, { owner = null, onEnd = null } = {}) {
    const player = this.getPlayer();
    if (!player || typeof player.play !== 'function') return Promise.resolve(false);

    this.claim(owner);
    this.cancelSegment();
    const token = this.segmentToken;

    try {
      player.currentTime = Math.max(0, Number(start) || 0);
    } catch (e) {
      // currentTime may throw before metadata is loaded; play() will still start from 0
    }

    const hasEnd = typeof end === 'number' && isFinite(end);
    const watch = () => {
      if (token !== this.segmentToken) return;
      if ((hasEnd && player.currentTime >= end) || player.ended) {
        if (typeof player.pause === 'function') player.pause();
        this.segmentFrame = null;
        if (typeof onEnd === 'function') onEnd();
        return;
      }
      if (player.paused) {
        // Paused by the user or another control: stop watching silently (no onEnd)
        this.segmentFrame = null;
        return;
      }
      this.segmentFrame = scheduleFrame(watch);
    };

    return Promise.resolve(player.play()).then(() => {
      if (token !== this.segmentToken) return false;
      this.segmentFrame = scheduleFrame(watch);
      return true;
    });
  }

  /** Cancels the active segment watcher and pauses playback. */
  stop() {
    this.cancelSegment();
    const player = this.getPlayer();
    if (player && !player.paused && typeof player.pause === 'function') {
      player.pause();
    }
  }

  stopAll() {
    this.stop();
  }
}

export const playbackController = new PlaybackController();
