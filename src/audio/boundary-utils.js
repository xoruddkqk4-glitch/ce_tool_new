/**
 * Sentence Boundary Resolver
 * Single place for: AI alignment (optional) → PCM VAD fallback → Korean intro cross-check → end padding.
 * Previously duplicated in InputView.handleTranslate() and InputView.autoSyncAudioScript().
 *
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

import { detectAudioSentenceBoundaries, detectKoreanIntroDuration } from './silence-detector.js';

export const BOUNDARY_END_PADDING_SEC = 0.9;       // headroom after a sentence end (never cut the last word)
export const BOUNDARY_LAST_END_PADDING_SEC = 1.0;  // headroom for the last sentence (bounded by file length)
export const BOUNDARY_NEXT_GAP_SEC = 0.15;         // stop this far before the next sentence starts
export const BOUNDARY_MIN_SEGMENT_SEC = 0.4;       // never shrink a segment below this
export const BOUNDARY_INTRO_MIN_SEC = 2.0;         // only trust Korean intro detection above this length
export const BOUNDARY_INTRO_TOLERANCE_SEC = 0.5;

/**
 * Mutates `boundaries` in place: extends each end by the padding policy, bounded by the next start.
 * Same arithmetic as the previous inline loop in input-view.js (entries with end === null/undefined are skipped).
 */
export function applyBoundaryEndPadding(boundaries, totalDuration = null) {
  if (!Array.isArray(boundaries)) return boundaries;
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (!b || b.end === null || b.end === undefined) continue;
    const nextStart = (i + 1 < boundaries.length && boundaries[i + 1] && boundaries[i + 1].start !== null)
      ? boundaries[i + 1].start
      : totalDuration;
    if (nextStart !== null && nextStart !== undefined && nextStart > b.start) {
      const maxSafeEnd = Math.max(b.start + BOUNDARY_MIN_SEGMENT_SEC, nextStart - BOUNDARY_NEXT_GAP_SEC);
      b.end = Math.min(maxSafeEnd, Math.round((b.end + BOUNDARY_END_PADDING_SEC) * 10) / 10);
    } else if (totalDuration !== null && totalDuration !== undefined) {
      b.end = Math.min(totalDuration, Math.round((b.end + BOUNDARY_LAST_END_PADDING_SEC) * 10) / 10);
    }
  }
  return boundaries;
}

/**
 * @param {Object} params
 * @param {AudioBuffer|null} params.audioBuffer
 * @param {string[]} params.sentences
 * @param {Function|null} params.aiAlign  async () => [{ start, end }] | null  (optional)
 * @returns {Promise<Array<{start:number|null,end:number|null}>>}
 */
export async function resolveSentenceBoundaries({ audioBuffer = null, sentences = [], aiAlign = null } = {}) {
  let boundaries = null;

  if (typeof aiAlign === 'function') {
    try {
      const alignments = await aiAlign();
      if (alignments && alignments.length === sentences.length) {
        boundaries = alignments.map(a => ({ start: a.start, end: a.end }));
      }
    } catch (err) {
      console.warn('AI audio alignment fallback:', err);
    }
  }

  if (!boundaries) {
    boundaries = detectAudioSentenceBoundaries(audioBuffer, sentences);
  } else if (audioBuffer && boundaries.length > 0) {
    // Cross-verify with PCM VAD to guarantee the Korean intro announcement is skipped
    const introSec = detectKoreanIntroDuration(audioBuffer, sentences);
    if (introSec > BOUNDARY_INTRO_MIN_SEC && boundaries[0].start !== null && boundaries[0].start < introSec - BOUNDARY_INTRO_TOLERANCE_SEC) {
      boundaries[0].start = introSec;
      // Keep start < end after pushing the start forward
      if (boundaries[0].end !== null && boundaries[0].end !== undefined &&
          boundaries[0].end < introSec + BOUNDARY_MIN_SEGMENT_SEC) {
        boundaries[0].end = introSec + BOUNDARY_MIN_SEGMENT_SEC;
      }
    }
  }

  if (boundaries && boundaries.length === sentences.length) {
    applyBoundaryEndPadding(boundaries, audioBuffer ? audioBuffer.duration : null);
  }
  return boundaries || [];
}
