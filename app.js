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
  
  // Supported Gemini candidate models in priority order
  // (gemini-1.5-* removed: retired models only added 404 round-trips to the fallback loop)
  GEMINI_CANDIDATE_MODELS: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-pro'
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
  'hello': '안녕하세요',
  'hi': '안녕',
  'welcome': '환영',
  'visitor': '방문객',
  'visitors': '방문객',
  'guest': '손님',
  'guests': '손님들',
  'beach': '비치',
  'beaches': '해변',
  'cryston': '크리스톤',
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
  // Module: src/utils/dom.js
  // =========================================================================

/**
 * DOM Utility Helpers (shared across views)
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

/**
 * Escapes a value for safe interpolation into innerHTML / attribute strings.
 * null/undefined → '' (prevents literal "undefined" from leaking into the UI).
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


  // =========================================================================
  // Module: src/core/text-splitter.js
  // =========================================================================

/**
 * Text Splitter Engine
 * Accurately splits text into individual sentences while preserving abbreviations, decimals, and honorifics.
 */

/**
 * Detects whether a string is primarily Korean (Hangul instructions or Korean questions)
 */
function isKoreanSentence(text) {
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
function cleanPracticeSentence(text) {
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

function splitIntoSentences(text, options = {}) {
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

  process(rawInput, naturalText = null) {
    const cleanInput = rawInput.trim();
    const lower = cleanInput.toLowerCase().replace(/[.,!?;:]+$/, '').trim();

    const fullKey = cleanInput.toLowerCase().trim();
    let res = null;
    if (PRESETS[fullKey]) res = JSON.parse(JSON.stringify(PRESETS[fullKey]));
    else if (PRESETS[lower + '.']) res = JSON.parse(JSON.stringify(PRESETS[lower + '.']));
    else res = this.parseAndSynthesize(cleanInput);

    if (naturalText && res && res.chunks) {
      res.natural = naturalText;
      this.alignNaturalToChunks(res.chunks, naturalText);
      res.chunk_text = res.chunks.map(c => c.ko).join(' || ');
      res.direct = res.chunks.map(c => c.ko).join(' / ');
    }

    return res;
  }

  alignNaturalToChunks(chunks, naturalText) {
    if (!chunks || !chunks.length || !naturalText) return;
    const words = naturalText.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    if (chunks.length === 1) {
      chunks[0].ko = naturalText.trim();
      return;
    }

    const aligned = this.alignChunksWithNatural(chunks, naturalText, chunks.map(c => c.ko || ''));
    for (let i = 0; i < chunks.length; i++) {
      if (aligned[i]) {
        chunks[i].ko = aligned[i];
      }
    }
  }

  alignChunksWithNatural(chunks, naturalText, translatedChunks = []) {
    if (!chunks || !chunks.length) return [];
    if (chunks.length === 1) return [naturalText.trim()];

    const natWords = naturalText.trim().split(/\s+/).filter(Boolean);
    if (!natWords.length) {
      return translatedChunks.length === chunks.length ? translatedChunks : chunks.map(c => typeof c === 'string' ? c : c.ko || '');
    }

    const cleanStr = (s) => (typeof s === 'string' ? s : '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();

    const matchScore = (enText, koWord, transText = '') => {
      const cleanKo = cleanStr(koWord);
      if (!cleanKo) return 0;

      // 1. Direct match with translated text if provided
      if (transText) {
        const cleanTrans = cleanStr(transText);
        const transTokens = cleanTrans.split(/\s+/);
        if (transTokens.some(tw => tw === cleanKo)) return 15;
        if (cleanTrans.includes(cleanKo)) return 10;
        for (let len = Math.min(cleanKo.length, 4); len >= 2; len--) {
          for (let i = 0; i <= cleanKo.length - len; i++) {
            const sub = cleanKo.substring(i, i + len);
            if (cleanTrans.includes(sub)) return 5 + len;
          }
        }
      }

      // 2. Transliteration / Dictionary / English tokens
      const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
      for (const token of enTokens) {
        if (DICTIONARY && DICTIONARY[token]) {
          const koVal = cleanStr(DICTIONARY[token]);
          if (cleanKo.includes(koVal) || koVal.includes(cleanKo)) return 12;
        }
        if (VERB_MAP && VERB_MAP[token]) {
          const vKo = cleanStr(VERB_MAP[token]);
          if (cleanKo.includes(vKo) || vKo.includes(cleanKo)) return 11;
        }
        if (PRONOUNS && PRONOUNS[token]) {
          const pObj = PRONOUNS[token];
          const pList = typeof pObj === 'string' ? [pObj] : Object.values(pObj);
          for (const pVal of pList) {
            const pKo = cleanStr(pVal);
            if (pKo && (cleanKo.includes(pKo) || pKo.includes(cleanKo))) return 11;
          }
        }
        if (ADVERBS && ADVERBS[token]) {
          const aKo = cleanStr(ADVERBS[token]);
          if (aKo && (cleanKo.includes(aKo) || aKo.includes(cleanKo))) return 11;
        }
        if (cleanKo.includes(token)) return 8;
      }

      return 0;
    };

    // Calculate score of each natural word against each chunk
    const wordScores = natWords.map((word, wIdx) => {
      const scores = chunks.map((c, cIdx) => {
        const enText = typeof c === 'string' ? c : c.en || '';
        const transText = translatedChunks[cIdx] || (typeof c === 'object' ? c.ko : '') || '';
        return matchScore(enText, word, transText);
      });
      return { word, wIdx, scores };
    });

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
    // and preceding word is an object/adverbial (ends with 을/를/에/로/서/과/와), group together
    for (let i = 1; i < natWords.length; i++) {
      const prev = natWords[i - 1];
      const curr = natWords[i];
      const prevHasParticle = /[을를에로과와서]$/.test(cleanStr(prev));
      const currIsModifier = /(는|은|던|인|한|시는|하시는|하는)$/.test(cleanStr(curr));
      if (prevHasParticle && currIsModifier && assignments[i - 1] !== -1) {
        assignments[i] = assignments[i - 1];
      }
    }

    // Fill unassigned words (-1)
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

    const chunkWords = chunks.map(() => []);
    assignments.forEach((cIdx, wIdx) => {
      chunkWords[cIdx].push(natWords[wIdx]);
    });

    return chunkWords.map((words, cIdx) => {
      if (words.length > 0) {
        return words.join(' ').trim();
      }
      if (translatedChunks[cIdx]) {
        return translatedChunks[cIdx];
      }
      const c = chunks[cIdx];
      return typeof c === 'string' ? c : c.ko || c.en || '';
    });
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
    // If word contains only English/Latin letters, do NOT append Korean particles (e.g. "as는", "beach를")
    if (/^[a-zA-Z\s,.'"-]+$/.test(word.trim())) {
      return word.trim();
    }
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
    // Incremented whenever a NEW sentence list is loaded (lets views tell fresh data from revisits)
    this.dataVersion = 0;

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
    this.dataVersion++;
    this.clearLoop();
    this.emit('sentencesLoaded', this.sentenceList);
  }

  reset() {
    this.uploadedAudioFile = null;
    this.uploadedAudioUrl = null;
    this.audioBuffer = null;
    this.isSynthesizedAudio = false;
    this.synthesizedWavBlob = null;
    this.scriptText = '';
    this.sentenceList = [];
    this.activeSentenceIndex = 0;
    this.dataVersion++;
    this.clearLoop();
    this.emit('sentencesLoaded', []);
    this.emit('stateReset');
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
    this.dataVersion++;
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

const memStorage = {};

function safeGet(key, def = '') {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) ?? def;
    }
  } catch (e) {}
  return memStorage[key] ?? def;
}

function safeSet(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch (e) {}
  memStorage[key] = String(val);
}

/**
 * Reads `key`; falls back to the legacy ChunkLingo key ONLY when `key` was never written.
 * (Legacy keys are no longer written, so an intentionally cleared value must not resurrect the old one.)
 */
function safeGetWithLegacy(key, legacyKey, def = '') {
  const v = safeGet(key, null);
  if (v !== null) return v || def;
  return safeGet(legacyKey, null) || def;
}

class StorageService {
  static getProvider() {
    return safeGetWithLegacy('ce_tool_provider', 'chunklingo_provider', 'gemini');
  }

  static getApiKey() {
    return safeGetWithLegacy('ce_tool_api_key', 'chunklingo_api_key', '');
  }

  static getCustomPrompt() {
    return safeGetWithLegacy('ce_tool_prompt', 'chunklingo_prompt', '');
  }

  static saveApiSettings(provider, apiKey, customPrompt) {
    safeSet('ce_tool_provider', provider);
    safeSet('ce_tool_api_key', apiKey);
    safeSet('ce_tool_prompt', customPrompt);
    // Legacy chunklingo_* keys are intentionally NOT written anymore (and not deleted:
    // file:// pages share one localStorage origin, so another app may still own them).
  }

  static getTheme() {
    return safeGetWithLegacy('ce_tool_theme', 'chunklingo_theme', 'dark');
  }

  static saveTheme(theme) {
    safeSet('ce_tool_theme', theme);
  }
}


  // =========================================================================
  // Module: src/services/ai-service.js
  // =========================================================================

/**
 * AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
 * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 2.5-pro, etc.)
 */





const AI_REQUEST_TIMEOUT_MS = 30000;   // text requests
const AI_AUDIO_TIMEOUT_MS = 120000;    // inline-audio requests (STT / alignment)
const FREE_TRANSLATE_TIMEOUT_MS = 10000;
const FREE_TRANSLATE_MAX_CONCURRENCY = 4; // avoid bursting the unofficial endpoint (HTTP 429)

let freeTranslateActive = 0;
const freeTranslateQueue = [];

/**
 * fetch() with an AbortController timeout. Falls back to plain fetch when AbortController is unavailable
 * (e.g. the vm sandbox used by scratch tests).
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  if (typeof AbortController !== 'function' || typeof setTimeout !== 'function') {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`AI 요청 시간이 초과되었습니다 (${Math.round(timeoutMs / 1000)}초). 네트워크 상태를 확인하고 다시 시도하세요.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON.parse that tolerates ```json fences / leading prose around the JSON object. */
function parseJsonLoose(content) {
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(unfenced);
    } catch (e2) {
      const start = unfenced.indexOf('{');
      const end = unfenced.lastIndexOf('}');
      if (start !== -1 && end > start) return JSON.parse(unfenced.slice(start, end + 1));
      throw e;
    }
  }
}

/** Runs `task` when a free-translate slot is available (max FREE_TRANSLATE_MAX_CONCURRENCY in flight). */
function runWithFreeTranslateLimit(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      freeTranslateActive++;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          freeTranslateActive--;
          const next = freeTranslateQueue.shift();
          if (next) next();
        });
    };
    if (freeTranslateActive < FREE_TRANSLATE_MAX_CONCURRENCY) run();
    else freeTranslateQueue.push(run);
  });
}

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
      // API key goes in the x-goog-api-key header (not the URL) so it never lands in logs / history
      const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
      const res = await fetchWithTimeout(listUrl, { headers: { 'x-goog-api-key': this.apiKey } });
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
  async postToGemini(payload, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
    const preferred = await this.resolveGeminiModel();
    const candidateList = [
      preferred,
      ...CONSTANTS.GEMINI_CANDIDATE_MODELS
    ];
    const uniqueCandidates = [...new Set(candidateList)];

    let lastError = null;

    for (const model of uniqueCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify(payload)
        }, timeoutMs);

        if (response.ok) {
          this.activeGeminiModel = model; // Cache working model
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!content) throw new Error('Gemini 응답 내용이 비어 있습니다.');
          return parseJsonLoose(content);
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
   * Fast, reliable natural Korean translation with AI fallback to free Google Translate endpoint
   */
  async translateNatural(text) {
    if (!text || !text.trim()) return '';
    // If user has AI key configured, attempt full AI translate
    if (this.hasKey()) {
      try {
        const res = await this.translate(text);
        if (res && res.natural) return res.natural;
      } catch (e) {
        console.warn('AI translation failed, trying free translate:', e);
      }
    }

    // Free high-quality Google Translate endpoint (concurrency-limited, 10s timeout)
    try {
      const translated = await this.fetchFreeTranslation(text.trim());
      if (translated) return translated;
    } catch (e) {
      console.warn('Public translation endpoint error:', e);
    }

    return null;
  }

  /**
   * Unofficial translate.googleapis.com call shared by translateNatural() and generateDirectChunks().
   * @returns {Promise<string>} '' when the endpoint returns nothing usable
   */
  fetchFreeTranslation(text) {
    return runWithFreeTranslateLimit(async () => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetchWithTimeout(url, {}, FREE_TRANSLATE_TIMEOUT_MS);
      if (!res.ok) return '';
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map(item => item[0]).join('').trim();
      }
      return '';
    });
  }

  /**
   * Generate natural chunk-by-chunk sequential Korean interpretation (직독직해)
   * based on the fluent natural Korean translation.
   */
  async generateDirectChunks(chunks, naturalText, englishSentence) {
    if (!chunks || !chunks.length) return [];
    if (!naturalText || !naturalText.trim()) {
      return chunks.map(c => (typeof c === 'string' ? c : c.ko || c.en || ''));
    }

    const cleanChunks = chunks.map(c => (typeof c === 'string' ? c : c.en || '').trim());
    if (cleanChunks.length === 1) {
      return [naturalText.trim()];
    }

    // 1. If AI API key is configured (Gemini / OpenAI), use prompt to partition natural Korean
    if (this.hasKey()) {
      try {
        const prompt = `You are an expert English-Korean linguist specialized in sequential interpretation (직독직해).
We have an English sentence: "${englishSentence || cleanChunks.join(' ')}"
And its natural Korean translation (우리말 자연스러운 해석): "${naturalText}"

The English sentence is divided into ${cleanChunks.length} sequential chunks (청크 구분 || 영어 문장):
${cleanChunks.map((c, i) => `[Chunk ${i + 1}] "${c}"`).join('\n')}

Task: Create the 직독직해 (chunk-by-chunk sequential interpretation) corresponding 1-to-1 with each English chunk above, based strictly on the natural Korean translation.

CRITICAL RULES:
1. Each Korean chunk MUST convey the specific meaning of that English chunk, NOT a naive left-to-right word split.
   - Example: English chunks: [Chunk 1] "Hello, visitors" || [Chunk 2] "to Cryston Beach."
     Natural Korean: "안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분."
     * Chunk 1 ("Hello, visitors") MUST be: "안녕하세요, 방문객 여러분" (or "방문객 여러분 안녕하세요")
     * Chunk 2 ("to Cryston Beach.") MUST be: "크리스톤 비치를 방문하시는" (or "크리스톤 비치로 오신")
     * NEVER put "크리스톤" into Chunk 1!
2. Draw words, vocabulary, and style directly from the natural Korean translation ("우리말 자연스러운 해석").
3. Pure Korean only. Never include English words or attach Korean particles to English.
4. Return exactly ${cleanChunks.length} strings in the "chunks" array:
{
  "chunks": [ "한국어 직독직해 1", "한국어 직독직해 2", ... ]
}`;
        if (this.provider === 'gemini') {
          const res = await this.callGemini(englishSentence || cleanChunks.join(' '), prompt);
          if (res && Array.isArray(res.chunks) && res.chunks.length === cleanChunks.length) {
            return res.chunks.map(s => String(s).trim());
          }
        } else {
          const res = await this.callOpenAI(englishSentence || cleanChunks.join(' '), prompt);
          if (res && Array.isArray(res.chunks) && res.chunks.length === cleanChunks.length) {
            return res.chunks.map(s => String(s).trim());
          }
        }
      } catch (aiErr) {
        console.warn('AI direct chunk generation fallback:', aiErr);
      }
    }

    // 2. High-speed, high-quality parallel chunk translation with natural alignment
    try {
      const translatedChunks = await Promise.all(
        cleanChunks.map(async (cText) => {
          if (!cText) return '';
          const cleanText = cText.replace(/^[,.!?–—;:]+|[,.!?–—;:]+$/g, '').trim();
          if (!cleanText) return '';
          return this.fetchFreeTranslation(cleanText);
        })
      );

      const allValid = translatedChunks.every(t => t && t.length > 0 && !/[a-zA-Z]{3,}/.test(t));
      if (allValid && translatedChunks.length === cleanChunks.length) {
        const aligned = this.alignChunksWithNatural(cleanChunks, naturalText, translatedChunks);
        if (aligned && aligned.length === cleanChunks.length && aligned.every(Boolean)) {
          return aligned;
        }
        return translatedChunks.map(t => t.replace(/^[,\s]+|[,\s]+$/g, ''));
      }
    } catch (fetchErr) {
      console.warn('Public chunk translation error:', fetchErr);
    }

    // 3. Smart offline semantic slice of naturalText
    return this.sliceNaturalTextIntoChunks(cleanChunks, naturalText);
  }

  sliceNaturalTextIntoChunks(chunks, naturalText) {
    if (!chunks || !chunks.length) return [];
    if (chunks.length === 1) return [naturalText.trim()];
    return this.alignChunksWithNatural(chunks, naturalText, []);
  }

  alignChunksWithNatural(chunks, naturalText, translatedChunks = []) {
    if (!chunks || !chunks.length) return [];
    if (chunks.length === 1) return [naturalText.trim()];

    const natWords = naturalText.trim().split(/\s+/).filter(Boolean);
    if (!natWords.length) {
      return translatedChunks.length === chunks.length ? translatedChunks : chunks.map(c => typeof c === 'string' ? c : c.ko || '');
    }

    const cleanStr = (s) => (typeof s === 'string' ? s : '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();

    const matchScore = (enText, koWord, transText = '') => {
      const cleanKo = cleanStr(koWord);
      if (!cleanKo) return 0;

      // 1. Direct match with translated text if provided
      if (transText) {
        const cleanTrans = cleanStr(transText);
        const transTokens = cleanTrans.split(/\s+/);
        if (transTokens.some(tw => tw === cleanKo)) return 15;
        if (cleanTrans.includes(cleanKo)) return 10;
        for (let len = Math.min(cleanKo.length, 4); len >= 2; len--) {
          for (let i = 0; i <= cleanKo.length - len; i++) {
            const sub = cleanKo.substring(i, i + len);
            if (cleanTrans.includes(sub)) return 5 + len;
          }
        }
      }

      // 2. Transliteration / Dictionary / English tokens
      const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
      for (const token of enTokens) {
        if (DICTIONARY && DICTIONARY[token]) {
          const koVal = cleanStr(DICTIONARY[token]);
          if (cleanKo.includes(koVal) || koVal.includes(cleanKo)) return 12;
        }
        if (VERB_MAP && VERB_MAP[token]) {
          const vKo = cleanStr(VERB_MAP[token]);
          if (cleanKo.includes(vKo) || vKo.includes(cleanKo)) return 11;
        }
        if (PRONOUNS && PRONOUNS[token]) {
          const pObj = PRONOUNS[token];
          const pList = typeof pObj === 'string' ? [pObj] : Object.values(pObj);
          for (const pVal of pList) {
            const pKo = cleanStr(pVal);
            if (pKo && (cleanKo.includes(pKo) || pKo.includes(cleanKo))) return 11;
          }
        }
        if (ADVERBS && ADVERBS[token]) {
          const aKo = cleanStr(ADVERBS[token]);
          if (aKo && (cleanKo.includes(aKo) || aKo.includes(cleanKo))) return 11;
        }
        if (cleanKo.includes(token)) return 8;
      }

      return 0;
    };

    // Calculate score of each natural word against each chunk
    const wordScores = natWords.map((word, wIdx) => {
      const scores = chunks.map((c, cIdx) => {
        const enText = typeof c === 'string' ? c : c.en || '';
        const transText = translatedChunks[cIdx] || (typeof c === 'object' ? c.ko : '') || '';
        return matchScore(enText, word, transText);
      });
      return { word, wIdx, scores };
    });

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
    // and preceding word is an object/adverbial (ends with 을/를/에/로/서/과/와), group together
    for (let i = 1; i < natWords.length; i++) {
      const prev = natWords[i - 1];
      const curr = natWords[i];
      const prevHasParticle = /[을를에로과와서]$/.test(cleanStr(prev));
      const currIsModifier = /(는|은|던|인|한|시는|하시는|하는)$/.test(cleanStr(curr));
      if (prevHasParticle && currIsModifier && assignments[i - 1] !== -1) {
        assignments[i] = assignments[i - 1];
      }
    }

    // Fill unassigned words (-1)
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

    const chunkWords = chunks.map(() => []);
    assignments.forEach((cIdx, wIdx) => {
      chunkWords[cIdx].push(natWords[wIdx]);
    });

    return chunkWords.map((words, cIdx) => {
      if (words.length > 0) {
        return words.join(' ').trim();
      }
      if (translatedChunks[cIdx]) {
        return translatedChunks[cIdx];
      }
      const c = chunks[cIdx];
      return typeof c === 'string' ? c : c.ko || c.en || '';
    });
  }

  /**
   * AI-powered Audio & Script Forced Alignment using Gemini Multimodal Audio
   */
  async alignAudioWithScript(base64Audio, mimeType, sentences) {
    if (!this.hasKey() || this.provider !== 'gemini' || !base64Audio) {
      return null;
    }

    const prompt = `You are a precision audio-script alignment engine for Korean-English listening comprehension tests (CSAT 수능 / EBS / school exam audio).

CRITICAL DOMAIN BACKGROUND & RULES:
1. The audio begins with a spoken Korean question announcement / direction (우리말 안내 방송 / 문제 설명, e.g. "1번 문제입니다. 대화를 듣고, 남자가 할 일로 가장 적절한 것을 고르시오.") followed by a chime sound ("딩동댕" 안내 종소리).
2. ALL KOREAN SPEECH, KOREAN ANNOUNCEMENTS, AND INTRO CHIMES MUST BE COMPLETELY IGNORED AND OMITTED.
3. The English dialogue begins strictly AFTER the Korean announcement and chime sound finish.
4. DO NOT align any English sentence to the Korean speech. [S1] MUST NOT start at or during the Korean voice.
5. The 'start' timestamp of [S1] MUST be the exact second when the speaker speaks the first ENGLISH word of [S1] (e.g. "Hello", "Good morning", "Excuse me").
6. Any Korean question outro (우리말 마무리 질문) at the end of the audio must also be completely excluded.

We have the following exact English sentences in order:
${sentences.map((s, idx) => `[S${idx + 1}] "${s}"`).join('\n')}

For each sentence, determine the precise start and end timestamps (in seconds, rounded to 1 decimal place) when the speaker speaks this English sentence in the audio.

CRITICAL FOR TIMESTAMPS:
- 'start': The exact moment the speaker begins the first English word of this sentence (MUST NOT include any preceding Korean speech or chimes).
- 'end': Include the complete release of the final English word plus 0.6s trailing padding (or up until right before the next English sentence starts).

Respond ONLY with valid JSON:
{
  "alignments": [
    { "sentence_index": 0, "start": 6.8, "end": 10.2 }
  ]
}`;

    try {
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

      const result = await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
      if (result && Array.isArray(result.alignments)) {
        // Raw timestamps only — end padding is applied ONCE in audio/boundary-utils.js
        // (previously padded here AND again in InputView, i.e. +1.5s on every sentence end)
        return result.alignments.map((a, i) => ({
          sentence_index: a.sentence_index ?? i,
          start: Number(a.start) || 0,
          end: Number(a.end) || 0
        }));
      }
    } catch (err) {
      console.warn('Gemini audio-script alignment failed:', err);
    }
    return null;
  }

  /**
   * Transcribe Audio and generate 3x1 translation simultaneously using Gemini Multimodal Audio
   */
  async transcribeAndTranslateAudio(base64Audio, mimeType) {
    if (!this.hasKey()) {
      throw new Error('음성 인식을 위해 AI API 키가 필요합니다. 설정에서 Gemini 또는 OpenAI API 키를 입력하세요.');
    }

    const prompt = `Listen to this English audio carefully.
This audio is from an English listening test (such as CSAT 수능 / EBS / school exam) which often contains spoken Korean question directions/announcements at the beginning (e.g. "1번 문제입니다. 대화를 듣고...") and/or Korean outro questions at the end.

CRITICAL INSTRUCTIONS:
1. OMIT ALL KOREAN SPOKEN ANNOUNCEMENTS, DIRECTIONS, QUESTION NUMBERS, AND CHIMES.
2. Transcribe ONLY the authentic English dialogue / passage spoken in the audio into the "script" field.
3. Translate into natural Korean (SOV order) in "natural".
4. Provide chunk-based sequential interpretation with " || " in "chunk_text".
5. Provide chunk breakdown array in "chunks": [{ "en": "...", "ko": "..." }]
6. If there are multiple sentences, also provide a "sentences" array where each element contains:
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

      return await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
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

    const response = await fetchWithTimeout(url, {
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

    return parseJsonLoose(content);
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
 * Combines Web Audio API PCM RMS energy analysis, VAD (Voice Activity Detection),
 * Korean question intro/outro omission, and adaptive energy valley alignment.
 */

/**
 * Calculates expected English reading duration based on word count
 */
function estimateEnglishSpeechDuration(sentences) {
  if (!sentences || !sentences.length) return 0;
  const totalEnglishWords = sentences.reduce((sum, s) => sum + (s || '').trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(2.0, totalEnglishWords * 0.42 + (sentences.length - 1) * 0.65);
}

/**
 * Detects Korean question announcement duration (in seconds) to be omitted
 */
function detectKoreanIntroDuration(audioBuffer, sentences, totalDuration) {
  if (!audioBuffer) return 0;
  try {
    const duration = totalDuration || audioBuffer.duration || 0;
    if (duration <= 0) return 0;

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSec = 0.05;
    const windowSize = Math.floor(sampleRate * windowSec);
    const numWindows = Math.floor(rawData.length / windowSize);

    const energies = new Float32Array(numWindows);
    let maxRms = 0;
    for (let w = 0; w < numWindows; w++) {
      let sumSq = 0;
      const offset = w * windowSize;
      const step = Math.max(1, Math.floor(windowSize / 128));
      let count = 0;
      for (let k = 0; k < windowSize; k += step) {
        const v = rawData[offset + k];
        sumSq += v * v;
        count++;
      }
      const rms = Math.sqrt(sumSq / count);
      energies[w] = rms;
      if (rms > maxRms) maxRms = rms;
    }

    if (maxRms <= 0.001) return 0;

    const vadThreshold = maxRms * 0.055;
    const speechSegments = extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold);
    const expectedEnglishSec = estimateEnglishSpeechDuration(sentences);
    const overhead = duration - expectedEnglishSec;

    if (speechSegments.length > sentences.length && overhead >= 2.0) {
      const remDur0 = duration - speechSegments[0].startSec;
      let bestScore = Math.abs(remDur0 - (expectedEnglishSec + 0.8));
      let bestIdx = 0;

      const maxIntroIdx = speechSegments.length - sentences.length;
      for (let i = 1; i <= maxIntroIdx; i++) {
        const prevSeg = speechSegments[i - 1];
        const currSeg = speechSegments[i];
        const gap = currSeg.startSec - prevSeg.endSec;
        const timeFromStart = currSeg.startSec;

        if (timeFromStart > 16.0) break;

        const remainingDur = duration - timeFromStart;
        if (remainingDur < expectedEnglishSec * 0.65) continue;

        const s1Words = (sentences[0] || '').trim().split(/\s+/).filter(Boolean).length;
        const s1MinDur = Math.min(1.0, s1Words * 0.25);
        if (currSeg.duration < s1MinDur) continue;

        const durDiff = Math.abs(remainingDur - (expectedEnglishSec + 0.8));
        const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
        const score = durDiff - gapBonus;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx > 0) {
        return Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
      }
    } else if (sentences.length === 1 && speechSegments.length >= 2 && overhead >= 2.0) {
      const remDur0 = duration - speechSegments[0].startSec;
      let bestScore = Math.abs(remDur0 - (expectedEnglishSec + 0.8));
      let bestIdx = 0;

      for (let i = 1; i < speechSegments.length; i++) {
        const prevSeg = speechSegments[i - 1];
        const currSeg = speechSegments[i];
        const gap = currSeg.startSec - prevSeg.endSec;
        const timeFromStart = currSeg.startSec;

        if (timeFromStart > 16.0) break;

        const remainingDur = duration - timeFromStart;
        if (remainingDur < expectedEnglishSec * 0.65) continue;

        const durDiff = Math.abs(remainingDur - (expectedEnglishSec + 0.8));
        const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
        const score = durDiff - gapBonus;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx > 0) {
        return Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
      }
    } else if (speechSegments.length <= 1 && overhead >= 3.0) {
      return Math.max(0, Math.round((overhead - 0.8) * 10) / 10);
    }
  } catch (e) {
    console.warn('detectKoreanIntroDuration error:', e);
  }
  return 0;
}

function extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold) {
  const speechSegments = [];
  let inSeg = false;
  let segStartW = 0;

  for (let w = 0; w < numWindows; w++) {
    const isSpeech = energies[w] >= vadThreshold;
    if (!inSeg && isSpeech) {
      inSeg = true;
      segStartW = w;
    } else if (inSeg && !isSpeech) {
      let silenceEnd = true;
      const look = Math.floor(0.25 / windowSec);
      for (let k = 1; k <= look && w + k < numWindows; k++) {
        if (energies[w + k] >= vadThreshold) {
          silenceEnd = false;
          break;
        }
      }
      if (silenceEnd) {
        inSeg = false;
        const durSec = (w - segStartW) * windowSec;
        if (durSec >= 0.25) {
          speechSegments.push({
            startIdx: segStartW,
            endIdx: w,
            startSec: Math.round(segStartW * windowSec * 10) / 10,
            endSec: Math.round(w * windowSec * 10) / 10,
            duration: Math.round(durSec * 10) / 10
          });
        }
      }
    }
  }
  if (inSeg) {
    speechSegments.push({
      startIdx: segStartW,
      endIdx: numWindows - 1,
      startSec: Math.round(segStartW * windowSec * 10) / 10,
      endSec: Math.round(numWindows * windowSec * 10) / 10,
      duration: Math.round((numWindows - 1 - segStartW) * windowSec * 10) / 10
    });
  }
  return speechSegments;
}

function detectAudioSentenceBoundaries(audioBuffer, sentences, totalDuration) {
  if (!sentences || !sentences.length) return [];
  const duration = totalDuration || (audioBuffer ? audioBuffer.duration : 0);

  if (!duration || duration <= 0) {
    return sentences.map(() => ({ start: null, end: null }));
  }

  const expectedEnglishSpeechSec = estimateEnglishSpeechDuration(sentences);
  const overhead = duration - expectedEnglishSpeechSec;

  // Step 1: PCM RMS analysis with VAD & Korean intro/outro omission
  if (audioBuffer) {
    try {
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSec = 0.05; // 50ms window
      const windowSize = Math.floor(sampleRate * windowSec);
      const numWindows = Math.floor(rawData.length / windowSize);

      const energies = new Float32Array(numWindows);
      let maxRms = 0;
      for (let w = 0; w < numWindows; w++) {
        let sumSq = 0;
        const offset = w * windowSize;
        const step = Math.max(1, Math.floor(windowSize / 128));
        let count = 0;
        for (let k = 0; k < windowSize; k += step) {
          const v = rawData[offset + k];
          sumSq += v * v;
          count++;
        }
        const rms = Math.sqrt(sumSq / count);
        energies[w] = rms;
        if (rms > maxRms) maxRms = rms;
      }

      if (maxRms > 0.001) {
        const vadThreshold = maxRms * 0.055;
        const speechSegments = extractVadSpeechSegments(energies, windowSec, numWindows, vadThreshold);

        // 1. Detect English speech onset (omitting Korean question announcement)
        let speechStart = speechSegments[0]?.startSec ?? 0;

        if (speechSegments.length > sentences.length && overhead >= 2.0) {
          const remDur0 = duration - speechSegments[0].startSec;
          let bestScore = Math.abs(remDur0 - (expectedEnglishSpeechSec + 0.8));
          let bestIdx = 0;

          const maxIntroIdx = speechSegments.length - sentences.length;
          for (let i = 1; i <= maxIntroIdx; i++) {
            const prevSeg = speechSegments[i - 1];
            const currSeg = speechSegments[i];
            const gap = currSeg.startSec - prevSeg.endSec;
            const timeFromStart = currSeg.startSec;

            if (timeFromStart > 16.0) break;

            const remainingDur = duration - timeFromStart;
            if (remainingDur < expectedEnglishSpeechSec * 0.65) continue;

            const s1Words = (sentences[0] || '').trim().split(/\s+/).filter(Boolean).length;
            const s1MinDur = Math.min(1.0, s1Words * 0.25);
            if (currSeg.duration < s1MinDur) continue;

            const durDiff = Math.abs(remainingDur - (expectedEnglishSpeechSec + 0.8));
            const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
            const score = durDiff - gapBonus;

            if (score < bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }

          if (bestIdx > 0) {
            speechStart = Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
          }
        } else if (sentences.length === 1 && speechSegments.length >= 2 && overhead >= 2.0) {
          const remDur0 = duration - speechSegments[0].startSec;
          let bestScore = Math.abs(remDur0 - (expectedEnglishSpeechSec + 0.8));
          let bestIdx = 0;

          for (let i = 1; i < speechSegments.length; i++) {
            const prevSeg = speechSegments[i - 1];
            const currSeg = speechSegments[i];
            const gap = currSeg.startSec - prevSeg.endSec;
            const timeFromStart = currSeg.startSec;

            if (timeFromStart > 16.0) break;

            const remainingDur = duration - timeFromStart;
            if (remainingDur < expectedEnglishSpeechSec * 0.65) continue;

            const durDiff = Math.abs(remainingDur - (expectedEnglishSpeechSec + 0.8));
            const gapBonus = Math.min(3.5, Math.max(0, gap - 0.4) * 2.0);
            const score = durDiff - gapBonus;

            if (score < bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }

          if (bestIdx > 0) {
            speechStart = Math.max(0, Math.round((speechSegments[bestIdx].startSec - 0.1) * 10) / 10);
          }
        } else if (speechSegments.length <= 1 && overhead >= 3.0) {
          speechStart = Math.max(0, Math.round((overhead - 0.8) * 10) / 10);
        } else if (speechSegments.length === 0) {
          const onsetThresh = maxRms * 0.05;
          let speechStartIdx = 0;
          for (let w = 0; w < numWindows; w++) {
            if (energies[w] >= onsetThresh) {
              speechStartIdx = Math.max(0, w - 2);
              break;
            }
          }
          speechStart = Math.max(0, Math.round((speechStartIdx * windowSec - 0.1) * 10) / 10);
        }

        // 2. Detect English speech offset (omitting trailing Korean outro questions / chimes)
        let speechEnd = Math.round(duration * 10) / 10;
        const englishSegments = speechSegments.filter(s => s.startSec >= speechStart - 0.1);
        if (englishSegments.length > 0) {
          const lastEngSeg = englishSegments[englishSegments.length - 1];
          if (englishSegments.length > sentences.length) {
            const targetSeg = englishSegments[sentences.length - 1];
            const span = targetSeg.endSec - speechStart;
            const nextSeg = englishSegments[sentences.length];
            if (span >= expectedEnglishSpeechSec * 0.8 || (nextSeg && nextSeg.startSec - targetSeg.endSec >= 0.5)) {
              speechEnd = Math.min(duration, Math.round((targetSeg.endSec + 0.8) * 10) / 10);
            } else {
              speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
            }
          } else {
            speechEnd = Math.min(duration, Math.round((lastEngSeg.endSec + 0.8) * 10) / 10);
          }
        }

        if (duration - speechEnd <= 0.6) {
          speechEnd = Math.round(duration * 10) / 10;
        }

        // Single sentence case
        if (sentences.length === 1) {
          return [{ start: speechStart, end: speechEnd }];
        }

        const speechDuration = Math.max(1.0, speechEnd - speechStart);

        // Smooth energy curve with moving average (~250ms window)
        const smoothRadius = 3;
        const smoothed = new Float32Array(numWindows);
        for (let i = 0; i < numWindows; i++) {
          let sum = 0, count = 0;
          for (let r = -smoothRadius; r <= smoothRadius; r++) {
            const idx = i + r;
            if (idx >= 0 && idx < numWindows) {
              sum += energies[idx];
              count++;
            }
          }
          smoothed[i] = sum / count;
        }

        // Calculate expected sentence transition timestamps based on word counts
        const weights = sentences.map(s => {
          const words = (s || '').trim().split(/\s+/).filter(Boolean);
          const punctBonus = /[?!]/.test(s) ? 1.5 : 1.0;
          return Math.max(3, words.length * punctBonus);
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let curWeight = 0;
        let lastStart = speechStart;
        const transitions = [];

        for (let i = 0; i < sentences.length - 1; i++) {
          curWeight += weights[i];
          const expectedTime = speechStart + speechDuration * (curWeight / totalWeight);
          const expectedIdx = Math.floor(expectedTime / windowSec);
          
          const searchSec = Math.min(4.5, Math.max(1.5, (speechDuration * (weights[i] / totalWeight)) * 0.6));
          const searchRadius = Math.floor(searchSec / windowSec);
          const minAllowedIdx = Math.floor((lastStart + 0.5) / windowSec);
          const maxAllowedIdx = Math.floor((speechEnd - 0.5) / windowSec);

          const startIdx = Math.max(minAllowedIdx, expectedIdx - searchRadius);
          const endIdx = Math.min(maxAllowedIdx, expectedIdx + searchRadius);

          let minVal = Infinity;
          let bestIdx = expectedIdx;

          for (let k = startIdx; k <= endIdx; k++) {
            const distFromExp = Math.abs(k - expectedIdx) / searchRadius;
            const score = smoothed[k] * (1.0 + 0.3 * distFromExp);
            if (score < minVal) {
              minVal = score;
              bestIdx = k;
            }
          }

          const valleyTime = Math.round(bestIdx * windowSec * 10) / 10;

          // Find the speech onset of the next sentence following the valley
          let nextOnsetIdx = bestIdx;
          for (let w = bestIdx; w < numWindows; w++) {
            if (energies[w] >= vadThreshold) {
              nextOnsetIdx = Math.max(bestIdx, w);
              break;
            }
          }
          const nextOnsetTime = Math.round(nextOnsetIdx * windowSec * 10) / 10;

          transitions.push({ valleyTime, nextOnsetTime });
          lastStart = nextOnsetTime;
        }

        // Construct boundaries where:
        // 1. Current sentence has generous tail headroom (+0.8s), stopping 0.15s before next sentence
        // 2. Next sentence starts cleanly 0.15s before its actual speech onset
        const boundaries = [];
        let curSentenceStart = speechStart;

        for (let i = 0; i < sentences.length - 1; i++) {
          const { valleyTime, nextOnsetTime } = transitions[i];
          const nextSentenceStart = Math.max(curSentenceStart + 0.6, Math.round((nextOnsetTime - 0.15) * 10) / 10);
          const maxTail = Math.round((valleyTime + 0.8) * 10) / 10;
          const curSentenceEnd = Math.max(curSentenceStart + 0.5, Math.min(nextSentenceStart - 0.15, maxTail));
          boundaries.push({ start: curSentenceStart, end: curSentenceEnd });
          curSentenceStart = nextSentenceStart;
        }

        boundaries.push({ start: curSentenceStart, end: speechEnd });
        return boundaries;
      }
    } catch (e) {
      console.warn('Audio silence & valley detection fallback:', e);
    }
  }

  // Step 2: Proportional fallback based on word counts with intro offset
  return proportionalSentenceBoundaries(sentences, duration, expectedEnglishSpeechSec);
}

function proportionalSentenceBoundaries(sentences, totalDuration, expectedEnglishSpeechSec) {
  if (!sentences || !sentences.length) return [];
  const expSec = expectedEnglishSpeechSec || estimateEnglishSpeechDuration(sentences);
  const overhead = totalDuration - expSec;
  const startOffset = overhead >= 2.5 ? Math.round((overhead - 0.5) * 10) / 10 : 0;
  const effectiveDur = Math.max(1.0, totalDuration - startOffset);

  if (sentences.length === 1) {
    return [{ start: startOffset, end: Math.round(totalDuration * 10) / 10 }];
  }
  const weights = sentences.map(s => Math.max(3, (s || '').trim().split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cur = startOffset;
  return sentences.map((s, idx) => {
    const fraction = weights[idx] / totalWeight;
    const dur = effectiveDur * fraction;
    const start = Math.round(cur * 10) / 10;
    const end = idx === sentences.length - 1 ? Math.round(totalDuration * 10) / 10 : Math.round((cur + dur) * 10) / 10;
    cur += dur;
    return { start, end };
  });
}


  // =========================================================================
  // Module: src/audio/boundary-utils.js
  // =========================================================================

/**
 * Sentence Boundary Resolver
 * Single place for: AI alignment (optional) → PCM VAD fallback → Korean intro cross-check → end padding.
 * Previously duplicated in InputView.handleTranslate() and InputView.autoSyncAudioScript().
 *
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */



const BOUNDARY_END_PADDING_SEC = 0.9;       // headroom after a sentence end (never cut the last word)
const BOUNDARY_LAST_END_PADDING_SEC = 1.0;  // headroom for the last sentence (bounded by file length)
const BOUNDARY_NEXT_GAP_SEC = 0.15;         // stop this far before the next sentence starts
const BOUNDARY_MIN_SEGMENT_SEC = 0.4;       // never shrink a segment below this
const BOUNDARY_INTRO_MIN_SEC = 2.0;         // only trust Korean intro detection above this length
const BOUNDARY_INTRO_TOLERANCE_SEC = 0.5;

/**
 * Mutates `boundaries` in place: extends each end by the padding policy, bounded by the next start.
 * Same arithmetic as the previous inline loop in input-view.js (entries with end === null/undefined are skipped).
 */
function applyBoundaryEndPadding(boundaries, totalDuration = null) {
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
async function resolveSentenceBoundaries({ audioBuffer = null, sentences = [], aiAlign = null } = {}) {
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
    }
  }

  if (boundaries && boundaries.length === sentences.length) {
    applyBoundaryEndPadding(boundaries, audioBuffer ? audioBuffer.duration : null);
  }
  return boundaries || [];
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
  // Module: src/audio/master-waveform.js
  // =========================================================================

/**
 * Master Audio Waveform & Sentence Segment Selector
 * Renders full-audio PCM timeline in Stage 1 Input View with interactive
 * draggable sentence segment boundaries, Ctrl+Wheel zoom, non-overlapping lockstep
 * boundary editing, silence snapping, and click-to-preview.
 */




class MasterWaveformTimeline {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;
    this.audioBuffer = null;
    this.sentenceList = [];
    this.options = options;

    this.peaks = [];
    this.totalBars = 1200; // High-resolution peak buffer
    this.hoverInfo = null; // { type: 'boundary'|'segment', index: number, listIdx: number, edge: 'start'|'end' }
    this.activeDrag = null; // { index: number, listIdx: number, edge: 'start'|'end', startX: number }
    this.snapEnabled = true;

    // Zoom state
    this.zoomLevel = 1.0;
    this.minZoom = 1.0;
    this.maxZoom = 10.0;
    this.baseWidth = 0;

    this.playbackTime = null;
    this.isPlaying = false;
    this.animFrameId = null;

    this.colors = [
      { fill: 'rgba(99, 102, 241, 0.18)', stroke: 'rgba(129, 140, 248, 0.85)', tag: '#818cf8' }, // Indigo
      { fill: 'rgba(16, 185, 129, 0.18)', stroke: 'rgba(52, 211, 153, 0.85)', tag: '#34d399' }, // Emerald
      { fill: 'rgba(245, 158, 11, 0.18)', stroke: 'rgba(251, 191, 36, 0.85)', tag: '#fbbf24' }, // Amber
      { fill: 'rgba(236, 72, 153, 0.18)', stroke: 'rgba(244, 114, 182, 0.85)', tag: '#f472b6' }, // Pink
      { fill: 'rgba(14, 165, 233, 0.18)', stroke: 'rgba(56, 189, 248, 0.85)', tag: '#38bdf8' }, // Cyan
      { fill: 'rgba(168, 85, 247, 0.18)', stroke: 'rgba(192, 132, 252, 0.85)', tag: '#c084fc' }  // Purple
    ];

    this.initEvents();
  }

  setAudioBuffer(audioBuffer) {
    this.audioBuffer = audioBuffer;
    this.peaks = [];
    if (audioBuffer) {
      this.extractPeaks();
    }
    this.syncCanvasSize();
    this.draw();
  }

  setSentenceList(sentenceList) {
    this.sentenceList = sentenceList || [];
    this.draw();
  }

  setSnapEnabled(enabled) {
    this.snapEnabled = !!enabled;
  }

  extractPeaks() {
    if (!this.audioBuffer) return;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const totalSamples = rawData.length;
      const blockSize = Math.max(1, Math.floor(totalSamples / this.totalBars));
      const peaks = [];
      let maxVal = 0;

      for (let i = 0; i < this.totalBars; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, totalSamples);
        let sum = 0;
        const step = Math.max(1, Math.floor(blockSize / 64));
        for (let j = start; j < end; j += step) {
          const val = Math.abs(rawData[j]);
          if (val > sum) sum = val;
        }
        peaks.push(sum);
        if (sum > maxVal) maxVal = sum;
      }

      if (maxVal > 0.001) {
        this.peaks = peaks.map(p => Math.min(1, Math.max(0.04, (p / maxVal) * 0.95)));
      } else {
        this.peaks = new Array(this.totalBars).fill(0.1);
      }
    } catch (e) {
      console.warn('Master waveform peak extraction error:', e);
      this.peaks = new Array(this.totalBars).fill(0.1);
    }
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    const duration = this.audioBuffer ? this.audioBuffer.duration : 1;

    // 1. Background Grid & Glass styling
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Dynamic time division grid lines based on zoom and duration
    const pxPerSec = w / duration;
    let timeStep = 5;
    if (pxPerSec > 160) {
      timeStep = 0.5;
    } else if (pxPerSec > 80) {
      timeStep = 1;
    } else if (pxPerSec > 35) {
      timeStep = 2;
    } else {
      timeStep = 5;
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';

    for (let t = 0; t <= duration; t += timeStep) {
      const x = Math.round((t / duration) * w);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      if (t > 0 && x < w - 24) {
        const text = Number.isInteger(t) ? `${t}s` : `${t.toFixed(1)}s`;
        ctx.fillText(text, x + 2, 11);
      }
    }

    // 2. Base Waveform PCM Bars
    if (this.peaks.length > 0) {
      const numBars = this.peaks.length;
      const barSpacing = w / numBars;
      const barWidth = Math.max(1, barSpacing * 0.75);
      const halfH = h / 2;

      for (let i = 0; i < numBars; i++) {
        const peak = this.peaks[i];
        const barH = Math.max(2, peak * (halfH - 8));
        const x = i * barSpacing;

        ctx.fillStyle = 'rgba(0, 255, 204, 0.35)';
        ctx.fillRect(x, halfH - barH, barWidth, barH * 2);
      }
    }

    // 3. Sentence Segment Overlays
    const validSentences = (this.sentenceList || []).filter(s => s.audioStart !== null && s.audioEnd !== null);

    validSentences.forEach((stn, idx) => {
      const startX = Math.round((stn.audioStart / duration) * w);
      const endX = Math.round((stn.audioEnd / duration) * w);
      const segW = Math.max(2, endX - startX);
      const color = this.colors[idx % this.colors.length];

      const isHovered = this.hoverInfo && this.hoverInfo.index === stn.index;
      const isDragging = this.activeDrag && this.activeDrag.index === stn.index;

      // Segment Background
      ctx.fillStyle = (isHovered || isDragging) ? color.fill.replace('0.18', '0.34') : color.fill;
      ctx.fillRect(startX, 0, segW, h);

      // Top Header Border
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, 0, segW, h);

      // Label Tag: S1 (00:03.2)
      ctx.fillStyle = color.tag;
      ctx.font = 'bold 10px sans-serif';
      const label = `S${stn.index + 1} (${this.formatSec(stn.audioStart)}~${this.formatSec(stn.audioEnd)})`;
      ctx.fillText(label, startX + 5, 22);

      // Left Boundary Handle Line
      const isStartHovered = isHovered && this.hoverInfo.edge === 'start';
      ctx.strokeStyle = isStartHovered ? '#ffffff' : color.stroke;
      ctx.lineWidth = isStartHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.stroke();

      // Right Boundary Handle Line
      const isEndHovered = isHovered && this.hoverInfo.edge === 'end';
      ctx.strokeStyle = isEndHovered ? '#ffffff' : color.stroke;
      ctx.lineWidth = isEndHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, h);
      ctx.stroke();

      // Grab handle diamond indicators
      this.drawHandleDiamond(ctx, startX, h / 2, isStartHovered ? '#ffffff' : color.tag);
      this.drawHandleDiamond(ctx, endX, h / 2, isEndHovered ? '#ffffff' : color.tag);
    });

    // 4. Playhead Line
    if (this.playbackTime !== null && this.playbackTime >= 0 && this.playbackTime <= duration) {
      const playheadX = Math.round((this.playbackTime / duration) * w);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawHandleDiamond(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
  }

  initEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousemove', (e) => this.handleWindowMouseMove(e));
      window.addEventListener('mouseup', (e) => this.handleWindowMouseUp(e));
    }
    this.canvas.addEventListener('mouseleave', () => {
      if (!this.activeDrag) {
        this.hoverInfo = null;
        this.draw();
      }
    });

    // Ctrl + Mouse Wheel Zoom Listener
    const wrap = this.canvas.parentElement || this.canvas;
    wrap.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const duration = this.audioBuffer ? this.audioBuffer.duration : 1;
        const rect = wrap.getBoundingClientRect();
        const mouseViewportX = e.clientX - rect.left;
        const contentX = wrap.scrollLeft + mouseViewportX;
        const anchorTime = (contentX / Math.max(1, this.canvas.width)) * duration;

        const factor = e.deltaY < 0 ? 1.25 : 0.8;
        const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * factor));
        this.setZoom(nextZoom, anchorTime, mouseViewportX);
      }
    }, { passive: false });

    // Handle container resize
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncCanvasSize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  syncCanvasSize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const wrap = this.canvas.parentElement;
    const baseW = Math.floor(wrap.clientWidth);
    if (baseW > 0) {
      this.baseWidth = baseW;
      const targetW = Math.round(baseW * this.zoomLevel);
      if (targetW !== this.canvas.width) {
        this.canvas.width = targetW;
        if (this.zoomLevel > 1.0) {
          this.canvas.style.width = `${targetW}px`;
        } else {
          this.canvas.style.width = '100%';
        }
        this.draw();
      }
    }
  }

  /**
   * Adjust horizontal zoom level
   * @param {number} level Zoom multiplier (1.0 to 10.0)
   * @param {number|null} anchorTime Time position in seconds to center zoom on
   * @param {number|null} anchorViewportX Horizontal mouse offset inside container
   */
  setZoom(level, anchorTime = null, anchorViewportX = null) {
    const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(level * 10) / 10));
    const wrap = this.canvas.parentElement;
    const baseW = (wrap && wrap.clientWidth > 0) ? wrap.clientWidth : (this.baseWidth || 800);
    this.baseWidth = baseW;

    const duration = this.audioBuffer ? this.audioBuffer.duration : 1;

    // If anchor is not provided, anchor to center of visible container
    if (anchorTime === null && wrap) {
      const mouseViewportX = wrap.clientWidth / 2;
      const contentX = wrap.scrollLeft + mouseViewportX;
      anchorTime = (contentX / Math.max(1, this.canvas.width)) * duration;
      anchorViewportX = mouseViewportX;
    }

    this.zoomLevel = clamped;
    const newWidth = Math.round(baseW * this.zoomLevel);
    this.canvas.width = newWidth;

    if (this.zoomLevel > 1.0) {
      this.canvas.style.width = `${newWidth}px`;
    } else {
      this.canvas.style.width = '100%';
    }

    // Preserve anchor point under view
    if (wrap && anchorTime !== null && anchorViewportX !== null) {
      const newContentX = (anchorTime / duration) * newWidth;
      wrap.scrollLeft = Math.max(0, newContentX - anchorViewportX);
    }

    this.draw();

    if (typeof this.options.onZoomChange === 'function') {
      this.options.onZoomChange(this.zoomLevel);
    }
  }

  getTimeAtX(clientX) {
    if (!this.canvas || !this.audioBuffer) return 0;
    const rect = this.canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const fraction = relX / rect.width;
    return fraction * this.audioBuffer.duration;
  }

  handleMouseMove(e) {
    if (this.activeDrag) return;
    if (!this.audioBuffer || !this.sentenceList.length) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const duration = this.audioBuffer.duration;
    const thresholdPx = 10;

    let found = null;

    // Check boundary lines first
    for (let i = 0; i < this.sentenceList.length; i++) {
      const stn = this.sentenceList[i];
      if (stn.audioStart === null || stn.audioEnd === null) continue;

      const startX = (stn.audioStart / duration) * w;
      const endX = (stn.audioEnd / duration) * w;

      if (Math.abs(x - startX) <= thresholdPx) {
        found = { type: 'boundary', index: stn.index, listIdx: i, edge: 'start' };
        break;
      }
      if (Math.abs(x - endX) <= thresholdPx) {
        found = { type: 'boundary', index: stn.index, listIdx: i, edge: 'end' };
        break;
      }
    }

    // If not hovering boundary, check inside segment
    if (!found) {
      for (let i = 0; i < this.sentenceList.length; i++) {
        const stn = this.sentenceList[i];
        if (stn.audioStart === null || stn.audioEnd === null) continue;
        const startX = (stn.audioStart / duration) * w;
        const endX = (stn.audioEnd / duration) * w;
        if (x >= startX && x <= endX) {
          found = { type: 'segment', index: stn.index, listIdx: i };
          break;
        }
      }
    }

    this.hoverInfo = found;
    if (found && found.type === 'boundary') {
      this.canvas.style.cursor = 'col-resize';
      const i = found.listIdx;
      if (found.edge === 'end' && i < this.sentenceList.length - 1) {
        this.canvas.title = `경계 조절: S${i + 1} 늘림/줄임 시 S${i + 2} 시작 위치 자동 연동`;
      } else if (found.edge === 'start' && i > 0) {
        this.canvas.title = `경계 조절: S${i + 1} 시작 조절 시 S${i} 끝 위치 자동 연동`;
      } else {
        this.canvas.title = `문장 S${found.index + 1} 경계 조절`;
      }
    } else if (found && found.type === 'segment') {
      this.canvas.style.cursor = 'pointer';
      this.canvas.title = `클릭하여 문장 S${found.index + 1} 오디오 구간 청취`;
    } else {
      this.canvas.style.cursor = 'default';
      this.canvas.title = '';
    }

    this.draw();
  }

  handleMouseDown(e) {
    if (!this.audioBuffer || !this.sentenceList.length) return;

    if (this.hoverInfo && this.hoverInfo.type === 'boundary') {
      const listIdx = this.hoverInfo.listIdx !== undefined 
        ? this.hoverInfo.listIdx 
        : this.sentenceList.findIndex(s => s.index === this.hoverInfo.index);
      const stn = this.sentenceList[listIdx];
      if (stn) {
        this.activeDrag = {
          index: stn.index,
          listIdx: listIdx,
          edge: this.hoverInfo.edge,
          startX: e.clientX,
          origStart: stn.audioStart,
          origEnd: stn.audioEnd
        };
      }
    } else if (this.hoverInfo && this.hoverInfo.type === 'segment') {
      // Click inside segment: Play this segment and select it
      const stn = this.sentenceList.find(s => s.index === this.hoverInfo.index);
      if (stn && stn.audioStart !== null && stn.audioEnd !== null) {
        playbackController.playSegment(stn.audioStart, stn.audioEnd, { owner: 'master-waveform' });
        if (typeof this.options.onSegmentSelect === 'function') {
          this.options.onSegmentSelect(stn.index);
        }
      }
    }
  }

  handleWindowMouseMove(e) {
    if (!this.activeDrag || !this.audioBuffer) return;

    // Auto-scroll container when dragging near viewport edges if zoomed in
    if (this.zoomLevel > 1.0 && this.canvas.parentElement) {
      const wrap = this.canvas.parentElement;
      const wrapRect = wrap.getBoundingClientRect();
      if (e.clientX < wrapRect.left + 30) {
        wrap.scrollLeft -= 14;
      } else if (e.clientX > wrapRect.right - 30) {
        wrap.scrollLeft += 14;
      }
    }

    let targetTime = this.getTimeAtX(e.clientX);
    const duration = this.audioBuffer.duration;
    targetTime = Math.max(0, Math.min(duration, targetTime));

    if (this.snapEnabled) {
      targetTime = this.findNearestSilenceTime(targetTime, 0.25);
    }

    targetTime = Math.round(targetTime * 10) / 10;

    const listIdx = this.activeDrag.listIdx;
    const stn = this.sentenceList[listIdx];
    if (!stn) return;

    const minDur = 0.2; // Minimum sentence duration

    if (this.activeDrag.edge === 'end') {
      // S[listIdx] right boundary is moving.
      // Contiguous with S[listIdx + 1] start: If S[listIdx] length expands, S[listIdx + 1] length shortens!
      const nextStn = (listIdx < this.sentenceList.length - 1) ? this.sentenceList[listIdx + 1] : null;

      const minBound = (stn.audioStart !== null ? stn.audioStart : 0) + minDur;
      let maxBound = duration;
      if (nextStn && nextStn.audioEnd !== null) {
        maxBound = nextStn.audioEnd - minDur;
      }

      let clampedTime = Math.max(minBound, Math.min(maxBound, targetTime));
      clampedTime = Math.round(clampedTime * 10) / 10;

      stn.audioEnd = clampedTime;
      stn.cachedPeaks = null;

      if (nextStn) {
        nextStn.audioStart = clampedTime;
        nextStn.cachedPeaks = null;
      }

      this.draw();

      if (typeof this.options.onSegmentChange === 'function') {
        this.options.onSegmentChange(
          stn.index,
          stn.audioStart,
          stn.audioEnd,
          false,
          nextStn ? { index: nextStn.index, audioStart: nextStn.audioStart, audioEnd: nextStn.audioEnd } : null
        );
      }
    } else { // edge === 'start'
      // S[listIdx] left boundary is moving.
      // Contiguous with S[listIdx - 1] end: If S[listIdx] start moves left, S[listIdx - 1] end moves left!
      const prevStn = (listIdx > 0) ? this.sentenceList[listIdx - 1] : null;

      let minBound = 0;
      if (prevStn && prevStn.audioStart !== null) {
        minBound = prevStn.audioStart + minDur;
      }
      const maxBound = (stn.audioEnd !== null ? stn.audioEnd : duration) - minDur;

      let clampedTime = Math.max(minBound, Math.min(maxBound, targetTime));
      clampedTime = Math.round(clampedTime * 10) / 10;

      stn.audioStart = clampedTime;
      stn.cachedPeaks = null;

      if (prevStn) {
        prevStn.audioEnd = clampedTime;
        prevStn.cachedPeaks = null;
      }

      this.draw();

      if (typeof this.options.onSegmentChange === 'function') {
        this.options.onSegmentChange(
          stn.index,
          stn.audioStart,
          stn.audioEnd,
          false,
          prevStn ? { index: prevStn.index, audioStart: prevStn.audioStart, audioEnd: prevStn.audioEnd } : null
        );
      }
    }
  }

  handleWindowMouseUp(e) {
    if (!this.activeDrag) return;

    const listIdx = this.activeDrag.listIdx;
    const edge = this.activeDrag.edge;
    const stn = this.sentenceList[listIdx];
    const adjStn = edge === 'end'
      ? (listIdx < this.sentenceList.length - 1 ? this.sentenceList[listIdx + 1] : null)
      : (listIdx > 0 ? this.sentenceList[listIdx - 1] : null);

    if (stn && typeof this.options.onSegmentChange === 'function') {
      this.options.onSegmentChange(
        stn.index,
        stn.audioStart,
        stn.audioEnd,
        true,
        adjStn ? { index: adjStn.index, audioStart: adjStn.audioStart, audioEnd: adjStn.audioEnd } : null
      );
    }

    this.activeDrag = null;
    this.draw();
  }

  findNearestSilenceTime(time, thresholdSec = 0.25) {
    if (!this.audioBuffer) return time;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const sr = this.audioBuffer.sampleRate;
      const centerSample = Math.floor(time * sr);
      const rangeSamples = Math.floor(thresholdSec * sr);
      const startSample = Math.max(0, centerSample - rangeSamples);
      const endSample = Math.min(rawData.length, centerSample + rangeSamples);

      let minRms = Infinity;
      let minSample = centerSample;
      const windowSize = Math.floor(sr * 0.04); // 40ms window

      for (let s = startSample; s < endSample - windowSize; s += Math.floor(windowSize / 2)) {
        let sumSq = 0;
        for (let j = 0; j < windowSize; j += 8) {
          const v = rawData[s + j];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / (windowSize / 8));
        if (rms < minRms) {
          minRms = rms;
          minSample = s + Math.floor(windowSize / 2);
        }
      }

      if (minRms < 0.05) {
        return minSample / sr;
      }
    } catch (e) {}
    return time;
  }

  setPlayheadTime(time) {
    this.playbackTime = time;
    this.draw();

    // Auto-follow playhead if zoomed in
    if (this.zoomLevel > 1.0 && this.audioBuffer && this.canvas && this.canvas.parentElement) {
      const wrap = this.canvas.parentElement;
      const duration = this.audioBuffer.duration;
      const playheadX = (time / duration) * this.canvas.width;
      const wrapW = wrap.clientWidth;
      const curScroll = wrap.scrollLeft;

      if (playheadX > curScroll + wrapW * 0.75 || playheadX < curScroll) {
        wrap.scrollLeft = Math.max(0, playheadX - wrapW * 0.25);
      }
    }
  }

  formatSec(sec) {
    if (sec === null || sec === undefined) return '0.0s';
    return `${sec.toFixed(1)}s`;
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


  // =========================================================================
  // Module: src/audio/playback-controller.js
  // =========================================================================

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

class PlaybackController {
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

const playbackController = new PlaybackController();


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
    this.hideTimer = null; // inner 300ms fade-out timer (must also be cleared, or a new toast gets hidden)
  }

  setElement(el) {
    this.toastEl = el;
  }

  show(message, durationMs = 3000) {
    if (!this.toastEl) {
      this.toastEl = document.getElementById('toast');
    }
    if (!this.toastEl) return;

    clearTimeout(this.timer);
    clearTimeout(this.hideTimer);

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    this.timer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.hideTimer = setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 300);
    }, durationMs);
  }
}

const toast = new ToastManager();


  // =========================================================================
  // Module: src/services/project-service.js
  // =========================================================================

/**
 * CE Tool Project Service
 * Handles .ceproject package serialization, deserialization, File System Access API,
 * In-place Save, Save As, Load, and persistent recent folder tracking.
 */





const PROJECT_IDB_NAME = 'ce_tool_db';
const PROJECT_STORE_NAME = 'project_handles';
const PROJECT_PICKER_ID = 'ce-project-folder';

class ProjectService {
  constructor() {
    this.currentFileHandle = null;
    this.lastDirectoryHandle = null;
    this.currentProjectName = '새 프로젝트';
    this.isDirty = false;
    this.dbPromise = null;
    this.onStateChangeCallbacks = [];
  }

  init() {
    this.initIndexedDB();
    this.loadLastProjectMeta();
  }

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.onStateChangeCallbacks.push(cb);
    }
  }

  notifyStateChange() {
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb({
          projectName: this.currentProjectName,
          hasHandle: !!this.currentFileHandle,
          isDirty: this.isDirty
        });
      } catch (err) {
        console.error('Error in project state callback:', err);
      }
    });
  }

  markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.notifyStateChange();
    }
  }

  markClean(name = this.currentProjectName) {
    this.isDirty = false;
    this.currentProjectName = name;
    this.notifyStateChange();
  }

  resetProject() {
    this.currentFileHandle = null;
    this.currentProjectName = '새 프로젝트';
    this.isDirty = false;
    this.saveLastProjectMeta('새 프로젝트');
    this.saveHandleToIDB('last_file_handle', null);
    this.notifyStateChange();
  }

  /* -------------------------------------------------------------------------
   * IndexedDB Persistence for Handles & Metadata
   * ------------------------------------------------------------------------- */
  initIndexedDB() {
    if (typeof indexedDB === 'undefined') return;
    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(PROJECT_IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
            db.createObjectStore(PROJECT_STORE_NAME);
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  async saveHandleToIDB(key, handle) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PROJECT_STORE_NAME);
        store.put(handle, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async getHandleFromIDB(key) {
    if (!this.dbPromise) return null;
    const db = await this.dbPromise;
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PROJECT_STORE_NAME, 'readonly');
        const store = tx.objectStore(PROJECT_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  loadLastProjectMeta() {
    try {
      if (typeof localStorage !== 'undefined') {
        const meta = localStorage.getItem('ce_tool_last_project_meta');
        if (meta) {
          const parsed = JSON.parse(meta);
          if (parsed && parsed.name) {
            this.currentProjectName = parsed.name;
          }
        }
      }
    } catch (e) {}
    this.notifyStateChange();
  }

  saveLastProjectMeta(name) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ce_tool_last_project_meta', JSON.stringify({
          name,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (e) {}
  }

  /* -------------------------------------------------------------------------
   * Serialization & Deserialization
   * ------------------------------------------------------------------------- */
  async serializeProject() {
    let audioData = null;
    if (appState.uploadedAudioFile) {
      const file = appState.uploadedAudioFile;
      const base64 = await this.readFileAsDataURL(file);
      audioData = {
        hasAudio: true,
        fileName: file.name || 'audio.mp3',
        mimeType: file.type || 'audio/mp3',
        size: file.size || 0,
        isSynthesized: !!appState.isSynthesizedAudio,
        dataBase64: base64
      };
    } else if (appState.isSynthesizedAudio && appState.synthesizedWavBlob) {
      const base64 = await this.readFileAsDataURL(appState.synthesizedWavBlob);
      audioData = {
        hasAudio: true,
        fileName: 'tts_synthesized.wav',
        mimeType: 'audio/wav',
        size: appState.synthesizedWavBlob.size || 0,
        isSynthesized: true,
        dataBase64: base64
      };
    }

    const project = {
      format: 'ce-project',
      version: '1.1.0',
      appName: 'CE Tool',
      savedAt: new Date().toISOString(),
      projectName: this.currentProjectName.replace(/\.ceproject$/i, ''),
      mode: appState.currentMode || 'text',
      scriptText: appState.scriptText || '',
      audio: audioData,
      sentenceList: appState.sentenceList || [],
      settings: {
        playbackSpeed: appState.playbackSpeed || 1.0,
        isFelsMode: !!appState.isFelsMode,
        activeSentenceIndex: appState.activeSentenceIndex || 0
      }
    };

    return JSON.stringify(project, null, 2);
  }

  async deserializeAndApply(jsonString, inputView) {
    const data = JSON.parse(jsonString);
    if (!data || (data.format !== 'ce-project' && !data.sentenceList && !data.sentences)) {
      throw new Error('유효한 CE Tool 프로젝트 파일(.ceproject)이 아닙니다.');
    }

    const sentences = data.sentenceList || data.sentences || [];
    const script = data.scriptText || '';
    const mode = data.mode || (data.audio?.hasAudio ? 'both' : 'text');

    // 1. Audio restoration
    if (data.audio && data.audio.dataBase64) {
      const blob = this.dataURLToBlob(data.audio.dataBase64, data.audio.mimeType || 'audio/mp3');
      const audioFile = new File([blob], data.audio.fileName || 'audio.mp3', {
        type: data.audio.mimeType || 'audio/mp3'
      });

      appState.uploadedAudioFile = audioFile;
      if (appState.uploadedAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(appState.uploadedAudioUrl);
      }
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        appState.uploadedAudioUrl = URL.createObjectURL(audioFile);
      }
      appState.isSynthesizedAudio = !!data.audio.isSynthesized;

      try {
        if (typeof decodeAudioFile === 'function') {
          appState.audioBuffer = await decodeAudioFile(audioFile);
        }
      } catch (decodeErr) {
        console.warn('Audio decoding fallback during load:', decodeErr);
      }

      if (inputView && typeof inputView.renderDropAreaPreview === 'function') {
        inputView.renderDropAreaPreview(audioFile);
      }
    } else {
      if (inputView && typeof inputView.resetAudioFile === 'function') {
        inputView.resetAudioFile();
      }
    }

    // 2. Mode and Script
    appState.scriptText = script;
    if (inputView && inputView.inputEnglish) {
      inputView.inputEnglish.value = script;
      if (inputView.charCount) inputView.charCount.textContent = `${script.length}자`;
    }

    if (inputView && typeof inputView.setMode === 'function') {
      inputView.setMode(mode);
    } else {
      appState.setUploadMode(mode);
    }

    // 3. Sentences & Settings
    appState.setSentenceList(sentences);
    if (data.settings) {
      if (typeof data.settings.playbackSpeed === 'number') {
        appState.playbackSpeed = data.settings.playbackSpeed;
      }
      if (typeof data.settings.activeSentenceIndex === 'number') {
        appState.setActiveSentenceIndex(data.settings.activeSentenceIndex);
      }
      if (typeof data.settings.isFelsMode === 'boolean') {
        appState.isFelsMode = data.settings.isFelsMode;
      }
    }

    // 4. Page 1 Results
    if (inputView && typeof inputView.renderParsedResults === 'function') {
      inputView.renderParsedResults({ scrollToSection: false });
    }

    return data;
  }

  /* -------------------------------------------------------------------------
   * 3 Core Actions: Open, Save, Save As
   * ------------------------------------------------------------------------- */
  async openProject(inputView) {
    if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: PROJECT_PICKER_ID, // Chromium MRU automatic folder memory!
          types: [{
            description: 'CE Tool Project (*.ceproject, *.json)',
            accept: { 'application/json': ['.ceproject', '.json'] }
          }],
          multiple: false
        };

        const savedDir = await this.getHandleFromIDB('last_dir_handle');
        if (savedDir) {
          pickerOpts.startIn = savedDir;
        }

        const [handle] = await window.showOpenFilePicker(pickerOpts);
        if (!handle) return;

        const file = await handle.getFile();
        const text = await file.text();

        await this.deserializeAndApply(text, inputView);

        this.currentFileHandle = handle;
        this.markClean(handle.name);
        this.saveLastProjectMeta(handle.name);
        this.saveHandleToIDB('last_file_handle', handle);

        toast.show(`📂 프로젝트 '${handle.name}'를 성공적으로 불러왔습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User canceled
        console.warn('Native file picker failed, falling back to input:', err);
      }
    }

    // Fallback: <input type="file">
    this.openWithFileInputFallback(inputView);
  }

  openWithFileInputFallback(inputView) {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('projectFileInput') || document.createElement('input');
    input.type = 'file';
    input.accept = '.ceproject,.json';
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        await this.deserializeAndApply(text, inputView);
        this.currentFileHandle = null; // No direct in-place save in fallback mode
        this.markClean(file.name);
        this.saveLastProjectMeta(file.name);
        toast.show(`📂 프로젝트 '${file.name}'를 성공적으로 불러왔습니다.`);
      } catch (err) {
        toast.show(`❌ 프로젝트 불러오기 실패: ${err.message}`);
      } finally {
        input.value = '';
      }
    };
    input.click();
  }

  async saveProject(inputView) {
    if (!this.currentFileHandle) {
      return this.saveProjectAs(inputView);
    }

    try {
      const opts = { mode: 'readwrite' };
      if (typeof this.currentFileHandle.queryPermission === 'function') {
        if ((await this.currentFileHandle.queryPermission(opts)) !== 'granted') {
          if ((await this.currentFileHandle.requestPermission(opts)) !== 'granted') {
            return this.saveProjectAs(inputView);
          }
        }
      }

      toast.show('💾 프로젝트 저장 중...');
      const jsonStr = await this.serializeProject();
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      this.markClean(this.currentFileHandle.name);
      toast.show(`💾 프로젝트 '${this.currentFileHandle.name}' 저장 완료!`);
    } catch (err) {
      console.error('In-place save failed, attempting Save As:', err);
      return this.saveProjectAs(inputView);
    }
  }

  async saveProjectAs(inputView) {
    const suggested = this.generateSuggestedName();

    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: PROJECT_PICKER_ID, // Chromium MRU automatic folder memory!
          suggestedName: `${suggested}.ceproject`,
          types: [{
            description: 'CE Tool Project (*.ceproject)',
            accept: { 'application/json': ['.ceproject'] }
          }]
        };

        const savedDir = await this.getHandleFromIDB('last_dir_handle');
        if (savedDir) {
          pickerOpts.startIn = savedDir;
        }

        const handle = await window.showSaveFilePicker(pickerOpts);
        if (!handle) return;

        toast.show('💾 프로젝트 저장 중...');
        const jsonStr = await this.serializeProject();
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        this.currentFileHandle = handle;
        this.markClean(handle.name);
        this.saveLastProjectMeta(handle.name);
        this.saveHandleToIDB('last_file_handle', handle);

        toast.show(`💾 프로젝트 '${handle.name}'로 새로 저장되었습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User canceled
        console.warn('Native save file picker failed, falling back to download:', err);
      }
    }

    // Fallback: Browser Blob download
    await this.saveWithDownloadFallback(suggested);
  }

  async saveWithDownloadFallback(suggested) {
    try {
      const jsonStr = await this.serializeProject();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${suggested}.ceproject`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.markClean(filename);
      this.saveLastProjectMeta(filename);
      toast.show(`💾 프로젝트 파일이 다운로드되었습니다: ${filename}`);
    } catch (err) {
      toast.show(`❌ 저장 실패: ${err.message}`);
    }
  }

  generateSuggestedName() {
    if (this.currentProjectName && this.currentProjectName !== '새 프로젝트') {
      return this.currentProjectName.replace(/\.ceproject$/i, '');
    }
    if (appState.uploadedAudioFile && appState.uploadedAudioFile.name) {
      return appState.uploadedAudioFile.name.replace(/\.[^/.]+$/, '');
    }
    if (appState.sentenceList && appState.sentenceList.length > 0 && appState.sentenceList[0].text) {
      const first = appState.sentenceList[0].text.trim().slice(0, 24).replace(/[^a-zA-Z0-9가-힣\s_-]/g, '').trim().replace(/\s+/g, '_');
      if (first) return first;
    }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `CE_Project_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  /* -------------------------------------------------------------------------
   * Utility Helpers
   * ------------------------------------------------------------------------- */
  readFileAsDataURL(blobOrFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blobOrFile);
    });
  }

  dataURLToBlob(dataURL, fallbackMime = 'audio/mp3') {
    const parts = dataURL.split(',');
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || fallbackMime;
    const binary = atob(parts[1] || parts[0]);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binary.charCodeAt(i);
    }
    return new Blob([u8], { type: mime });
  }
}

const projectService = new ProjectService();


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
    if (this.engineBadge) {
      this.engineBadge.addEventListener('click', () => this.open());
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
    // Escape closes the modal
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
          this.close();
        }
      });
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
      // callOpenAI() uses gpt-4o-mini, so the badge must not claim GPT-4o
      const icon = provider === 'gemini' ? '✨' : '🟢';
      const label = provider === 'gemini' ? 'Gemini AI' : 'OpenAI';
      this.engineBadge.innerHTML = `<span class="badge-icon">${icon}</span><span class="badge-label">${label}</span>`;
      this.engineBadge.className = 'engine-badge ai-active';
      this.engineBadge.title = `AI 엔진 활성: ${label} (클릭하여 설정)`;
    } else {
      this.engineBadge.innerHTML = `<span class="badge-icon">⚙️</span><span class="badge-label">규칙 엔진</span>`;
      this.engineBadge.className = 'engine-badge rule-active';
      this.engineBadge.title = '로컬 규칙 엔진 활성 (클릭하여 AI API 설정)';
    }
  }
}


  // =========================================================================
  // Module: src/ui/sentence-trimmer-modal.js
  // =========================================================================

/**
 * Sentence Audio Waveform Trimmer Modal
 * High-resolution zoomed waveform editor for adjusting individual sentence audioStart & audioEnd
 * with visual draggable handles, numeric inputs, and instant segment preview playback.
 */




class SentenceTrimmerModal {
  constructor() {
    this.modalEl = document.getElementById('sentenceTrimmerModal');
    this.canvas = document.getElementById('trimmerCanvas');
    this.ctx = (this.canvas && typeof this.canvas.getContext === 'function') ? this.canvas.getContext('2d') : null;

    this.titleEl = document.getElementById('trimmerModalTitle');
    this.textPreviewEl = document.getElementById('trimmerStnText');
    this.inputStart = document.getElementById('trimmerInputStart');
    this.inputEnd = document.getElementById('trimmerInputEnd');
    this.btnPlay = document.getElementById('btnTrimmerPlaySegment');
    this.btnSave = document.getElementById('btnSaveTrimmer');
    this.btnCancel = document.getElementById('btnCancelTrimmer');
    this.btnClose = document.getElementById('btnCloseTrimmerModal');

    this.currentStn = null;
    this.audioBuffer = null;
    this.onSave = null;

    this.zoomStart = 0;
    this.zoomEnd = 10;
    this.currentStart = 0;
    this.currentEnd = 5;

    this.activeDrag = null; // 'start' | 'end' | 'body'
    this.dragStartX = 0;
    this.dragOrigStart = 0;
    this.dragOrigEnd = 0;

    this.peaks = [];
    this.initEvents();
  }

  open(stn, audioBuffer, onSaveCallback) {
    if (!stn || !audioBuffer) return;
    this.currentStn = stn;
    this.audioBuffer = audioBuffer;
    this.onSave = onSaveCallback;

    const totalDur = audioBuffer.duration || 1;
    this.currentStart = stn.audioStart !== null ? Math.max(0, stn.audioStart) : 0;
    this.currentEnd = stn.audioEnd !== null ? Math.min(totalDur, stn.audioEnd) : Math.min(totalDur, this.currentStart + 4);

    // Zoom view: 1.8s margin before and after sentence
    const margin = 1.8;
    this.zoomStart = Math.max(0, this.currentStart - margin);
    this.zoomEnd = Math.min(totalDur, this.currentEnd + margin);

    if (this.titleEl) {
      this.titleEl.textContent = `문장 S${stn.index + 1} 음성 구간 정밀 조정`;
    }
    if (this.textPreviewEl) {
      this.textPreviewEl.textContent = `"${stn.text || ''}"`;
    }

    this.updateInputFields();
    this.extractZoomedPeaks();

    if (this.modalEl) {
      this.modalEl.classList.remove('hidden');
    }

    requestAnimationFrame(() => {
      this.syncCanvasSize();
      this.draw();
    });
  }

  close() {
    playbackController.stopAll();
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
    this.currentStn = null;
  }

  updateInputFields() {
    if (this.inputStart) this.inputStart.value = (Math.round(this.currentStart * 10) / 10).toFixed(1);
    if (this.inputEnd) this.inputEnd.value = (Math.round(this.currentEnd * 10) / 10).toFixed(1);
  }

  syncCanvasSize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    if (w > 0 && w !== this.canvas.width) {
      this.canvas.width = w;
      this.extractZoomedPeaks();
    }
  }

  extractZoomedPeaks() {
    if (!this.audioBuffer) return;
    try {
      const rawData = this.audioBuffer.getChannelData(0);
      const sr = this.audioBuffer.sampleRate;
      const startSample = Math.floor(this.zoomStart * sr);
      const endSample = Math.min(rawData.length, Math.floor(this.zoomEnd * sr));
      const rangeSamples = Math.max(1, endSample - startSample);
      const numBars = 320;
      const blockSize = Math.max(1, Math.floor(rangeSamples / numBars));
      const peaks = [];
      let maxVal = 0;

      for (let i = 0; i < numBars; i++) {
        const s = startSample + i * blockSize;
        const e = Math.min(s + blockSize, endSample);
        let sum = 0;
        let count = 0;
        for (let j = s; j < e; j += 4) {
          const val = Math.abs(rawData[j]);
          if (val > sum) sum = val;
          count++;
        }
        peaks.push(sum);
        if (sum > maxVal) maxVal = sum;
      }

      if (maxVal > 0.001) {
        this.peaks = peaks.map(p => Math.min(1, Math.max(0.05, (p / maxVal) * 0.95)));
      } else {
        this.peaks = new Array(numBars).fill(0.1);
      }
    } catch (e) {
      this.peaks = new Array(320).fill(0.1);
    }
  }

  timeToX(time) {
    if (!this.canvas) return 0;
    const span = Math.max(0.1, this.zoomEnd - this.zoomStart);
    return Math.round(((time - this.zoomStart) / span) * this.canvas.width);
  }

  xToTime(x) {
    if (!this.canvas) return 0;
    const fraction = Math.max(0, Math.min(1, x / this.canvas.width));
    const span = Math.max(0.1, this.zoomEnd - this.zoomStart);
    return this.zoomStart + fraction * span;
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const startX = this.timeToX(this.currentStart);
    const endX = this.timeToX(this.currentEnd);
    const activeW = Math.max(4, endX - startX);

    // 2. Pre-selection dim background
    if (startX > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, startX, h);
    }

    // Active Selection Background
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(startX, 0, activeW, h);

    // Post-selection dim background
    if (endX < w) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(endX, 0, w - endX, h);
    }

    // 3. High-definition PCM Bars
    if (this.peaks.length > 0) {
      const numBars = this.peaks.length;
      const barSpacing = w / numBars;
      const barW = Math.max(1, barSpacing * 0.75);
      const halfH = h / 2;

      for (let i = 0; i < numBars; i++) {
        const peak = this.peaks[i];
        const barH = Math.max(2, peak * (halfH - 10));
        const x = i * barSpacing;

        const isInside = x >= startX && x <= endX;
        ctx.fillStyle = isInside ? '#00ffcc' : 'rgba(100, 116, 139, 0.4)';
        ctx.fillRect(x, halfH - barH, barW, barH * 2);
      }
    }

    // 4. Selection Active Border Box
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 0, activeW, h);

    // 5. Handles (Start & End)
    this.drawHandle(ctx, startX, h, '#10b981', '시작');
    this.drawHandle(ctx, endX, h, '#f43f5e', '종료');

    // 6. Time HUD at bottom
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`${(Math.round(this.currentStart * 10) / 10).toFixed(1)}s`, Math.max(6, startX - 20), h - 8);

    ctx.fillStyle = '#fb7185';
    ctx.fillText(`${(Math.round(this.currentEnd * 10) / 10).toFixed(1)}s`, Math.min(w - 38, endX - 10), h - 8);
  }

  drawHandle(ctx, x, h, color, text) {
    // Vertical line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Top Handle Badge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 18, 4, 36, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, 17);
    ctx.textAlign = 'left';
  }

  initEvents() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    if (this.inputStart) {
      this.inputStart.addEventListener('change', () => {
        const val = parseFloat(this.inputStart.value);
        if (!isNaN(val) && val >= 0 && val < this.currentEnd - 0.2) {
          this.currentStart = Math.round(val * 10) / 10;
          this.draw();
        } else {
          this.updateInputFields();
        }
      });
    }

    if (this.inputEnd) {
      this.inputEnd.addEventListener('change', () => {
        const val = parseFloat(this.inputEnd.value);
        const totalDur = this.audioBuffer ? this.audioBuffer.duration : 999;
        if (!isNaN(val) && val > this.currentStart + 0.2 && val <= totalDur) {
          this.currentEnd = Math.round(val * 10) / 10;
          this.draw();
        } else {
          this.updateInputFields();
        }
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        playbackController.playSegment(this.currentStart, this.currentEnd, { owner: 'trimmer-modal' });
      });
    }

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => {
        if (typeof this.onSave === 'function') {
          this.onSave(this.currentStart, this.currentEnd);
        }
        this.close();
      });
    }

    if (this.btnCancel) this.btnCancel.addEventListener('click', () => this.close());
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.close());

    // Close on backdrop click
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }
  }

  handleMouseDown(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startX = this.timeToX(this.currentStart);
    const endX = this.timeToX(this.currentEnd);
    const hitThreshold = 18;

    if (Math.abs(x - startX) <= hitThreshold) {
      this.activeDrag = 'start';
    } else if (Math.abs(x - endX) <= hitThreshold) {
      this.activeDrag = 'end';
    } else if (x > startX && x < endX) {
      this.activeDrag = 'body';
      this.dragStartX = x;
      this.dragOrigStart = this.currentStart;
      this.dragOrigEnd = this.currentEnd;
    }
  }

  handleMouseMove(e) {
    if (!this.activeDrag || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalDur = this.audioBuffer ? this.audioBuffer.duration : 999;

    if (this.activeDrag === 'start') {
      const newTime = Math.max(0, Math.min(this.currentEnd - 0.2, this.xToTime(x)));
      this.currentStart = Math.round(newTime * 10) / 10;
    } else if (this.activeDrag === 'end') {
      const newTime = Math.max(this.currentStart + 0.2, Math.min(totalDur, this.xToTime(x)));
      this.currentEnd = Math.round(newTime * 10) / 10;
    } else if (this.activeDrag === 'body') {
      const deltaX = x - this.dragStartX;
      const deltaTime = (deltaX / this.canvas.width) * (this.zoomEnd - this.zoomStart);
      const dur = this.dragOrigEnd - this.dragOrigStart;

      let newStart = Math.max(0, this.dragOrigStart + deltaTime);
      let newEnd = newStart + dur;
      if (newEnd > totalDur) {
        newEnd = totalDur;
        newStart = Math.max(0, newEnd - dur);
      }
      this.currentStart = Math.round(newStart * 10) / 10;
      this.currentEnd = Math.round(newEnd * 10) / 10;
    }

    this.updateInputFields();
    this.draw();
  }

  handleMouseUp() {
    this.activeDrag = null;
  }
}


  // =========================================================================
  // Module: src/ui/router.js
  // =========================================================================

/**
 * SPA Page Router for CE Tool
 * Switches between 3 views (Input, Practice, Memorize) without browser reload,
 * preserving Web Audio API Context, PCM audio buffers, and sentence states.
 */



class AppRouter {
  constructor(views = {}) {
    this.views = views; // { input: View, practice: View, memorize: View }
    this.currentPage = 'input';
    this.hasNavigated = false;
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
    // Re-selecting the current tab must not reset the view state (e.g. Page 2 sentence position)
    if (this.hasNavigated && pageId === this.currentPage) return;

    const prevPage = this.currentPage;
    if (this.views[prevPage] && typeof this.views[prevPage].onDeactivated === 'function') {
      this.views[prevPage].onDeactivated();
    }

    // Any page-owned segment playback must stop when leaving the page
    playbackController.stop();

    this.currentPage = pageId;
    this.hasNavigated = true;

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

  /** True while a modal dialog is visible — global shortcuts must not drive the player behind it. */
  isModalOpen() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return false;
    return ['settingsModal', 'handoutModal', 'classroomModal'].some(id => {
      const el = document.getElementById(id);
      return !!(el && el.classList && typeof el.classList.contains === 'function' && !el.classList.contains('hidden'));
    });
  }

  handleKeyDown(e) {
    if (this.isModalOpen()) return;

    // =========================================================================
    // GLOBAL: Project File Shortcuts (Ctrl+O, Ctrl+S, Ctrl+Shift+S)
    // =========================================================================
    if (e.ctrlKey || e.metaKey) {
      const key = (e.key || '').toLowerCase();
      if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        if (this.handlers.onOpenProject) this.handlers.onOpenProject();
        return;
      }
      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          if (this.handlers.onSaveProjectAs) this.handlers.onSaveProjectAs();
        } else {
          if (this.handlers.onSaveProject) this.handlers.onSaveProject();
        }
        return;
      }
      return; // Ignore other Ctrl/Cmd shortcuts
    }

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

















// Placeholder kept in the 직독직해 slash string for empty chunks so slot positions never shift
const DIRECT_EMPTY_PLACEHOLDER = '—';
// Inline base64 audio requests above this size are rejected by Gemini (≈20MB request limit)
const MAX_AI_INLINE_AUDIO_BYTES = 15 * 1024 * 1024;
// Some OSes report an empty MIME type on drag & drop, so also accept by extension
const AUDIO_FILE_EXT_RE = /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i;

class InputView {
  constructor(router) {
    this.router = router;
    this.ruleEngine = new RuleChunkEngine();
    this.handoutMode = 'student'; // 'student' | 'teacher'
    this.isStartingPractice = false;     // re-entrancy guard for the 3 "start practice" buttons
    this.busySentences = new WeakSet();   // sentences with an in-flight chunk re-translation
    this.cachedBase64 = null;             // { file, base64 } — avoid re-encoding the same upload

    // DOM Elements - Input Form
    this.container = document.getElementById('view-input');
    this.modeTabs = document.querySelectorAll('.mode-tab');
    this.audioUploadSection = document.getElementById('audioUploadSection');
    this.dropArea = document.getElementById('dropArea');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.inputEnglish = document.getElementById('inputEnglish');
    this.charCount = document.getElementById('charCount');
    this.btnClear = document.getElementById('btnClear');
    this.btnResetAllData = document.getElementById('btnResetAllData');
    this.btnTranslate = document.getElementById('btnTranslate');
    this.btnTranslateText = document.getElementById('btnTranslateText');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // DOM Elements - Parsed Results Section
    this.parsedResultsSection = document.getElementById('parsedResultsSection');
    this.parsedSentenceList = document.getElementById('parsedSentenceList');
    this.resultsCountBadge = document.getElementById('resultsCountBadge');
    this.btnAutoSyncAudio = document.getElementById('btnAutoSyncAudio');
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

    // DOM Elements - Master Waveform & Trimmer
    this.masterWaveformSection = document.getElementById('masterWaveformSection');
    this.masterWaveformCanvas = document.getElementById('masterWaveformCanvas');
    this.btnMasterPlayPause = document.getElementById('btnMasterPlayPause');
    this.masterPlayIcon = document.getElementById('masterPlayIcon');
    this.masterPlayLabel = document.getElementById('masterPlayLabel');
    this.masterTimeHud = document.getElementById('masterTimeHud');
    this.btnSnapSilence = document.getElementById('btnSnapSilence');
    this.btnMasterZoomOut = document.getElementById('btnMasterZoomOut');
    this.masterZoomLabel = document.getElementById('masterZoomLabel');
    this.btnMasterZoomIn = document.getElementById('btnMasterZoomIn');

    this.masterWaveform = null;
    if (this.masterWaveformCanvas) {
      this.masterWaveform = new MasterWaveformTimeline(this.masterWaveformCanvas, {
        onZoomChange: (zoom) => {
          if (this.masterZoomLabel) {
            this.masterZoomLabel.textContent = `${Math.round(zoom * 100)}%`;
          }
        },
        onSegmentChange: (idx, start, end, isFinal, adjInfo) => {
          const updateStn = (stnIdx, sStart, sEnd) => {
            const stn = appState.sentenceList ? appState.sentenceList.find(s => s.index === stnIdx) : null;
            if (stn) {
              stn.audioStart = sStart;
              stn.audioEnd = sEnd;
              stn.cachedPeaks = null;
              const timeBadge = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${stnIdx}"] .stn-audio-time`) : null;
              if (timeBadge) {
                timeBadge.textContent = `⏱ ${this.formatSec(sStart)} ~ ${this.formatSec(sEnd)}`;
              }
            }
          };

          updateStn(idx, start, end);
          if (adjInfo) {
            updateStn(adjInfo.index, adjInfo.audioStart, adjInfo.audioEnd);
          }

          if (isFinal) {
            projectService.markDirty();
            if (adjInfo) {
              toast.show(`⏱ 문장 S${idx + 1} & S${adjInfo.index + 1} 구간 자동 연동 완료!`);
            } else {
              toast.show(`⏱ 문장 S${idx + 1} 구간: ${start}s ~ ${end}s`);
            }
          }
        },
        onSegmentSelect: (idx) => {
          const targetCard = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"]`) : null;
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            targetCard.classList.add('merged-highlight');
            setTimeout(() => targetCard.classList.remove('merged-highlight'), 1000);
          }
        }
      });
    }

    this.trimmerModal = new SentenceTrimmerModal();

    this.initEvents();
    this.setMode('text'); // default: script only
  }

  initEvents() {
    // Data Reset Button (All data clear)
    if (this.btnResetAllData) {
      this.btnResetAllData.addEventListener('click', () => {
        this.resetAllData();
      });
    }

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
        const f = files.length > 0 ? files[0] : null;
        if (f && ((f.type || '').startsWith('audio/') || AUDIO_FILE_EXT_RE.test(f.name || ''))) {
          this.handleAudioFile(f);
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
        projectService.markDirty();
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
        projectService.markDirty();
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

    // Auto Audio-Script Sync Trigger
    if (this.btnAutoSyncAudio) {
      this.btnAutoSyncAudio.addEventListener('click', () => this.autoSyncAudioScript());
    }

    // Master Waveform Controls
    if (this.btnMasterPlayPause) {
      this.btnMasterPlayPause.addEventListener('click', () => {
        if (!this.nativeAudioPlayer || !this.nativeAudioPlayer.src) {
          toast.show('⚠️ 재생 가능한 오디오 파일이 없습니다.');
          return;
        }
        if (this.nativeAudioPlayer.paused) {
          playbackController.claim('input-master');
          this.nativeAudioPlayer.play().then(() => {
            if (this.masterPlayIcon) this.masterPlayIcon.textContent = '⏸';
            if (this.masterPlayLabel) this.masterPlayLabel.textContent = '일시정지';
          }).catch(e => console.error(e));
        } else {
          this.nativeAudioPlayer.pause();
          if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
          if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
        }
      });
    }

    if (this.btnSnapSilence) {
      this.btnSnapSilence.addEventListener('click', () => {
        const isActive = this.btnSnapSilence.classList.toggle('active');
        if (this.masterWaveform) {
          this.masterWaveform.setSnapEnabled(isActive);
        }
        const span = this.btnSnapSilence.querySelector('span');
        if (span) span.textContent = isActive ? '🧲 묵음 스냅 ON' : '🧲 묵음 스냅 OFF';
        toast.show(isActive ? '🧲 묵음 구간 자동 스냅이 활성화되었습니다.' : '묵음 구간 스냅이 비활성화되었습니다.');
      });
    }

    // Master Waveform Zoom Controls
    if (this.btnMasterZoomOut) {
      this.btnMasterZoomOut.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(this.masterWaveform.zoomLevel - 0.5);
        }
      });
    }

    if (this.btnMasterZoomIn) {
      this.btnMasterZoomIn.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(this.masterWaveform.zoomLevel + 0.5);
        }
      });
    }

    if (this.masterZoomLabel) {
      this.masterZoomLabel.addEventListener('click', () => {
        if (this.masterWaveform) {
          this.masterWaveform.setZoom(1.0);
          toast.show('🔍 파형 배율이 100% 원본으로 리셋되었습니다.');
        }
      });
    }

    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        const cur = this.nativeAudioPlayer.currentTime;
        const dur = this.nativeAudioPlayer.duration || 1;
        if (this.masterWaveform) {
          this.masterWaveform.setPlayheadTime(cur);
        }
        if (this.masterTimeHud) {
          this.masterTimeHud.textContent = `${this.formatSec(cur)} / ${this.formatSec(dur)}`;
        }
      });

      this.nativeAudioPlayer.addEventListener('pause', () => {
        if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
        if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';
      });

      this.nativeAudioPlayer.addEventListener('play', () => {
        if (this.masterPlayIcon) this.masterPlayIcon.textContent = '⏸';
        if (this.masterPlayLabel) this.masterPlayLabel.textContent = '일시정지';
      });
    }

    // Handout Modal Triggers
    if (this.btnPrintHandout) {
      this.btnPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }
    if (this.btnBottomPrintHandout) {
      this.btnBottomPrintHandout.addEventListener('click', () => this.openHandoutModal('student'));
    }

    // Transition to Page 2
    // Waits for the translation to finish before navigating (previously raced: Page 2 opened with stale/demo data)
    const startPracticeHandler = async () => {
      if (this.isStartingPractice) return;
      this.isStartingPractice = true;
      try {
        if (!appState.sentenceList || appState.sentenceList.length === 0) {
          if (this.inputEnglish && this.inputEnglish.value.trim()) {
            const ok = await this.handleTranslate();
            if (!ok) return;
          }
        }
        this.router.navigateTo('practice');
      } finally {
        this.isStartingPractice = false;
      }
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

    // Escape closes the handout modal (settings modal handles its own Escape)
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.handoutModal && !this.handoutModal.classList.contains('hidden')) {
          this.closeHandoutModal();
        }
      });
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
    } else if (mode === 'audio') {
      if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
      if (scriptInputSection) scriptInputSection.classList.add('hidden');
    } else {
      // text only
      if (this.audioUploadSection) this.audioUploadSection.classList.add('hidden');
      if (scriptInputSection) scriptInputSection.classList.remove('hidden');
    }
    if (this.btnTranslateText) this.btnTranslateText.textContent = this.getTranslateButtonLabel(mode);
  }

  getTranslateButtonLabel(mode = appState.currentMode) {
    if (mode === 'both') return '3x1 생성 및 음성 연동';
    if (mode === 'audio') return '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
    return '3x1 해석 및 FELS 생성';
  }

  /** Gemini inline audio is only attempted for real uploads within the size limit. */
  canSendAudioToAI(file) {
    return !!file && typeof file.size === 'number' && file.size <= MAX_AI_INLINE_AUDIO_BYTES;
  }

  shouldUseAiAlignment() {
    const file = appState.uploadedAudioFile;
    return !!file && !appState.isSynthesizedAudio && aiService.hasKey() &&
      aiService.provider === 'gemini' && this.canSendAudioToAI(file);
  }

  /** Base64-encodes the upload once and reuses it for STT / alignment / re-sync. */
  async getAudioBase64(file) {
    if (this.cachedBase64 && this.cachedBase64.file === file) return this.cachedBase64.base64;
    const base64 = await this.readFileAsBase64(file);
    this.cachedBase64 = { file, base64 };
    return base64;
  }

  /** Shared boundary resolution for handleTranslate() and autoSyncAudioScript(). */
  async computeSentenceBoundaries(rawSentences) {
    const file = appState.uploadedAudioFile;
    const aiAlign = this.shouldUseAiAlignment()
      ? async () => aiService.alignAudioWithScript(await this.getAudioBase64(file), file.type || 'audio/mp3', rawSentences)
      : null;
    return resolveSentenceBoundaries({ audioBuffer: appState.audioBuffer, sentences: rawSentences, aiAlign });
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
    if (this.masterWaveform && appState.audioBuffer) {
      this.masterWaveform.setAudioBuffer(appState.audioBuffer);
      if (appState.sentenceList && appState.sentenceList.length > 0) {
        if (this.masterWaveformSection) this.masterWaveformSection.classList.remove('hidden');
        this.masterWaveform.setSentenceList(appState.sentenceList);
      }
    }
    projectService.markDirty();
  }

  renderDropAreaPreview(file) {
    if (!this.dropArea) return;
    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    this.dropArea.innerHTML = `
      <div class="audio-file-info">
        <div class="audio-file-icon">🎵</div>
        <div class="audio-file-details">
          <div class="audio-file-name">${escapeHtml(file.name)}</div>
          <div class="audio-file-meta">${formatSize(file.size)} • ${escapeHtml(file.type || 'audio/mp3')}</div>
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
    projectService.markDirty();

    if (this.masterWaveformSection) {
      this.masterWaveformSection.classList.add('hidden');
    }
    if (this.masterWaveform) {
      this.masterWaveform.setAudioBuffer(null);
      this.masterWaveform.setSentenceList([]);
    }

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

  /**
   * Reset and clear all loaded/saved data across the application
   */
  resetAllData() {
    const hasData = (this.inputEnglish && this.inputEnglish.value.trim().length > 0) ||
                    (appState.sentenceList && appState.sentenceList.length > 0) ||
                    appState.uploadedAudioFile || appState.audioBuffer;

    if (hasData) {
      if (typeof confirm === 'function' && !confirm('현재 입력 및 불러온 모든 데이터(스크립트, 음성, 문장 구간)를 삭제하고 초기화하시겠습니까?')) {
        return;
      }
    }

    // 1. Stop any active audio playback
    playbackController.stopAll();
    if (this.nativeAudioPlayer) {
      if (typeof this.nativeAudioPlayer.pause === 'function') this.nativeAudioPlayer.pause();
      if (typeof this.nativeAudioPlayer.removeAttribute === 'function') this.nativeAudioPlayer.removeAttribute('src');
      if (typeof this.nativeAudioPlayer.load === 'function') this.nativeAudioPlayer.load();
    }

    // 2. Reset Audio State & Drop Area
    this.resetAudioFile();

    // 3. Reset AppState
    if (typeof appState.reset === 'function') {
      appState.reset();
    } else {
      appState.uploadedAudioFile = null;
      appState.uploadedAudioUrl = null;
      appState.audioBuffer = null;
      appState.isSynthesizedAudio = false;
      appState.synthesizedWavBlob = null;
      appState.scriptText = '';
      appState.setSentenceList([]);
    }

    // 4. Reset Project Service
    if (typeof projectService.resetProject === 'function') {
      projectService.resetProject();
    } else {
      projectService.currentFileHandle = null;
      projectService.currentProjectName = '새 프로젝트';
      projectService.isDirty = false;
      projectService.notifyStateChange();
    }

    // 5. Reset Script Input Area
    if (this.inputEnglish) {
      this.inputEnglish.value = '';
      this.inputEnglish.focus();
    }
    if (this.charCount) {
      this.charCount.textContent = '0자';
    }

    // 6. Reset Master Waveform Timeline
    if (this.masterWaveform) {
      this.masterWaveform.setAudioBuffer(null);
      this.masterWaveform.setSentenceList([]);
      this.masterWaveform.setZoom(1.0);
    }
    if (this.masterWaveformSection) {
      this.masterWaveformSection.classList.add('hidden');
    }
    if (this.masterTimeHud) {
      this.masterTimeHud.textContent = '00:00.0 / 00:00.0';
    }
    if (this.masterPlayIcon) this.masterPlayIcon.textContent = '▶';
    if (this.masterPlayLabel) this.masterPlayLabel.textContent = '재생';

    // 7. Hide Parsed Results Section
    if (this.parsedResultsSection) {
      this.parsedResultsSection.classList.add('hidden');
    }
    if (this.parsedSentenceList) {
      this.parsedSentenceList.innerHTML = '';
    }
    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = '0개 문장';
    }

    toast.show('🔄 모든 데이터가 성공적으로 삭제되고 초기화되었습니다.');
  }

  /**
   * @returns {Promise<boolean>} true when appState.sentenceList was (re)built successfully
   */
  async handleTranslate() {
    // Ctrl+Enter / preset chips can fire while a request is already running (button is disabled then)
    if (this.btnTranslate && this.btnTranslate.disabled === true) return false;
    const mode = appState.currentMode;

    // Mode 2: Audio Only (STT)
    if (mode === 'audio') {
      if (!appState.uploadedAudioFile) {
        toast.show('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
        return false;
      }
      if (!aiService.hasKey()) {
        toast.show('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 AI API 키를 입력하세요.');
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.click();
        return false;
      }
      if (!this.canSendAudioToAI(appState.uploadedAudioFile)) {
        toast.show('⚠️ 15MB를 초과하는 음성 파일은 AI 음성 인식을 지원하지 않습니다. 파일을 나눠 업로드하거나 스크립트를 직접 입력하세요.');
        return false;
      }

      let success = false;
      this.setLoading(true);
      try {
        const base64Audio = await this.getAudioBase64(appState.uploadedAudioFile);
        const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
        const aiResult = await aiService.transcribeAndTranslateAudio(base64Audio, mimeType);

        const scriptText = aiResult.script || '';
        if (this.inputEnglish) {
          this.inputEnglish.value = scriptText;
          if (this.charCount) this.charCount.textContent = `${scriptText.length}자`;
        }

        const rawSentences = splitIntoSentences(scriptText, { filterKorean: true });
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
        success = true; // data is ready even if a later UI render step fails

        // Render Results Panel on Page 1
        this.renderParsedResults({ scrollToSection: true });
        toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 완료! 아래에서 청크와 해석을 확인하세요.`);
      } catch (err) {
        console.error(err);
        toast.show(`❌ 음성 추출 오류: ${err.message}`);
      } finally {
        this.setLoading(false);
      }
      return success;
    }

    // Mode 1 (Both) or Mode 3 (Text)
    const text = this.inputEnglish ? this.inputEnglish.value.trim() : '';
    if (!text) {
      toast.show('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
      if (this.inputEnglish) this.inputEnglish.focus();
      return false;
    }

    let success = false;
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

      // Sentence splitting - strictly exclude Korean sentences from practice drill
      let rawSentences = splitIntoSentences(text, { filterKorean: true });
      if (rawSentences.length === 0) rawSentences.push(cleanPracticeSentence(text) || text);

      // AI alignment (optional) → VAD fallback → Korean intro check → end padding (see audio/boundary-utils.js)
      const boundaries = await this.computeSentenceBoundaries(rawSentences);

      // Parallel fetch natural Korean translation for all sentences
      const naturalTranslations = await Promise.all(
        rawSentences.map(stnText => aiService.translateNatural(stnText).catch(() => null))
      );

      const sentenceList = rawSentences.map((stnText, idx) => {
        const natural = naturalTranslations[idx];
        const res = this.ruleEngine.process(stnText, natural);
        if (natural) {
          res.natural = natural;
        }
        return {
          index: idx,
          text: stnText,
          audioStart: boundaries[idx]?.start ?? null,
          audioEnd: boundaries[idx]?.end ?? null,
          result: res
        };
      });

      // Refine 직독직해 chunks based strictly on natural Korean translation
      await Promise.all(
        sentenceList.map(async (stn) => {
          if (stn.result && stn.result.chunks && stn.result.natural) {
            try {
              const directKoChunks = await aiService.generateDirectChunks(
                stn.result.chunks,
                stn.result.natural,
                stn.text
              );
              if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
                directKoChunks.forEach((ko, i) => {
                  stn.result.chunks[i].ko = ko;
                });
                stn.result.chunk_text = directKoChunks.join(' || ');
                stn.result.direct = directKoChunks.join(' / ');
              }
            } catch (chunkErr) {
              console.warn('Chunk direct translation error:', chunkErr);
            }
          }
        })
      );

      appState.scriptText = text;
      appState.setSentenceList(sentenceList);
      success = true; // data is ready even if a later UI render step fails

      // Render Results Panel on Page 1
      this.renderParsedResults({ scrollToSection: true });
      toast.show(`✨ 총 ${rawSentences.length}개 문장 파싱 및 자연스러운 직독직해 분석 완료!`);
    } catch (err) {
      console.error('Translation error:', err);
      toast.show(`❌ 오류: ${err.message}`);
    } finally {
      this.setLoading(false);
    }
    return success;
  }

  /**
   * One-click Audio and Script Auto Sync
   */
  async autoSyncAudioScript() {
    if (!appState.uploadedAudioFile || !appState.sentenceList || appState.sentenceList.length === 0) {
      toast.show('⚠️ 먼저 MP3 음성 파일과 스크립트를 입력해주세요.');
      return;
    }

    toast.show('⚡ 음성과 스크립트 자동 Sync 계산 중...');
    try {
      const rawSentences = appState.sentenceList.map(s => s.text);
      const boundaries = await this.computeSentenceBoundaries(rawSentences);

      if (boundaries && boundaries.length === appState.sentenceList.length) {
        appState.sentenceList.forEach((stn, i) => {
          stn.audioStart = boundaries[i]?.start ?? stn.audioStart;
          stn.audioEnd = boundaries[i]?.end ?? stn.audioEnd;
          stn.cachedPeaks = null;
        });
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        this.renderParsedResults({ scrollContext: { scrollYBefore: scrollY } });
        toast.show('✨ 음성-스크립트 자동 Sync 완료! 문장별 재생 구간이 최적화되었습니다.');
      }
    } catch (err) {
      console.error('Auto sync error:', err);
      toast.show(`❌ 자동 Sync 오류: ${err.message}`);
    }
  }

  /**
   * Merge sentence with previous sentence
   */
  mergeWithPreviousSentence(idx) {
    if (idx <= 0 || !appState.sentenceList || idx >= appState.sentenceList.length) return;

    const targetIdx = idx - 1;
    const scrollYBefore = window.scrollY || document.documentElement.scrollTop || 0;
    const prevCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"]`) : null;
    const curCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"]`) : null;
    const refCard = prevCardBefore || curCardBefore;
    const cardTopBefore = refCard ? refCard.getBoundingClientRect().top : null;

    const prev = appState.sentenceList[targetIdx];
    const cur = appState.sentenceList[idx];

    const mergedText = `${prev.text} ${cur.text}`.trim();
    const mergedStart = prev.audioStart !== null ? prev.audioStart : cur.audioStart;
    const mergedEnd = cur.audioEnd !== null ? cur.audioEnd : prev.audioEnd;
    const mergedChunks = [...(prev.result?.chunks || []), ...(cur.result?.chunks || [])];
    const mergedNatural = `${prev.result?.natural || ''} ${cur.result?.natural || ''}`.trim();

    prev.text = mergedText;
    prev.audioStart = mergedStart;
    prev.audioEnd = mergedEnd;
    prev.result = {
      ...(prev.result || {}),
      chunks: mergedChunks,
      natural: mergedNatural,
      chunk_text: mergedChunks.map(c => c.ko).join(' || '),
      direct: mergedChunks.map(c => c.ko).join(' / ')
    };
    prev.cachedPeaks = null;

    appState.sentenceList.splice(idx, 1);
    appState.sentenceList.forEach((s, i) => { s.index = i; });
    appState.scriptText = appState.sentenceList.map(s => s.text).join(' ');
    projectService.markDirty();

    this.renderParsedResults({
      targetIdx,
      scrollContext: { scrollYBefore, cardTopBefore }
    });
    toast.show(`🔗 문장 S${idx}와 S${idx + 1}이 하나로 결합되었습니다.`);

    aiService.translateNatural(mergedText).then(natural => {
      if (natural) {
        prev.result.natural = natural;
        const naturalInput = this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"] .sentence-natural-input`);
        if (naturalInput) naturalInput.value = natural;
      }
    }).catch(() => {});
  }

  /**
   * Split sentence into two sentences at given word index
   */
  splitSentence(idx, splitWordIndex) {
    if (!appState.sentenceList || idx < 0 || idx >= appState.sentenceList.length) return;
    const cur = appState.sentenceList[idx];
    const words = (cur.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1 || splitWordIndex < 0 || splitWordIndex >= words.length - 1) {
      toast.show('⚠️ 분리할 위치를 올바르게 선택하세요.');
      return;
    }

    const scrollYBefore = window.scrollY || document.documentElement.scrollTop || 0;
    const targetCardBefore = this.parsedSentenceList ? this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"]`) : null;
    const cardTopBefore = targetCardBefore ? targetCardBefore.getBoundingClientRect().top : null;

    const wordsPart1 = words.slice(0, splitWordIndex + 1);
    const wordsPart2 = words.slice(splitWordIndex + 1);

    let text1 = wordsPart1.join(' ').trim();
    let text2 = wordsPart2.join(' ').trim();

    if (!/[.!?]$/.test(text1) && /[.!?]$/.test(cur.text)) {
      text1 += '.';
    }

    const totalDuration = (cur.audioStart !== null && cur.audioEnd !== null)
      ? Math.max(0.6, cur.audioEnd - cur.audioStart)
      : null;
    let part1Start = cur.audioStart;
    let part1End = null;
    let part2Start = null;
    let part2End = cur.audioEnd;

    if (totalDuration !== null) {
      const fraction1 = wordsPart1.length / words.length;
      const splitTime = Math.round((cur.audioStart + totalDuration * fraction1) * 10) / 10;
      part1End = splitTime;
      part2Start = splitTime;
    }

    const res1 = this.ruleEngine.process(text1);
    const res2 = this.ruleEngine.process(text2);

    const newStn1 = {
      index: idx,
      text: text1,
      audioStart: part1Start,
      audioEnd: part1End,
      result: res1
    };

    const newStn2 = {
      index: idx + 1,
      text: text2,
      audioStart: part2Start,
      audioEnd: part2End,
      result: res2
    };

    appState.sentenceList.splice(idx, 1, newStn1, newStn2);
    appState.sentenceList.forEach((s, i) => { s.index = i; });
    appState.scriptText = appState.sentenceList.map(s => s.text).join(' ');
    projectService.markDirty();

    this.renderParsedResults({
      targetIdx: idx,
      scrollContext: { scrollYBefore, cardTopBefore }
    });
    toast.show(`✂️ 문장이 S${idx + 1}과 S${idx + 2}로 분리되었습니다.`);

    Promise.all([
      aiService.translateNatural(text1),
      aiService.translateNatural(text2)
    ]).then(([nat1, nat2]) => {
      if (nat1) {
        newStn1.result.natural = nat1;
        const inp1 = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx}"] .sentence-natural-input`);
        if (inp1) inp1.value = nat1;
      }
      if (nat2) {
        newStn2.result.natural = nat2;
        const inp2 = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx + 1}"] .sentence-natural-input`);
        if (inp2) inp2.value = nat2;
      }
    }).catch(() => {});
  }

  /**
   * Toggle inline interactive sentence split bar
   */
  toggleSplitBar(itemCard, stn, idx) {
    const splitBar = itemCard.querySelector('.sentence-split-bar');
    if (!splitBar) return;

    if (!splitBar.classList.contains('hidden')) {
      splitBar.classList.add('hidden');
      return;
    }

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      toast.show('⚠️ 1개 단어로 된 문장은 더 이상 분리할 수 없습니다.');
      return;
    }

    const container = splitBar.querySelector('.split-words-container');
    container.innerHTML = '';

    words.forEach((w, wIdx) => {
      if (wIdx < words.length - 1) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'split-word-chip';
        chip.innerHTML = `<span class="split-chip-word">${this.escapeHtml(w)}</span><span class="split-chip-cue">✂️ 여기서 분리</span>`;
        chip.title = `'${w}' 뒤에서 문장 분리`;
        chip.addEventListener('click', () => {
          this.splitSentence(idx, wIdx);
        });
        container.appendChild(chip);
      } else {
        const lastWord = document.createElement('span');
        lastWord.className = 'split-last-word';
        lastWord.textContent = w;
        container.appendChild(lastWord);
      }
    });

    const btnCancel = splitBar.querySelector('.btn-cancel-split');
    if (btnCancel) {
      btnCancel.onclick = () => splitBar.classList.add('hidden');
    }

    splitBar.classList.remove('hidden');
  }

  /**
   * Re-fetch natural translation for single sentence and regenerate 직독직해
   */
  async retranslateSentence(stn, naturalInput, directInput) {
    toast.show('🤖 우리말 자연스러운 해석 및 직독직해 가져오는 중...');
    try {
      const natural = await aiService.translateNatural(stn.text);
      if (natural) {
        if (!stn.result) stn.result = {};
        stn.result.natural = natural;
        if (naturalInput) naturalInput.value = natural;

        // Automatically regenerate 직독직해 based on the updated natural translation!
        if (stn.result.chunks && stn.result.chunks.length > 0) {
          try {
            const directKoChunks = await aiService.generateDirectChunks(
              stn.result.chunks,
              natural,
              stn.text
            );
            if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
              directKoChunks.forEach((ko, i) => {
                stn.result.chunks[i].ko = ko;
              });
              stn.result.chunk_text = directKoChunks.join(' || ');
              stn.result.direct = directKoChunks.join(' / ');
              if (directInput) {
                directInput.value = this.getDirectChunkString(stn.result.chunks);
              }
            }
          } catch (chunkErr) {
            console.warn('Chunk direct translation error:', chunkErr);
          }
        }

        toast.show('✨ 자연스러운 해석 및 직독직해가 업데이트되었습니다!');
      } else {
        toast.show('⚠️ 번역 결과를 가져오지 못했습니다.');
      }
    } catch (e) {
      toast.show(`❌ 재해석 실패: ${e.message}`);
    }
  }

  renderParsedResults(options = {}) {
    if (!this.parsedResultsSection || !this.parsedSentenceList) return;
    const sentences = appState.sentenceList;
    if (!sentences || !sentences.length) {
      this.parsedResultsSection.classList.add('hidden');
      return;
    }

    const {
      scrollToSection = false,
      targetIdx = null,
      scrollContext = null
    } = options;

    if (this.resultsCountBadge) {
      this.resultsCountBadge.textContent = `총 ${sentences.length}개 문장`;
    }

    // 1. Lock container height before innerHTML = '' to prevent document collapse and screen jump to top
    const prevListHeight = this.parsedSentenceList.offsetHeight;
    if (prevListHeight > 0) {
      this.parsedSentenceList.style.minHeight = `${prevListHeight}px`;
    }

    const fallbackScrollY = scrollContext?.scrollYBefore ?? (window.scrollY || document.documentElement.scrollTop || 0);

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
            ${hasAudioTime ? `<span class="stn-audio-time" title="클릭하여 오디오 구간 수정">⏱ ${timeStr}</span>` : ''}
          </div>
          <div class="stn-header-btn-group">
            <button class="stn-speak-btn" type="button" title="문장 음성 듣기">
              <span>🔊 문장 듣기</span>
            </button>
            ${idx > 0 ? `
            <button class="stn-merge-btn" type="button" title="이전 문장(S${idx})과 합치기">
              <span>🔗 이전 문장과 결합</span>
            </button>
            ` : ''}
            <button class="stn-split-btn" type="button" title="이 문장을 두 개로 분리하기">
              <span>✂️ 문장 분리</span>
            </button>
          </div>
        </div>

        <!-- Inline Sentence Split Picker Bar -->
        <div class="sentence-split-bar hidden">
          <div class="split-bar-header">
            <span>✂️ <strong>문장 분리:</strong> 분리할 기준 단어를 클릭하세요 (선택 단어 뒤에서 새로운 문장으로 분리):</span>
            <button type="button" class="btn-cancel-split icon-btn" title="취소">✕</button>
          </div>
          <div class="split-words-container"></div>
        </div>

        <!-- Interactive Clickable Word-Divider Track -->
        <div class="word-divider-track"></div>

        <!-- Strict 2x2 Editable Fields Grid -->
        <div class="sentence-edit-grid">
          <!-- Row 1, Col 1: 영어 문장 원문 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>📝 영어 문장 원문 (Script):</span>
            </label>
            <input type="text" class="sentence-script-input" value="${this.escapeHtml(stn.text || '')}" placeholder="영어 문장 원문">
          </div>

          <!-- Row 1, Col 2: 우리말 해석 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✍️ 우리말 자연스러운 해석:</span>
              <button type="button" class="btn-retranslate" title="자연스러운 해석 다시 가져오기">🔄 재해석</button>
            </label>
            <input type="text" class="sentence-natural-input" value="${this.escapeHtml(stn.result?.natural || '')}" placeholder="자연스러운 우리말 해석">
          </div>

          <!-- Row 2, Col 1: 청크 구분 영어 문장 -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>✂️ 청크 구분(||) 영어 문장:</span>
            </label>
            <input type="text" class="chunk-text-input" value="${this.escapeHtml(this.getChunkString(stn.result?.chunks))}" placeholder="단어 사이에 || 입력">
          </div>

          <!-- Row 2, Col 2: 직독직해 (순차 해석) -->
          <div class="sentence-edit-field">
            <label class="edit-field-label">
              <span>🧩 직독직해 (순차 해석):</span>
            </label>
            <input type="text" class="chunk-direct-input" value="${this.escapeHtml(this.getDirectChunkString(stn.result?.chunks))}" placeholder="청크별 순차 해석 (|| 로 구분)">
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

      // 2. Hook up Merge button (if idx > 0)
      const mergeBtn = itemCard.querySelector('.stn-merge-btn');
      if (mergeBtn) {
        mergeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.mergeWithPreviousSentence(idx);
        });
      }

      // 3. Hook up Split button
      const splitBtn = itemCard.querySelector('.stn-split-btn');
      if (splitBtn) {
        splitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleSplitBar(itemCard, stn, idx);
        });
      }

      // 4. Hook up Audio Time adjustment on click (Visual Waveform Trimmer Modal)
      const timeBadge = itemCard.querySelector('.stn-audio-time');
      if (timeBadge && hasAudioTime) {
        timeBadge.title = '클릭하여 파형을 보며 오디오 구간을 정밀 조정합니다.';
        timeBadge.style.cursor = 'pointer';
        timeBadge.addEventListener('click', () => {
          if (this.trimmerModal && appState.audioBuffer) {
            this.trimmerModal.open(stn, appState.audioBuffer, (newStart, newEnd) => {
              stn.audioStart = newStart;
              stn.audioEnd = newEnd;
              stn.cachedPeaks = null;
              timeBadge.textContent = `⏱ ${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}`;

              // Synchronize adjacent sentences so no overlap occurs
              const prevStn = idx > 0 ? appState.sentenceList[idx - 1] : null;
              const nextStn = idx < appState.sentenceList.length - 1 ? appState.sentenceList[idx + 1] : null;
              if (prevStn && prevStn.audioEnd !== null && Math.abs(prevStn.audioEnd - newStart) > 0.05) {
                prevStn.audioEnd = newStart;
                prevStn.cachedPeaks = null;
                const prevBadge = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx - 1}"] .stn-audio-time`);
                if (prevBadge) prevBadge.textContent = `⏱ ${this.formatSec(prevStn.audioStart)} ~ ${this.formatSec(prevStn.audioEnd)}`;
              }
              if (nextStn && nextStn.audioStart !== null && Math.abs(nextStn.audioStart - newEnd) > 0.05) {
                nextStn.audioStart = newEnd;
                nextStn.cachedPeaks = null;
                const nextBadge = this.parsedSentenceList.querySelector(`[data-stn-idx="${idx + 1}"] .stn-audio-time`);
                if (nextBadge) nextBadge.textContent = `⏱ ${this.formatSec(nextStn.audioStart)} ~ ${this.formatSec(nextStn.audioEnd)}`;
              }

              if (this.masterWaveform) {
                this.masterWaveform.draw();
              }
              projectService.markDirty();
              toast.show(`⏱ 문장 S${idx + 1} 구간 수정 및 인접 문장 자동 연동 완료!`);
            });
          } else {
            // Fallback prompt if audio buffer not yet decoded
            const currentStart = stn.audioStart !== null ? stn.audioStart : 0;
            const currentEnd = stn.audioEnd !== null ? stn.audioEnd : 0;
            const inputStr = prompt(`문장 S${idx + 1} 오디오 구간 (초 단위) 수정:\n예: 3.5 ~ 8.2`, `${currentStart} ~ ${currentEnd}`);
            if (inputStr) {
              const parts = inputStr.split('~').map(s => parseFloat(s.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > parts[0]) {
                stn.audioStart = Math.round(parts[0] * 10) / 10;
                stn.audioEnd = Math.round(parts[1] * 10) / 10;
                stn.cachedPeaks = null;
                timeBadge.textContent = `⏱ ${this.formatSec(stn.audioStart)} ~ ${this.formatSec(stn.audioEnd)}`;
                if (this.masterWaveform) this.masterWaveform.draw();
                projectService.markDirty();
                toast.show(`⏱ 문장 S${idx + 1} 구간 수정: ${stn.audioStart}s ~ ${stn.audioEnd}s`);
              }
            }
          }
        });
      }

      // 5. Render Interactive Word-Divider Track & Inputs
      const track = itemCard.querySelector('.word-divider-track');
      const scriptInput = itemCard.querySelector('.sentence-script-input');
      const naturalInput = itemCard.querySelector('.sentence-natural-input');
      const chunkInput = itemCard.querySelector('.chunk-text-input');
      const directInput = itemCard.querySelector('.chunk-direct-input');
      const retransBtn = itemCard.querySelector('.btn-retranslate');

      if (track) {
        this.renderWordDividerTrack(track, stn, chunkInput, directInput);
      }

      // 6. Hook up Retranslate Button
      if (retransBtn) {
        retransBtn.addEventListener('click', () => {
          this.retranslateSentence(stn, naturalInput, directInput);
        });
      }

      // Enter only commits the field (blur → single 'change' event). Previously Enter AND change both ran the
      // update, firing duplicate AI requests. isComposing guard keeps Korean IME composition intact.
      const commitOnEnter = (inputEl) => (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          if (typeof inputEl.blur === 'function') inputEl.blur();
        }
      };

      // 7. Hook up Script Input
      if (scriptInput) {
        scriptInput.addEventListener('change', () => {
          this.updateSentenceScript(stn, scriptInput.value, chunkInput, directInput, naturalInput, track);
        });
        scriptInput.addEventListener('keydown', commitOnEnter(scriptInput));
      }

      // 8. Hook up Chunk Text Input (English ||)
      if (chunkInput) {
        chunkInput.addEventListener('change', () => {
          this.updateChunksFromTextInput(stn, chunkInput.value, directInput, track);
        });
        chunkInput.addEventListener('keydown', commitOnEnter(chunkInput));
      }

      // 9. Hook up Direct Chunk Input (Korean ||)
      if (directInput) {
        directInput.addEventListener('change', () => {
          const ok = this.updateChunksFromDirectInput(stn, directInput.value);
          if (!ok) directInput.value = this.getDirectChunkString(stn.result?.chunks);
        });
        directInput.addEventListener('keydown', commitOnEnter(directInput));
      }

      // 10. Hook up Natural Korean Input
      if (naturalInput) {
        naturalInput.addEventListener('input', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
        });
        naturalInput.addEventListener('change', () => {
          if (!stn.result) stn.result = {};
          stn.result.natural = naturalInput.value;
          // Synchronize 직독직해 instantly when natural interpretation is edited by user
          if (stn.result.chunks && stn.result.chunks.length > 0) {
            this.ruleEngine.alignNaturalToChunks(stn.result.chunks, stn.result.natural);
            stn.result.chunk_text = stn.result.chunks.map(c => c.ko).join(' || ');
            stn.result.direct = stn.result.chunks.map(c => c.ko).join(' / ');
            if (directInput && document.activeElement !== directInput) {
              directInput.value = this.getDirectChunkString(stn.result.chunks);
            }
            this.scheduleDirectChunkAiRefinement(stn, directInput);
          }
        });
      }

      this.parsedSentenceList.appendChild(itemCard);
    });

    this.parsedResultsSection.classList.remove('hidden');

    // Sync master waveform
    if (this.masterWaveform && appState.audioBuffer) {
      if (this.masterWaveformSection) this.masterWaveformSection.classList.remove('hidden');
      this.masterWaveform.setAudioBuffer(appState.audioBuffer);
      this.masterWaveform.setSentenceList(appState.sentenceList);
    }

    requestAnimationFrame(() => {
      // Release temporary min-height lock
      if (this.parsedSentenceList) {
        this.parsedSentenceList.style.minHeight = '';
      }

      // If explicit scrollToSection requested (e.g. initial generation or preset load)
      if (scrollToSection) {
        this.parsedResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // If specific sentence index targeted (e.g. after merge or split)
      if (typeof targetIdx === 'number' && targetIdx >= 0) {
        const targetCard = this.parsedSentenceList.querySelector(`[data-stn-idx="${targetIdx}"]`);
        if (targetCard) {
          if (scrollContext && typeof scrollContext.cardTopBefore === 'number') {
            // Keep card at the exact same screen pixel coordinate
            const cardTopAfter = targetCard.getBoundingClientRect().top;
            const delta = cardTopAfter - scrollContext.cardTopBefore;
            if (Math.abs(delta) > 1) {
              window.scrollBy({ top: delta, behavior: 'auto' });
            }
          } else {
            targetCard.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }

          // Visual confirmation animation
          targetCard.classList.add('merged-highlight');
          setTimeout(() => targetCard.classList.remove('merged-highlight'), 1200);
          return;
        }
      }

      // Fallback: restore exact scroll position to prevent jumping to top
      if (fallbackScrollY > 0) {
        window.scrollTo({ top: fallbackScrollY, behavior: 'auto' });
      }
    });
  }

  renderWordDividerTrack(track, stn, chunkInput, directInput) {
    if (!track) return;
    track.innerHTML = '';

    const itemCard = track.closest && typeof track.closest === 'function' ? track.closest('.parsed-sentence-item') : null;
    const resolvedChunkInput = chunkInput || (itemCard && itemCard.querySelector ? itemCard.querySelector('.chunk-text-input') : null);
    const resolvedDirectInput = directInput || (itemCard && itemCard.querySelector ? itemCard.querySelector('.chunk-direct-input') : null);

    const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    // Determine current boundary word indices
    const boundaryWordIndices = new Set();
    let runningWordCount = 0;
    (stn.result?.chunks || []).forEach((c, cIdx) => {
      const cWords = (c.en || '').trim().split(/\s+/).filter(Boolean);
      runningWordCount += cWords.length;
      if (cIdx < (stn.result?.chunks || []).length - 1 && runningWordCount > 0 && runningWordCount < words.length) {
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

        dividerSlot.addEventListener('click', (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (boundaryWordIndices.has(idx)) {
            boundaryWordIndices.delete(idx);
          } else {
            boundaryWordIndices.add(idx);
          }

          // Instant in-memory chunk rebuilding & local rule semantic alignment (< 1ms)
          this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);

          if (resolvedChunkInput) {
            resolvedChunkInput.value = this.getChunkString(stn.result.chunks);
          }
          if (resolvedDirectInput && document.activeElement !== resolvedDirectInput) {
            resolvedDirectInput.value = this.getDirectChunkString(stn.result.chunks);
          }

          // Instantly refresh the track
          this.renderWordDividerTrack(track, stn, resolvedChunkInput, resolvedDirectInput);
          toast.show('✂️ 청크 구분이 업데이트되었습니다.');

          // Non-blocking debounced AI refinement in the background (if AI configured)
          this.scheduleDirectChunkAiRefinement(stn, resolvedDirectInput);
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
        const koStr = existingChunk ? existingChunk.ko : '';
        newChunks.push({ en: enStr, ko: koStr });
        curWords = [];
      }
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;

    // Instant synchronous semantic alignment using RuleChunkEngine (< 1ms)
    if (stn.result.natural) {
      this.ruleEngine.alignNaturalToChunks(newChunks, stn.result.natural);
    }

    stn.result.chunk_text = newChunks.map(c => c.ko).join(' || ');
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
    projectService.markDirty();
  }

  updateChunksFromTextInput(stn, chunkedText, directInput, track) {
    const parts = (chunkedText || '').split('||').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const newChunks = parts.map(part => {
      const existing = (stn.result?.chunks || []).find(c => c.en.trim() === part);
      return {
        en: part,
        ko: existing ? existing.ko : ''
      };
    });

    if (!stn.result) stn.result = {};
    stn.result.chunks = newChunks;

    // Instant synchronous semantic alignment using RuleChunkEngine (< 1ms)
    if (stn.result.natural) {
      this.ruleEngine.alignNaturalToChunks(newChunks, stn.result.natural);
    }

    stn.result.chunk_text = newChunks.map(c => c.ko).join(' || ');
    stn.result.direct = newChunks.map(c => c.ko).join(' / ');
    projectService.markDirty();

    if (directInput && document.activeElement !== directInput) {
      directInput.value = this.getDirectChunkString(newChunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, null, directInput);
    }
    toast.show('✂️ 청크 구분이 저장되었습니다.');

    // Non-blocking debounced AI refinement in the background (if AI configured)
    this.scheduleDirectChunkAiRefinement(stn, directInput);
  }

  /**
   * Debounced, non-blocking background AI refinement for direct chunks.
   * Never delays or blocks user interactions; silently applies higher quality AI mappings when ready.
   */
  scheduleDirectChunkAiRefinement(stn, directInput) {
    if (!aiService.hasKey() || !stn.result?.natural || !stn.result?.chunks?.length) {
      return;
    }

    if (!this.directChunkTimers) {
      this.directChunkTimers = new Map();
    }

    if (this.directChunkTimers.has(stn)) {
      clearTimeout(this.directChunkTimers.get(stn));
    }

    stn._chunkRevision = (stn._chunkRevision || 0) + 1;
    const currentRev = stn._chunkRevision;
    const expectedChunkCount = stn.result.chunks.length;

    const timer = setTimeout(async () => {
      this.directChunkTimers.delete(stn);
      if (stn._chunkRevision !== currentRev) return;

      try {
        const directKoChunks = await aiService.generateDirectChunks(
          stn.result.chunks,
          stn.result.natural,
          stn.text
        );

        if (stn._chunkRevision === currentRev &&
            directKoChunks &&
            directKoChunks.length === expectedChunkCount &&
            directKoChunks.every(Boolean)) {
          directKoChunks.forEach((ko, i) => {
            if (stn.result.chunks[i]) {
              stn.result.chunks[i].ko = ko;
            }
          });
          stn.result.chunk_text = directKoChunks.join(' || ');
          stn.result.direct = directKoChunks.join(' / ');

          if (directInput && document.activeElement !== directInput) {
            directInput.value = this.getDirectChunkString(stn.result.chunks);
          }
        }
      } catch (err) {
        console.warn('Background AI direct chunk refinement skipped:', err);
      }
    }, 700);

    this.directChunkTimers.set(stn, timer);
  }

  /**
   * Applies the "직독직해" input (ko1 || ko2 || ...) slot-by-slot.
   * Empty slots are written as DIRECT_EMPTY_PLACEHOLDER by getDirectChunkString(), so positions never shift.
   * @returns {boolean} false when the slot count does not match the chunk count (nothing is changed)
   */
  updateChunksFromDirectInput(stn, directStr) {
    if (!stn.result) stn.result = {};
    if (!stn.result.chunks) stn.result.chunks = [];
    const chunks = stn.result.chunks;
    const parts = (directStr || '').split('||').map(p => p.trim());

    if (parts.length !== chunks.length) {
      toast.show(`⚠️ 직독직해 칸 수(${parts.length})가 청크 수(${chunks.length})와 다릅니다. '||' 개수를 맞춰주세요.`);
      return false;
    }

    chunks.forEach((chunk, i) => {
      chunk.ko = parts[i] === DIRECT_EMPTY_PLACEHOLDER ? '' : parts[i];
    });

    stn.result.chunk_text = chunks.map(c => c.ko).join(' || ');
    stn.result.direct = chunks.map(c => c.ko).join(' / ');
    toast.show('🧩 직독직해 해석이 저장되었습니다.');
    return true;
  }

  async updateSentenceScript(stn, newText, chunkInput, directInput, naturalInput, track) {
    const cleanText = (newText || '').trim();
    if (!cleanText || cleanText === stn.text) return;
    stn.text = cleanText;

    // Re-process chunks with rule engine
    const newResult = this.ruleEngine.process(cleanText, stn.result?.natural);
    if (!stn.result) stn.result = {};
    stn.result.chunks = newResult.chunks;
    stn.result.chunk_text = newResult.chunk_text;
    stn.result.direct = newResult.direct;
    stn.cachedPeaks = null;

    if (chunkInput) {
      chunkInput.value = this.getChunkString(stn.result.chunks);
    }
    if (directInput) {
      directInput.value = this.getDirectChunkString(stn.result.chunks);
    }
    if (track) {
      this.renderWordDividerTrack(track, stn, chunkInput, directInput);
    }

    // Sync global script text
    appState.scriptText = (appState.sentenceList || []).map(s => s.text).join(' ');
    toast.show(`📝 문장 S${stn.index + 1} 원문이 수정되었습니다.`);

    // Auto-translate natural in background and regenerate 직독직해
    try {
      const natural = await aiService.translateNatural(cleanText);
      if (natural) {
        stn.result.natural = natural;
        if (naturalInput) naturalInput.value = natural;
        const directKoChunks = await aiService.generateDirectChunks(stn.result.chunks, natural, cleanText);
        if (directKoChunks && directKoChunks.length === stn.result.chunks.length) {
          directKoChunks.forEach((ko, i) => {
            stn.result.chunks[i].ko = ko;
          });
          stn.result.chunk_text = directKoChunks.join(' || ');
          stn.result.direct = directKoChunks.join(' / ');
          if (directInput) {
            directInput.value = this.getDirectChunkString(stn.result.chunks);
          }
        }
      }
    } catch (e) {}
  }

  escapeHtml(str) {
    return escapeHtml(str); // delegates to the shared utils/dom.js implementation
  }

  getChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    return chunks.map(c => (c.en || '').trim()).filter(Boolean).join(' || ');
  }

  /** One slot per chunk (empty → placeholder) so updateChunksFromDirectInput() can map slots 1:1. */
  getDirectChunkString(chunks) {
    if (!chunks || !chunks.length) return '';
    const slots = chunks.map(c => (c.ko || '').trim());
    if (slots.every(s => !s)) return '';
    return slots.map(s => s || DIRECT_EMPTY_PLACEHOLDER).join(' || ');
  }

  playOrSpeakSentence(stn, speakBtn) {
    if (speakBtn) {
      const origHtml = speakBtn.innerHTML;
      speakBtn.innerHTML = '<span>🔊 재생 중...</span>';
      setTimeout(() => {
        if (speakBtn) speakBtn.innerHTML = origHtml;
      }, 1500);
    }

    // 1. If authentic uploaded audio exists, play the slice through the shared playback controller
    //    (owner 'input' → the Practice looper ignores this playback; segment end is enforced by rAF)
    if (appState.uploadedAudioUrl && !appState.isSynthesizedAudio &&
        stn.audioStart !== null && stn.audioEnd !== null) {
      try {
        playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
        playbackController.playSegment(stn.audioStart, stn.audioEnd, { owner: 'input' })
          .catch(e => {
            console.warn('Audio play error, falling back to TTS:', e);
            speakText(stn.text, 'en-US');
          });
        return;
      } catch (e) {
        console.warn('Audio playback error, fallback to TTS:', e);
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
            return `<span class="handout-fels-blank answer-mode">[ ${escapeHtml(w)} ]</span>`;
          } else {
            return `<span class="handout-fels-blank">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</span>`;
          }
        } else {
          return `<span>${escapeHtml(w)}</span>`;
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
        return `<span class="handout-chunk-box">[ ${escapeHtml(koText)} ]</span>`;
      });
      const chunkedKoHtml = chunkedKoSegments.join('<span class="handout-chunk-divider"> || </span>');

      backSentencesHtml += `
        <div class="handout-stn-item handout-speaking-item">
          <div class="handout-speaking-row">
            <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
            <div class="handout-direct-ko">${chunkedKoHtml}</div>
          </div>
          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${escapeHtml(stn.text)}</div>` : ''}
          <div class="handout-speaking-check-row">
            <span class="speaking-check-label">🗣️ 말하기 훈련 체크:</span>
            <span class="check-box-pill">☐ 1차: 청크별 낭독</span>
            <span class="check-box-pill">☐ 2차: 직독직해 스피킹</span>
            <span class="check-box-pill">☐ 3차: 유창성 통과</span>
          </div>
        </div>
      `;
    });

    const handoutYear = new Date().getFullYear();

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
                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
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
                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
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

  /**
   * Toggles the busy state WITHOUT rebuilding the button markup.
   * (The previous innerHTML rewrite detached this.btnTranslateText, so later setMode() label updates were lost.)
   */
  setLoading(isLoading) {
    if (!this.btnTranslate) return;
    this.btnTranslate.disabled = !!isLoading;
    if (this.btnTranslateText) {
      this.btnTranslateText.textContent = isLoading ? '처리 중...' : this.getTranslateButtonLabel(appState.currentMode);
    }
    const icon = typeof this.btnTranslate.querySelector === 'function' ? this.btnTranslate.querySelector('svg') : null;
    if (icon && icon.classList) {
      if (isLoading) icon.classList.add('spin-icon');
      else icon.classList.remove('spin-icon');
    }
  }

  onActivated() {
    // Re-render results if sentence list exists
    if (appState.sentenceList.length > 0) {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      this.renderParsedResults({ scrollContext: { scrollYBefore: scrollY } });
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
    this.felsBlanks = [];
    // Last AppState.dataVersion seen by onActivated (fresh data → FELS mode default)
    this.lastSeenDataVersion = -1;

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
      },
      onLoopRestart: () => {
        // Synthesized sessions play a silent WAV; re-speak the sentence on every loop repeat
        if (appState.isSynthesizedAudio) {
          const activeStn = appState.getActiveSentence();
          if (activeStn) speakText(activeStn.text);
        }
      }
    });
  }

  /**
   * Page 2 looper/sentence-boundary enforcement is only valid while Page 2 is visible AND
   * Page 2 started the current playback. Prevents pausing Page 1 / Page 3 segment playback.
   */
  isLooperActive() {
    const onPracticePage = !this.router || typeof this.router.getCurrentPage !== 'function'
      || this.router.getCurrentPage() === 'practice';
    return onPracticePage && playbackController.isOwnedBy('practice');
  }

  initEvents() {
    // 1. Audio Player Events
    if (this.nativeAudioPlayer) {
      this.nativeAudioPlayer.addEventListener('loadedmetadata', () => {
        this.onAudioLoaded();
      });

      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        this.updateAudioProgress();
        if (this.isLooperActive()) this.looperEngine.checkBoundary();
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

    // Speak Row buttons
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
      this.computeAndApplyStabilizedWidths();
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

    // Pointer Events: one code path for mouse, touch (tablets / interactive whiteboards) and pen.
    // setPointerCapture keeps move/up events on the canvas even when the pointer leaves it.
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.nativeAudioPlayer.src) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      this.isCanvasMouseDown = true;
      this.dragStartX = e.clientX - rect.left;
      this.currentMouseX = this.dragStartX;
      this.isRangeDragging = false;
      if (typeof canvas.setPointerCapture === 'function') {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isCanvasMouseDown || !this.waveformCanvas) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.currentMouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      if (Math.abs(this.currentMouseX - this.dragStartX) > 5) {
        this.isRangeDragging = true;
        this.drawWaveform();
      }
    });

    canvas.addEventListener('pointercancel', () => {
      this.isCanvasMouseDown = false;
      this.isRangeDragging = false;
      this.dragStartX = null;
      this.currentMouseX = null;
      this.drawWaveform();
    });

    canvas.addEventListener('pointerup', (e) => {
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

    // Synchronize Audio Player Source (muted flag is ALWAYS re-applied → no silent real MP3)
    if (appState.uploadedAudioUrl) {
      playbackController.setSource(appState.uploadedAudioUrl, { muted: appState.isSynthesizedAudio });
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

      const initialWidth = this.estimateCardWidth(chunk);
      card.style.flex = '0 0 auto';
      card.style.width = `${initialWidth}px`;
      card.style.minWidth = `${initialWidth}px`;

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
          input.placeholder = '[ ]';
          input.style.width = `${Math.min(76, Math.max(34, felsInfo.clean.length * 9 + 20))}px`;
          input.style.maxWidth = '80px';
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

    // Compute locked card widths without visual collapse
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        this.computeAndApplyStabilizedWidths();
      });
    }
    setTimeout(() => {
      this.computeAndApplyStabilizedWidths();
    }, 50);
  }

  estimateCardWidth(chunk) {
    const enText = (chunk?.en || '').trim();
    const koText = (chunk?.ko || '').trim();
    const words = enText ? enText.split(/\s+/).filter(Boolean) : [];

    let felsW = 0;
    words.forEach(word => {
      const felsInfo = getFelsInfo(word);
      if (felsInfo) {
        const inputW = Math.min(76, Math.max(34, felsInfo.clean.length * 9 + 20));
        felsW += inputW;
        const trailingPunct = word.match(/[.,!?;:]+$/);
        if (trailingPunct) {
          felsW += trailingPunct[0].length * 8 + 2;
        }
      } else {
        felsW += word.length * 10;
      }
    });
    if (words.length > 1) {
      felsW += (words.length - 1) * 5;
    }

    const origW = enText.length * 10;
    // Korean text on back face can wrap onto 2 lines if long
    const rawKoW = koText.length * 15;
    const koW = rawKoW > 160 ? Math.ceil(rawKoW / 2) + 14 : rawKoW;

    const frontW = Math.max(felsW, origW, 20);
    const contentW = Math.max(frontW, Math.min(koW, frontW * 1.15 + 16));
    return Math.max(56, Math.ceil(contentW + 14));
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

    const containerWidth = this.chunksContainer.clientWidth || 0;
    const cardMeasurements = [];

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

        let childSum = 0;
        Array.from(felsWrap.children).forEach(ch => {
          const inp = ch.querySelector ? ch.querySelector('input') : null;
          if (inp && inp.style && inp.style.width) {
            childSum += (parseFloat(inp.style.width) || ch.offsetWidth || 0);
          } else {
            childSum += (ch.offsetWidth || 0);
          }
        });
        if (felsWrap.children.length > 1) {
          childSum += (felsWrap.children.length - 1) * 4;
        }

        wFels = Math.max(felsWrap.scrollWidth || 0, childSum);
        felsWrap.style.display = prevDisp;
        if (wasHidden) felsWrap.classList.add('hidden');
      }

      if (origWrap) {
        const wasHidden = origWrap.classList.contains('hidden');
        origWrap.classList.remove('hidden');
        const prevDisp = origWrap.style.display;
        origWrap.style.display = 'inline-flex';

        let origChildSum = 0;
        Array.from(origWrap.children).forEach(ch => {
          origChildSum += (ch.offsetWidth || 0);
        });
        if (origWrap.children.length > 1) {
          origChildSum += (origWrap.children.length - 1) * 4;
        }

        wOrig = Math.max(origWrap.scrollWidth || 0, origChildSum);
        origWrap.style.display = prevDisp;
        if (wasHidden) origWrap.classList.add('hidden');
      }

      if (koWrap) {
        const rawKoW = Math.max(koWrap.scrollWidth || 0, koWrap.offsetWidth || 0);
        wKo = rawKoW > 160 ? Math.ceil(rawKoW / 2) + 14 : rawKoW;
      }

      // Front-face dominant sizing: eliminate excessive blank margin on front face
      const frontW = Math.max(wFels, wOrig, 20);
      const effectiveContentW = Math.max(frontW, Math.min(wKo, frontW * 1.15 + 16));
      const currentW = parseFloat(card.style.width) || 0;
      const measuredCardWidth = Math.ceil(effectiveContentW + 14);
      // In real DOM with layout, measuredCardWidth reflects true contents.
      // In mock DOM without layout (where scrollWidth is 0), fall back to currentW.
      const naturalCardWidth = Math.max(currentW, 56, measuredCardWidth);
      const minCardWidth = Math.max(56, Math.ceil(frontW + 10));

      cardMeasurements.push({
        card,
        naturalWidth: naturalCardWidth,
        minWidth: minCardWidth
      });
    });

    const totalNaturalWidth = cardMeasurements.reduce((sum, item) => sum + item.naturalWidth, 0);
    const totalGap = (cardMeasurements.length - 1) * 5;
    const requiredTotal = totalNaturalWidth + totalGap;

    if (containerWidth > 0 && requiredTotal > containerWidth) {
      const availableForCards = Math.max(0, containerWidth - totalGap - 4);
      const scale = availableForCards / totalNaturalWidth;

      cardMeasurements.forEach(({ card, naturalWidth, minWidth }) => {
        let targetWidth = naturalWidth;
        if (scale >= 0.70) {
          targetWidth = Math.max(minWidth, Math.floor(naturalWidth * scale));
        }
        card.style.flex = '0 0 auto';
        card.style.width = `${targetWidth}px`;
        card.style.minWidth = `${Math.min(targetWidth, minWidth)}px`;
      });
    } else {
      cardMeasurements.forEach(({ card, naturalWidth }) => {
        card.style.flex = '0 0 auto';
        card.style.width = `${naturalWidth}px`;
        card.style.minWidth = `${naturalWidth}px`;
      });
    }
  }

  // --- Shortcut & UI Actions ---

  togglePlayPause() {
    if (!this.nativeAudioPlayer.src) {
      toast.show('⚠️ 재생 가능한 오디오가 없습니다.');
      return;
    }

    if (this.nativeAudioPlayer.paused) {
      playbackController.claim('practice');
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

    playbackController.claim('practice');
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

      playbackController.claim('practice');
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
    cards.forEach((card) => {
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
        if (this.isLooperActive()) this.looperEngine.checkBoundary();
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
    playbackController.claim('practice');

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

    // 2. Default state policy:
    //    - Fresh data (new sentence list since the last visit) → FELS Weak-Form mode.
    //      (AppState.setSentenceList() already reset activeSentenceIndex to S1.)
    //    - Revisit (e.g. Page 3 "S3 ↗" jump, returning from Page 3) → keep the current sentence.
    const isFreshData = this.lastSeenDataVersion !== appState.dataVersion;
    this.lastSeenDataVersion = appState.dataVersion;
    if (isFreshData) {
      appState.isFelsMode = true;
    }
    const lastIdx = appState.sentenceList.length - 1;
    const startIdx = Math.min(Math.max(0, appState.activeSentenceIndex || 0), lastIdx);
    appState.activeSentenceIndex = startIdx;
    this.updateFelsModeButtonUI();

    // 3. Render sentence navigator & load the active sentence
    this.renderSentenceNavigator();
    this.loadSentence(startIdx);

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
    this.classroomChunksContainer = document.getElementById('classroomChunksContainer');
    this.btnClassroomPlay = document.getElementById('btnClassroomPlay');
    this.btnClassroomFlipAll = document.getElementById('btnClassroomFlipAll');
    this.btnClassroomPrev = document.getElementById('btnClassroomPrev');
    this.btnClassroomNext = document.getElementById('btnClassroomNext');
    this.btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
    this.classroomIndex = 0;
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

    // Auto-fit chunk cards into single lines on window or container resize
    if (typeof ResizeObserver !== 'undefined' && this.canvasContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.canvasContainer && this.canvasContainer.offsetParent !== null) {
          this.fitAllSentenceRows();
        }
      });
      this.resizeObserver.observe(this.canvasContainer);
    } else {
      window.addEventListener('resize', () => {
        if (this.canvasContainer && this.canvasContainer.offsetParent !== null) {
          this.fitAllSentenceRows();
        }
      });
    }
  }

  setMemorizeMode(mode) {
    appState.memorizeMode = mode;
    this.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-memorize-mode') === mode);
    });

    if (this.canvasContainer) {
      this.canvasContainer.setAttribute('data-mode', mode);
      requestAnimationFrame(() => {
        this.fitAllSentenceRows();
      });
    }

    toast.show(`암기 모드: ${this.getModeLabel(mode)}`);
  }

  getModeLabel(mode) {
    switch (mode) {
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
        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${escapeHtml(stn.text)}</span>
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
        cCard._chunkEn = chunk.en || '';
        cCard._chunkKo = chunk.ko || '';

        // Shortcut Key Badge (1 to 9)
        const keyNum = cIdx + 1;
        const keyBadge = keyNum <= 9 ? `<span class="memorize-key-badge" title="숫자키 [${keyNum}] 뒤집기">${keyNum}</span>` : '';

        // Dynamic width per card based on content length with minimal padding
        const enLen = (chunk.en || '').trim().length;
        const koLen = (chunk.ko || '').trim().length;
        const estContentWidth = Math.max(enLen * 8.5, koLen * 12.5);
        const cardWidth = Math.max(20, Math.round(estContentWidth + 6));
        cCard.style.width = `${cardWidth}px`;
        cCard.style.flex = '0 0 auto';
        if (appState.memorizeAllFlipped) {
          cCard.classList.add('flipped');
        }

        cCard.innerHTML = `
          <div class="memorize-card-inner">
            ${keyBadge}
            <div class="memorize-face memorize-face-en">
              <span class="chunk-en-text">${escapeHtml(chunk.en)}</span>
            </div>
            <div class="memorize-face memorize-face-ko">
              <span class="chunk-ko-text">${escapeHtml(chunk.ko)}</span>
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

      // Auto-fit all sentence rows to fit strictly in a single line without horizontal scrolling
      requestAnimationFrame(() => {
        this.fitAllSentenceRows();
      });
    }
  }

  measureTextWidth(text, isKo = false) {
    if (!text) return 0;
    const str = String(text).trim();
    if (!str) return 0;

    // 1. In browser, try canvas 2D measurement for subpixel font metrics
    if (typeof document !== 'undefined') {
      try {
        if (!this._measureCanvas) {
          this._measureCanvas = document.createElement('canvas');
          this._measureCtx = this._measureCanvas.getContext('2d');
        }
        if (this._measureCtx && typeof this._measureCtx.measureText === 'function') {
          const fontSize = isKo ? 13.5 : 14.72;
          const fontWeight = isKo ? '600' : '700';
          this._measureCtx.font = `${fontWeight} ${fontSize}px "Pretendard Variable", "Pretendard", "Plus Jakarta Sans", sans-serif`;
          const metrics = this._measureCtx.measureText(str);
          if (metrics && metrics.width > 0 && (metrics.width !== 50 || str.length === 5)) {
            return Math.ceil(metrics.width);
          }
        }
      } catch (e) {
        // Fallback below
      }
    }

    // 2. High-precision character metric fallback
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        w += 14.5; // Hangul syllable
      } else if (code >= 0x1100 && code <= 0x11ff || code >= 0x3130 && code <= 0x318f) {
        w += 12; // Hangul Jamo
      } else if (code >= 65 && code <= 90) {
        w += 10.2; // Uppercase Latin
      } else if (code >= 97 && code <= 122) {
        if ('il'.includes(str[i])) w += 4.5;
        else if ('mw'.includes(str[i])) w += 12.8;
        else if ('rftj'.includes(str[i])) w += 6.5;
        else w += 8.5; // Lowercase Latin
      } else if (code === 32) {
        w += 4.8; // Space
      } else if (code >= 48 && code <= 57) {
        w += 8.8; // Digits
      } else {
        w += 6.5; // Symbols/Punctuation
      }
    }
    return Math.ceil(w);
  }

  fitAllSentenceRows() {
    if (!this.canvasContainer) return;
    const grids = this.canvasContainer.querySelectorAll('.memorize-chunk-grid');
    grids.forEach(grid => this.fitSentenceRow(grid));
  }

  fitSentenceRow(chunkGrid) {
    if (!chunkGrid) return;
    const cards = Array.from(chunkGrid.querySelectorAll('.memorize-chunk-card'));
    if (!cards.length) return;

    // Available width of the chunk row
    const gridWidth = chunkGrid.clientWidth;
    if (!gridWidth || gridWidth <= 0) return;

    const gap = 4; // matches CSS gap: 4px
    const totalGaps = (cards.length - 1) * gap;

    // Fixed horizontal overhead per card: 4px left + 4px right padding + 2px border + 2px safety buffer = 12px
    const fixedCardExtra = 12;
    const totalFixedOverhead = cards.length * fixedCardExtra + totalGaps;
    const availTextWidth = Math.max(20, gridWidth - totalFixedOverhead - 4);

    // Measure raw unscaled text width of each card at base font size (0.92rem)
    const rawTextWidths = [];
    cards.forEach(card => {
      const enText = card._chunkEn || (card.querySelector('.chunk-en-text')?.textContent || '');
      const koText = card._chunkKo || (card.querySelector('.chunk-ko-text')?.textContent || '');

      const wEn = this.measureTextWidth(enText, false);
      const wKo = this.measureTextWidth(koText, true);
      const maxTextW = Math.max(wEn, wKo, 10);
      rawTextWidths.push(maxTextW);
    });

    const totalRawTextWidth = rawTextWidths.reduce((sum, w) => sum + w, 0);

    if (totalRawTextWidth > availTextWidth) {
      // Must scale down font size so that the text of ALL cards fits without clipping or ellipsis
      const scale = availTextWidth / totalRawTextWidth;
      // Allow scaling down smoothly (down to 0.45rem if needed for very long sentences)
      const scaledFontRem = Math.max(0.45, Math.min(0.92, 0.92 * scale));
      chunkGrid.style.setProperty('--row-chunk-font-size', `${scaledFontRem.toFixed(3)}rem`);

      // Allocate card widths: exactly textWidth * scale + fixedCardExtra!
      let remainingTextSpace = availTextWidth;
      cards.forEach((card, idx) => {
        let allocatedTextW;
        if (idx === cards.length - 1) {
          allocatedTextW = Math.max(10, remainingTextSpace);
        } else {
          allocatedTextW = Math.max(10, Math.floor(rawTextWidths[idx] * scale));
          remainingTextSpace -= allocatedTextW;
        }
        const cardW = allocatedTextW + fixedCardExtra;
        card.style.flex = '0 0 auto';
        card.style.width = `${cardW}px`;
        card.style.minWidth = '0px';
        card.style.maxWidth = 'none'; // NEVER clamp maxWidth so text is never cut off
      });
    } else {
      // Fits comfortably at standard font size
      chunkGrid.style.setProperty('--row-chunk-font-size', '0.92rem');
      cards.forEach((card, idx) => {
        const cardW = rawTextWidths[idx] + fixedCardExtra;
        card.style.flex = '0 0 auto';
        card.style.width = `${cardW}px`;
        card.style.minWidth = '0px';
        card.style.maxWidth = 'none';
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
    playbackController.stop();
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

    // Real audio play (owner 'memorize' → the Practice looper no longer pauses it at S1's boundary)
    if (this.canPlayUploadedAudio()) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null; // null → play to media end

      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
      playbackController.playSegment(stnStart, stnEnd, {
        owner: 'memorize',
        onEnd: () => {
          // 0.4s pause between sentences
          setTimeout(() => {
            if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
          }, 400);
        }
      }).catch(e => {
        console.error(e);
        if (this.isPlayingAll) this.stopPlayAllScript();
      });
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

  /** Real uploaded audio (not the silent synthesized WAV) is available for segment playback. */
  canPlayUploadedAudio() {
    return !!appState.uploadedAudioUrl && !appState.isSynthesizedAudio;
  }

  playSingleSentence(idx) {
    const list = appState.sentenceList;
    if (!list || idx < 0 || idx >= list.length) return;

    this.highlightActiveSentenceRow(idx);
    const targetStn = list[idx];

    if (this.canPlayUploadedAudio()) {
      const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null;

      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
      playbackController.playSegment(stnStart, stnEnd, { owner: 'memorize' })
        .catch(e => {
          console.error(e);
          speakText(targetStn.text, 'en-US');
        });
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
    // Synchronize flip state: if Korean is on front in Page 3 canvas, show Korean in classroom modal
    this.areClassroomCardsFlipped = !!appState.memorizeAllFlipped;

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
      this.renderClassroomModal();
    }
  }

  nextClassroomSentence() {
    const list = appState.sentenceList;
    if (list && this.classroomIndex < list.length - 1) {
      this.classroomIndex++;
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
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.innerHTML = this.areClassroomCardsFlipped
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }
    toast.show(this.areClassroomCardsFlipped ? '🔄 모든 청크 뒷면(해석)으로 뒤집기' : '🔄 모든 청크 앞면(영어)으로 뒤집기');
  }

  flipClassroomCardByIndex(cIdx) {
    if (!this.classroomChunksContainer) return;
    const card = this.classroomChunksContainer.querySelector(`.classroom-sentence-row.is-active .classroom-chunk-card[data-c-idx="${cIdx}"]`);
    if (card) {
      card.classList.toggle('flipped');
      toast.show(`현재 문장 청크 #${cIdx + 1} 뒤집기`);
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
    const currentIdx = this.classroomIndex;

    if (this.classroomStnBadge) {
      this.classroomStnBadge.textContent = `S${currentIdx + 1}`;
    }
    if (this.classroomStnCounter) {
      this.classroomStnCounter.textContent = `${currentIdx + 1} / ${list.length} 문장 (선택 문장 가운데 표시)`;
    }
    if (this.btnClassroomPrev) {
      this.btnClassroomPrev.disabled = (currentIdx <= 0);
    }
    if (this.btnClassroomNext) {
      this.btnClassroomNext.disabled = (currentIdx >= list.length - 1);
    }
    if (this.btnClassroomFlipAll) {
      this.btnClassroomFlipAll.innerHTML = this.areClassroomCardsFlipped
        ? '<span>🔤 영어 앞면</span>'
        : '<span>🔄 전체 뒤집기</span>';
    }

    if (!this.classroomChunksContainer) return;
    this.classroomChunksContainer.innerHTML = '';

    // Render 3 sentences: Prev (i - 1), Active Center (i), Next (i + 1)
    const rowsToRender = [
      { type: 'prev', idx: currentIdx - 1, label: '이전 문장' },
      { type: 'active', idx: currentIdx, label: '현재 문장 (중심)' },
      { type: 'next', idx: currentIdx + 1, label: '다음 문장' }
    ];

    rowsToRender.forEach(rowDef => {
      const rowEl = document.createElement('div');
      rowEl.className = `classroom-sentence-row row-${rowDef.type}`;

      if (rowDef.idx < 0) {
        rowEl.classList.add('is-placeholder');
        rowEl.innerHTML = `
          <div class="classroom-row-header placeholder-header">
            <span class="classroom-row-badge dimmed">S0</span>
            <span class="classroom-row-preview">시작 문장입니다 (이전 문장 없음)</span>
          </div>
        `;
        this.classroomChunksContainer.appendChild(rowEl);
        return;
      }

      if (rowDef.idx >= list.length) {
        rowEl.classList.add('is-placeholder');
        rowEl.innerHTML = `
          <div class="classroom-row-header placeholder-header">
            <span class="classroom-row-badge dimmed">S${list.length + 1}</span>
            <span class="classroom-row-preview">마지막 문장입니다 (다음 문장 없음)</span>
          </div>
        `;
        this.classroomChunksContainer.appendChild(rowEl);
        return;
      }

      const sIdx = rowDef.idx;
      const stnData = list[sIdx];
      const isActive = (rowDef.type === 'active');

      if (isActive) {
        rowEl.classList.add('is-active');
      } else {
        rowEl.classList.add('is-context');
        rowEl.addEventListener('click', (e) => {
          if (e.target.closest('.classroom-chunk-card') || e.target.closest('button')) return;
          this.classroomIndex = sIdx;
          this.renderClassroomModal();
        });
      }

      // Sentence Header inside row
      const headerEl = document.createElement('div');
      headerEl.className = 'classroom-row-header';

      const badgeBtn = document.createElement('button');
      badgeBtn.className = `classroom-row-badge ${isActive ? 'active-badge' : ''}`;
      badgeBtn.textContent = `S${sIdx + 1}`;
      badgeBtn.title = isActive ? '현재 선택 문장' : `문장 S${sIdx + 1}로 이동`;
      if (!isActive) {
        badgeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.classroomIndex = sIdx;
          this.renderClassroomModal();
        });
      }

      const previewText = document.createElement('span');
      previewText.className = 'classroom-row-preview';
      previewText.textContent = stnData.text || '';
      previewText.title = stnData.result?.natural || '';

      const playBtn = document.createElement('button');
      playBtn.className = 'classroom-row-mini-play';
      playBtn.innerHTML = '▶';
      playBtn.title = `문장 S${sIdx + 1} 듣기`;
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSingleSentence(sIdx);
      });

      headerEl.appendChild(badgeBtn);
      headerEl.appendChild(previewText);
      headerEl.appendChild(playBtn);
      rowEl.appendChild(headerEl);

      // Chunks container for this sentence (Strict Single-Line)
      const chunksWrap = document.createElement('div');
      chunksWrap.className = 'classroom-row-chunks';

      const chunks = stnData.result?.chunks || [{ en: stnData.text, ko: stnData.result?.natural || '' }];
      chunks.forEach((chunk, cIdx) => {
        const card = document.createElement('div');
        card.className = `classroom-chunk-card ${isActive ? 'active-card' : 'context-card'}`;
        card.setAttribute('data-c-idx', cIdx);
        card.setAttribute('data-s-idx', sIdx);
        if (this.areClassroomCardsFlipped) {
          card.classList.add('flipped');
        }

        const keyNum = cIdx + 1;
        // Key badges only on active center row (1~9)
        const keyBadge = (isActive && keyNum <= 9) ? `<span class="classroom-key-badge">${keyNum}</span>` : '';

        const enText = (chunk.en || '').trim();
        const koText = (chunk.ko || '').trim();

        // Calculate sleek compact width so sentence stays strictly on 1 line
        const charLen = Math.max(enText.length, Math.ceil(koText.length * 1.4));
        const estCardW = Math.max(isActive ? 60 : 48, charLen * (isActive ? 13 : 10) + (isActive ? 24 : 16));
        card.style.width = `${estCardW}px`;
        card.style.flex = '0 0 auto';

        card.innerHTML = `
          <div class="classroom-card-inner">
            ${keyBadge}
            <div class="classroom-face classroom-face-en">
              <span class="classroom-chunk-text">${escapeHtml(enText)}</span>
            </div>
            <div class="classroom-face classroom-face-ko">
              <span class="classroom-chunk-text">${escapeHtml(koText)}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          card.classList.toggle('flipped');
        });

        chunksWrap.appendChild(card);
      });

      rowEl.appendChild(chunksWrap);
      this.classroomChunksContainer.appendChild(rowEl);
    });

    // Precise DOM width adjustment after render
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
          const isAct = c.classList.contains('active-card');
          const padding = isAct ? 24 : 16;
          const targetW = Math.max(isAct ? 60 : 48, maxTextW + padding);
          const curW = parseFloat(c.style.width || '0');
          if (targetW > curW) {
            c.style.width = `${targetW}px`;
            c.style.minWidth = `${targetW}px`;
          }
        }
      });
    });
  }

  onActivated() {
    this.activeRowIndex = appState.activeSentenceIndex || 0;
    this.renderFullScriptCanvas();
    this.setActiveRow(this.activeRowIndex);
    requestAnimationFrame(() => {
      this.fitAllSentenceRows();
    });
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
    this.projectService = projectService;
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

    // 5. Initialize Project Service & Toolbar UI
    this.initProjectToolbar();

    // 6. Initialize Global Shortcuts (Page 2, Page 3, and Project File operations)
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
      onOpenProject: () => this.projectService.openProject(this.inputView),
      onSaveProject: () => this.projectService.saveProject(this.inputView),
      onSaveProjectAs: () => this.projectService.saveProjectAs(this.inputView),
      getCurrentPage: () => this.router.getCurrentPage(),
      isShortcutActive: () => ['practice', 'memorize'].includes(this.router.getCurrentPage())
    });

    // 7. Navigate to initial page from URL hash or default to 'input'
    const initialHash = window.location.hash.replace(/^#/, '');
    if (['input', 'practice', 'memorize'].includes(initialHash)) {
      this.router.navigateTo(initialHash);
    } else {
      this.router.navigateTo('input');
    }

    console.log('🚀 CE Tool 3-Page Architecture initialized successfully.');
  }

  initProjectToolbar() {
    this.projectService.init();

    this.projectService.onStateChange((state) => {
      const pill = document.getElementById('projectStatusPill');
      const nameLabel = document.getElementById('projectNameLabel');
      const statusLabel = document.getElementById('projectSaveStatus');
      if (nameLabel) nameLabel.textContent = state.projectName;
      if (statusLabel) {
        statusLabel.textContent = state.isDirty ? '(수정됨 ●)' : (state.hasHandle ? '(저장됨 ✓)' : '(미저장)');
      }
      if (pill) {
        pill.classList.toggle('is-dirty', state.isDirty);
        pill.classList.toggle('is-clean', !state.isDirty && state.hasHandle);
        pill.classList.toggle('empty', !state.hasHandle && !state.isDirty);
      }
    });

    const btnOpen = document.getElementById('btnProjectOpen');
    const btnSave = document.getElementById('btnProjectSave');
    const btnSaveAs = document.getElementById('btnProjectSaveAs');

    if (btnOpen) btnOpen.addEventListener('click', () => this.projectService.openProject(this.inputView));
    if (btnSave) btnSave.addEventListener('click', () => this.projectService.saveProject(this.inputView));
    if (btnSaveAs) btnSaveAs.addEventListener('click', () => this.projectService.saveProjectAs(this.inputView));
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
