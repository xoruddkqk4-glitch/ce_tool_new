/**
 * CE Tool - 3-Page Multi-Input AI Chunk & FELS Weak-Form Listening Trainer
 * Standalone Zero-CORS Distribution Bundle (Compatible with file:/// and http://)
 * Generated from modular src/ package
 */

(function () {
  'use strict';

  // =========================================================================
  // Module: src/config/constants.js
  // =========================================================================

/**
 * Global Constants & Configurations for CE Tool
 */

const CONSTANTS = {
  // Waveform display
  TOTAL_WAVEFORM_BARS: 360,
  
  // Looper & Shadowing
  SHADOWING_PAUSE_MS: 500, // 0.5s pause between loop repeats
  DEFAULT_REPEAT_COUNT: 3,
  
  // Fallback realistic speech timing
  SPEECH_WORD_DURATION_SEC: 0.40,
  SPEECH_BOUNDARY_MARGIN_SEC: 0.60,
  
  // Storage keys
  STORAGE_KEYS: {
    API_CONFIG: 'ce_tool_api_config',
    THEME: 'ce_tool_theme',
    CUSTOM_PROMPT: 'ce_tool_custom_prompt'
  },
  
  // Supported Gemini candidate models in priority order
  GEMINI_CANDIDATE_MODELS: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro'
  ]
};

  // =========================================================================
  // Module: src/config/fels-dict.js
  // =========================================================================

/**
 * FELS (Function-Embedded Listening Skills) Categories, Vocabulary & Grammar Dictionary
 */

const FELS_CATEGORIES = {
  articles: {
    label: '관사',
    words: new Set(['a', 'an', 'the'])
  },
  prepositions: {
    label: '전치사',
    words: new Set([
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'into',
      'about', 'through', 'under', 'over', 'between', 'after', 'before',
      'during', 'without', 'against', 'towards', 'onto', 'upon', 'within'
    ])
  },
  pronouns: {
    label: '대명사',
    words: new Set([
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine',
      'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those',
      'who', 'whom', 'whose', 'what', 'which', 'something', 'anything',
      'nothing', 'someone', 'anyone', 'no one', 'another'
    ])
  },
  auxiliary: {
    label: 'Be/조동사',
    words: new Set([
      'am', 'is', 'are', 'was', 'were', 'been', 'being', 'be', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
      'should', 'can', 'could', 'may', 'might', 'must'
    ])
  },
  conjunctions: {
    label: '접속사',
    words: new Set([
      'and', 'but', 'or', 'so', 'because', 'if', 'when', 'while',
      'that', 'as', 'than', 'since', 'although', 'though', 'unless'
    ])
  },
  negatives: {
    label: '부정어',
    words: new Set(['not', 'no'])
  },
  contractions: {
    label: '축약형',
    words: new Set([
      "i'm", "you're", "he's", "she's", "it's", "we're", "they're",
      "don't", "doesn't", "didn't", "can't", "couldn't", "won't",
      "wouldn't", "isn't", "aren't", "wasn't", "weren't", "haven't",
      "hasn't", "hadn't", "there's", "let's", "that's", "what's", "who's"
    ])
  }
};

const FELS_ALL_SET = new Set();
Object.values(FELS_CATEGORIES).forEach(cat => {
  cat.words.forEach(w => FELS_ALL_SET.add(w));
});

function getFelsInfo(rawToken) {
  if (!rawToken) return null;
  const clean = rawToken.toLowerCase().replace(/[^a-z']/g, '');
  if (FELS_ALL_SET.has(clean)) {
    for (const [key, cat] of Object.entries(FELS_CATEGORIES)) {
      if (cat.words.has(clean)) {
        return { key, label: cat.label, clean };
      }
    }
  }
  return null;
}

const PRONOUNS = {
  'i': { subj: '나는', obj: '나를', poss: '나의' },
  'you': { subj: '당신은', obj: '당신을', poss: '당신의' },
  'he': { subj: '그는', obj: '그를', poss: '그의' },
  'she': { subj: '그녀는', obj: '그녀를', poss: '그녀의' },
  'it': { subj: '그것은', obj: '그것을', poss: '그것의' },
  'we': { subj: '우리는', obj: '우리를', poss: '우리의' },
  'they': { subj: '그들은', obj: '그들을', poss: '그들의' },
  'this': { subj: '이것은', obj: '이것을', poss: '이것의' },
  'that': { subj: '저것은', obj: '저것을', poss: '저것의' }
};

const PREPOSITIONS = {
  'to': { label: '~에/~(으)로', particle: '에' },
  'in': { label: '~안에/~에서', particle: '에서' },
  'at': { label: '~에서', particle: '에서' },
  'on': { label: '~위에', particle: '위에' },
  'under': { label: '~밑에', particle: '밑에서' },
  'for': { label: '~을 위해', particle: '을 위해' },
  'with': { label: '~와 함께', particle: '와 함께' },
  'without': { label: '~없이', particle: '없이' },
  'by': { label: '~에 의해/~옆에', particle: '에 의해' },
  'from': { label: '~로부터', particle: '로부터' },
  'about': { label: '~에 대해', particle: '에 대해' },
  'into': { label: '~속으로', particle: '속으로' },
  'after': { label: '~후에', particle: '후에' },
  'before': { label: '~전에', particle: '전에' },
  'during': { label: '~동안', particle: '동안' },
  'over': { label: '~너머로', particle: '너머로' }
};

const ADVERBS = {
  'yesterday': '어제',
  'today': '오늘',
  'tomorrow': '내일',
  'now': '지금',
  'then': '그때',
  'peacefully': '평화롭게',
  'slowly': '천천히',
  'fast': '빠르게',
  'quickly': '신속하게',
  'carefully': '조심스럽게',
  'happily': '행복하게',
  'always': '항상',
  'often': '자주',
  'usually': '보통',
  'never': '결코',
  'very': '매우',
  'well': '잘',
  'hard': '열심히'
};

const DICTIONARY = {
  'school': '학교',
  'shcool': '학교',
  'bookstore': '서점',
  'library': '도서관',
  'park': '공원',
  'hospital': '병원',
  'station': '역',
  'airport': '공항',
  'store': '가게',
  'market': '시장',
  'office': '사무실',
  'home': '집',
  'room': '방',
  'table': '테이블',
  'desk': '책상',
  'chair': '의자',
  'book': '책',
  'books': '책들',
  'laptop': '노트북',
  'computer': '컴퓨터',
  'phone': '전화기',
  'letter': '편지',
  'music': '음악',
  'movie': '영화',
  'coffee': '커피',
  'water': '물',
  'apple': '사과',
  'food': '음식',
  'dinner': '저녁 식사',
  'lunch': '점심',
  'breakfast': '아침 식사',
  'cat': '고양이',
  'dog': '강아지',
  'bird': '새',
  'boy': '소년',
  'girl': '소녀',
  'student': '학생',
  'teacher': '선생님',
  'friend': '친구',
  'brother': '형제',
  'sister': '자매',
  'father': '아버지',
  'mother': '어머니',
  'english': '영어',
  'korean': '한국어',
  'career': '진로/직업',
  'future': '미래',
  'mind': '마음',
  'heart': '마음',
  'health': '건강',
  'work': '일/근무',
  'rest': '휴식',
  'walk': '산책',
  'money': '돈',
  'time': '시간',
  'day': '날/하루',
  'problem': '문제',
  'question': '질문',
  'answer': '답변',
  'new': '새로운',
  'old': '오래된',
  'good': '좋은',
  'bad': '나쁜',
  'big': '큰',
  'small': '작은',
  'hot': '뜨거운',
  'cold': '차가운',
  'wooden': '나무',
  'beautiful': '아름다운',
  'smart': '똑똑한',
  'hard': '어려운/열심히'
};

const VERB_MAP = {
  'go': { base: '가다', past: '갔다', pres: '간다', gerund: '가는 것' },
  'went': { base: '가다', past: '갔다', pres: '간다', gerund: '가는 것' },
  'gone': { base: '가다', past: '갔다', pres: '간다', gerund: '가는 것' },
  'buy': { base: '사다', past: '샀다', pres: '산다', gerund: '사는 것' },
  'bought': { base: '사다', past: '샀다', pres: '산다', gerund: '사는 것' },
  'want': { base: '원하다', past: '원했다', pres: '원한다', gerund: '원하는 것' },
  'wants': { base: '원하다', past: '원했다', pres: '원한다', gerund: '원하는 것' },
  'wanted': { base: '원하다', past: '원했다', pres: '원한다', gerund: '원하는 것' },
  'learn': { base: '배우다', past: '배웠다', pres: '배운다', gerund: '배우는 것' },
  'learned': { base: '배우다', past: '배웠다', pres: '배운다', gerund: '배우는 것' },
  'sleep': { base: '자다', past: '잤다', pres: '잔다', gerund: '자는 것' },
  'slept': { base: '자다', past: '잤다', pres: '잔다', gerund: '자는 것' },
  'sleeping': { base: '자다', past: '잤다', pres: '자고 있다', gerund: '자는 것' },
  'eat': { base: '먹다', past: '먹었다', pres: '먹는다', gerund: '먹는 것' },
  'ate': { base: '먹다', past: '먹었다', pres: '먹는다', gerund: '먹는 것' },
  'eaten': { base: '먹다', past: '먹었다', pres: '먹는다', gerund: '먹는 것' },
  'see': { base: '보다', past: '봤다', pres: '본다', gerund: '보는 것' },
  'saw': { base: '보다', past: '봤다', pres: '본다', gerund: '보는 것' },
  'seen': { base: '보다', past: '봤다', pres: '본다', gerund: '보는 것' },
  'read': { base: '읽다', past: '읽었다', pres: '읽는다', gerund: '읽는 것' },
  'write': { base: '쓰다', past: '썼다', pres: '쓴다', gerund: '쓰는 것' },
  'wrote': { base: '쓰다', past: '썼다', pres: '쓴다', gerund: '쓰는 것' },
  'study': { base: '공부하다', past: '공부했다', pres: '공부한다', gerund: '공부하는 것' },
  'studied': { base: '공부하다', past: '공부했다', pres: '공부한다', gerund: '공부하는 것' },
  'help': { base: '돕다', past: '도왔다', pres: '도움이 된다', gerund: '돕는 것' },
  'helps': { base: '돕다', past: '도왔다', pres: '도움이 된다', gerund: '돕는 것' },
  'helped': { base: '돕다', past: '도왔다', pres: '도왔다', gerund: '도운 것' },
  'refresh': { base: '상쾌하게 하다', past: '상쾌하게 했다', pres: '상쾌하게 만든다', gerund: '상쾌하게 하는 것' },
  'take': { base: '취하다/가지다', past: '취했다', pres: '취한다', gerund: '취하는 것' },
  'taking': { base: '취하다', past: '취했다', pres: '취하고 있다', gerund: '취하는 것' },
  'make': { base: '만들다', past: '만들었다', pres: '만든다', gerund: '만드는 것' },
  'makes': { base: '만들다', past: '만들었다', pres: '만든다', gerund: '만드는 것' },
  'like': { base: '좋아하다', past: '좋아했다', pres: '좋아한다', gerund: '좋아하는 것' },
  'likes': { base: '좋아하다', past: '좋아했다', pres: '좋아한다', gerund: '좋아하는 것' },
  'live': { base: '살다', past: '살았다', pres: '산다', gerund: '사는 것' },
  'lived': { base: '살다', past: '살았다', pres: '산다', gerund: '사는 것' }
};

const PRESETS = {
  'i went to school.': {
    natural: '나는 학교에 갔다.',
    chunk_text: '나는 || 갔다 || 학교에',
    chunks: [
      { en: 'I', ko: '나는' },
      { en: 'went', ko: '갔다' },
      { en: 'to school', ko: '학교에' }
    ]
  },
  'i went to shcool.': {
    natural: '나는 학교에 갔다.',
    chunk_text: '나는 || 갔다 || 학교에',
    chunks: [
      { en: 'I', ko: '나는' },
      { en: 'went', ko: '갔다' },
      { en: 'to shcool', ko: '학교에' }
    ]
  },
  'she bought a new book at the bookstore yesterday.': {
    natural: '그녀는 어제 서점에서 새 책을 샀다.',
    chunk_text: '그녀는 || 샀다 || 새 책을 || 서점에서 || 어제',
    chunks: [
      { en: 'She', ko: '그녀는' },
      { en: 'bought', ko: '샀다' },
      { en: 'a new book', ko: '새 책을' },
      { en: 'at the bookstore', ko: '서점에서' },
      { en: 'yesterday', ko: '어제' }
    ]
  },
  'he wants to learn english for his future career.': {
    natural: '그는 그의 미래 진로를 위해 영어를 배우기를 원한다.',
    chunk_text: '그는 || 원한다 || 영어를 배우는 것을 || 그의 미래 진로를 위해',
    chunks: [
      { en: 'He', ko: '그는' },
      { en: 'wants', ko: '원한다' },
      { en: 'to learn English', ko: '영어를 배우는 것을' },
      { en: 'for his future career', ko: '그의 미래 진로를 위해' }
    ]
  },
  'taking a rest after work helps refresh your mind.': {
    natural: '퇴근 후 휴식을 취하는 것은 당신의 마음을 상쾌하게 하는 데 도움이 된다.',
    chunk_text: '휴식을 취하는 것은 || 퇴근 후에 || 도움이 된다 || 당신의 마음을 상쾌하게 하는 데',
    chunks: [
      { en: 'Taking a rest', ko: '휴식을 취하는 것은' },
      { en: 'after work', ko: '퇴근 후에' },
      { en: 'helps', ko: '도움이 된다' },
      { en: 'refresh your mind', ko: '당신의 마음을 상쾌하게 하는 데' }
    ]
  },
  'the cat is sleeping peacefully under the wooden table.': {
    natural: '그 고양이는 나무 테이블 밑에서 평화롭게 자고 있다.',
    chunk_text: '그 고양이는 || 평화롭게 자고 있다 || 나무 테이블 밑에서',
    chunks: [
      { en: 'The cat', ko: '그 고양이는' },
      { en: 'is sleeping peacefully', ko: '평화롭게 자고 있다' },
      { en: 'under the wooden table', ko: '나무 테이블 밑에서' }
    ]
  }
};

  // =========================================================================
  // Module: src/core/text-splitter.js
  // =========================================================================

/**
 * Text Splitter Engine
 * Accurately splits text into individual sentences while preserving abbreviations, decimals, and honorifics.
 */

function splitIntoSentences(text) {
  if (!text) return [];
  const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie', 'u.s', 'e.g', 'i.e'];
  let processed = text.replace(/\.{2,}/g, '__ELLIPSIS__');
  processed = processed.replace(/(\d+)\.(\d+)/g, '$1__DECIMAL_DOT__$2');
  abbreviations.forEach(abbr => {
    const re = new RegExp('\\b' + abbr.replace('.', '\\.') + '\\.', 'gi');
    processed = processed.replace(re, match => match.slice(0, -1) + '__ABBR_DOT__');
  });
  const parts = processed.split(/(?<=[.?!])\s+|\n+/);
  return parts
    .map(p => p.replace(/__ELLIPSIS__/g, '...').replace(/__DECIMAL_DOT__/g, '.').replace(/__ABBR_DOT__/g, '.').trim())
    .filter(Boolean);
}

/**
 * Resiliently partitions flat chunks across split sentences,
 * ensuring S1 never contains chunks from S2 or S3.
 */
function distributeChunksSequentially(rawSentences, chunks) {
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

  // =========================================================================
  // Module: src/core/fels-engine.js
  // =========================================================================

/**
 * FELS (Function-Embedded Listening Skills) Processing Engine
 * Identifies 7 function word categories, uniform blank sizing, and answer verification.
 */



function calculateUniformBlankWidth(chunks) {
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

function parseTokenPunctuation(token) {
  const match = token.match(/^(.*?)([.,!?;:]*)$/);
  const base = match ? match[1] : token;
  const punct = match ? match[2] : '';
  const clean = base.toLowerCase().replace(/[^a-z']/g, '');
  return { base, punct, clean };
}

function verifyAnswer(userVal, expectedWord) {
  const normUser = (userVal || '').trim().toLowerCase();
  const normExp = (expectedWord || '').trim().toLowerCase();
  return normUser === normExp;
}

  // =========================================================================
  // Module: src/core/rule-chunk-engine.js
  // =========================================================================

/**
 * Intelligent Rule-Based Local Chunking & Translation Engine
 * Operates offline without external API dependencies.
 */



class RuleChunkEngine {
  constructor() {}

  process(rawInput) {
    const cleanInput = rawInput.trim();
    const lower = cleanInput.toLowerCase().replace(/[.,!?;:]+$/, '').trim();

    const fullKey = cleanInput.toLowerCase().trim();
    if (PRESETS[fullKey]) return PRESETS[fullKey];
    if (PRESETS[lower + '.']) return PRESETS[lower + '.'];

    return this.parseAndSynthesize(cleanInput);
  }

  parseAndSynthesize(text) {
    const punctuationMatch = text.match(/[.!?]+$/);
    const punct = punctuationMatch ? punctuationMatch[0] : '.';
    const sentence = text.replace(/[.!?]+$/, '').trim();

    const words = sentence.split(/\s+/);
    const chunks = [];
    let i = 0;

    // 1. Extract Subject Chunk
    const subjChunk = this.extractSubject(words, i);
    if (subjChunk) {
      chunks.push(subjChunk);
      i = subjChunk.nextIndex;
    }

    // 2. Parse Remaining Chunks
    while (i < words.length) {
      const word = words[i].toLowerCase();

      // To-Infinitive
      if (word === 'to' && i + 1 < words.length && this.isVerb(words[i + 1])) {
        const toInfChunk = this.extractToInfinitive(words, i);
        chunks.push(toInfChunk);
        i = toInfChunk.nextIndex;
        continue;
      }

      // Prepositional Phrase
      if (PREPOSITIONS[word]) {
        const prepChunk = this.extractPrepositionalPhrase(words, i);
        chunks.push(prepChunk);
        i = prepChunk.nextIndex;
        continue;
      }

      // Adverb
      if (ADVERBS[word]) {
        chunks.push({
          en: words[i],
          ko: ADVERBS[word],
          type: 'adverb'
        });
        i++;
        continue;
      }

      // Verb phrase
      if (this.isVerb(word) || this.isAuxiliary(word)) {
        const verbChunk = this.extractVerbPhrase(words, i);
        chunks.push(verbChunk);
        i = verbChunk.nextIndex;
        continue;
      }

      // Object or Noun phrase
      const objChunk = this.extractNounPhrase(words, i);
      chunks.push(objChunk);
      i = objChunk.nextIndex;
    }

    const natural = this.synthesizeNaturalKorean(chunks, punct);
    const chunk_text = chunks.map(c => c.ko).join(' || ');

    return {
      natural,
      chunk_text,
      chunks
    };
  }

  extractSubject(words, startIndex) {
    if (startIndex >= words.length) return null;
    const w0 = words[startIndex].toLowerCase();

    if (PRONOUNS[w0]) {
      return {
        en: words[startIndex],
        ko: PRONOUNS[w0].subj,
        type: 'subject',
        nextIndex: startIndex + 1
      };
    }

    if (w0.endsWith('ing') && this.isVerb(w0.slice(0, -3)) || VERB_MAP[w0]) {
      let endIndex = startIndex + 1;
      while (endIndex < words.length && !this.isMainVerb(words[endIndex])) {
        endIndex++;
      }
      const phrase = words.slice(startIndex, endIndex).join(' ');
      const trans = this.translatePhrase(phrase) + '은';
      return {
        en: phrase,
        ko: trans,
        type: 'subject',
        nextIndex: endIndex
      };
    }

    if (['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their'].includes(w0)) {
      let endIndex = startIndex + 1;
      while (endIndex < words.length && !this.isVerb(words[endIndex]) && !this.isAuxiliary(words[endIndex])) {
        endIndex++;
        if (endIndex - startIndex >= 3) break;
      }
      const phrase = words.slice(startIndex, endIndex).join(' ');
      const trans = this.translateNounPhrase(phrase, '은/는');
      return {
        en: phrase,
        ko: trans,
        type: 'subject',
        nextIndex: endIndex
      };
    }

    const nounTrans = this.translateWord(w0);
    return {
      en: words[startIndex],
      ko: this.attachParticle(nounTrans, '은/는'),
      type: 'subject',
      nextIndex: startIndex + 1
    };
  }

  extractVerbPhrase(words, startIndex) {
    let endIndex = startIndex + 1;
    const first = words[startIndex].toLowerCase();

    if (['is', 'am', 'are', 'was', 'were'].includes(first)) {
      if (endIndex < words.length && words[endIndex].toLowerCase().endsWith('ing')) {
        endIndex++;
        if (endIndex < words.length && ADVERBS[words[endIndex].toLowerCase()]) {
          endIndex++;
        }
      }
    } else if (['can', 'could', 'will', 'would', 'should', 'must', 'may'].includes(first)) {
      if (endIndex < words.length) endIndex++;
    }

    const phrase = words.slice(startIndex, endIndex).join(' ');
    const ko = this.translateVerbPhrase(phrase);

    return {
      en: phrase,
      ko: ko,
      type: 'verb',
      nextIndex: endIndex
    };
  }

  extractToInfinitive(words, startIndex) {
    let endIndex = startIndex + 2;
    while (endIndex < words.length && !PREPOSITIONS[words[endIndex].toLowerCase()] && !ADVERBS[words[endIndex].toLowerCase()]) {
      endIndex++;
    }
    const phrase = words.slice(startIndex, endIndex).join(' ');
    const action = words.slice(startIndex + 1, endIndex).join(' ');
    const ko = this.translatePhrase(action) + '는 것을';

    return {
      en: phrase,
      ko: ko,
      type: 'infinitive',
      nextIndex: endIndex
    };
  }

  extractPrepositionalPhrase(words, startIndex) {
    const prep = words[startIndex].toLowerCase();
    let endIndex = startIndex + 1;

    while (endIndex < words.length && !this.isVerb(words[endIndex]) && !PREPOSITIONS[words[endIndex].toLowerCase()] && !ADVERBS[words[endIndex].toLowerCase()]) {
      endIndex++;
    }

    const phrase = words.slice(startIndex, endIndex).join(' ');
    const body = words.slice(startIndex + 1, endIndex).join(' ');
    const bodyTrans = this.translatePhrase(body);
    const prepInfo = PREPOSITIONS[prep] || { particle: '에' };

    let ko = '';
    if (prep === 'under') {
      ko = `${bodyTrans} 밑에서`;
    } else if (prep === 'for') {
      ko = `${bodyTrans}을 위해`;
    } else if (prep === 'with') {
      ko = `${bodyTrans}와 함께`;
    } else if (prep === 'to') {
      ko = `${bodyTrans}에`;
    } else {
      ko = `${bodyTrans}${prepInfo.particle}`;
    }

    return {
      en: phrase,
      ko: ko,
      type: 'prepositional',
      nextIndex: endIndex
    };
  }

  extractNounPhrase(words, startIndex) {
    let endIndex = startIndex + 1;
    while (endIndex < words.length && !PREPOSITIONS[words[endIndex].toLowerCase()] && !ADVERBS[words[endIndex].toLowerCase()]) {
      endIndex++;
    }
    const phrase = words.slice(startIndex, endIndex).join(' ');
    const trans = this.translateNounPhrase(phrase, '을/를');

    return {
      en: phrase,
      ko: trans,
      type: 'object',
      nextIndex: endIndex
    };
  }

  translateNounPhrase(phrase, particleType) {
    const tokens = phrase.split(/\s+/);
    const translatedParts = [];

    for (let t of tokens) {
      const lower = t.toLowerCase();
      if (['the', 'a', 'an'].includes(lower)) continue;
      if (PRONOUNS[lower]) {
        translatedParts.push(PRONOUNS[lower].poss);
      } else if (DICTIONARY[lower]) {
        translatedParts.push(DICTIONARY[lower]);
      } else {
        translatedParts.push(t);
      }
    }

    const joined = translatedParts.join(' ');
    return this.attachParticle(joined, particleType);
  }

  translateVerbPhrase(phrase) {
    const lower = phrase.toLowerCase();
    if (lower === 'went') return '갔다';
    if (lower === 'bought') return '샀다';
    if (lower === 'wants') return '원한다';
    if (lower === 'helps') return '도움이 된다';
    if (lower === 'is sleeping peacefully') return '평화롭게 자고 있다';

    const words = lower.split(/\s+/);
    for (let w of words) {
      if (VERB_MAP[w]) {
        return VERB_MAP[w].past || VERB_MAP[w].pres || VERB_MAP[w].base;
      }
    }
    return phrase + '하다';
  }

  translateChunkText(phrase) {
    if (!phrase) return '';
    return this.translatePhrase(phrase);
  }

  translatePhrase(phrase) {
    const tokens = phrase.split(/\s+/);
    const parts = tokens.map(t => {
      const l = t.toLowerCase();
      if (['the', 'a', 'an'].includes(l)) return '';
      if (DICTIONARY[l]) return DICTIONARY[l];
      if (VERB_MAP[l]) return VERB_MAP[l].base.replace(/다$/, '');
      if (PRONOUNS[l]) return PRONOUNS[l].poss;
      return t;
    }).filter(Boolean);

    return parts.join(' ');
  }

  translateWord(w) {
    const lower = w.toLowerCase();
    return DICTIONARY[lower] || w;
  }

  isVerb(w) {
    const lower = w.toLowerCase();
    return !!VERB_MAP[lower] || ['is', 'are', 'was', 'were', 'am'].includes(lower);
  }

  isMainVerb(w) {
    const lower = w.toLowerCase();
    return ['helps', 'makes', 'is', 'are', 'was', 'went', 'bought', 'wants'].includes(lower);
  }

  isAuxiliary(w) {
    const lower = w.toLowerCase();
    return ['can', 'could', 'will', 'would', 'should', 'must', 'may'].includes(lower);
  }

  attachParticle(word, particlePair) {
    if (!word) return '';
    const lastChar = word[word.length - 1];
    const code = lastChar.charCodeAt(0);
    const hasBatchim = (code >= 0xac00 && code <= 0xd7a3) ? (code - 0xac00) % 28 > 0 : false;

    if (particlePair === '은/는') {
      return hasBatchim ? `${word}은` : `${word}는`;
    }
    if (particlePair === '이/가') {
      return hasBatchim ? `${word}이` : `${word}가`;
    }
    if (particlePair === '을/를') {
      return hasBatchim ? `${word}을` : `${word}를`;
    }
    return word;
  }

  synthesizeNaturalKorean(chunks, punct) {
    const subjects = chunks.filter(c => c.type === 'subject');
    const adverbs = chunks.filter(c => c.type === 'adverb');
    const preps = chunks.filter(c => c.type === 'prepositional');
    const objects = chunks.filter(c => c.type === 'object' || c.type === 'infinitive');
    const verbs = chunks.filter(c => c.type === 'verb');
    const others = chunks.filter(c => !['subject', 'adverb', 'prepositional', 'object', 'infinitive', 'verb'].includes(c.type));

    const reordered = [
      ...subjects.map(c => c.ko),
      ...adverbs.map(c => c.ko),
      ...preps.map(c => c.ko),
      ...objects.map(c => c.ko),
      ...others.map(c => c.ko),
      ...verbs.map(c => c.ko)
    ];

    let sentence = reordered.join(' ').trim();
    if (!sentence.endsWith('.') && !sentence.endsWith('!') && !sentence.endsWith('?')) {
      sentence += punct;
    }
    return sentence;
  }
}

  // =========================================================================
  // Module: src/core/app-state.js
  // =========================================================================

/**
 * Centralized Application State (AppState)
 * Shared across Page 1 (Input), Page 2 (Practice), and Page 3 (Memorization).
 * Preserves Web Audio Context, decoded audio buffer, and sentence structures without reload.
 */

class AppState {
  constructor() {
    this.listeners = new Map();

    // Input mode: 'both' | 'audio' | 'text'
    this.currentMode = 'text';

    // Audio & Web Audio
    this.uploadedAudioFile = null;
    this.uploadedAudioUrl = null;
    this.audioBuffer = null;
    this.isSynthesizedAudio = false;
    this.synthesizedWavBlob = null;
    this.playbackSpeed = 1.0;

    // Script & Sentence classification
    this.scriptText = '';
    this.sentenceList = [];
    this.activeSentenceIndex = 0;

    // A-B Looper & Shadowing
    this.loopStart = null;
    this.loopEnd = null;
    this.targetLoopCount = 3;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.isAutoAdvance = false;

    // Practice View Card State
    this.isFelsMode = true; // true: blanks, false: original english
    this.areAllCardsFlipped = false;
    this.felsBlanks = [];
    this.naturalVisible = false; // default false

    // Memorization View State
    this.memorizeMode = 'all'; // 'all' | 'en' | 'ko' | 'cloze'
    this.isMemorizePlaying = false;
    this.memorizeAllFlipped = false;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event).filter(h => h !== handler);
    this.listeners.set(event, list);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  setUploadMode(mode) {
    this.currentMode = mode;
    this.emit('modeChanged', mode);
  }

  setSentenceList(list) {
    this.sentenceList = list || [];
    this.activeSentenceIndex = 0;
    this.clearLoop();
    this.emit('sentencesLoaded', this.sentenceList);
  }

  setActiveSentenceIndex(idx) {
    if (idx < 0 || idx >= this.sentenceList.length) return;
    this.activeSentenceIndex = idx;
    this.clearLoop();
    this.emit('activeSentenceChanged', {
      index: idx,
      sentence: this.sentenceList[idx]
    });
  }

  getActiveSentence() {
    if (!this.sentenceList || this.sentenceList.length === 0) return null;
    return this.sentenceList[this.activeSentenceIndex] || null;
  }

  setLoopRange(start, end) {
    this.loopStart = start;
    this.loopEnd = end;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.emit('loopChanged', { start, end, count: this.targetLoopCount });
  }

  clearLoop() {
    this.loopStart = null;
    this.loopEnd = null;
    this.currentLoopCount = 0;
    this.isShadowingWaiting = false;
    this.emit('loopChanged', { start: null, end: null, count: this.targetLoopCount });
  }

  resetAll() {
    this.uploadedAudioFile = null;
    if (this.uploadedAudioUrl) {
      URL.revokeObjectURL(this.uploadedAudioUrl);
      this.uploadedAudioUrl = null;
    }
    this.audioBuffer = null;
    this.isSynthesizedAudio = false;
    this.synthesizedWavBlob = null;
    this.scriptText = '';
    this.sentenceList = [];
    this.activeSentenceIndex = 0;
    this.clearLoop();
    this.emit('reset');
  }
}

// Global Singleton Instance
const appState = new AppState();

  // =========================================================================
  // Module: src/services/storage-service.js
  // =========================================================================

/**
 * Local Storage Service for CE Tool
 * Handles API provider, keys, custom prompt, and theme persistence.
 */

class StorageService {
  static getProvider() {
    return localStorage.getItem('ce_tool_provider') || localStorage.getItem('chunklingo_provider') || 'gemini';
  }

  static getApiKey() {
    return localStorage.getItem('ce_tool_api_key') || localStorage.getItem('chunklingo_api_key') || '';
  }

  static getCustomPrompt() {
    return localStorage.getItem('ce_tool_prompt') || localStorage.getItem('chunklingo_prompt') || '';
  }

  static saveApiSettings(provider, apiKey, customPrompt) {
    localStorage.setItem('ce_tool_provider', provider);
    localStorage.setItem('ce_tool_api_key', apiKey);
    localStorage.setItem('ce_tool_prompt', customPrompt);
    // Backward compatibility
    localStorage.setItem('chunklingo_provider', provider);
    localStorage.setItem('chunklingo_api_key', apiKey);
    localStorage.setItem('chunklingo_prompt', customPrompt);
  }

  static getTheme() {
    return localStorage.getItem('ce_tool_theme') || localStorage.getItem('chunklingo_theme') || 'dark';
  }

  static saveTheme(theme) {
    localStorage.setItem('ce_tool_theme', theme);
    localStorage.setItem('chunklingo_theme', theme);
  }
}

  // =========================================================================
  // Module: src/services/ai-service.js
  // =========================================================================

/**
 * AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
 * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 1.5-flash-latest, etc.)
 */




class AIService {
  constructor() {
    this.provider = StorageService.getProvider();
    this.apiKey = StorageService.getApiKey();
    this.customPrompt = StorageService.getCustomPrompt();
    this.activeGeminiModel = null;
  }

  saveSettings(provider, apiKey, customPrompt) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.customPrompt = customPrompt;
    this.activeGeminiModel = null; // Reset cached model on settings update
    StorageService.saveApiSettings(provider, apiKey, customPrompt);
  }

  hasKey() {
    return !!(this.apiKey && this.apiKey.trim());
  }

  /**
   * Dynamically resolve the best available Gemini model for generateContent
   */
  async resolveGeminiModel() {
    if (this.activeGeminiModel) {
      return this.activeGeminiModel;
    }

    const priorityOrder = CONSTANTS.GEMINI_CANDIDATE_MODELS;

    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        for (const cand of priorityOrder) {
          if (available.includes(cand)) {
            this.activeGeminiModel = cand;
            return cand;
          }
        }

        const flashModel = available.find(m => m.includes('flash'));
        if (flashModel) {
          this.activeGeminiModel = flashModel;
          return flashModel;
        }

        if (available.length > 0) {
          this.activeGeminiModel = available[0];
          return available[0];
        }
      }
    } catch (e) {
      console.warn('Gemini ListModels query failed, falling back to priority candidates:', e);
    }

    this.activeGeminiModel = 'gemini-2.5-flash';
    return this.activeGeminiModel;
  }

  /**
   * Resilient POST to Gemini API with automatic candidate model fallback on 404/retirement
   */
  async postToGemini(payload) {
    const preferred = await this.resolveGeminiModel();
    const candidateList = [
      preferred,
      ...CONSTANTS.GEMINI_CANDIDATE_MODELS
    ];
    const uniqueCandidates = [...new Set(candidateList)];

    let lastError = null;

    for (const model of uniqueCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          this.activeGeminiModel = model; // Cache working model
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!content) throw new Error('Gemini 응답 내용이 비어 있습니다.');
          return JSON.parse(content);
        }

        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `Status ${response.status}`;
        lastError = new Error(errMsg);

        // If model is retired or not found (404), seamlessly try next candidate model
        if (response.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
          console.warn(`Gemini model ${model} not available (${errMsg}). Trying next model candidate...`);
          continue;
        } else {
          // For quota, auth, or bad request errors, throw immediately
          throw lastError;
        }
      } catch (fetchErr) {
        if (fetchErr.message && !fetchErr.message.includes('not found') && !fetchErr.message.includes('not supported') && !fetchErr.message.includes('404')) {
          throw fetchErr;
        }
        lastError = fetchErr;
      }
    }

    throw lastError || new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키 상태를 확인하세요.');
  }

  async translate(text) {
    if (!this.hasKey()) {
      throw new Error('AI API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘에서 API 키를 입력하세요.');
    }

    const systemPrompt = `You are an expert English-Korean linguist specialized in syntax chunking and natural translation.
Translate the user's English sentence into Korean in TWO distinct formats:
1. "natural": A fluent, idiomatic Korean sentence adhering strictly to Korean SOV word order and proper grammar/particles (우리말 해석).
2. "chunk_text": Meaning-based sequential chunks (직독직해) following the English thought sequence, separated strictly by " || ". (Example: "I went to school." -> "나는 || 갔다 || 학교에").
3. "chunks": An array of objects for each chunk: [{ "en": "English chunk", "ko": "Korean chunk" }]

Respond ONLY with valid, raw JSON in this structure (no markdown fences, no extra text):
{
  "natural": "...",
  "chunk_text": "...",
  "chunks": [
    { "en": "...", "ko": "..." }
  ]
}
${this.customPrompt ? `Additional User Instructions: ${this.customPrompt}` : ''}`;

    if (this.provider === 'gemini') {
      return this.callGemini(text, systemPrompt);
    } else {
      return this.callOpenAI(text, systemPrompt);
    }
  }

  /**
   * Transcribe Audio and generate 3x1 translation simultaneously using Gemini Multimodal Audio
   */
  async transcribeAndTranslateAudio(base64Audio, mimeType) {
    if (!this.hasKey()) {
      throw new Error('음성 인식을 위해 AI API 키가 필요합니다. 설정에서 Gemini 또는 OpenAI API 키를 입력하세요.');
    }

    const prompt = `Listen to this English audio carefully.
1. Transcribe the spoken English accurately into the "script" field.
2. Translate into natural Korean (SOV order) in "natural".
3. Provide chunk-based sequential interpretation with " || " in "chunk_text".
4. Provide chunk breakdown array in "chunks": [{ "en": "...", "ko": "..." }]
5. If there are multiple sentences, also provide a "sentences" array where each element contains:
   { "text": "English sentence", "natural": "Korean natural translation", "chunks": [{ "en": "...", "ko": "..." }] }

Respond ONLY with valid JSON:
{
  "script": "transcribed English text",
  "natural": "...",
  "chunk_text": "...",
  "chunks": [{ "en": "...", "ko": "..." }],
  "sentences": [
    {
      "text": "...",
      "natural": "...",
      "chunks": [{ "en": "...", "ko": "..." }]
    }
  ]
}`;

    if (this.provider === 'gemini') {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/mp3',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      return await this.postToGemini(payload);
    } else {
      throw new Error('OpenAI 모드에서는 Gemini API 키를 권장합니다. (Gemini는 오디오 멀티모달 네이티브 지원)');
    }
  }

  async callGemini(text, systemPrompt) {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nEnglish Sentence: "${text}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    return await this.postToGemini(payload);
  }

  async callOpenAI(text, systemPrompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `English Sentence: "${text}"` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API 요청 실패 (Status ${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI 응답 내용이 비어 있습니다.');

    return JSON.parse(content);
  }
}

const aiService = new AIService();

  // =========================================================================
  // Module: src/audio/audio-context.js
  // =========================================================================

/**
 * Web Audio Context Singleton & PCM Audio Decoding
 */

let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

async function ensureAudioContextRunning() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('AudioContext resume error:', e);
    }
  }
  return ctx;
}

