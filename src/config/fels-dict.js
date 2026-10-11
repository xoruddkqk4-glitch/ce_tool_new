/**
 * FELS (Function-Embedded Listening Skills) Categories, Vocabulary & Grammar Dictionary
 */

export const FELS_CATEGORIES = {
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

export const FELS_ALL_SET = new Set();
Object.values(FELS_CATEGORIES).forEach(cat => {
  cat.words.forEach(w => FELS_ALL_SET.add(w));
});

export function getFelsInfo(rawToken) {
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

export const PRONOUNS = {
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

export const PREPOSITIONS = {
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

export const ADVERBS = {
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

export const DICTIONARY = {
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

export const VERB_MAP = {
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

export const PRESETS = {
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
