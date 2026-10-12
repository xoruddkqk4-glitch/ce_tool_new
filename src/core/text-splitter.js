/**
 * Text Splitter Engine
 * Accurately splits text into individual sentences while preserving abbreviations, decimals, and honorifics.
 */

/**
 * Detects whether a string is primarily Korean (Hangul instructions or Korean questions)
 */
export function isKoreanSentence(text) {
  if (!text) return true;
  const hangul = (text.match(/[가-힣]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  // If no Latin letters at all, it's definitely not an English practice sentence
  if (latin === 0) return true;
  // If Hangul characters outnumber Latin letters, it's a Korean sentence
  if (hangul > latin) return true;
  return false;
}

/**
 * Strips Korean question prefixes (e.g. '1번. 남: ') and inline Korean annotations
 * to preserve a clean English practice sentence.
 */
export function cleanPracticeSentence(text) {
  if (!text) return '';
  // Strip speaker indicators like 'M: ', 'W: ', 'Man: ', 'Woman: ', 'Boy: ', 'Girl: ', 'Speaker 1: ', 'A: ', 'B: ', '남: ', '여: '
  let cleaned = text.replace(/^((M(an)?|W(oman)?|Boy|Girl|Speaker\s*\d+|[AB남여])\s*:\s*)/i, '').trim();
  // Strip leading question/speaker indicators like '1번. 남:', '여:', 'W:', 'M:', '[남]'
  // Only when the prefix actually contains Hangul or a bracket — otherwise '20 minutes later' / '3D printers' / '1990 was'
  // lost their leading numbers.
  cleaned = cleaned.replace(/^(?=[^A-Za-z]*[가-힣\[(])[0-9가-힣\s.:,·()\[\]\-]+(?=[A-Za-z])/, '').trim();
  // Strip inline Korean parentheticals e.g. '(해설)', '[안내]'
  cleaned = cleaned.replace(/\([가-힣\s,.:~]+\)/g, '');
  cleaned = cleaned.replace(/\[[가-힣\s,.:~]+\]/g, '');
  // Strip any stray Korean words from inside the English practice sentence
  cleaned = cleaned.replace(/[가-힣]+/g, '');
  // Strip speaker indicators again in case they were preceded by Korean tags
  cleaned = cleaned.replace(/^((M(an)?|W(oman)?|Boy|Girl|Speaker\s*\d+|[AB남여])\s*:\s*)/i, '').trim();
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

export function splitIntoSentences(text, options = {}) {
  if (!text) return [];
  const filterKorean = options.filterKorean !== false;
  const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie', 'u.s', 'e.g', 'i.e', 'a.m', 'p.m', 'st', 'mt', 'approx'];
  let processed = text.replace(/\.{2,}/g, '__ELLIPSIS__');
  processed = processed.replace(/(\d+)\.(\d+)/g, '$1__DECIMAL_DOT__$2');
  abbreviations.forEach(abbr => {
    // Escape EVERY dot (previously only the first one was escaped)
    const re = new RegExp('\\b' + abbr.replace(/\./g, '\\.') + '\\.', 'gi');
    processed = processed.replace(re, match => match.slice(0, -1) + '__ABBR_DOT__');
  });
  // Also split after a closing quote/paren that follows the terminator: `He said, "Hi." Then...`
  const parts = processed.split(/(?<=[.?!]["'”’)]?)\s+|\n+/);
  return parts
    .map(p => p.replace(/__ELLIPSIS__/g, '...').replace(/__DECIMAL_DOT__/g, '.').replace(/__ABBR_DOT__/g, '.').trim())
    .map(p => cleanPracticeSentence(p))
    .filter(Boolean)
    .filter(p => !filterKorean || !isKoreanSentence(p));
}

/**
 * Resiliently partitions flat chunks across split sentences,
 * ensuring S1 never contains chunks from S2 or S3.
 */
export function distributeChunksSequentially(rawSentences, chunks) {
  if (!rawSentences || !rawSentences.length) return [];
  if (!chunks || !chunks.length) return rawSentences.map(() => []);

  const clean = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  let currentStnIdx = 0;
  const result = rawSentences.map(() => []);

  for (const chunk of chunks) {
    const chunkEnClean = clean(chunk.en);
    if (!chunkEnClean) continue;

    let foundIdx = -1;

    // First try: Verbatim check in sentences starting from currentStnIdx
    for (let i = currentStnIdx; i < rawSentences.length; i++) {
      const stnClean = clean(rawSentences[i]);
      if (stnClean.includes(chunkEnClean)) {
        foundIdx = i;
        break;
      }
    }

    // Second try: Keyword / word-level match if punctuation differs
    if (foundIdx === -1) {
      const chunkWords = chunkEnClean.split(' ').map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 1);
      for (let i = currentStnIdx; i < rawSentences.length; i++) {
        const stnWords = clean(rawSentences[i]).split(' ').map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean);
        const matchCount = chunkWords.filter(w => stnWords.includes(w)).length;
        if (matchCount > 0 && matchCount >= Math.min(2, chunkWords.length)) {
          foundIdx = i;
          break;
        }
      }
    }

    if (foundIdx !== -1) {
      currentStnIdx = foundIdx;
      result[currentStnIdx].push(chunk);
    } else {
      if (currentStnIdx < rawSentences.length) {
        result[currentStnIdx].push(chunk);
      } else {
        result[rawSentences.length - 1].push(chunk);
      }
    }
  }

  return result;
}