async function decodeAudioFile(file) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) throw new Error('Web Audio API is not supported in this browser.');
  const arrayBuffer = await file.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

  // =========================================================================
  // Module: src/audio/silence-detector.js
  // =========================================================================

/**
 * Audio Sentence Boundary Detection Engine
 * Combines Web Audio API PCM RMS energy silence detection with proportional time fallback.
 */

function detectAudioSentenceBoundaries(audioBuffer, sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || (audioBuffer ? audioBuffer.duration : 0);

  if (!duration || duration <= 0) {
    return sentences.map(() => ({ start: null, end: null }));
  }

  if (sentences.length === 1) {
    return [{ start: 0, end: Math.round(duration * 10) / 10 }];
  }

  // Step 1: Attempt PCM RMS silence dip detection if audioBuffer exists
  if (audioBuffer) {
    try {
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSec = 0.05; // 50ms window
      const windowSize = Math.floor(sampleRate * windowSec);
      const numWindows = Math.floor(rawData.length / windowSize);

      const energies = [];
      let maxRms = 0;
      for (let w = 0; w < numWindows; w++) {
        let sumSq = 0;
        const offset = w * windowSize;
        for (let k = 0; k < windowSize; k += 4) {
          const v = rawData[offset + k];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / (windowSize / 4));
        energies.push(rms);
        if (rms > maxRms) maxRms = rms;
      }

      const silenceThresh = maxRms * 0.08;
      const silencePauses = [];
      let inSilence = false;
      let silenceStart = 0;

      for (let w = 0; w < numWindows; w++) {
        if (energies[w] < silenceThresh) {
          if (!inSilence) {
            inSilence = true;
            silenceStart = w * windowSec;
          }
        } else {
          if (inSilence) {
            const silenceDur = (w * windowSec) - silenceStart;
            if (silenceDur >= 0.2 && silenceStart > 0.3 && (w * windowSec) < duration - 0.3) {
              silencePauses.push(silenceStart + silenceDur / 2);
            }
            inSilence = false;
          }
        }
      }

      if (silencePauses.length >= sentences.length - 1) {
        const weights = sentences.map(s => Math.max(3, s.trim().split(/\s+/).length));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let curWeight = 0;
        const splitPoints = [];

        for (let i = 0; i < sentences.length - 1; i++) {
          curWeight += weights[i];
          const expectedTime = duration * (curWeight / totalWeight);
          let closest = silencePauses[0];
          let minDist = Math.abs(closest - expectedTime);
          for (const p of silencePauses) {
            const d = Math.abs(p - expectedTime);
            if (d < minDist) {
              minDist = d;
              closest = p;
            }
          }
          splitPoints.push(Math.round(closest * 10) / 10);
        }

        const result = [];
        let lastT = 0;
        for (let i = 0; i < sentences.length; i++) {
          const endT = i === sentences.length - 1 ? Math.round(duration * 10) / 10 : splitPoints[i];
          result.push({ start: lastT, end: Math.max(lastT + 0.3, endT) });
          lastT = endT;
        }
        return result;
      }
    } catch (e) {
      console.warn('Audio silence detection fallback:', e);
    }
  }

  // Step 2: Proportional fallback based on word counts
  return proportionalSentenceBoundaries(sentences, duration);
}

