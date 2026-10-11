// scratch/test_chunk_harmonizer.js

function cleanKoToken(token) {
  return token.replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();
}

function getSubstrings(str) {
  const s = cleanKoToken(str);
  const subs = new Set();
  for (let len = 2; len <= s.length; len++) {
    for (let i = 0; i <= s.length - len; i++) {
      subs.add(s.substring(i, i + len));
    }
  }
  return subs;
}

function calculateWordMatchScore(word, targetChunkText) {
  const cleanWord = cleanKoToken(word);
  const cleanTarget = cleanKoToken(targetChunkText);
  if (!cleanWord || !cleanTarget) return 0;

  if (cleanTarget.includes(cleanWord)) return 1.0;

  // Check stem overlap (2+ chars)
  const wordSubs = getSubstrings(cleanWord);
  let best = 0;
  for (const sub of wordSubs) {
    if (cleanTarget.includes(sub)) {
      const score = sub.length / Math.max(cleanWord.length, 2);
      if (score > best) best = score;
    }
  }
  return best;
}

function harmonizeChunkTranslationsWithNatural(cleanChunks, translatedChunks, naturalText) {
  if (!cleanChunks || !cleanChunks.length) return [];
  if (cleanChunks.length === 1) return [naturalText.trim()];

  const natWords = naturalText.trim().split(/\s+/).filter(Boolean);
  if (!natWords.length) return translatedChunks;

  // Score each natural word against each translated chunk
  const wordAssignments = natWords.map((word, wordIdx) => {
    let bestChunkIdx = -1;
    let bestScore = 0;

    translatedChunks.forEach((trans, cIdx) => {
      const score = calculateWordMatchScore(word, trans);
      if (score > bestScore) {
        bestScore = score;
        bestChunkIdx = cIdx;
      }
    });

    return { word, wordIdx, bestChunkIdx, bestScore };
  });

  // Assign unassigned or low score words to neighboring assigned words
  // Forward pass
  let lastAssigned = 0;
  for (let i = 0; i < wordAssignments.length; i++) {
    if (wordAssignments[i].bestScore >= 0.4) {
      lastAssigned = wordAssignments[i].bestChunkIdx;
    } else {
      wordAssignments[i].candidateChunk = lastAssigned;
    }
  }
  // Backward pass to check if it belongs to the following chunk
  let nextAssigned = cleanChunks.length - 1;
  for (let i = wordAssignments.length - 1; i >= 0; i--) {
    if (wordAssignments[i].bestScore >= 0.4) {
      nextAssigned = wordAssignments[i].bestChunkIdx;
    } else {
      // If forward and backward differ, see which chunk's English has similar preposition/relative
      wordAssignments[i].bestChunkIdx = wordAssignments[i].candidateChunk ?? nextAssigned;
    }
  }

  // Final chunk groupings
  const chunkWords = cleanChunks.map(() => []);
  wordAssignments.forEach((wa) => {
    const targetIdx = wa.bestScore >= 0.4 ? wa.bestChunkIdx : (wa.candidateChunk ?? 0);
    const validIdx = Math.max(0, Math.min(cleanChunks.length - 1, targetIdx));
    chunkWords[validIdx].push(wa.word);
  });

  // Check if any chunk ended up empty. If so, fall back to translatedChunk for that chunk
  const result = chunkWords.map((words, i) => {
    if (!words.length) {
      return translatedChunks[i] || '';
    }
    return words.join(' ').trim();
  });

  return result;
}

// Test cases
const test1 = {
  chunks: ['Hello, visitors', 'to Cryston Beach.'],
  translated: ['안녕하세요 방문객 여러분', '크리스톤 비치로.'],
  natural: '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.'
};

console.log('Test 1 Harmonized:', harmonizeChunkTranslationsWithNatural(test1.chunks, test1.translated, test1.natural));
