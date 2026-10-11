// scratch/test_align_algorithm.js

// Dictionary of common English-Korean roots for offline/fast alignment
const EN_KO_ROOTS = {
  'hello': ['안녕'],
  'hi': ['안녕'],
  'visitor': ['방문객', '방문자', '손님', '방문'],
  'visitors': ['방문객', '방문자', '여러분', '손님'],
  'cryston': ['크리스톤'],
  'beach': ['비치', '해변', '바닷가', '바다'],
  'to': ['에', '로', '를', '으로', '향하', '방문하'],
  'welcome': ['환영'],
  'thank': ['감사', '고맙'],
  'thanks': ['감사', '고맙'],
  'today': ['오늘'],
  'tomorrow': ['내일'],
  'yesterday': ['어제'],
  'school': ['학교'],
  'student': ['학생'],
  'students': ['학생'],
  'teacher': ['선생', '교사'],
  'book': ['책'],
  'water': ['물'],
  'food': ['음식', '밥'],
  'car': ['차', '자동차'],
  'time': ['시간', '때'],
  'day': ['날', '하루', '일'],
  'people': ['사람', '사람들', '분들'],
  'year': ['년', '해'],
  'years': ['년', '해']
};

function cleanStr(s) {
  return (s || '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();
}

function matchScore(enText, koWord, translatedKoChunk = '') {
  const cleanKo = cleanStr(koWord);
  if (!cleanKo) return 0;

  // 1. Direct match with translated chunk text if available
  if (translatedKoChunk) {
    const cleanTrans = cleanStr(translatedKoChunk);
    if (cleanTrans.includes(cleanKo)) return 10;
    // Check substring of length >= 2
    for (let len = Math.min(cleanKo.length, 4); len >= 2; len--) {
      for (let i = 0; i <= cleanKo.length - len; i++) {
        const sub = cleanKo.substring(i, i + len);
        if (cleanTrans.includes(sub)) return 5 + len;
      }
    }
  }

  // 2. Match with English tokens using phonetic / dictionary roots
  const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
  for (const token of enTokens) {
    // Exact or transliterated match
    const roots = EN_KO_ROOTS[token];
    if (roots) {
      for (const root of roots) {
        if (cleanKo.includes(root)) return 8;
      }
    }
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

  console.log('Word scores:');
  wordScores.forEach(ws => {
    console.log(`Word: "${ws.word}" -> scores:`, ws.scores);
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

  console.log('Initial assignments (unfilled -1):', assignments);

  // Fill in unassigned words (-1)
  // For unassigned words between assigned words, attach to the neighboring chunk
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] === -1) {
      // Look backward for nearest assigned
      let prevAssigned = -1;
      for (let p = i - 1; p >= 0; p--) {
        if (assignments[p] !== -1) {
          prevAssigned = assignments[p];
          break;
        }
      }
      // Look forward for nearest assigned
      let nextAssigned = -1;
      for (let n = i + 1; n < assignments.length; n++) {
        if (assignments[n] !== -1) {
          nextAssigned = assignments[n];
          break;
        }
      }

      if (prevAssigned !== -1 && nextAssigned !== -1) {
        // e.g. prev was 1, next was 0 -> attach to prev or next?
        // Korean modifier before noun: "크리스톤(1) 비치를(1) 방문하시는(?) 방문객(0) 여러분(0)"
        // "방문하시는" modifies "방문객" but belongs semantically to "to Cryston Beach"
        assignments[i] = prevAssigned;
      } else if (prevAssigned !== -1) {
        assignments[i] = prevAssigned;
      } else if (nextAssigned !== -1) {
        assignments[i] = nextAssigned;
      } else {
        assignments[i] = 0;
      }
    }
  }

  console.log('Filled assignments:', assignments);

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

const test1Chunks = ['Hello, visitors', 'to Cryston Beach.'];
const test1Nat = '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.';
const test1Trans = ['안녕하세요 방문객 여러분', '크리스톤 비치로.'];

const res = alignChunksWithNatural(test1Chunks, test1Nat, test1Trans);
console.log('\nFinal aligned chunks:');
res.forEach((r, idx) => console.log(`Chunk ${idx + 1}: "${r}"`));
console.log('Joined with ||:');
console.log(res.join(' || '));