function proportionalSentenceBoundaries(sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  if (sentences.length === 1) {
    return [{ start: 0, end: Math.round(totalDuration * 10) / 10 }];
  }
  const weights = sentences.map(s => Math.max(3, s.trim().split(/\s+/).length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cur = 0;
  return sentences.map((s, idx) => {
    const fraction = weights[idx] / totalWeight;
    const dur = totalDuration * fraction;
    const start = Math.round(cur * 10) / 10;
    const end = idx === sentences.length - 1 ? Math.round(totalDuration * 10) / 10 : Math.round((cur + dur) * 10) / 10;
    cur += dur;
    return { start, end };
  });
}

  // =========================================================================
  // Module: src/audio/tts-synthesizer.js
  // =========================================================================

/**
 * TTS Synthesizer & Silent PCM WAV Generator
 * Completely eliminates noise/static for text-only inputs by generating pure silent PCM WAV
 * for waveform timing synchronization, while using clean SpeechSynthesis for authentic voice.
 */



function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  let pos = 0;

  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // Subchunk1Size
  setUint16(1);          // AudioFormat: PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);         // BitsPerSample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  const channels = [];
  for (let c = 0; c < numOfChan; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let chan = 0; chan < numOfChan; chan++) {
      let sample = channels[chan][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

function synthesizeSilentAudioForScript(text, audioCtx) {
  if (!text || !text.trim() || !audioCtx) return null;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;

  const estDuration = Math.max(2.0, Math.min(60, words.length * CONSTANTS.SPEECH_WORD_DURATION_SEC + CONSTANTS.SPEECH_BOUNDARY_MARGIN_SEC));
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * estDuration);
  const audioBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Pure silent PCM WAV to avoid any audio static or buzz
  channelData.fill(0);

  // Synthesize diamond rhythm waveform peaks matching speech syllables
  const totalBars = CONSTANTS.TOTAL_WAVEFORM_BARS;
  const waveformPeaks = [];
  const barsPerWord = totalBars / words.length;

  for (let i = 0; i < totalBars; i++) {
    const posInWord = (i % barsPerWord) / barsPerWord; // 0.0 ~ 1.0

    if (posInWord < 0.80) {
      const normPos = posInWord / 0.80;
      const diamondEnv = Math.sin(normPos * Math.PI);
      const texture = 0.90 + 0.10 * Math.sin(i * 1.5) * Math.cos(i * 0.7);
      const peak = Math.max(0.12, Math.min(0.96, diamondEnv * texture * 0.88));
      waveformPeaks.push(peak);
    } else {
      const baseline = 0.07 + 0.03 * Math.sin(i * 0.8);
      waveformPeaks.push(baseline);
    }
  }

  const wavBlob = audioBufferToWavBlob(audioBuffer);

  return {
    estDuration,
    audioBuffer,
    waveformPeaks,
    wavBlob
  };
}

function speakText(text, lang = 'en-US', rate = 0.95) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;

    // Pick authentic voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const matchVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]) && (v.name.includes('Natural') || v.name.includes('Google') || !v.localService)) ||
                         voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]));
      if (matchVoice) utter.voice = matchVoice;
    }
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS playback error:', e);
  }
}

  // =========================================================================
  // Module: src/audio/waveform-renderer.js
  // =========================================================================

/**
 * Waveform Canvas Renderer
 * Renders symmetrical neon mint waveform bars, sentence-unit zoom, playhead,
 * A-B looper selection box, range drag preview, and 0.5s shadowing overlay.
 */



class WaveformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  /**
   * Slice or generate sentence-unit waveform peaks (360 bars)
   */
  static extractSentencePeaks(audioBuffer, sentence, totalBars = CONSTANTS.TOTAL_WAVEFORM_BARS) {
    if (!sentence) return [];
    if (sentence.cachedPeaks && sentence.cachedPeaks.length === totalBars) {
      return sentence.cachedPeaks;
    }

    // 1. If decoded audioBuffer exists, slice real PCM samples
    if (audioBuffer && !sentence.isSynthesizedAudio) {
      try {
        const rawData = audioBuffer.getChannelData(0);
        const sr = audioBuffer.sampleRate;
        const sttStart = (sentence.audioStart !== null && sentence.audioStart !== undefined) ? sentence.audioStart : 0;
        const sttEnd = (sentence.audioEnd !== null && sentence.audioEnd !== undefined) ? sentence.audioEnd : audioBuffer.duration;
        const startSample = Math.max(0, Math.floor(sttStart * sr));
        const endSample = Math.min(rawData.length, Math.floor(sttEnd * sr));
        const sampleCount = endSample - startSample;

        if (sampleCount > totalBars) {
          const blockSize = Math.floor(sampleCount / totalBars);
          const peaks = [];
          let maxPeak = 0;
          for (let i = 0; i < totalBars; i++) {
            const s = startSample + i * blockSize;
            const e = Math.min(s + blockSize, endSample);
            let sum = 0;
            for (let j = s; j < e; j += 4) {
              const val = Math.abs(rawData[j]);
              if (val > sum) sum = val;
            }
            peaks.push(sum);
            if (sum > maxPeak) maxPeak = sum;
          }
          if (maxPeak > 0.001) {
            const normalized = peaks.map(p => Math.min(1, Math.max(0.05, (p / maxPeak) * 0.95)));
            sentence.cachedPeaks = normalized;
            return normalized;
          }
        }
      } catch (e) {
        console.warn('Sentence audio peak slice error:', e);
      }
    }

    // 2. Dynamic, realistic speech rhythm fallback
    const words = (sentence.text || '').trim().split(/\s+/).filter(Boolean);
    const numWords = Math.max(1, words.length);
    const barsPerWord = totalBars / numWords;
    const peaks = [];

    for (let i = 0; i < totalBars; i++) {
      const wordIdx = Math.min(numWords - 1, Math.floor(i / barsPerWord));
      const posInWord = (i % barsPerWord) / barsPerWord;
      const wordStr = words[wordIdx] || 'word';

      // Vary amplitude by word length & stress pattern
      const isContentWord = wordStr.length >= 4;
      const stressFactor = isContentWord ? 0.92 : (wordStr.length <= 2 ? 0.42 : 0.68);

      if (posInWord < 0.82) {
        const normPos = posInWord / 0.82;
        // Asymmetric bell curve for natural syllable onset and decay
        const envelope = Math.pow(Math.sin(normPos * Math.PI), 1.2);
        // Multi-frequency micro-texture (speech harmonics)
        const harmonics = 0.80 + 0.14 * Math.sin(i * 1.7) * Math.cos(i * 0.85) + 0.06 * Math.sin(i * 3.3);
        const peak = Math.max(0.12, Math.min(0.96, envelope * harmonics * stressFactor));
        peaks.push(peak);
      } else {
        // Inter-word dip / acoustic pause
        const pauseFloor = 0.05 + 0.03 * Math.sin(i * 0.6);
        peaks.push(pauseFloor);
      }
    }

    sentence.cachedPeaks = peaks;
    return peaks;
  }

  draw(params) {
    if (!this.canvas || !this.ctx) return;
    const {
      activeSentence,
      sentenceIndex,
      totalSentences,
      currentTime,
      totalDuration,
      loopStart,
      loopEnd,
      isRangeDragging,
      dragStartX,
      currentMouseX,
      isShadowingWaiting,
      formatTimeFn
    } = params;

    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = (typeof canvas.getBoundingClientRect === 'function')
      ? canvas.getBoundingClientRect()
      : { width: canvas.width || 800, height: canvas.height || 110 };
    const width = rect.width || 800;
    const height = 110;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Dark background
    ctx.fillStyle = '#090e17';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    const centerY = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Sentence time window
    const stnStart = (activeSentence && activeSentence.audioStart !== null) ? activeSentence.audioStart : 0;
    const stnEnd = (activeSentence && activeSentence.audioEnd !== null) ? activeSentence.audioEnd : totalDuration;
    const stnDuration = Math.max(0.1, stnEnd - stnStart);

    const curTime = currentTime || 0;
    const sentenceProgress = Math.max(0, Math.min(1, (curTime - stnStart) / stnDuration));
    const progressX = sentenceProgress * width;

    // 2. A-B Loop Box
    if (loopStart !== null) {
      const x1 = Math.max(0, Math.min(width, ((loopStart - stnStart) / stnDuration) * width));
      if (loopEnd !== null) {
        const x2 = Math.max(0, Math.min(width, ((loopEnd - stnStart) / stnDuration) * width));
        if (x2 > x1 + 1) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
          ctx.fillRect(x1, 0, x2 - x1, height);

          ctx.strokeStyle = 'rgb(0, 255, 204)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
          ctx.moveTo(x2, 0); ctx.lineTo(x2, height);
          ctx.stroke();

          ctx.fillStyle = 'rgb(0, 255, 204)';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('[A]', x1 + 3, 14);
          ctx.fillText('[B]', Math.max(x1 + 22, x2 - 22), 14);
        }
      } else {
        // [A] only
        ctx.save();
        ctx.strokeStyle = 'rgb(0, 255, 204)';
        ctx.lineWidth = 2;
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgb(0, 255, 204)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('[A] 시작점', Math.min(width - 65, x1 + 4), 14);
      }
    }

    // 3. Range Drag Selection Preview
    if (isRangeDragging && dragStartX !== null && currentMouseX !== null) {
      const x1 = Math.min(dragStartX, currentMouseX);
      const x2 = Math.max(dragStartX, currentMouseX);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
      ctx.fillRect(x1, 0, x2 - x1, height);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0, x2 - x1, height);
    }

    // 4. Waveform Bars
    let bars = activeSentence ? activeSentence.cachedPeaks : null;
    if (!bars || bars.length === 0) {
      if (activeSentence) {
        bars = WaveformRenderer.extractSentencePeaks(params.audioBuffer, activeSentence, CONSTANTS.TOTAL_WAVEFORM_BARS);
        activeSentence.cachedPeaks = bars;
      } else {
        bars = [];
      }
    }
    const totalBars = bars.length || CONSTANTS.TOTAL_WAVEFORM_BARS;
    const barWidth = Math.max(1.8, (width / totalBars) * 0.72);

    for (let i = 0; i < totalBars; i++) {
      const bx = (i / totalBars) * width;
      const peak = bars[i] !== undefined ? bars[i] : 0.12;
      const bh = Math.max(2, peak * (height / 2) * 0.88);

      if (bx <= progressX) {
        ctx.fillStyle = 'rgb(0, 255, 204)';
        ctx.shadowColor = 'rgba(0, 255, 204, 0.75)';
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(0, 255, 204, 0.32)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2, [barWidth / 2]);
      } else {
        ctx.rect(bx - barWidth / 2, centerY - bh, barWidth, bh * 2);
      }
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // 5. Playhead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(progressX, 6, 3.5, 0, Math.PI * 2);
    ctx.arc(progressX, height - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5.5 Sentence Unit Badge
    if (activeSentence && totalSentences > 0) {
      ctx.shadowBlur = 0;
      const fmt = formatTimeFn || (s => `${s.toFixed(1)}s`);
      const badgeText = `SENTENCE S${(sentenceIndex || 0) + 1}/${totalSentences} (${fmt(stnStart)} ~ ${fmt(stnEnd)})`;
      ctx.font = 'bold 10px monospace';
      const badgeW = ctx.measureText(badgeText).width + 16;

      ctx.fillStyle = 'rgba(9, 14, 23, 0.78)';
      ctx.fillRect(8, 8, badgeW, 20);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, badgeW, 20);

      ctx.fillStyle = 'rgb(0, 255, 204)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 16, 18);
    }

    // 6. Shadowing 0.5s pause overlay
    if (isShadowingWaiting) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';
      ctx.fillStyle = 'rgba(9, 14, 23, 0.88)';
      const bannerW = 210;
      const bannerH = 34;
      ctx.fillRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);
      ctx.strokeStyle = 'rgb(0, 255, 204)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(width / 2 - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);

      ctx.fillStyle = 'rgb(0, 255, 204)';
      ctx.font = 'bold 12px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗣️ 0.5s 쉐도잉 대기 중...', width / 2, centerY);
    }

    ctx.restore();
  }
}

  // =========================================================================
  // Module: src/audio/looper-engine.js
  // =========================================================================

/**
 * Looper Engine & Playback Boundary Controller
 * Manages A-B section repeat, 0.5s shadowing delay timer, and sentence-bounded playback.
 */



function formatPreciseTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

class LooperEngine {
  constructor(audioPlayer, appState) {
    this.audioPlayer = audioPlayer;
    this.appState = appState;
    this.shadowTimer = null;
    this.callbacks = {
      onLoopCountUpdate: () => {},
      onLoopComplete: () => {},
      onShadowingWait: () => {},
      onAutoAdvance: () => {},
      onPlayStateChange: () => {}
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

  // =========================================================================
  // Module: src/ui/toast-manager.js
  // =========================================================================

/**
 * Floating Toast Notification Manager
 */

class ToastManager {
  constructor(toastElement) {
    this.toastEl = toastElement || document.getElementById('toast');
    this.timer = null;
  }

  setElement(el) {
    this.toastEl = el;
  }

  show(message, durationMs = 3000) {
    if (!this.toastEl) {
      this.toastEl = document.getElementById('toast');
    }
    if (!this.toastEl) return;

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 300);
    }, durationMs);
  }
}

const toast = new ToastManager();

  // =========================================================================
  // Module: src/ui/settings-modal.js
  // =========================================================================

/**
 * AI Settings Modal Controller
 */




class SettingsModal {
  constructor() {
    this.modal = document.getElementById('settingsModal');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnSaveSettings = document.getElementById('btnSaveSettings');
    this.providerRadios = document.querySelectorAll('input[name="aiProvider"]');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.customPromptInput = document.getElementById('customPrompt');
    this.engineBadge = document.getElementById('engineBadge');

    this.initEvents();
    this.populate();
    this.updateEngineBadge();
  }

  initEvents() {
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.open());
    }
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => this.save());
    }
  }

  open() {
    this.populate();
    if (this.modal) this.modal.classList.remove('hidden');
  }

  close() {
    if (this.modal) this.modal.classList.add('hidden');
  }

  populate() {
    const provider = aiService.provider;
    this.providerRadios.forEach(r => {
      r.checked = (r.value === provider);
    });
    if (this.apiKeyInput) this.apiKeyInput.value = aiService.apiKey || '';
    if (this.customPromptInput) this.customPromptInput.value = aiService.customPrompt || '';
  }

  save() {
    let selProvider = 'gemini';
    this.providerRadios.forEach(r => {
      if (r.checked) selProvider = r.value;
    });
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
    const prompt = this.customPromptInput ? this.customPromptInput.value.trim() : '';

    aiService.saveSettings(selProvider, key, prompt);
    this.updateEngineBadge();
    this.close();
    toast.show('✅ AI 설정이 저장되었습니다.');
  }

  updateEngineBadge() {
    if (!this.engineBadge) return;
    const provider = aiService.provider;
    const hasKey = aiService.hasKey();
    if (hasKey) {
      this.engineBadge.textContent = provider === 'gemini' ? '✨ Gemini AI' : '🟢 OpenAI GPT-4o';
      this.engineBadge.className = 'engine-badge ai-active';
    } else {
      this.engineBadge.textContent = '⚙️ 로컬 규칙 엔진';
      this.engineBadge.className = 'engine-badge rule-active';
    }
  }
}

  // =========================================================================
  // Module: src/ui/router.js
  // =========================================================================

/**
 * SPA Page Router for ChunkLingo
 * Switches between 3 views (Input, Practice, Memorize) without browser reload,
 * preserving Web Audio API Context, PCM audio buffers, and sentence states.
 */

class AppRouter {
  constructor(views = {}) {
    this.views = views; // { input: View, practice: View, memorize: View }
    this.currentPage = 'input';
    this.initEvents();
  }

  registerViews(views) {
    this.views = { ...this.views, ...views };
  }

  initEvents() {
    // Top tab clicks
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pageId = btn.getAttribute('data-page');
        if (pageId) {
          this.navigateTo(pageId);
        }
      });
    });

    // Hash change support
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (['input', 'practice', 'memorize'].includes(hash) && hash !== this.currentPage) {
        this.navigateTo(hash, false);
      }
    });
  }

  navigateTo(pageId, updateHash = true) {
    if (!this.views[pageId] && !document.getElementById(`view-${pageId}`)) return;

    const prevPage = this.currentPage;
    if (this.views[prevPage] && typeof this.views[prevPage].onDeactivated === 'function') {
      this.views[prevPage].onDeactivated();
    }

    this.currentPage = pageId;

    // 1. Update navigation tab buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
    });

    // 2. Toggle view containers
    ['input', 'practice', 'memorize'].forEach(key => {
      const container = document.getElementById(`view-${key}`);
      if (container) {
        container.classList.toggle('hidden', key !== pageId);
      }
    });

    // 3. Notify new view
    if (this.views[pageId] && typeof this.views[pageId].onActivated === 'function') {
      this.views[pageId].onActivated();
    }

    // 4. Update hash
    if (updateHash) {
      window.location.hash = pageId;
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }
}

  // =========================================================================
  // Module: src/ui/shortcut-manager.js
  // =========================================================================

/**
 * Unified Global Keyboard Shortcut Manager
 * Handles 9 shortcuts: Space, [, ], \, R, ←, →, S, T with IME protection and typing safety guards.
 */

class ShortcutManager {
  constructor(handlers = {}) {
    this.handlers = handlers; // { onPlayPause, onSetStart, onSetEnd, onClearRegion, onStartLoop, onPrevSentence, onNextSentence, onToggleFels, onToggleTranslation, isShortcutActive }
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.init();
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  init() {
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyHandler);
  }

  handleKeyDown(e) {
    const target = e.target;
    const isTyping = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );

    // Typing protection: If user is actively typing in a form field
    if (isTyping) {
      const isFelsBlank = target.classList && target.classList.contains('fels-blank-input');
      // Alt + Arrow allowed inside FELS blanks for sentence jumping
      if (isFelsBlank && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' && this.handlers.onPrevSentence) {
          this.handlers.onPrevSentence();
        } else if (e.key === 'ArrowRight' && this.handlers.onNextSentence) {
          this.handlers.onNextSentence();
        }
      }
      return;
    }

    // Ignore if Ctrl/Cmd is pressed (allow browser shortcuts like Ctrl+R, Ctrl+C)
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    const currentPage = this.handlers.getCurrentPage
      ? this.handlers.getCurrentPage()
      : (this.handlers.isShortcutActive && this.handlers.isShortcutActive() ? 'practice' : null);

    // =========================================================================
    // PAGE 3: Memorization Shortcuts (Number keys 1~9 and Keypad 1~9)
    // =========================================================================
    if (currentPage === 'memorize') {
      const classroomModal = document.getElementById('classroomModal');
      if (classroomModal && !classroomModal.classList.contains('hidden')) {
        return;
      }

      let num = null;
      if (e.code && /^Digit([1-9])$/.test(e.code)) {
        num = parseInt(e.code.replace('Digit', ''), 10);
      } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
        num = parseInt(e.code.replace('Numpad', ''), 10);
      } else if (e.key >= '1' && e.key <= '9') {
        num = parseInt(e.key, 10);
      }

      if (num !== null) {
        e.preventDefault();
        if (this.handlers.onFlipMemorizeCard) {
          this.handlers.onFlipMemorizeCard(num);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (this.handlers.onPlayAllMemorize) {
          this.handlers.onPlayAllMemorize();
        }
        return;
      }
      return;
    }

    // =========================================================================
    // PAGE 2: Practice View Shortcuts (Space, [, ], \, R, Arrows, S, T)
    // =========================================================================
    if (currentPage !== 'practice') {
      if (this.handlers.isShortcutActive && !this.handlers.isShortcutActive()) {
        return;
      }
    }

    // Number keys 1~9: flip practice chunk cards (Page 2)
    let practiceNum = null;
    if (e.code && /^Digit([1-9])$/.test(e.code)) {
      practiceNum = parseInt(e.code.replace('Digit', ''), 10);
    } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
      practiceNum = parseInt(e.code.replace('Numpad', ''), 10);
    } else if (e.key >= '1' && e.key <= '9') {
      practiceNum = parseInt(e.key, 10);
    }

    if (practiceNum !== null) {
      e.preventDefault();
      if (this.handlers.onFlipPracticeCard) {
        this.handlers.onFlipPracticeCard(practiceNum);
      }
      return;
    }

    const key = e.key;

    // 1. Space: togglePlayPause
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      if (this.handlers.onPlayPause) this.handlers.onPlayPause();
      return;
    }

    // 2. [ : setRegionStartFromCurrentTime
    if (key === '[') {
      e.preventDefault();
      if (this.handlers.onSetStart) this.handlers.onSetStart();
      return;
    }

    // 3. ] : setRegionEndFromCurrentTime
    if (key === ']') {
      e.preventDefault();
      if (this.handlers.onSetEnd) this.handlers.onSetEnd();
      return;
    }

    // 4. \ (￦) : clearSelectedRegion
    if (key === '\\' || key === '¥' || key === '₩') {
      e.preventDefault();
      if (this.handlers.onClearRegion) this.handlers.onClearRegion();
      return;
    }

    // 5. R / r : startRegionLoop
    if (key === 'r' || key === 'R' || key === 'ㄱ') {
      e.preventDefault();
      if (this.handlers.onStartLoop) this.handlers.onStartLoop();
      return;
    }

    // 6. ArrowLeft : prevSentence
    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (this.handlers.onPrevSentence) this.handlers.onPrevSentence();
      return;
    }

    // 7. ArrowRight : nextSentence
    if (key === 'ArrowRight') {
      e.preventDefault();
      if (this.handlers.onNextSentence) this.handlers.onNextSentence();
      return;
    }

    // 8. S / s : toggleFelsMode
    if (key === 's' || key === 'S' || key === 'ㄴ') {
      e.preventDefault();
      if (this.handlers.onToggleFels) this.handlers.onToggleFels();
      return;
    }

    // 9. T / t : toggleTranslation
    if (key === 't' || key === 'T' || key === 'ㅅ') {
      e.preventDefault();
      if (this.handlers.onToggleTranslation) this.handlers.onToggleTranslation();
      return;
    }
  }
}

  // =========================================================================
  // Module: src/views/input-view.js
  // =========================================================================

