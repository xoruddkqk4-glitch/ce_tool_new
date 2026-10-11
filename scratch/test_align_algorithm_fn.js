// scratch/test_align_algorithm_fn.js

function cleanStr(s) {
  return (s || '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();
}

function matchScore(enText, koWord, translatedKoChunk = '') {
  const cleanKo = cleanStr(koWord);
  if (!cleanKo) return 0;

  // 1. Exact match with translated chunk text if available
  if (translatedKoChunk) {
    const cleanTrans = cleanStr(translatedKoChunk);
    const transWords = cleanTrans.split(/\s+/);
    if (transWords.some(tw => tw === cleanKo)) return 15;
    if (cleanTrans.includes(cleanKo)) return 10;
    // Check substring of length >= 2
    for (let len = Math.min(cleanKo.length, 4); len >= 2; len--) {
      for (let i = 0; i <= cleanKo.length - len; i++) {
        const sub = cleanKo.substring(i, i + len);
        if (cleanTrans.includes(sub)) return 5 + len;
      }
    }
  }

  // 2. Transliteration / English token stems
  const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
  for (const token of enTokens) {
    if (cleanKo.includes(token)) return 9;
  }

  return 0;
}

function alignChunksWithNatural(chunks, naturalText, translatedChunks = []) {
  if (!chunks || !chunks.length) return [];
  if (chunks.length === 1) return [naturalText.trim()];

  const natWords = naturalText.trim().split(/\s+/).filter(Boolean);
  if (!natWords.length) {
    return translatedChunks.length === chunks.length ? translatedChunks : chunks.map(c => typeof c === 'string' ? c : c.ko || '');
  }

  // Each natural word gets a score for each chunk
  const wordScores = natWords.map((word, wIdx) => {
    const scores = chunks.map((c, cIdx) => {
      const enText = typeof c === 'string' ? c : c.en || '';
      const transText = translatedChunks[cIdx] || '';
      return matchScore(enText, word, transText);
    });
    return { word, wIdx, scores };
  });

  // Assign each word to the chunk with highest positive score
  const assignments = new Array(natWords.length).fill(-1);
  wordScores.forEach((ws, idx) => {
    let maxScore = 0;
    let bestChunk = -1;
    ws.scores.forEach((sc, cIdx) => {
      if (sc > maxScore) {
        maxScore = sc;
        bestChunk = cIdx;
      }
    });
    if (maxScore > 0) {
      assignments[idx] = bestChunk;
    }
  });

  // Grammar refinement: If a word is an adnominal modifier (-는/-하시는/-은/-던)
  // and the preceding word is an object/adverbial (ends with 을/를/에/로/에서),
  // they belong together in the same chunk.
  for (let i = 1; i < natWords.length; i++) {
    const prev = natWords[i - 1];
    const curr = natWords[i];
    const prevHasParticle = /[을를에로과와서]$/.test(cleanStr(prev));
    const currIsModifier = /(는|은|던|인|한|시는|하시는|하는)$/.test(cleanStr(curr));
    if (prevHasParticle && currIsModifier && assignments[i - 1] !== -1) {
      assignments[i] = assignments[i - 1];
    }
  }

  // Fill in unassigned words (-1)
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] === -1) {
      let prevAssigned = -1;
      for (let p = i - 1; p >= 0; p--) {
        if (assignments[p] !== -1) {
          prevAssigned = assignments[p];
          break;
        }
      }
      let nextAssigned = -1;
      for (let n = i + 1; n < assignments.length; n++) {
        if (assignments[n] !== -1) {
          nextAssigned = assignments[n];
          break;
        }
      }

      if (prevAssigned !== -1) {
        assignments[i] = prevAssigned;
      } else if (nextAssigned !== -1) {
        assignments[i] = nextAssigned;
      } else {
        assignments[i] = 0;
      }
    }
  }

  // Collect words for each chunk
  const chunkWords = chunks.map(() => []);
  assignments.forEach((cIdx, wIdx) => {
    chunkWords[cIdx].push(natWords[wIdx]);
  });

  // If any chunk has 0 words, fall back to translatedChunks or existing ko
  const finalChunks = chunkWords.map((words, cIdx) => {
    if (words.length > 0) {
      return words.join(' ');
    }
    if (translatedChunks[cIdx]) {
      return translatedChunks[cIdx];
    }
    const c = chunks[cIdx];
    return typeof c === 'string' ? c : c.ko || c.en || '';
  });

  return finalChunks;
}

module.exports = {
  alignChunksWithNatural
};
