/**
 * FELS (Function-Embedded Listening Skills) Processing Engine
 * Identifies 7 function word categories, uniform blank sizing, and answer verification.
 */

import { getFelsInfo } from '../config/fels-dict.js';

export function calculateUniformBlankWidth(chunks) {
  let maxLen = 4;
  chunks.forEach(c => {
    const words = (c.en || '').split(/\s+/);
    words.forEach(w => {
      const info = getFelsInfo(w);
      if (info && info.clean.length > maxLen) {
        maxLen = info.clean.length;
      }
    });
  });
  return Math.min(Math.max(maxLen * 11 + 20, 68), 120);
}

/** Normalize curly / typographic apostrophes to ASCII so don’t === don't. */
function normalizeApostrophe(s) {
  return String(s || '').replace(/[\u2018\u2019\u201B\u2032]/g, "'");
}

export function parseTokenPunctuation(token) {
  const match = token.match(/^(.*?)([.,!?;:]*)$/);
  const base = match ? match[1] : token;
  const punct = match ? match[2] : '';
  const clean = normalizeApostrophe(base).toLowerCase().replace(/[^a-z']/g, '');
  return { base, punct, clean };
}

export function verifyAnswer(userVal, expectedWord) {
  const normUser = normalizeApostrophe(userVal).trim().toLowerCase();
  const normExp = normalizeApostrophe(expectedWord).trim().toLowerCase();
  return normUser === normExp;
}