/**
 * Page 1: Data Input View (InputView)
 * - 3 Input Modes: Both (Audio + Script), Audio Only (STT), Script Only (Default)
 * - MP3 drag & drop file upload
 * - Script textarea with character count & clear button
 * - Preset chips for instant evaluation
 * - Instant parsing results on Page 1 (sentence list, chunk display, Korean translation)
 * - Manual chunk splitting/merging (interactive word dividers + text edit)
 * - Editable Korean translation in real-time
 * - A4 Portrait Student/Teacher Printable & Downloadable Handout
 * - Direct transition to Page 2 (Practice) with verified chunks
 */











class InputView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();
    this.handoutMode = 'student'; // 'student' | 'teacher'

    // DOM Elements - Input Form
    this.container = document.getElementById('view-input');
    this.modeTabs = document.querySelectorAll('.mode-tab');
    this.audioUploadSection = document.getElementById('audioUploadSection');
    this.dropArea = document.getElementById('dropArea');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.inputEnglish = document.getElementById('inputEnglish');
    this.charCount = document.getElementById('charCount');
    this.btnClear = document.getElementById('btnClear');
    this.btnTranslate = document.getElementById('btnTranslate');
    this.btnTranslateText = document.getElementById('btnTranslateText');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // DOM Elements - Parsed Results Section
    this.parsedResultsSection = document.getElementById('parsedResultsSection');
    this.parsedSentenceList = document.getElementById('parsedSentenceList');
    this.resultsCountBadge = document.getElementById('resultsCountBadge');
    this.btnPrintHandout = document.getElementById('btnPrintHandout');
    this.btnStartPractice = document.getElementById('btnStartPractice');
    this.btnHeaderStartPractice = document.getElementById('btnHeaderStartPractice');
    this.btnBottomPrintHandout = document.getElementById('btnBottomPrintHandout');
    this.btnBottomStartPractice = document.getElementById('btnBottomStartPractice');

    // DOM Elements - Handout Modal
    this.handoutModal = document.getElementById('handoutModal');
    this.btnCloseHandout = document.getElementById('btnCloseHandout');
    this.btnDoPrint = document.getElementById('btnDoPrint');
    this.btnDownloadHtml = document.getElementById('btnDownloadHtml');
    this.printableSheet = document.getElementById('printableSheet');
    this.btnHandoutTypeStudent = document.getElementById('btnHandoutTypeStudent');
    this.btnHandoutTypeTeacher = document.getElementById('btnHandoutTypeTeacher');

    // Audio Singleton
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    this.initEvents();
    this.setMode('text'); // default: script only
  }

  initEvents() {
    // Mode tabs
    this.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // File Drag & Drop
    if (this.dropArea) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dropArea.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.dropArea.classList.remove('drag-over');
        });
      });

      this.dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('audio/')) {
          this.handleAudioFile(files[0]);
        } else {
          toast.show('⚠️ 오디오 파일(.mp3, .wav 등)만 업로드 가능합니다.');
        }
      });

      this.dropArea.addEventListener('click', (e) => {
        if (e.target.closest('#btnRemoveAudio') || e.target.closest('.audio-file-info')) return;
        if (this.audioFileInput) this.audioFileInput.click();
      });
    }

    if (this.audioFileInput) {
      this.audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleAudioFile(e.target.files[0]);
        }
      });
    }

    // Text Area & Char Counter
    if (this.inputEnglish) {
      this.inputEnglish.addEventListener('input', () => {
        const len = this.inputEnglish.value.length;
        if (this.charCount) this.charCount.textContent = `${len}자`;
      });

      this.inputEnglish.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.handleTranslate();
        }
      });
    }

    // Clear Button
    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        if (this.inputEnglish) {
          this.inputEnglish.value = '';
          if (this.charCount) this.charCount.textContent = '0자';
          this.inputEnglish.focus();
        }
        if (this.parsedResultsSection) {
          this.parsedResultsSection.classList.add('hidden');
        }
      });
    }

    // Preset Chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        if (text && this.inputEnglish) {
          if (appState.currentMode === 'audio') {
            this.setMode('text');
          }
          this.inputEnglish.value = text;
          if (this.charCount) this.charCount.textContent = `${text.length}자`;
          this.handleTranslate();
        }
      });
    });

    // Translate Trigger
    if (this.btnTranslate) {
      this.btnTranslate.addEventListener('click', () => this.handleTranslate());
    }

    // Handout Modal Triggers
    if (this.btnPrintHandout) {
      this.btnPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnBottomPrintHandout) {
      this.btnBottomPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }

    // Transition to Page 2
    const startPracticeHandler = () => {
      if (!appState.sentenceList || appState.sentenceList.length === 0) {
        if (this.inputEnglish && this.inputEnglish.value.trim()) {
          this.handleTranslate();
        }
      }
      this.router.navigateTo('practice');
    };
    if (this.btnStartPractice) {
      this.btnStartPractice.addEventListener('click', startPracticeHandler);
    }
    if (this.btnHeaderStartPractice) {
      this.btnHeaderStartPractice.addEventListener('click', startPracticeHandler);
    }
    if (this.btnBottomStartPractice) {
      this.btnBottomStartPractice.addEventListener('click', startPracticeHandler);
    }

    // Handout Modal Controls
    if (this.btnCloseHandout) {
      this.btnCloseHandout.addEventListener('click', () => this.closeHandoutModal());
    }
    if (this.handoutModal) {
      this.handoutModal.addEventListener('click', (e) => {
        if (e.target === this.handoutModal) this.closeHandoutModal();
      });
    }
    if (this.btnDoPrint) {
      this.btnDoPrint.addEventListener('click', () => {
        toast.show('🖨️ 인쇄 대화상자가 열립니다. [대상: PDF로 저장]을 선택하시면 A4 양면 PDF로 저장됩니다.');
        setTimeout(() => window.print(), 150);
      });
    }
    if (this.btnDownloadHtml) {
      this.btnDownloadHtml.addEventListener('click', () => this.downloadHandoutHtml());
    }
    if (this.btnHandoutTypeStudent) {
      this.btnHandoutTypeStudent.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnHandoutTypeTeacher) {
      this.btnHandoutTypeTeacher.addEventListener('click', () => this.openHandoutModal('teacher'));
    }
  }

  setMode(mode) {
    appState.setUploadMode(mode);

    this.modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    const scriptInputSection = document.getElementById('scriptInputSection');

    if (mode === 'both') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 생성 및 음성 연동';
    } else if (mode === 'audio') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.add('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
    } else {
      // text only
      if (this.audioUploadSection) this.audioUploadSection.classList.add('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 해석 및 FELS 생성';
    }
  }

  async handleAudioFile(file) {
    appState.uploadedAudioFile = file;
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
    }
    appState.uploadedAudioUrl = URL.createObjectURL(file);
    appState.isSynthesizedAudio = false;

    // Decode PCM buffer
    try {
      toast.show('⏳ 오디오 파형 분석 중...');
      const audioBuffer = await decodeAudioFile(file);
      appState.audioBuffer = audioBuffer;
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    } catch (err) {
      console.warn('Audio decoding fallback:', err);
      toast.show(`🎵 음성 파일 첨부 완료: ${file.name}`);
    }

    this.renderDropAreaPreview(file);
  }

  renderDropAreaPreview(file) {
    if (!this.dropArea) return;
    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    this.dropArea.innerHTML = `
      <div class="audio-file-info">
        <div class="audio-file-icon">🎵</div>
        <div class="audio-file-details">
          <div class="audio-file-name">${file.name}</div>
          <div class="audio-file-meta">${formatSize(file.size)} • ${file.type || 'audio/mp3'}</div>
        </div>
        <button id="btnRemoveAudio" class="icon-btn remove-btn" title="오디오 삭제">✕</button>
      </div>
    `;

    const btnRemove = this.dropArea.querySelector('#btnRemoveAudio');
    if (btnRemove) {
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetAudioFile();
      });
    }
  }

  resetAudioFile() {
    if (appState.uploadedAudioUrl) {
      URL.revokeObjectURL(appState.uploadedAudioUrl);
      appState.uploadedAudioUrl = null;
    }
    appState.uploadedAudioFile = null;
    appState.audioBuffer = null;
    appState.isSynthesizedAudio = false;

    if (this.audioFileInput) this.audioFileInput.value = '';
    if (this.dropArea) {
      this.dropArea.innerHTML = `
        <div class="drop-icon">📁</div>
        <p class="drop-title">MP3 음성 파일을 여기에 드래그하거나 클릭하여 업로드</p>
        <p class="drop-hint">지원 형식: MP3, WAV, M4A, OGG (수능/교재 듣기 음성)</p>
      `;
    }
    toast.show('오디오 파일이 제거되었습니다.');
  }

  async handleTranslate() {
    const mode = appState.currentMode;

    // Mode 2: Audio Only (STT)
    if (mode === 'audio') {
      if (!appState.uploadedAudioFile) {
        toast.show('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
        return;
      }
      if (!aiService.hasKey()) {
        toast.show('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 AI API 키를 입력하세요.');
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.click();
        return;
      }

      this.setLoading(true);
      try {
        const base64Audio = await this.readFileAsBase64(appState.uploadedAudioFile);
        const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
        const aiResult = await aiService.transcribeAndTranslateAudio(base64Audio, mimeType);

        const scriptText = aiResult.script || '';
        if (this.inputEnglish) {
          this.inputEnglish.value = scriptText;
          if (this.charCount) this.charCount.textContent = `${scriptText.length}자`;
        }

        const rawSentences = splitIntoSentences(scriptText);
        const boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);

        // Partition AI chunks sequentially across each sentence so S1 never contains S2/S3 chunks
        const distributedChunks = distributeChunksSequentially(rawSentences, aiResult.chunks || []);

        const sentenceList = rawSentences.map((stnText, idx) => {
          let result;
          const directStn = aiResult.sentences && aiResult.sentences[idx];
          if (directStn && directStn.chunks && directStn.chunks.length > 0) {
            result = {
              natural: directStn.natural || this.ruleEngine.process(stnText).natural || '',
              chunk_text: directStn.chunks.map(c => c.ko).join(' || '),
              direct: directStn.chunks.map(c => c.ko).join(' / '),
              chunks: directStn.chunks
            };
          } else {
            const stnChunks = distributedChunks[idx] || [];
            if (stnChunks.length > 0) {
              result = {
                natural: (idx === 0 && rawSentences.length === 1 ? aiResult.natural : this.ruleEngine.process(stnText).natural) || '',
                chunk_text: stnChunks.map(c => c.ko).join(' || '),
                direct: stnChunks.map(c => c.ko).join(' / '),
                chunks: stnChunks
              };
            } else {
              result = this.ruleEngine.process(stnText);
            }
          }
          return {
            index: idx,
            text: stnText,
            audioStart: boundaries[idx]?.start ?? null,
            audioEnd: boundaries[idx]?.end ?? null,
            result
          };
        });

        appState.scriptText = scriptText;
        appState.setSentenceList(sentenceList);

        // Render Results Panel on Page 1
        this.renderParsedResults();
        toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 완료! 아래에서 청크와 해석을 확인하세요.`);
      } catch (err) {
        console.error(err);
        toast.show(`❌ 음성 추출 오류: ${err.message}`);
      } finally {
        this.setLoading(false);
      }
      return;
    }

    // Mode 1 (Both) or Mode 3 (Text)
    const text = this.inputEnglish ? this.inputEnglish.value.trim() : '';
    if (!text) {
      toast.show('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
      if (this.inputEnglish) this.inputEnglish.focus();
      return;
    }

    this.setLoading(true);

    try {
      // If no authentic uploaded MP3, synthesize clean silent WAV for visual waveform
      if (!appState.uploadedAudioFile || appState.isSynthesizedAudio) {
        try {
          const audioCtx = getAudioContext();
          if (audioCtx && typeof audioCtx.createBuffer === 'function') {
            const synthData = synthesizeSilentAudioForScript(text, audioCtx);
            if (synthData) {
              if (appState.uploadedAudioUrl) URL.revokeObjectURL(appState.uploadedAudioUrl);
              appState.uploadedAudioUrl = URL.createObjectURL(synthData.wavBlob);
              appState.audioBuffer = synthData.audioBuffer;
              appState.isSynthesizedAudio = true;
              appState.uploadedAudioFile = new File([synthData.wavBlob], 'tts_synthesized.wav', { type: 'audio/wav' });
            }
          }
        } catch (audioErr) {
          console.warn('Audio synthesis fallback notice:', audioErr);
        }
      }

      // Sentence splitting
      let rawSentences = splitIntoSentences(text);
      if (rawSentences.length === 0) rawSentences.push(text);

      const boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);

      const sentenceList = rawSentences.map((stnText, idx) => ({
        index: idx,
        text: stnText,
        audioStart: boundaries[idx]?.start ?? null,
        audioEnd: boundaries[idx]?.end ?? null,
        result: this.ruleEngine.process(stnText)
      }));

      appState.scriptText = text;
      appState.setSentenceList(sentenceList);

      // Render Results Panel on Page 1
      this.renderParsedResults();
      toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 및 청크 분석 완료! 아래에서 검토 및 수정할 수 있습니다.`);
    } catch (err) {
      console.error('Translation error:', err);
      toast.show(`❌ 오류: ${err.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  renderParsedResults() {
    if (!this.parsedResultsSection || !this.parsedSentenceList) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.parsedResultsSection.classList.add('hidden');
      return;
    }

    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = `총 ${sentences.length}개 문장`;
    }

    this.parsedSentenceList.innerHTML = '';

    sentences.forEach((stn, idx) => {
      // Ensure stn.result exists
      if (!stn.result) {
        stn.result = this.ruleEngine.process(stn.text);
      }

      const itemCard = document.createElement('div');
      itemCard.className = 'parsed-sentence-item';
      itemCard.setAttribute('data-stn-idx', idx);

      const hasAudioTime = stn.audioStart !== null && stn.audioEnd !== null;
      const timeStr = hasAudioTime 
        ? `${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}` 
        : '';

      itemCard.innerHTML = `
        <div class="sentence-item-header">
          <div class="stn-header-meta">
            <span class="stn-badge-pill">문장 ${idx + 1} (S${idx + 1})</span>
            ${hasAudioTime ? `<span class="stn-audio-time">⏱ ${timeStr}</span>` : ''}
          </div>
          <button class="stn-speak-btn" type="button" title="문장 음성 듣기">
            <span>🔊 문장 듣기</span>
          </button>
        </div>

        <!-- Interactive Clickable Word-Divider Track -->
        <div class="word-divider-track"></div>

        <!-- Editable Fields Grid -->
        <div class="sentence-edit-grid">
          <div class="sentence-edit-field full-width-field">
            <label class="edit-field-label">
              <span>📝 영어 문장 원문 (Script):</span>
              <span style="font-weight: 400; opacity: 0.7;">오탈자나 단어를 직접 수정하면 청크 분석 및 음성이 즉시 동기화됩니다</span>
            </label>
            <input type="text" class="sentence-script-input" value="${this.escapeHtml(stn.text || '')}">
          </div>
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✂️ 청크 구분(||) 텍스트 편집:</span>
              <span style="font-weight: 400; opacity: 0.7;">단어 사이에 '||'를 직접 입력하거나 위 구분자를 클릭하세요</span>
            </label>
            <input type="text" class="chunk-text-input" value="${this.escapeHtml(this.getChunkString(stn.result.chunks))}">
          </div>
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✍️ 우리말 자연스러운 해석:</span>
              <span style="font-weight: 400; opacity: 0.7;">학생 학습지 및 카드 뒷면에 반영됩니다</span>
            </label>
            <input type="text" class="sentence-natural-input" value="${this.escapeHtml(stn.result.natural || '')}">
          </div>
        </div>
      `;

      // 1. Hook up Speak/Play button
      const speakBtn = itemCard.querySelector('.stn-speak-btn');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => {
          this.playOrSpeakSentence(stn, speakBtn);
        });
      }

      // 2. Render Interactive Word-Divider Track
      const track = itemCard.querySelector('.word-divider-track');
      const scriptInput = itemCard.querySelector('.sentence-script-input');
      const chunkInput = itemCard.querySelector('.chunk-text-input');
      const naturalInput = itemCard.querySelector('.sentence-natural-input');

      if (track) {
        this.renderWordDividerTrack(track, stn, chunkInput);
      }

      // 3. Hook up Script Input
      if (scriptInput) {
        scriptInput.addEventListener('change', () => {
          this.updateSentenceScript(stn, scriptInput.value, chunkInput, track);
        });
        scriptInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.updateSentenceScript(stn, scriptInput.value, chunkInput, track);
          }
        });
      }

      // 4. Hook up Chunk Text Input
      if (chunkInput) {
        chunkInput.addEventListener('change', () => {
          this.updateChunksFromTextInput(stn, chunkInput.value, track);
        });
        chunkInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.updateChunksFromTextInput(stn, chunkInput.value, track);
          }
        });
      }

      // 5. Hook up Natural Korean Input
      if (naturalInput) {
        naturalInput.addEventListener('input', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
        });
      }

      this.parsedSentenceList.appendChild(itemCard);
    });

    this.parsedResultsSection.classList.remove('hidden');
    setTimeout(() => {
      this.parsedResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  renderWordDividerTrack(track, stn, chunkInput) {
    if (!track) return;
    track.innerHTML = '';

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    // Determine current boundary word indices
    const boundaryWordIndices = new Set();
    let runningWordCount = 0;
    (stn.result.chunks || []).forEach((c, cIdx) => {
      const cWords = (c.en || '').trim().split(/\s+/).filter(Boolean);
      runningWordCount += cWords.length;
      if (cIdx < (stn.result.chunks || []).length - 1 && runningWordCount > 0 && runningWordCount < words.length) {
        boundaryWordIndices.add(runningWordCount - 1);
      }
    });

    words.forEach((w, idx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word-token';
      wordSpan.textContent = w;
      track.appendChild(wordSpan);

      // Divider slot between words
      if (idx < words.length - 1) {
        const isBoundary = boundaryWordIndices.has(idx);
        const dividerSlot = document.createElement('span');
        dividerSlot.className = `divider-slot ${isBoundary ? 'active' : ''}`;
        dividerSlot.setAttribute('data-word-idx', idx);
        dividerSlot.title = isBoundary ? "클릭하여 청크 합치기" : "클릭하여 청크 분리하기 (|| 추가)";
        dividerSlot.textContent = isBoundary ? '||' : '+';

        dividerSlot.addEventListener('click', () => {
          if (boundaryWordIndices.has(idx)) {
            boundaryWordIndices.delete(idx);
          } else {
            boundaryWordIndices.add(idx);
          }
          this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);
          if (chunkInput) {
            chunkInput.value = this.getChunkString(stn.result.chunks);
          }
          this.renderWordDividerTrack(track, stn, chunkInput);
          toast.show('✂️ 청크 구분이 업데이트되었습니다.');
        });

        track.appendChild(dividerSlot);
      }
    });
  }

  rebuildChunksFromBoundaries(stn, words, boundaryWordIndices) {
    const newChunks = [];
    let curWords = [];

    words.forEach((w, idx) => {
      curWords.push(w);
      if (boundaryWordIndices.has(idx) || idx === words.length - 1) {
        const enStr = curWords.join(' ');
        const existingChunk = (stn.result?.chunks || []).find(c => c.en.trim() === enStr.trim());
        const koStr = existingChunk ? existingChunk.ko : this.ruleEngine.translateChunkText(enStr);
        newChunks.push({ en: enStr, ko: koStr });
        curWords = [];
      }
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
  }

  updateChunksFromTextInput(stn, chunkedText, track) {
    const parts = (chunkedText || '').split('||').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const newChunks = parts.map(part => {
      const existing = (stn.result?.chunks || []).find(c => c.en.trim() === part);
      return {
        en: part,
        ko: existing ? existing.ko : this.ruleEngine.translateChunkText(part)
      };
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');

    if (track) {
      this.renderWordDividerTrack(track, stn, null);
    }
    toast.show('✂️ 청크 구분이 저장되었습니다.');
  }

  updateSentenceScript(stn, newText, chunkInput, track) {
    const cleanText = (newText || '').trim();
    if (!cleanText || cleanText === stn.text) return;
    stn.text = cleanText;

    // Re-process chunks with rule engine
    const newResult = this.ruleEngine.process(cleanText);
    if (!stn.result) stn.result = {};
    stn.result.chunks = newResult.chunks;
    stn.result.direct = newResult.direct;
    if (!stn.result.natural) stn.result.natural = newResult.natural;
    stn.cachedPeaks = null;

    if (chunkInput) {
      chunkInput.value = this.getChunkString(stn.result.chunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, chunkInput);
    }

    // Sync global script text
    appState.scriptText = (appState.sentenceList || []).map(s => s.text).join(' ');
    toast.show(`📝 문장 S${stn.index + 1} 원문이 수정되었습니다.`);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    return chunks.map(c => (c.en || '').trim()).filter(Boolean).join(' || ');
  }

  playOrSpeakSentence(stn, speakBtn) {
    if (speakBtn) {
      const origHtml = speakBtn.innerHTML;
      speakBtn.innerHTML = '<span>🔊 재생 중...</span>';
      setTimeout(() => {
        if (speakBtn) speakBtn.innerHTML = origHtml;
      }, 1500);
    }

    // 1. If authentic uploaded audio exists, play slice
    if (appState.uploadedAudioUrl && this.nativeAudioPlayer && !appState.isSynthesizedAudio) {
      if (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl) {
        this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
      }
      if (stn.audioStart !== null && stn.audioEnd !== null) {
        try {
          this.nativeAudioPlayer.currentTime = stn.audioStart;
          this.nativeAudioPlayer.play().catch(e => {
            console.warn('Audio play error, falling back to TTS:', e);
            speakText(stn.text, 'en-US');
          });

          if (this.currentStopHandler) {
            this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
          }
          this.currentStopHandler = () => {
            if (this.nativeAudioPlayer.currentTime >= stn.audioEnd) {
              this.nativeAudioPlayer.pause();
              this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
              this.currentStopHandler = null;
            }
          };
          this.nativeAudioPlayer.addEventListener('timeupdate', this.currentStopHandler);
          return;
        } catch (e) {
          console.warn('Audio playback error, fallback to TTS:', e);
        }
      }
    }

    // 2. High-reliability TTS Fallback
    speakText(stn.text, 'en-US');
  }

  // =========================================================================
  // A4 Printable Handout Modal Functions
  // =========================================================================

  openHandoutModal(mode = 'student') {
    this.handoutMode = mode;
    if (this.btnHandoutTypeStudent && this.btnHandoutTypeTeacher) {
      this.btnHandoutTypeStudent.classList.toggle('active', mode === 'student');
      this.btnHandoutTypeTeacher.classList.toggle('active', mode === 'teacher');
    }

    this.renderHandoutSheet();
    if (this.handoutModal) {
      this.handoutModal.classList.remove('hidden');
      const modalBody = this.handoutModal.querySelector('.handout-modal-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
      setTimeout(() => {
        if (modalBody) modalBody.scrollTop = 0;
      }, 50);
    }
  }

  closeHandoutModal() {
    if (this.handoutModal) {
      this.handoutModal.classList.add('hidden');
    }
  }

  renderHandoutSheet() {
    if (!this.printableSheet) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.printableSheet.innerHTML = `
        <div style="padding: 60px; text-align: center; color: #64748b; font-size: 11pt;">
          출력할 문장 데이터가 없습니다. 먼저 스크립트를 입력하고 해석을 생성하세요.
        </div>
      `;
      return;
    }

    const isTeacher = this.handoutMode === 'teacher';

    // 1. FRONT PAGE (앞면: 오직 소리 청취 약형드랩만 - 청크 분리 표시 '||' 일체 없음!)
    let frontSentencesHtml = '';
    sentences.forEach((stn, idx) => {
      // Natural continuous English sentence with FELS blanks, NO chunk divider (' || ')
      const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
      const wordParts = words.map(w => {
        const fels = getFelsInfo(w);
        if (fels) {
          if (isTeacher) {
            return `<span class="handout-fels-blank answer-mode">[ ${w} ]</span>`;
          } else {
            return `<span class="handout-fels-blank">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</span>`;
          }
        } else {
          return `<span>${w}</span>`;
        }
      });

      const naturalSentenceHtml = wordParts.join(' ');

      frontSentencesHtml += `
        <div class="handout-stn-item">
          <div class="handout-stn-main-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-stn-text">${naturalSentenceHtml}</div>
          </div>
          <div class="handout-dictation-line">
            <span>✍️ 받아쓰기 / 메모:</span>
            <span class="handout-line-filler"></span>
          </div>
        </div>
      `;
    });

    // 2. BACK PAGE (뒷면: 직독직해 우리말 해석만 - 학생들이 보며 영어 문장 말하기 연습)
    let backSentencesHtml = '';
    sentences.forEach((stn, idx) => {
      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];

      const chunkedKoSegments = chunks.map(c => {
        const koText = (c.ko || '').trim() || (c.en || '').trim();
        return `<span class="handout-chunk-box">[ ${koText} ]</span>`;
      });
      const chunkedKoHtml = chunkedKoSegments.join('<span class="handout-chunk-divider"> || </span>');

      backSentencesHtml += `
        <div class="handout-stn-item handout-speaking-item">
          <div class="handout-speaking-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-direct-ko">${chunkedKoHtml}</div>
          </div>
          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${stn.text}</div>` : ''}
          <div class="handout-speaking-check-row">
            <span class="speaking-check-label">🗣️ 말하기 훈련 체크:</span>
            <span class="check-box-pill">☐ 1차: 청크별 낭독</span>
            <span class="check-box-pill">☐ 2차: 직독직해 스피킹</span>
            <span class="check-box-pill">☐ 3차: 유창성 통과</span>
          </div>
        </div>
      `;
    });

    this.printableSheet.innerHTML = `
      <!-- ========================================================================= -->
      <!-- [A4 1페이지 - 앞면: 약형드랩 듣기 훈련지 (우리말 해석 없음 / 소리만 듣고 빈칸 채우기)] -->
      <!-- ========================================================================= -->
      <div class="a4-page-sheet a4-page-front">
        <div class="handout-sheet-label no-print">📄 [A4 1페이지 - 앞면: 약형드랩 듣기 훈련지] (우리말 해석 없음 / 소리 듣고 빈칸 채우기)</div>
        <div>
          <!-- Front Header -->
          <div class="handout-page-header">
            <div class="handout-title-area">
              <h2>CE Tool 문장 단위 약형드랩(FELS) 청크 학습지 [앞면]</h2>
              <div class="handout-subtitle">
                ${isTeacher ? '★ [교사용 정답지] 기능어 정답 확인용' : '★ [학생용 듣기 훈련지] 원어민 음성 청취 빈칸 채우기 (소리 집중 훈련)'}
              </div>
            </div>
            <table class="handout-score-table">
              <tr>
                <th>학 번</th>
                <th>이 름</th>
                <th>날 짜</th>
                <th>점 수</th>
              </tr>
              <tr>
                <td style="width: 55px; height: 22px;"></td>
                <td style="width: 65px;"></td>
                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                <td style="width: 60px; font-weight: 700;">&nbsp;&nbsp;&nbsp;&nbsp; / 100</td>
              </tr>
            </table>
          </div>

          <!-- Front Instructions -->
          <div class="handout-instructions-box">
            <strong>※ [앞면 학습 지침]</strong> 
            ① 원어민 음성을 집중 청취하고 <strong>[ &nbsp;&nbsp;&nbsp;&nbsp; ]</strong> 빈칸에 들리는 약형 기능어(전치사, 관사, 대명사, 조동사, be동사 등)를 소리만 듣고 바르게 적으세요. 
            ② 우리말 해석이나 청크 끊기 표시 없이 자연스러운 영어 문장의 소리에만 집중하는 훈련입니다.
          </div>

          <!-- Front Sentences -->
          <div class="handout-sentences-container">
            ${frontSentencesHtml}
          </div>
        </div>

        <!-- Front Footer -->
        <div class="handout-page-footer">
          <div class="handout-rules-bar">
            <strong>[FELS 약형 7대 영역]</strong>
            <span>①관사(a, an, the)</span>
            <span>②전치사(to, of, in, at, for, on, with)</span>
            <span>③대명사(it, you, him, her, them, that)</span>
            <span>④조동사(can, will, would, should)</span>
            <span>⑤접속사(and, but, that)</span>
            <span>⑥be동사(is, are, was, were)</span>
            <span>⑦축약형/부정(n't, 's, 've)</span>
          </div>
          <div class="handout-footer-meta">
            <span>CE Tool • Function-Embedded Listening Skills (FELS) System</span>
            <span>A4 양면 유인물 • 앞면 (Page 1 of 2)</span>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- [A4 2페이지 - 뒷면: 직독직해 말하기 훈련지 (우리말 해석 보며 영어 문장 말하기)] -->
      <!-- ========================================================================= -->
      <div class="a4-page-sheet a4-page-back">
        <div class="handout-sheet-label no-print">📄 [A4 2페이지 - 뒷면: 직독직해 말하기 훈련지] (우리말 해석 보며 영어 문장 말하기 연습)</div>
        <div>
          <!-- Back Header -->
          <div class="handout-page-header">
            <div class="handout-title-area">
              <h2>CE Tool 문장 단위 직독직해 말하기 훈련지 [뒷면]</h2>
              <div class="handout-subtitle">
                ${isTeacher ? '★ [교사용 가이드] 직독직해 청크 및 영작 모범 답안' : '★ [학생용 스피킹 훈련지] 직독직해 우리말 청크를 보면서 영어 문장 구두 발화하기'}
              </div>
            </div>
            <table class="handout-score-table">
              <tr>
                <th>학 번</th>
                <th>이 름</th>
                <th>날 짜</th>
                <th>말하기 평가</th>
              </tr>
              <tr>
                <td style="width: 55px; height: 22px;"></td>
                <td style="width: 65px;"></td>
                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                <td style="width: 60px; font-weight: 700; font-size: 8pt;">[ &nbsp; 통과 &nbsp; ]</td>
              </tr>
            </table>
          </div>

          <!-- Back Instructions -->
          <div class="handout-instructions-box">
            <strong>※ [뒷면 학습 지침]</strong> 
            ① 청크 단위('||')로 제시된 직독직해 우리말 어순을 보며, 지체 없이 영어 문장을 큰 소리로 말해보세요(직독직해 영작 및 스피킹 훈련). 
            ② 학생들은 직독직해를 보면서 영어 문장을 구두로 유창하게 말하는 연습을 합니다.
          </div>

          <!-- Back Sentences -->
          <div class="handout-sentences-container">
            ${backSentencesHtml}
          </div>
        </div>

        <!-- Back Footer -->
        <div class="handout-page-footer">
          <div class="handout-rules-bar">
            <strong>[직독직해 스피킹 3원칙]</strong>
            <span>① 우리말 어순 그대로 끊어 읽기</span>
            <span>② 청크를 보는 즉시 0.5초 내 영어 발화</span>
            <span>③ 막힘없이 연결하여 전체 영어 문장 완성</span>
          </div>
          <div class="handout-footer-meta">
            <span>CE Tool • Chunk Direct Translation & Speaking System</span>
            <span>A4 양면 유인물 • 뒷면 (Page 2 of 2)</span>
          </div>
        </div>
      </div>
    `;
  }

  downloadHandoutHtml() {
    const sheetHtml = this.printableSheet ? this.printableSheet.innerHTML : '';
    if (!sheetHtml) {
      toast.show('⚠️ 다운로드할 유인물 내용이 없습니다.');
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>CE Tool - A4 양면 약형드랩 & 직독직해 유인물</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pretendard", sans-serif; margin: 0; padding: 24px; background: #2b303a; color: #111827; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
    .a4-printable-sheet { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 32px; width: 100%; max-width: 210mm; margin: 0 auto; }
    .a4-page-sheet { width: 100%; min-height: 297mm; background: #ffffff; color: #111827; padding: 14mm 16mm; box-shadow: 0 10px 35px rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: flex-start; position: relative; box-sizing: border-box; }
    .handout-sheet-label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 800; color: #4338ca; background: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 9999px; padding: 4px 14px; margin-bottom: 12px; }
    .handout-page-header { border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
    .handout-title-area h2 { font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
    .handout-subtitle { font-size: 8.5pt; color: #475569; font-weight: 600; }
    .handout-score-table { border-collapse: collapse; font-size: 8.5pt; }
    .handout-score-table th, .handout-score-table td { border: 1px solid #64748b; padding: 3px 8px; text-align: center; }
    .handout-score-table th { background: #f1f5f9; font-weight: 700; }
    .handout-instructions-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; font-size: 8.5pt; line-height: 1.35; color: #334155; margin-bottom: 12px; }
    .handout-sentences-container { display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .handout-stn-item { border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 10px; background: #ffffff; }
    .handout-stn-main-row { margin-bottom: 4px; }
    .handout-stn-num { display: inline-block; font-weight: 800; font-size: 9pt; background: #0f172a; color: #ffffff; padding: 1px 6px; border-radius: 3px; margin-right: 6px; }
    .handout-stn-text { font-size: 10.5pt; font-weight: 600; color: #0f172a; line-height: 1.5; display: inline; }
    .handout-chunk-divider { display: inline-block; color: #0284c7; font-weight: 800; font-family: monospace; margin: 0 4px; }
    .handout-fels-blank { display: inline-block; min-width: 48px; border-bottom: 1.5px solid #0f172a; text-align: center; font-weight: 700; padding: 0 4px; margin: 0 2px; }
    .handout-fels-blank.answer-mode { color: #2563eb; background: #eff6ff; border-bottom: 2px solid #2563eb; }
    .handout-dictation-line { margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 3px; font-size: 8pt; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
    .handout-line-filler { flex: 1; border-bottom: 1px dashed #94a3b8; height: 12px; display: inline-block; }
    .handout-speaking-item { background: #f8fafc; border-left: 4px solid #0284c7; }
    .handout-speaking-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .handout-direct-ko { font-size: 10.5pt; font-weight: 700; color: #0f172a; line-height: 1.5; flex: 1; }
    .handout-chunk-box { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 1px 6px; border-radius: 3px; font-weight: 700; margin: 1px 2px; }
    .handout-teacher-en-ref { font-size: 8.5pt; color: #475569; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 3px 8px; border-radius: 4px; margin-bottom: 6px; }
    .handout-speaking-check-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 8pt; color: #64748b; }
    .speaking-check-label { font-weight: 700; color: #0f172a; }
    .check-box-pill { display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 6px; }
    .handout-page-footer { border-top: 1.5px solid #111827; padding-top: 6px; margin-top: auto; }
    .handout-rules-bar { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 7.8pt; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; }
    .handout-footer-meta { display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }
    @media print {
      body { padding: 0 !important; background: #ffffff !important; }
      .a4-printable-sheet { max-width: 100% !important; gap: 0 !important; }
      .a4-page-sheet { box-shadow: none !important; min-height: 275mm !important; padding: 4mm 6mm !important; page-break-after: always !important; break-after: page !important; }
      .a4-page-sheet.a4-page-back { page-break-after: auto !important; break-after: auto !important; }
      .no-print, .handout-sheet-label { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="a4-printable-sheet">
    ${sheetHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CE_Tool_약형드랩_양면유인물_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show('📥 A4 양면 유인물 HTML 파일이 다운로드되었습니다.');
  }

  formatSec(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  setLoading(isLoading) {
    if (!this.btnTranslate) return;
    if (isLoading) {
      this.btnTranslate.disabled = true;
      this.btnTranslate.innerHTML = `
        <svg class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <span>처리 중...</span>
      `;
    } else {
      this.btnTranslate.disabled = false;
      const mode = appState.currentMode;
      const btnLabel = mode === 'audio' 
        ? '🎙️ 음성에서 스크립트 추출 및 3x1 생성' 
        : (mode === 'both' ? '3x1 생성 및 음성 연동' : '3x1 해석 및 FELS 생성');
      this.btnTranslate.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
        <span id="btnTranslateText">${btnLabel}</span>
        <kbd class="btn-kbd">Ctrl+↵</kbd>
      `;
    }
  }

  onActivated() {
    // Re-render results if sentence list exists
    if (appState.sentenceList.length > 0) {
      this.renderParsedResults();
    } else if (this.inputEnglish && !this.inputEnglish.value) {
      this.inputEnglish.focus();
    }
  }

  onDeactivated() {}
}

  // =========================================================================
  // Module: src/views/practice-view.js
  // =========================================================================

/**
 * Page 2: Sentence Unit Weak-Form Chunk Practice View (PracticeView)
 * 
 * Strict Vertical Ordering:
 * ① [Top] FELS Weak-Form Chunk Learning Cards (#rowChunks)
 * ② [Middle] Natural Korean Translation (#rowNatural - hidden by default, toggle with 'T')
 * ③ [Bottom] Audio Waveform Player (#audioPlayerSection - sentence-unit zoomed waveform, A-B looper, 0.5s shadowing delay)
 * ④ [Bottom Docked] Sentence Navigator (#sentenceNavigator - prev/next, chips track, auto-advance)
 * 
 * Supports 9 Unified Global Shortcuts: Space, [, ], \, R, ←, →, S, T
 */












class PracticeView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();

    // Native Audio Player Element
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    // Section 1 (Top): Chunk Cards Elements
    this.chunksContainer = document.getElementById('chunksContainer');
    this.btnCheckFels = document.getElementById('btnCheckFels');
    this.btnToggleFelsMode = document.getElementById('btnToggleFelsMode');
    this.felsModeIcon = document.getElementById('felsModeIcon');
    this.felsModeLabel = document.getElementById('felsModeLabel');
    this.btnResetFels = document.getElementById('btnResetFels');
    this.btnFlipAllCards = document.getElementById('btnFlipAllCards');
    this.flipAllIcon = document.getElementById('flipAllIcon');
    this.flipAllLabel = document.getElementById('flipAllLabel');
    this.felsScoreBar = document.getElementById('felsScoreBar');
    this.felsScoreText = document.getElementById('felsScoreText');

    // Section 2 (Middle): Natural Korean Translation Elements
    this.rowNatural = document.getElementById('rowNatural');
    this.txtNatural = document.getElementById('txtNatural');
    this.maskCoverNatural = document.getElementById('maskCoverNatural');

    // Section 3 (Bottom): Audio Player & Waveform Elements
    this.audioPlayerSection = document.getElementById('audioPlayerSection');
    this.waveformCanvas = document.getElementById('waveformCanvas');
    this.waveformLoading = document.getElementById('waveformLoading');
    this.btnAudioPlay = document.getElementById('btnAudioPlay');
    this.iconPlay = document.getElementById('iconPlay');
    this.iconPause = document.getElementById('iconPause');
    this.audioFileName = document.getElementById('audioFileName');
    this.audioFileSize = document.getElementById('audioFileSize');
    this.audioCurrentTime = document.getElementById('audioCurrentTime');
    this.audioDuration = document.getElementById('audioDuration');
    this.speedBtns = document.querySelectorAll('.speed-btn');
    this.looperCountBtns = document.querySelectorAll('.looper-count-btn');
    this.btnClearLoop = document.getElementById('btnClearLoop');
    this.loopStatusBadge = document.getElementById('loopStatusBadge');
    this.loopRangeLabel = document.getElementById('loopRangeLabel');
    this.loopCountLabel = document.getElementById('loopCountLabel');
    this.shadowingIndicator = document.getElementById('shadowingIndicator');

    // Section 4 (Bottom Dock): Sentence Navigator Elements
    this.sentenceNavigator = document.getElementById('sentenceNavigator');
    this.btnPrevSentence = document.getElementById('btnPrevSentence');
    this.btnNextSentence = document.getElementById('btnNextSentence');
    this.currentSentenceNum = document.getElementById('currentSentenceNum');
    this.totalSentenceNum = document.getElementById('totalSentenceNum');
    this.sentenceChipsTrack = document.getElementById('sentenceChipsTrack');
    this.chkAutoAdvance = document.getElementById('chkAutoAdvance');

    // Engines
    this.waveformRenderer = new WaveformRenderer(this.waveformCanvas);
    this.looperEngine = new LooperEngine(this.nativeAudioPlayer, appState);

    // Canvas interaction state
    this.isCanvasMouseDown = false;
    this.isRangeDragging = false;
    this.dragStartX = null;
    this.currentMouseX = null;
    this.draggingDividerIndex = null;
    this.selectedDividerForMove = null;
    this.stabilizedWidths = [];
    this.felsBlanks = [];

    this.initLooperCallbacks();
    this.initEvents();
  }

  initLooperCallbacks() {
    this.looperEngine.setCallbacks({
      onLoopCountUpdate: (cur, target) => {
        this.updateLoopBadge();
      },
      onLoopComplete: (target) => {
        toast.show(`🔁 구간 ${target}회 반복 재생이 완료되었습니다.`);
        this.updatePlayPauseIcon(false);
        this.drawWaveform();
      },
      onShadowingWait: (isWaiting) => {
        if (this.shadowingIndicator) {
          this.shadowingIndicator.classList.toggle('hidden', !isWaiting);
        }
        this.drawWaveform();
      },
      onAutoAdvance: () => {
        if (appState.activeSentenceIndex < appState.sentenceList.length - 1) {
          toast.show('⏭️ 다음 문장으로 자동 이동합니다...');
          this.nextSentence();
        }
      },
      onPlayStateChange: (isPlaying) => {
        this.updatePlayPauseIcon(isPlaying);
      }
    });
  }

  initEvents() {
    // 1. Audio Player Events
    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('loadedmetadata', () => {
        this.onAudioLoaded();
      });

      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        this.updateAudioProgress();
        this.looperEngine.checkBoundary();
        this.drawWaveform();
      });

      this.nativeAudioPlayer.addEventListener('play', () => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
      });

      this.nativeAudioPlayer.addEventListener('pause', () => {
        this.updatePlayPauseIcon(false);
      });

      this.nativeAudioPlayer.addEventListener('ended', () => {
        this.updatePlayPauseIcon(false);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      });
    }

    if (this.btnAudioPlay) {
      this.btnAudioPlay.addEventListener('click', () => this.togglePlayPause());
    }

    // Playback Speed
    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.setPlaybackSpeed(speed, btn);
      });
    });

    // Repeat Counts
    this.looperCountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const count = btn.getAttribute('data-count');
        this.looperCountBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        appState.targetLoopCount = count === 'infinite' ? Infinity : parseInt(count, 10);
        this.updateLoopBadge();
        const str = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
        toast.show(`반복 횟수가 ${str}로 변경되었습니다.`);
      });
    });

    // Clear Loop
    if (this.btnClearLoop) {
      this.btnClearLoop.addEventListener('click', () => this.clearSelectedRegion());
    }

    // Canvas Events
    this.initWaveformCanvasEvents();

    // 2. FELS Card Controls
    if (this.btnCheckFels) {
      this.btnCheckFels.addEventListener('click', () => this.checkFelsAnswers());
    }
    if (this.btnToggleFelsMode) {
      this.btnToggleFelsMode.addEventListener('click', () => this.toggleFelsMode());
    }
    if (this.btnResetFels) {
      this.btnResetFels.addEventListener('click', () => this.resetFelsInputs());
    }
    if (this.btnFlipAllCards) {
      this.btnFlipAllCards.addEventListener('click', () => this.toggleFlipAllCards());
    }

    // Row Natural Visibility (Click mask to reveal, click text to hide)
    if (this.maskCoverNatural) {
      this.maskCoverNatural.addEventListener('click', () => this.setRowNaturalVisibility(true));
    }

    if (this.txtNatural) {
      this.txtNatural.addEventListener('click', () => {
        if (appState.naturalVisible) {
          this.setRowNaturalVisibility(false);
        }
      });
      this.txtNatural.title = '클릭하여 해석 가리기 (T)';
    }

    const rowContentNatural = this.rowNatural ? this.rowNatural.querySelector('.row-content') : null;
    if (rowContentNatural) {
      rowContentNatural.addEventListener('click', (e) => {
        if (e.target.closest('#maskCoverNatural')) return;
        if (appState.naturalVisible) {
          this.setRowNaturalVisibility(false);
        }
      });
    }

    const toggleRowNaturalBtn = document.querySelector('[data-target="rowNatural"]');
    if (toggleRowNaturalBtn) {
      toggleRowNaturalBtn.addEventListener('click', () => this.toggleRowNaturalVisibility());
    }

    // Copy & Speak Row buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        this.copyResult(target, btn);
      });
    });

    document.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        this.speakResult(target);
      });
    });

    // 3. Sentence Navigator Events
    if (this.btnPrevSentence) {
      this.btnPrevSentence.addEventListener('click', () => this.prevSentence());
    }
    if (this.btnNextSentence) {
      this.btnNextSentence.addEventListener('click', () => this.nextSentence());
    }
    if (this.chkAutoAdvance) {
      this.chkAutoAdvance.addEventListener('change', (e) => {
        appState.isAutoAdvance = e.target.checked;
        toast.show(appState.isAutoAdvance ? '⏩ 다음 문장 자동 이동이 활성화되었습니다.' : '다음 문장 자동 이동이 해제되었습니다.');
      });
    }

    // Listen to AppState events
    appState.on('sentencesLoaded', (list) => {
      this.renderSentenceNavigator();
      this.loadSentence(0);
    });

    appState.on('activeSentenceChanged', ({ index }) => {
      this.loadSentence(index);
    });

    window.addEventListener('resize', () => {
      this.drawWaveform();
    });

    // Resize observer on waveform container to ensure wave window is always drawn
    if (this.waveformCanvas && this.waveformCanvas.parentElement && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        this.drawWaveform();
      });
      ro.observe(this.waveformCanvas.parentElement);
    }
  }

  initWaveformCanvasEvents() {
    if (!this.waveformCanvas) return;
    const canvas = this.waveformCanvas;

    canvas.addEventListener('mousedown', (e) => {
      if (!this.nativeAudioPlayer.src) return;
      const rect = canvas.getBoundingClientRect();
      this.isCanvasMouseDown = true;
      this.dragStartX = e.clientX - rect.left;
      this.currentMouseX = this.dragStartX;
      this.isRangeDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isCanvasMouseDown || !this.waveformCanvas) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.currentMouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      if (Math.abs(this.currentMouseX - this.dragStartX) > 5) {
        this.isRangeDragging = true;
        this.drawWaveform();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isCanvasMouseDown) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

      const activeStn = appState.getActiveSentence();
      const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
        ? this.nativeAudioPlayer.duration
        : (appState.audioBuffer ? appState.audioBuffer.duration : 0);

      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : totalDuration;
      const stnDuration = Math.max(0.1, stnEnd - stnStart);

      if (totalDuration > 0 || stnDuration > 0) {
        if (this.isRangeDragging && Math.abs(curX - this.dragStartX) > 8) {
          // A-B Looper Drag Selection inside sentence
          const x1 = Math.min(this.dragStartX, curX);
          const x2 = Math.max(this.dragStartX, curX);
          const t1 = stnStart + (x1 / rect.width) * stnDuration;
          const t2 = stnStart + (x2 / rect.width) * stnDuration;
          this.setLoopRange(t1, t2);
        } else {
          // Instant Seek on Click
          const seekRatio = Math.max(0, Math.min(1, curX / rect.width));
          this.seekAudio(stnStart + seekRatio * stnDuration);
        }
      }

      this.isCanvasMouseDown = false;
      this.isRangeDragging = false;
      this.dragStartX = null;
      this.currentMouseX = null;
      this.drawWaveform();
    });
  }

  async loadSentence(idx) {
    if (!appState.sentenceList || idx < 0 || idx >= appState.sentenceList.length) return;
    const targetStn = appState.sentenceList[idx];

    // Compute or fetch 3x1 chunk result
    if (!targetStn.result) {
      if (aiService.hasKey()) {
        try {
          toast.show(`🤖 문장 S${idx + 1} AI 3x1 해석 생성 중...`);
          targetStn.result = await aiService.translate(targetStn.text);
        } catch (e) {
          console.warn('AI translation failed, using rule engine:', e);
          targetStn.result = this.ruleEngine.process(targetStn.text);
        }
      } else {
        targetStn.result = this.ruleEngine.process(targetStn.text);
      }
    }

    // Sanity check: Ensure this sentence does not contain foreign chunks belonging to other sentences
    if (appState.sentenceList.length > 1 && targetStn.result?.chunks?.length > 1) {
      const otherSentences = appState.sentenceList.filter((_, sIdx) => sIdx !== idx).map(s => s.text);
      const hasForeignChunks = targetStn.result.chunks.some(chunk => {
        const cEn = (chunk.en || '').trim().toLowerCase();
        if (!cEn) return false;
        const inTarget = targetStn.text.toLowerCase().includes(cEn);
        const inOthers = otherSentences.some(stn => stn.toLowerCase().includes(cEn));
        return !inTarget && inOthers;
      });

      if (hasForeignChunks) {
        const allForeignAndLocalChunks = [...targetStn.result.chunks];
        const rawSentences = appState.sentenceList.map(s => s.text);
        const partitioned = distributeChunksSequentially(rawSentences, allForeignAndLocalChunks);

        partitioned.forEach((pChunks, pIdx) => {
          if (pChunks.length > 0 && appState.sentenceList[pIdx]) {
            appState.sentenceList[pIdx].result = {
              ...(appState.sentenceList[pIdx].result || {}),
              chunks: pChunks,
              chunk_text: pChunks.map(c => c.ko).join(' || '),
              direct: pChunks.map(c => c.ko).join(' / ')
            };
          }
        });
      }
    }

    // Extract peaks if not yet cached
    if (!targetStn.cachedPeaks) {
      targetStn.cachedPeaks = WaveformRenderer.extractSentencePeaks(appState.audioBuffer, targetStn);
    }

    // Synchronize Audio Player Source
    if (appState.uploadedAudioUrl && (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl)) {
      this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
      this.nativeAudioPlayer.muted = appState.isSynthesizedAudio;
    }

    // Update Natural Korean Text (Keep hidden by default)
    if (this.txtNatural) {
      this.txtNatural.textContent = targetStn.result.natural || '';
    }
    this.setRowNaturalVisibility(false); // Default hidden

    // Render Cards in Top Section
    this.renderChunkCards(targetStn.result.chunks || []);

    // Set Audio Player HUD
    if (appState.uploadedAudioFile) {
      if (this.audioFileName) this.audioFileName.textContent = appState.uploadedAudioFile.name;
    }
    if (targetStn.audioStart !== null && targetStn.audioEnd !== null) {
      if (this.nativeAudioPlayer.src) {
        try {
          this.nativeAudioPlayer.currentTime = targetStn.audioStart;
        } catch (e) {}
      }
    }

    // Clear previous loops
    this.clearSelectedRegion();
    this.updateSentenceChipsUI();
    this.drawWaveform();
  }

  renderChunkCards(chunks) {
    if (!this.chunksContainer) return;
    this.chunksContainer.innerHTML = '';
    this.felsBlanks = [];
    appState.areAllCardsFlipped = false;
    this.updateFlipAllButtonUI();

    if (!chunks || !chunks.length) {
      this.chunksContainer.innerHTML = '<span class="placeholder-text">청크 정보가 없습니다.</span>';
      return;
    }

    chunks.forEach((chunk, idx) => {
      // 3D Flip Card (Compact, Headerless, Single-Row)
      const card = document.createElement('div');
      card.className = 'chunk-card-3d';
      card.setAttribute('data-idx', idx);

      const inner = document.createElement('div');
      inner.className = 'card-inner';

      // FRONT FACE: English / FELS Weak-Form Blanks
      const frontFace = document.createElement('div');
      frontFace.className = 'card-face card-front';

      // Word container for FELS mode
      const felsWrap = document.createElement('div');
      felsWrap.className = 'chunk-tokens-wrap chunk-tokens-fels';
      if (!appState.isFelsMode) {
        felsWrap.classList.add('hidden');
        felsWrap.style.display = 'none';
      } else {
        felsWrap.style.display = 'inline-flex';
      }

      const words = (chunk.en || '').trim().split(/\s+/).filter(Boolean);
      words.forEach((word) => {
        const felsInfo = getFelsInfo(word);

        if (felsInfo) {
          const inputWrap = document.createElement('div');
          inputWrap.className = 'fels-input-wrap';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'fels-input fels-blank-input';
          input.setAttribute('data-answer', felsInfo.clean);
          input.setAttribute('data-original', word);
          input.setAttribute('data-category', felsInfo.label);
          input.placeholder = '[  ]';
          input.style.width = `${Math.min(84, Math.max(46, felsInfo.clean.length * 10 + 16))}px`;
          input.style.maxWidth = '90px';
          input.spellcheck = false;
          input.autocomplete = 'off';

          const trailingPunct = word.match(/[.,!?;:]+$/);
          const punctStr = trailingPunct ? trailingPunct[0] : '';

          inputWrap.appendChild(input);
          felsWrap.appendChild(inputWrap);

          if (punctStr) {
            const punctSpan = document.createElement('span');
            punctSpan.className = 'fels-punct';
            punctSpan.textContent = punctStr;
            felsWrap.appendChild(punctSpan);
          }

          this.felsBlanks.push({
            inputEl: input,
            answer: felsInfo.clean,
            original: word,
            category: felsInfo.label
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const nextInput = this.findNextBlank(input);
              if (nextInput) {
                nextInput.focus();
              } else {
                this.checkFelsAnswers();
              }
            }
          });
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'fels-token-content';
          wordSpan.textContent = word;
          felsWrap.appendChild(wordSpan);
        }
      });

      // Original English Text Container
      const origWrap = document.createElement('div');
      origWrap.className = 'chunk-tokens-original';
      if (appState.isFelsMode) {
        origWrap.classList.add('hidden');
        origWrap.style.display = 'none';
      } else {
        origWrap.style.display = 'inline-flex';
      }

      words.forEach((word) => {
        const origSpan = document.createElement('span');
        origSpan.className = 'orig-word-span';
        origSpan.textContent = word;
        origWrap.appendChild(origSpan);
      });

      frontFace.appendChild(felsWrap);
      frontFace.appendChild(origWrap);

      // BACK FACE: Korean Chunk
      const backFace = document.createElement('div');
      backFace.className = 'card-face card-back';

      const koWrap = document.createElement('div');
      koWrap.className = 'ko-chunk-content';
      koWrap.textContent = chunk.ko || '';

      backFace.appendChild(koWrap);

      const keyNum = idx + 1;
      if (keyNum <= 9) {
        const keyBadge = document.createElement('span');
        keyBadge.className = 'practice-key-badge';
        keyBadge.textContent = `${keyNum}`;
        keyBadge.title = `숫자키 [${keyNum}] 뒤집기`;
        inner.appendChild(keyBadge);
      }

      inner.appendChild(frontFace);
      inner.appendChild(backFace);
      card.appendChild(inner);

      // Card Click Flip
      card.addEventListener('click', (e) => {
        if (e.target.closest('input') || e.target.closest('.fels-input-wrap')) return;
        card.classList.toggle('flipped');
      });

      this.chunksContainer.appendChild(card);
    });

    // Compute locked card widths
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
    }, 50);
  }

  translateCustomChunk(chunkEn, originalChunks = []) {
    const cleanEn = chunkEn.trim();
    if (!cleanEn) return '';
    const existing = (originalChunks || []).find(c => c.en && c.en.trim().toLowerCase() === cleanEn.toLowerCase());
    if (existing && existing.ko) return existing.ko;

    try {
      const parsed = this.ruleEngine.process(cleanEn);
      if (parsed && parsed.chunks && parsed.chunks.length > 0) {
        return parsed.chunks.map(c => c.ko).join(' ');
      }
      if (parsed && parsed.natural) return parsed.natural;
    } catch (e) {}

    return this.ruleEngine.translatePhrase(cleanEn) || cleanEn;
  }

  findNextBlank(currentInput) {
    const idx = this.felsBlanks.findIndex(b => b.inputEl === currentInput);
    if (idx !== -1 && idx + 1 < this.felsBlanks.length) {
      return this.felsBlanks[idx + 1].inputEl;
    }
    return null;
  }

  computeAndApplyStabilizedWidths() {
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards.length) return;

    this.stabilizedWidths = [];

    cards.forEach((card) => {
      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');
      const koWrap = card.querySelector('.ko-chunk-content');

      let wFels = 0;
      let wOrig = 0;
      let wKo = 0;

      if (felsWrap) {
        const wasHidden = felsWrap.classList.contains('hidden');
        felsWrap.classList.remove('hidden');
        const prevDisp = felsWrap.style.display;
        felsWrap.style.display = 'inline-flex';
        wFels = felsWrap.scrollWidth || 0;
        felsWrap.style.display = prevDisp;
        if (wasHidden) felsWrap.classList.add('hidden');
      }

      if (origWrap) {
        const wasHidden = origWrap.classList.contains('hidden');
        origWrap.classList.remove('hidden');
        const prevDisp = origWrap.style.display;
        origWrap.style.display = 'inline-flex';
        wOrig = origWrap.scrollWidth || 0;
        origWrap.style.display = prevDisp;
        if (wasHidden) origWrap.classList.add('hidden');
      }

      if (koWrap) {
        wKo = koWrap.scrollWidth || 0;
      }

      // Dynamic width per card based on content length with clean breathing room
      const contentWidth = Math.max(wFels, wOrig, wKo);
      const finalCardWidth = Math.max(48, Math.ceil(contentWidth + 24));

      card.style.flex = '0 0 auto';
      card.style.width = `${finalCardWidth}px`;
      card.style.minWidth = `${finalCardWidth}px`;
    });
  }

  // --- Shortcut & UI Actions ---

  togglePlayPause() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    if (this.nativeAudioPlayer.paused) {
      const activeStn = appState.getActiveSentence();
      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : this.nativeAudioPlayer.duration;

      if (appState.loopStart !== null && appState.loopEnd !== null) {
        if (this.nativeAudioPlayer.currentTime < appState.loopStart || this.nativeAudioPlayer.currentTime >= appState.loopEnd) {
          this.nativeAudioPlayer.currentTime = appState.loopStart;
        }
      } else {
        if (this.nativeAudioPlayer.currentTime < stnStart || this.nativeAudioPlayer.currentTime >= stnEnd) {
          this.nativeAudioPlayer.currentTime = stnStart;
        }
      }

      this.nativeAudioPlayer.play().then(() => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
        if (appState.isSynthesizedAudio && activeStn) {
          speakText(activeStn.text);
        }
      }).catch(e => console.error(e));
    } else {
      this.nativeAudioPlayer.pause();
      this.updatePlayPauseIcon(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  setRegionStartFromCurrentTime() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }
    const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;
    appState.loopStart = cur;

    if (appState.loopEnd !== null && appState.loopEnd <= appState.loopStart) {
      appState.loopEnd = null;
    }

    if (appState.loopEnd !== null) {
      this.setLoopRange(appState.loopStart, appState.loopEnd);
      toast.show(`🚩 [A] 시작점 설정: ${formatPreciseTime(appState.loopStart)} (루프: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)})`);
    } else {
      appState.currentLoopCount = 0;
      this.updateLoopBadge();
      if (this.loopStatusBadge) {
        this.loopStatusBadge.classList.remove('hidden');
        this.loopRangeLabel.textContent = `시작점 [A]: ${formatPreciseTime(appState.loopStart)} ~ (']' 끝점 대기)`;
        this.loopCountLabel.textContent = '';
      }
      this.drawWaveform();
      toast.show(`🚩 [A] 시작점 설정: ${formatPreciseTime(appState.loopStart)} (']' 키를 눌러 끝점을 확정하세요)`);
    }
  }

  setRegionEndFromCurrentTime() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }
    const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;
    const activeStn = appState.getActiveSentence();
    const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;

    let start = appState.loopStart !== null ? appState.loopStart : stnStart;
    let end = cur;

    if (end <= start) {
      if (start - end > 0.3) {
        const temp = start;
        start = end;
        end = temp;
      } else {
        end = start + 0.5;
      }
    }

    this.setLoopRange(start, end);
    const countStr = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
    toast.show(`🏁 [B] 끝점 확정: ${formatPreciseTime(end)} ➔ A-B 구간 ${countStr} 반복 시작!`);
  }

  setLoopRange(start, end) {
    if (Math.abs(end - start) < 0.2) return;
    appState.setLoopRange(start, end);
    this.updateLoopBadge();

    this.nativeAudioPlayer.currentTime = appState.loopStart;
    this.nativeAudioPlayer.play().then(() => {
      this.updatePlayPauseIcon(true);
      this.startWaveformPlaybackLoop();
      if (appState.isSynthesizedAudio) {
        const activeStn = appState.getActiveSentence();
        if (activeStn) speakText(activeStn.text);
      }
    }).catch(e => console.error(e));

    this.drawWaveform();
  }

  clearSelectedRegion() {
    appState.clearLoop();
    this.looperEngine.reset();
    if (this.loopStatusBadge) this.loopStatusBadge.classList.add('hidden');
    this.drawWaveform();
  }

  startRegionLoop() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    const activeStn = appState.getActiveSentence();

    if (appState.loopStart !== null && appState.loopEnd !== null) {
      appState.currentLoopCount = 0;
      this.looperEngine.reset();
      this.updateLoopBadge();

      this.nativeAudioPlayer.currentTime = appState.loopStart;
      this.nativeAudioPlayer.play().then(() => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
        if (appState.isSynthesizedAudio && activeStn) {
          speakText(activeStn.text);
        }
      }).catch(e => console.error(e));

      const countStr = appState.targetLoopCount === Infinity ? '무한' : `${appState.targetLoopCount}회`;
      toast.show(`🔁 구간 반복 재생 시작: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)} (${countStr})`);
    } else if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null) {
      this.setLoopRange(activeStn.audioStart, activeStn.audioEnd);
      toast.show(`🔁 S${appState.activeSentenceIndex + 1} 문장 구간 반복 재생을 시작합니다.`);
    } else {
      const dur = this.nativeAudioPlayer.duration || 1;
      this.setLoopRange(0, dur);
      toast.show('🔁 전체 오디오 구간 반복 재생을 시작합니다.');
    }
  }

  prevSentence() {
    if (appState.activeSentenceIndex > 0) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex - 1);
      toast.show(`⬅️ 이전 문장 (S${appState.activeSentenceIndex + 1}/${appState.sentenceList.length})`);
    } else {
      toast.show('첫 번째 문장입니다.');
    }
  }

  nextSentence() {
    if (appState.sentenceList && appState.activeSentenceIndex < appState.sentenceList.length - 1) {
      appState.setActiveSentenceIndex(appState.activeSentenceIndex + 1);
      toast.show(`➡️ 다음 문장 (S${appState.activeSentenceIndex + 1}/${appState.sentenceList.length})`);
    } else {
      toast.show('마지막 문장입니다.');
    }
  }

  toggleFelsMode() {
    appState.isFelsMode = !appState.isFelsMode;
    this.updateFelsModeButtonUI();

    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    cards.forEach((card, idx) => {
      const felsWrap = card.querySelector('.chunk-tokens-fels');
      const origWrap = card.querySelector('.chunk-tokens-original');

      if (felsWrap && origWrap) {
        if (appState.isFelsMode) {
          felsWrap.classList.remove('hidden');
          felsWrap.style.display = 'inline-flex';
          origWrap.classList.add('hidden');
          origWrap.style.display = 'none';
        } else {
          felsWrap.classList.add('hidden');
          felsWrap.style.display = 'none';
          origWrap.classList.remove('hidden');
          origWrap.style.display = 'inline-flex';
        }
      }

      if (this.stabilizedWidths[idx]) {
        card.style.width = `${this.stabilizedWidths[idx]}px`;
      }
    });

    toast.show(appState.isFelsMode ? '✏️ FELS 빈칸 모드로 전환되었습니다.' : '📖 원문 전체 보기 모드로 전환되었습니다.');
  }

  updateFelsModeButtonUI() {
    if (this.felsModeIcon && this.felsModeLabel) {
      if (appState.isFelsMode) {
        this.felsModeIcon.textContent = '🔤';
        this.felsModeLabel.textContent = '원문 보기';
      } else {
        this.felsModeIcon.textContent = '✏️';
        this.felsModeLabel.textContent = 'FELS 빈칸';
      }
    }
  }

  checkFelsAnswers() {
    if (!this.felsBlanks.length) {
      toast.show('확인할 FELS 빈칸이 없습니다.');
      return;
    }

    if (!appState.isFelsMode) {
      this.toggleFelsMode();
    }

    let correctCount = 0;
    const totalCount = this.felsBlanks.length;

    this.felsBlanks.forEach(item => {
      if (!item.inputEl) return;
      const userVal = (item.inputEl.value || '').trim().toLowerCase();
      const expected = (item.answer || '').toLowerCase();

      const parent = item.inputEl.parentElement;
      if (parent && typeof parent.querySelector === 'function') {
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      }

      if (userVal === expected) {
        correctCount++;
        item.inputEl.classList.remove('is-wrong');
        item.inputEl.classList.add('is-correct');
      } else {
        item.inputEl.classList.remove('is-correct');
        item.inputEl.classList.add('is-wrong');

        if (parent) {
          const displayAnswer = item.original ? item.original.replace(/[.,!?;:]+$/, '') : item.answer;
          const revealBadge = document.createElement('span');
          revealBadge.className = 'fels-answer-reveal';
          revealBadge.textContent = displayAnswer;
          revealBadge.title = `정답: ${displayAnswer} (${item.category || '약형'})`;
          parent.appendChild(revealBadge);
        }
      }
    });

    const percentage = Math.round((correctCount / totalCount) * 100);

    if (this.felsScoreText && this.felsScoreBar) {
      this.felsScoreText.innerHTML = `
        🎯 <strong>채점 결과:</strong> 총 ${totalCount}개 중 <strong>${correctCount}개</strong> 정답 (${percentage}%) 
        <span style="font-weight: 500; font-size: 0.8rem; margin-left: 8px;">
          ${percentage === 100 ? '🎉 완벽합니다! 약형 기능어를 모두 청취했습니다.' : '💡 오답 항목 아래 표시된 초록색 정답을 확인해보세요.'}
        </span>
      `;
      this.felsScoreBar.classList.remove('hidden');
    }

    toast.show(`채점 완료! 정답: ${correctCount}/${totalCount}개 (${percentage}%)`);
  }

  resetFelsInputs() {
    this.felsBlanks.forEach(item => {
      if (!item.inputEl) return;
      item.inputEl.value = '';
      item.inputEl.classList.remove('is-correct', 'is-wrong');
      const parent = item.inputEl.parentElement;
      if (parent && typeof parent.querySelector === 'function') {
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      }
    });
    if (this.felsScoreBar) this.felsScoreBar.classList.add('hidden');
    if (this.felsBlanks.length > 0) {
      this.felsBlanks[0].inputEl.focus();
    }
    toast.show('빈칸이 초기화되었습니다. 다시 입력해 보세요.');
  }

  toggleFlipAllCards() {
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards.length) return;

    appState.areAllCardsFlipped = !appState.areAllCardsFlipped;
    cards.forEach(card => {
      card.classList.toggle('flipped', appState.areAllCardsFlipped);
    });
    this.updateFlipAllButtonUI();
    toast.show(appState.areAllCardsFlipped ? '🔄 모든 카드를 해석(뒷면)으로 뒤집었습니다.' : '🔄 모든 카드를 영어(앞면)로 뒤집었습니다.');
  }

  flipCardByIndex(num) {
    if (!this.chunksContainer) return;
    const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
    if (!cards || !cards.length) return;
    const cardIndex = num - 1;
    if (cardIndex >= 0 && cardIndex < cards.length) {
      const card = cards[cardIndex];
      card.classList.toggle('flipped');
      toast.show(`청크 #${num} 뒤집기`);
    }
  }

  updateFlipAllButtonUI() {
    if (!this.flipAllLabel || !this.flipAllIcon) return;
    if (appState.areAllCardsFlipped) {
      this.flipAllLabel.textContent = '영어 앞면';
      this.flipAllIcon.textContent = '🔤';
    } else {
      this.flipAllLabel.textContent = '해석 뒷면';
      this.flipAllIcon.textContent = '🔄';
    }
  }

  // --- Row Natural Visibility ---

  toggleRowNaturalVisibility() {
    this.setRowNaturalVisibility(!appState.naturalVisible);
  }

  setRowNaturalVisibility(makeVisible) {
    appState.naturalVisible = makeVisible;
    if (!this.rowNatural) return;

    const rowContent = this.rowNatural.querySelector('.row-content');
    const maskCover = this.rowNatural.querySelector('.row-mask-cover');
    const toggleBtn = document.querySelector('[data-target="rowNatural"]');

    if (makeVisible) {
      if (rowContent) rowContent.classList.remove('is-masked');
      if (maskCover) maskCover.classList.add('hidden');
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.title = '해석 가리기 (T)';
      }
    } else {
      if (rowContent) rowContent.classList.add('is-masked');
      if (maskCover) maskCover.classList.remove('hidden');
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.title = '해석 보기 (T)';
      }
    }
  }

  // --- Sentence Navigator ---

  renderSentenceNavigator() {
    if (!this.sentenceNavigator || !appState.sentenceList || appState.sentenceList.length === 0) {
      if (this.sentenceNavigator) this.sentenceNavigator.classList.add('hidden');
      return;
    }

    this.sentenceNavigator.classList.remove('hidden');
    if (this.totalSentenceNum) this.totalSentenceNum.textContent = appState.sentenceList.length;

    if (this.sentenceChipsTrack) {
      this.sentenceChipsTrack.innerHTML = '';
      appState.sentenceList.forEach((stn, idx) => {
        const chip = document.createElement('button');
        chip.className = `sentence-chip ${idx === appState.activeSentenceIndex ? 'active' : ''}`;
        chip.setAttribute('data-stn-idx', idx);

        let timeStr = '';
        if (stn.audioStart !== null && stn.audioEnd !== null) {
          timeStr = ` (${formatTime(stn.audioStart)})`;
        }

        chip.innerHTML = `<span class="chip-num">S${idx + 1}</span>`;
        chip.title = `${stn.text}${timeStr ? ' ' + timeStr : ''}`;

        chip.addEventListener('click', () => {
          appState.setActiveSentenceIndex(idx);
        });

        this.sentenceChipsTrack.appendChild(chip);
      });
    }

    this.updateSentenceChipsUI();
  }

  updateSentenceChipsUI() {
    if (!this.sentenceNavigator) return;
    if (this.currentSentenceNum) {
      this.currentSentenceNum.textContent = appState.activeSentenceIndex + 1;
    }
    if (this.btnPrevSentence) {
      this.btnPrevSentence.disabled = (appState.activeSentenceIndex <= 0);
    }
    if (this.btnNextSentence) {
      this.btnNextSentence.disabled = (appState.activeSentenceIndex >= appState.sentenceList.length - 1);
    }

    if (this.sentenceChipsTrack) {
      const chips = this.sentenceChipsTrack.querySelectorAll('.sentence-chip');
      chips.forEach((c, idx) => {
        c.classList.toggle('active', idx === appState.activeSentenceIndex);
      });
      const activeChip = this.sentenceChipsTrack.querySelector('.sentence-chip.active');
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  // --- Audio Helpers ---

  onAudioLoaded() {
    if (this.audioDuration) {
      this.audioDuration.textContent = formatPreciseTime(this.nativeAudioPlayer.duration);
    }
    this.drawWaveform();
  }

  updateAudioProgress() {
    if (this.audioCurrentTime) {
      this.audioCurrentTime.textContent = formatPreciseTime(this.nativeAudioPlayer.currentTime);
    }
  }

  updatePlayPauseIcon(isPlaying) {
    if (!this.iconPlay || !this.iconPause) return;
    if (isPlaying) {
      this.iconPlay.classList.add('hidden');
      this.iconPause.classList.remove('hidden');
    } else {
      this.iconPlay.classList.remove('hidden');
      this.iconPause.classList.add('hidden');
    }
  }

  updateLoopBadge() {
    if (!this.loopStatusBadge) return;
    if (appState.loopStart !== null && appState.loopEnd !== null) {
      this.loopStatusBadge.classList.remove('hidden');
      if (this.loopRangeLabel) {
        this.loopRangeLabel.textContent = `루프: ${formatPreciseTime(appState.loopStart)} ~ ${formatPreciseTime(appState.loopEnd)}`;
      }
      if (this.loopCountLabel) {
        const targetStr = appState.targetLoopCount === Infinity ? '∞' : appState.targetLoopCount;
        this.loopCountLabel.textContent = `(${Math.min(appState.currentLoopCount + 1, appState.targetLoopCount || 1)}/${targetStr}회)`;
      }
    } else {
      this.loopStatusBadge.classList.add('hidden');
    }
  }

  seekAudio(time) {
    this.nativeAudioPlayer.currentTime = Math.max(0, Math.min(this.nativeAudioPlayer.duration || time, time));
    this.updateAudioProgress();
    this.drawWaveform();
  }

  setPlaybackSpeed(speed, activeBtn) {
    this.nativeAudioPlayer.playbackRate = speed;
    appState.playbackSpeed = speed;
    this.speedBtns.forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    toast.show(`재생 속도: ${speed}x`);
  }

  startWaveformPlaybackLoop() {
    const loop = () => {
      if (!this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
        this.updateAudioProgress();
        this.looperEngine.checkBoundary();
        this.drawWaveform();
        requestAnimationFrame(loop);
      } else {
        this.updateAudioProgress();
        this.drawWaveform();
      }
    };
    requestAnimationFrame(loop);
  }

  drawWaveform() {
    const activeStn = appState.getActiveSentence();
    const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
      ? this.nativeAudioPlayer.duration
      : (appState.audioBuffer ? appState.audioBuffer.duration : 1);

    this.waveformRenderer.draw({
      activeSentence: activeStn,
      audioBuffer: appState.audioBuffer,
      sentenceIndex: appState.activeSentenceIndex,
      totalSentences: appState.sentenceList.length,
      currentTime: this.nativeAudioPlayer.currentTime,
      totalDuration: totalDuration,
      loopStart: appState.loopStart,
      loopEnd: appState.loopEnd,
      isRangeDragging: this.isRangeDragging,
      dragStartX: this.dragStartX,
      currentMouseX: this.currentMouseX,
      isShadowingWaiting: appState.isShadowingWaiting,
      formatTimeFn: formatPreciseTime
    });
  }

  copyResult(target, btn) {
    const activeStn = appState.getActiveSentence();
    if (!activeStn) return;

    let text = '';
    if (target === 'en') {
      text = activeStn.text || '';
    } else if (target === 'chunk') {
      text = activeStn.result?.chunks ? activeStn.result.chunks.map(c => c.ko).join(' || ') : '';
    } else if (target === 'natural') {
      text = activeStn.result?.natural || '';
    }

    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>복사됨!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
      toast.show('📋 클립보드에 복사되었습니다.');
    });
  }

  speakResult(target) {
    const activeStn = appState.getActiveSentence();
    if (!activeStn) return;

    if (target === 'en') {
      if (appState.uploadedAudioFile && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
        this.togglePlayPause();
      } else {
        speakText(activeStn.text, 'en-US');
      }
    } else {
      const ko = activeStn.result?.natural || '';
      if (ko) speakText(ko, 'ko-KR');
    }
  }

  onActivated() {
    // 1. If sentenceList is empty, seed with default sample sentence
    if (!appState.sentenceList || appState.sentenceList.length === 0) {
      const defaultScript = "I went to school yesterday. She bought a new book at the bookstore.";
      const rawSentences = splitIntoSentences(defaultScript);
      const list = rawSentences.map((stnText, idx) => ({
        index: idx,
        text: stnText,
        audioStart: null,
        audioEnd: null,
        result: this.ruleEngine.process(stnText)
      }));
      appState.scriptText = defaultScript;
      appState.setSentenceList(list);
    }

    // 2. Default state: Sentence 1 + FELS Weak-Form mode
    appState.activeSentenceIndex = 0;
    appState.isFelsMode = true;
    this.updateFelsModeButtonUI();

    // 3. Render sentence navigator & load sentence 1
    this.renderSentenceNavigator();
    this.loadSentence(0);

    // 4. Ensure Waveform Canvas is drawn with proper visible dimensions
    this.drawWaveform();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.drawWaveform());
    }
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
      this.drawWaveform();
    }, 60);
    setTimeout(() => {
      this.drawWaveform();
    }, 180);
  }

  onDeactivated() {
    if (this.nativeAudioPlayer && typeof this.nativeAudioPlayer.pause === 'function') {
      try {
        if (!this.nativeAudioPlayer.paused) {
          this.nativeAudioPlayer.pause();
        }
      } catch (e) {}
    }
    if ('speechSynthesis' in window && typeof window.speechSynthesis.cancel === 'function') {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}

  // =========================================================================
  // Module: src/views/memorize-view.js
  // =========================================================================

/**
 * Page 3: Full Script Chunk Memorization View (MemorizeView)
 * Displays the entire script on one screen as an interactive chunk card grid for recitation and memorization.
 * 
 * Features:
 * - 4 Memorization Modes: Show All (전체 보기), English Only (영어만), Korean Only (한국어만), Cloze (빈칸 블라인드)
 * - Full Script Continuous Audio Playback with real-time neon sentence row highlight
 * - Batch Flip All Cards (일괄 뒤집기)
 * - Self-directed individual chunk reveal on click
 * - Click sentence tag (S1, S2...) to practice that specific sentence in Page 2
 */






class MemorizeView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();

    // DOM Elements
    this.container = document.getElementById('view-memorize');
    this.canvasContainer = document.getElementById('memorizeCanvas');
    this.modeButtons = document.querySelectorAll('.memorize-mode-btn');
    this.btnPlayAllScript = document.getElementById('btnPlayAllScript');
    this.btnFlipAllMemorize = document.getElementById('btnFlipAllMemorize');
    this.memorizeStatsBadge = document.getElementById('memorizeStatsBadge');

    this.isPlayingAll = false;
    this.playCurrentSentenceIndex = 0;
    this.activeRowIndex = 0;
    this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');

    // Classroom Large Presentation Modal Elements
    this.classroomModal = document.getElementById('classroomModal');
    this.classroomStnBadge = document.getElementById('classroomStnBadge');
    this.classroomStnCounter = document.getElementById('classroomStnCounter');
    this.classroomFullText = document.getElementById('classroomFullText');
    this.classroomChunksContainer = document.getElementById('classroomChunksContainer');
    this.classroomNaturalSection = document.getElementById('classroomNaturalSection');
    this.classroomNaturalText = document.getElementById('classroomNaturalText');
    this.btnToggleClassroomNatural = document.getElementById('btnToggleClassroomNatural');
    this.btnClassroomPlay = document.getElementById('btnClassroomPlay');
    this.btnClassroomFlipAll = document.getElementById('btnClassroomFlipAll');
    this.btnClassroomPrev = document.getElementById('btnClassroomPrev');
    this.btnClassroomNext = document.getElementById('btnClassroomNext');
    this.btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
    this.classroomIndex = 0;
    this.isClassroomNaturalHidden = false;
    this.areClassroomCardsFlipped = false;
    this.boundClassroomKeyHandler = this.handleClassroomKeyDown.bind(this);

    this.initEvents();
  }

  initEvents() {
    // Mode Buttons
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-memorize-mode');
        this.setMemorizeMode(mode);
      });
    });

    // Play All Script Button
    if (this.btnPlayAllScript) {
      this.btnPlayAllScript.addEventListener('click', () => this.togglePlayAllScript());
    }

    // Flip All Cards Button
    if (this.btnFlipAllMemorize) {
      this.btnFlipAllMemorize.addEventListener('click', () => this.toggleFlipAllCards());
    }

    // Listen to sentence updates
    appState.on('sentencesLoaded', () => {
      this.renderFullScriptCanvas();
    });

    appState.on('activeSentenceChanged', ({ index }) => {
      this.setActiveRow(index);
    });

    // Classroom Large Modal Events
    if (this.btnCloseClassroomModal) {
      this.btnCloseClassroomModal.addEventListener('click', () => this.closeClassroomModal());
    }
    if (this.classroomModal) {
      this.classroomModal.addEventListener('click', (e) => {
        if (e.target === this.classroomModal) this.closeClassroomModal();
      });
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.addEventListener('click', () => this.prevClassroomSentence());
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.addEventListener('click', () => this.nextClassroomSentence());
    }
    if (this.btnClassroomPlay) {
      this.btnClassroomPlay.addEventListener('click', () => this.playSingleSentence(this.classroomIndex));
    }
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.addEventListener('click', () => this.flipAllClassroomCards());
    }
    if (this.btnToggleClassroomNatural) {
      this.btnToggleClassroomNatural.addEventListener('click', () => this.toggleClassroomNatural());
    }
  }

  setMemorizeMode(mode) {
    appState.memorizeMode = mode;
    this.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-memorize-mode') === mode);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', mode);
    }

    toast.show(`암기 모드: ${this.getModeLabel(mode)}`);
  }

  getModeLabel(mode) {
    switch (mode) {
      case 'en': return '영어만 보기';
      case 'ko': return '한국어만 보기';
      case 'cloze': return '청크 가리기(Cloze)';
      default: return '전체 보기';
    }
  }

  renderFullScriptCanvas() {
    if (!this.canvasContainer) return;
    this.canvasContainer.innerHTML = '';

    const list = appState.sentenceList;
    if (!list || list.length === 0) {
      this.canvasContainer.innerHTML = `
        <div class="memorize-empty-state">
          <p>📝 아직 입력된 스크립트가 없습니다.</p>
          <button class="primary-btn btn-sm" id="btnGoToInput">1페이지 데이터 입력으로 이동</button>
        </div>
      `;
      const btn = this.canvasContainer.querySelector('#btnGoToInput');
      if (btn) btn.addEventListener('click', () => this.router.navigateTo('input'));
      return;
    }

    if (this.memorizeStatsBadge) {
      this.memorizeStatsBadge.textContent = `총 ${list.length}개 문장 • 암기 훈련 모드`;
    }

    list.forEach((stn, sIdx) => {
      // Ensure result exists
      if (!stn.result) {
        stn.result = this.ruleEngine.process(stn.text);
      }

      const sRow = document.createElement('div');
      sRow.className = 'memorize-sentence-row';
      sRow.setAttribute('data-stn-idx', sIdx);
      if (sIdx === this.activeRowIndex) {
        sRow.classList.add('active-row');
      }

      sRow.addEventListener('click', (e) => {
        if (e.target.closest('.memorize-stn-badge') || e.target.closest('.memorize-stn-play')) return;
        this.setActiveRow(sIdx);
      });

      // Sentence Header (S1, S2, jump to practice, expand classroom modal)
      const sHeader = document.createElement('div');
      sHeader.className = 'memorize-sentence-header';
      sHeader.innerHTML = `
        <button class="memorize-stn-badge" title="문장 S${sIdx + 1} 2페이지 약형 연습으로 이동">
          <span>S${sIdx + 1}</span>
          <span class="jump-icon">↗</span>
        </button>
        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${stn.text}</span>
        <button class="memorize-stn-expand-btn" title="교실 대형 화면으로 크게 보기 (모달)">🔍 크게 보기</button>
        <button class="memorize-stn-play" title="이 문장 듣기">▶</button>
      `;

      // Jump to practice
      const badgeBtn = sHeader.querySelector('.memorize-stn-badge');
      if (badgeBtn) {
        badgeBtn.addEventListener('click', () => {
          appState.setActiveSentenceIndex(sIdx);
          this.router.navigateTo('practice');
        });
      }

      // Expand to classroom modal
      const expandBtn = sHeader.querySelector('.memorize-stn-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClassroomModal(sIdx);
        });
      }

      const previewSpan = sHeader.querySelector('.memorize-stn-preview');
      if (previewSpan) {
        previewSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClassroomModal(sIdx);
        });
      }

      // Double-click row to open classroom modal
      sRow.addEventListener('dblclick', () => {
        this.openClassroomModal(sIdx);
      });

      // Play this sentence
      const playBtn = sHeader.querySelector('.memorize-stn-play');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          this.playSingleSentence(sIdx);
        });
      }

      // Chunk Grid for this sentence
      const chunkGrid = document.createElement('div');
      chunkGrid.className = 'memorize-chunk-grid';

      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];
      chunks.forEach((chunk, cIdx) => {
        const cCard = document.createElement('div');
        cCard.className = 'memorize-chunk-card';
        cCard.setAttribute('data-c-idx', cIdx);

        // Shortcut Key Badge (1 to 9)
        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="memorize-key-badge" title="숫자키 [${keyNum}] 뒤집기">${keyNum}</span>` : '';

        // Dynamic width per card based on content length with minimal padding
        const enLen = (chunk.en || '').trim().length;
        const koLen = (chunk.ko || '').trim().length;
        const estContentWidth = Math.max(enLen * 11, koLen * 16);
        const cardWidth = Math.max(48, Math.round(estContentWidth + 24));
        cCard.style.width = `${cardWidth}px`;
        cCard.style.flex = '0 0 auto';

        cCard.innerHTML = `
          <div class="memorize-card-inner">
            ${keyBadge}
            <div class="memorize-face memorize-face-en">
              <span class="chunk-en-text">${chunk.en}</span>
            </div>
            <div class="memorize-face memorize-face-ko">
              <span class="chunk-ko-text">${chunk.ko}</span>
            </div>
          </div>
        `;

        // Click to toggle individual flip / unmask
        cCard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActiveRow(sIdx);
          cCard.classList.toggle('flipped');
        });

        chunkGrid.appendChild(cCard);
      });

      sRow.appendChild(sHeader);
      sRow.appendChild(chunkGrid);
      this.canvasContainer.appendChild(sRow);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', appState.memorizeMode || 'all');

      // Precise measurement to prevent any text clipping on proportional fonts
      requestAnimationFrame(() => {
        if (!this.canvasContainer) return;
        const cards = this.canvasContainer.querySelectorAll('.memorize-chunk-card');
        cards.forEach(c => {
          const enEl = c.querySelector('.chunk-en-text');
          const koEl = c.querySelector('.chunk-ko-text');
          const wEn = enEl ? enEl.scrollWidth : 0;
          const wKo = koEl ? koEl.scrollWidth : 0;
          const maxW = Math.max(wEn, wKo);
          if (maxW > 0) {
            const targetW = Math.max(48, maxW + 24);
            const currentW = parseFloat(c.style.width || '0');
            if (targetW > currentW) {
              c.style.width = `${targetW}px`;
              c.style.minWidth = `${targetW}px`;
            }
          }
        });
      });
    }
  }

  toggleFlipAllCards() {
    if (!this.canvasContainer) return;
    appState.memorizeAllFlipped = !appState.memorizeAllFlipped;

    const cards = this.canvasContainer.querySelectorAll('.memorize-chunk-card');
    cards.forEach(c => {
      c.classList.toggle('flipped', appState.memorizeAllFlipped);
    });

    if (this.btnFlipAllMemorize) {
      this.btnFlipAllMemorize.innerHTML = appState.memorizeAllFlipped
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }

    toast.show(appState.memorizeAllFlipped ? '모든 카드를 해석(뒷면)으로 뒤집었습니다.' : '모든 카드를 영어(앞면)로 뒤집었습니다.');
  }

  togglePlayAllScript() {
    if (this.isPlayingAll) {
      this.stopPlayAllScript();
    } else {
      this.startPlayAllScript();
    }
  }

  startPlayAllScript() {
    const list = appState.sentenceList;
    if (!list || list.length === 0) {
      toast.show('⚠️ 재생할 스크립트 문장이 없습니다.');
      return;
    }

    this.isPlayingAll = true;
    this.playCurrentSentenceIndex = 0;
    this.updatePlayAllButtonUI(true);
    toast.show('▶ 전체 스크립트 연속 낭독 재생을 시작합니다.');
    this.playSentenceInSequence(0);
  }

  stopPlayAllScript() {
    this.isPlayingAll = false;
    this.updatePlayAllButtonUI(false);
    if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused) {
      this.nativeAudioPlayer.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.clearAllRowHighlights();
    toast.show('전체 재생이 일시정지되었습니다.');
  }

  updatePlayAllButtonUI(isPlaying) {
    if (!this.btnPlayAllScript) return;
    if (isPlaying) {
      this.btnPlayAllScript.classList.add('playing');
      this.btnPlayAllScript.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        <span>일시정지</span>
      `;
    } else {
      this.btnPlayAllScript.classList.remove('playing');
      this.btnPlayAllScript.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>전체 스크립트 연속 재생</span>
      `;
    }
  }

  playSentenceInSequence(idx) {
    if (!this.isPlayingAll) return;
    const list = appState.sentenceList;
    if (idx >= list.length) {
      this.stopPlayAllScript();
      toast.show('🎉 전체 스크립트 낭독이 완료되었습니다!');
      return;
    }

    this.playCurrentSentenceIndex = idx;
    this.highlightActiveSentenceRow(idx);

    const targetStn = list[idx];

    // Real audio play
    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;

      this.nativeAudioPlayer.currentTime = stnStart;
      this.nativeAudioPlayer.play().catch(e => console.error(e));

      const checkEnd = () => {
        if (!this.isPlayingAll) return;
        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
          // 0.4s pause between sentences
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        } else {
          requestAnimationFrame(checkEnd);
        }
      };
      requestAnimationFrame(checkEnd);
    } else {
      // Speech Synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(targetStn.text);
        utter.lang = 'en-US';
        utter.rate = 0.95;
        utter.onend = () => {
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        };
        utter.onerror = () => {
          if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
        };
        window.speechSynthesis.speak(utter);
      }
    }
  }

  playSingleSentence(idx) {
    const list = appState.sentenceList;
    if (!list || idx < 0 || idx >= list.length) return;

    this.highlightActiveSentenceRow(idx);
    const targetStn = list[idx];

    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;

      this.nativeAudioPlayer.currentTime = stnStart;
      this.nativeAudioPlayer.play().catch(e => console.error(e));

      const checkEnd = () => {
        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
          this.nativeAudioPlayer.pause();
        } else {
          requestAnimationFrame(checkEnd);
        }
      };
      requestAnimationFrame(checkEnd);
    } else {
      speakText(targetStn.text, 'en-US');
    }
  }

  highlightActiveSentenceRow(idx) {
    this.clearAllRowHighlights();
    if (!this.canvasContainer) return;
    const row = this.canvasContainer.querySelector(`.memorize-sentence-row[data-stn-idx="${idx}"]`);
    if (row) {
      row.classList.add('playing-active');
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  clearAllRowHighlights() {
    if (!this.canvasContainer) return;
    this.canvasContainer.querySelectorAll('.memorize-sentence-row').forEach(r => {
      r.classList.remove('playing-active');
    });
  }

  setActiveRow(idx) {
    this.activeRowIndex = idx;
    if (!this.canvasContainer) return;
    this.canvasContainer.querySelectorAll('.memorize-sentence-row').forEach((r) => {
      const rowIdx = parseInt(r.getAttribute('data-stn-idx'), 10);
      r.classList.toggle('active-row', rowIdx === idx);
    });
  }

  flipCardByIndex(num) {
    if (!this.canvasContainer || num < 1 || num > 9) return;
    const cardIdx = num - 1;

    // Target the active sentence row, playing row, or first row
    let targetRow = this.canvasContainer.querySelector(`.memorize-sentence-row[data-stn-idx="${this.activeRowIndex}"]`);
    if (!targetRow) {
      targetRow = this.canvasContainer.querySelector('.memorize-sentence-row.playing-active')
        || this.canvasContainer.querySelector('.memorize-sentence-row.active-row')
        || this.canvasContainer.querySelector('.memorize-sentence-row');
    }

    if (!targetRow) return;

    const cards = targetRow.querySelectorAll('.memorize-chunk-card');
    if (cards && cards[cardIdx]) {
      cards[cardIdx].classList.toggle('flipped');
    }
  }

  // --- Classroom Large Presentation Modal Methods ---

  openClassroomModal(sIdx) {
    const list = appState.sentenceList;
    if (!list || sIdx < 0 || sIdx >= list.length) return;

    this.classroomIndex = sIdx;
    this.isClassroomNaturalHidden = false;
    this.areClassroomCardsFlipped = false;

    this.renderClassroomModal();
    if (this.classroomModal) {
      this.classroomModal.classList.remove('hidden');
    }
    window.addEventListener('keydown', this.boundClassroomKeyHandler);
    toast.show(`🖥️ 문장 S${sIdx + 1} 교실 대형 화면 열림`);
  }

  closeClassroomModal() {
    if (this.classroomModal) {
      this.classroomModal.classList.add('hidden');
    }
    window.removeEventListener('keydown', this.boundClassroomKeyHandler);
  }

  isClassroomModalOpen() {
    return this.classroomModal && !this.classroomModal.classList.contains('hidden');
  }

  prevClassroomSentence() {
    if (this.classroomIndex > 0) {
      this.classroomIndex--;
      this.areClassroomCardsFlipped = false;
      this.renderClassroomModal();
    }
  }

  nextClassroomSentence() {
    const list = appState.sentenceList;
    if (list && this.classroomIndex < list.length - 1) {
      this.classroomIndex++;
      this.areClassroomCardsFlipped = false;
      this.renderClassroomModal();
    }
  }

  flipAllClassroomCards() {
    this.areClassroomCardsFlipped = !this.areClassroomCardsFlipped;
    if (!this.classroomChunksContainer) return;
    const cards = this.classroomChunksContainer.querySelectorAll('.classroom-chunk-card');
    cards.forEach(card => {
      card.classList.toggle('flipped', this.areClassroomCardsFlipped);
    });
    toast.show(this.areClassroomCardsFlipped ? '🔄 모든 청크 뒷면(해석)으로 뒤집기' : '🔄 모든 청크 앞면(영어)으로 뒤집기');
  }

  toggleClassroomNatural() {
    this.isClassroomNaturalHidden = !this.isClassroomNaturalHidden;
    if (this.classroomNaturalSection) {
      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
    }
    toast.show(this.isClassroomNaturalHidden ? '우리말 해석 가림' : '우리말 해석 표시');
  }

  flipClassroomCardByIndex(cIdx) {
    if (!this.classroomChunksContainer) return;
    const card = this.classroomChunksContainer.querySelector(`.classroom-chunk-card[data-c-idx="${cIdx}"]`);
    if (card) {
      card.classList.toggle('flipped');
      toast.show(`청크 #${cIdx + 1} 뒤집기`);
    }
  }

  handleClassroomKeyDown(e) {
    if (!this.isClassroomModalOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeClassroomModal();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      this.prevClassroomSentence();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      this.nextClassroomSentence();
      return;
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      this.playSingleSentence(this.classroomIndex);
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      e.stopPropagation();
      this.flipAllClassroomCards();
      return;
    }

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleClassroomNatural();
      return;
    }

    // Number keys 1~9
    let num = null;
    if (e.code && /^Digit([1-9])$/.test(e.code)) {
      num = parseInt(e.code.replace('Digit', ''), 10);
    } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
      num = parseInt(e.code.replace('Numpad', ''), 10);
    } else if (e.key >= '1' && e.key <= '9') {
      num = parseInt(e.key, 10);
    }

    if (num !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.flipClassroomCardByIndex(num - 1);
    }
  }

  renderClassroomModal() {
    const list = appState.sentenceList;
    if (!list || this.classroomIndex < 0 || this.classroomIndex >= list.length) return;
    const stn = list[this.classroomIndex];

    if (this.classroomStnBadge) {
      this.classroomStnBadge.textContent = `S${this.classroomIndex + 1}`;
    }
    if (this.classroomStnCounter) {
      this.classroomStnCounter.textContent = `${this.classroomIndex + 1} / ${list.length} 문장`;
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.disabled = (this.classroomIndex <= 0);
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.disabled = (this.classroomIndex >= list.length - 1);
    }

    if (this.classroomFullText) {
      this.classroomFullText.textContent = stn.text || '';
    }

    if (this.classroomNaturalText) {
      this.classroomNaturalText.textContent = stn.result?.natural || '';
    }
    if (this.classroomNaturalSection) {
      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
    }

    if (this.classroomChunksContainer) {
      this.classroomChunksContainer.innerHTML = '';
      const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];

      chunks.forEach((chunk, cIdx) => {
        const card = document.createElement('div');
        card.className = 'classroom-chunk-card';
        card.setAttribute('data-c-idx', cIdx);
        if (this.areClassroomCardsFlipped) {
          card.classList.add('flipped');
        }

        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="classroom-key-badge">${keyNum}</span>` : '';
        const enText = (chunk.en || '').trim();
        const koText = (chunk.ko || '').trim();
        const longestText = enText.length >= koText.length ? enText : koText;

        // Dynamic initial estimation based on 1.75rem bold font
        const estEn = enText.length * 20;
        const estKo = koText.length * 28;
        const estW = Math.max(estEn, estKo) + 64;
        const initialWidth = Math.max(90, Math.ceil(estW));
        card.style.width = `${initialWidth}px`;
        card.style.flex = '0 0 auto';

        card.innerHTML = `
          <div class="classroom-card-inner">
            <div class="classroom-card-sizer" aria-hidden="true">${longestText}</div>
            ${keyBadge}
            <div class="classroom-face classroom-face-en">
              <span class="classroom-chunk-text">${enText}</span>
            </div>
            <div class="classroom-face classroom-face-ko">
              <span class="classroom-chunk-text">${koText}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          card.classList.toggle('flipped');
        });

        this.classroomChunksContainer.appendChild(card);
      });

      // Precise DOM measurement after render to guarantee ZERO overflow/clipping
      requestAnimationFrame(() => {
        if (!this.classroomChunksContainer) return;
        const cards = this.classroomChunksContainer.querySelectorAll('.classroom-chunk-card');
        cards.forEach(c => {
          const enEl = c.querySelector('.classroom-face-en .classroom-chunk-text');
          const koEl = c.querySelector('.classroom-face-ko .classroom-chunk-text');
          const wEn = enEl ? enEl.scrollWidth : 0;
          const wKo = koEl ? koEl.scrollWidth : 0;
          const maxTextW = Math.max(wEn, wKo);
          if (maxTextW > 0) {
            const targetW = Math.max(90, maxTextW + 64);
            c.style.width = `${targetW}px`;
            c.style.minWidth = `${targetW}px`;
          }
        });
      });
    }
  }

  onActivated() {
    this.activeRowIndex = appState.activeSentenceIndex || 0;
    this.renderFullScriptCanvas();
    this.setActiveRow(this.activeRowIndex);
  }

  onDeactivated() {
    if (this.isPlayingAll) {
      this.stopPlayAllScript();
    }
    if (this.isClassroomModalOpen()) {
      this.closeClassroomModal();
    }
  }
}

  // =========================================================================
  // Module: src/main.js
  // =========================================================================

/**
 * CE Tool Main Coordinator & Application Entry Point
 * Orchestrates 3-Page SPA Views (Input, Practice, Memorize), Router, Shortcuts, and Theme.
 */











class CEToolApp {
  constructor() {
    this.router = null;
    this.inputView = null;
    this.practiceView = null;
    this.memorizeView = null;
    this.shortcutManager = null;
    this.settingsModal = null;
    this.appState = appState;
  }

  init() {
    // 1. Initialize Theme
    this.initTheme();

    // 2. Initialize Router
    this.router = new AppRouter();

    // 3. Initialize Views
    this.inputView = new InputView(this.router);
    this.practiceView = new PracticeView(this.router);
    this.memorizeView = new MemorizeView(this.router);

    this.router.registerViews({
      input: this.inputView,
      practice: this.practiceView,
      memorize: this.memorizeView
    });

    // 4. Initialize Settings Modal
    this.settingsModal = new SettingsModal();

    // 5. Initialize Global Shortcuts (Page 2 & Page 3)
    this.shortcutManager = new ShortcutManager({
      onPlayPause: () => this.practiceView.togglePlayPause(),
      onSetStart: () => this.practiceView.setRegionStartFromCurrentTime(),
      onSetEnd: () => this.practiceView.setRegionEndFromCurrentTime(),
      onClearRegion: () => this.practiceView.clearSelectedRegion(),
      onStartLoop: () => this.practiceView.startRegionLoop(),
      onPrevSentence: () => this.practiceView.prevSentence(),
      onNextSentence: () => this.practiceView.nextSentence(),
      onToggleFels: () => this.practiceView.toggleFelsMode(),
      onToggleTranslation: () => this.practiceView.toggleRowNaturalVisibility(),
      onFlipPracticeCard: (num) => this.practiceView.flipCardByIndex(num),
      onFlipMemorizeCard: (num) => this.memorizeView.flipCardByIndex(num),
      onPlayAllMemorize: () => this.memorizeView.togglePlayAllScript(),
      getCurrentPage: () => this.router.getCurrentPage(),
      isShortcutActive: () => ['practice', 'memorize'].includes(this.router.getCurrentPage())
    });

    // 6. Navigate to initial page from URL hash or default to 'input'
    const initialHash = window.location.hash.replace(/^#/, '');
    if (['input', 'practice', 'memorize'].includes(initialHash)) {
      this.router.navigateTo(initialHash);
    } else {
      this.router.navigateTo('input');
    }

    console.log('🚀 CE Tool 3-Page Architecture initialized successfully.');
  }

  initTheme() {
    const savedTheme = StorageService.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        StorageService.saveTheme(next);
        this.updateThemeIcon(next);
        toast.show(`테마가 ${next === 'dark' ? '다크 모드' : '라이트 모드'}로 변경되었습니다.`);
      });
    }
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.title = theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
    }
  }
}

// Reliable Bootstrap (Works in both loading and interactive/complete DOM states)
function bootstrapApp() {
  const app = new CEToolApp();
  app.init();
  window.__ceToolApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}


})();
