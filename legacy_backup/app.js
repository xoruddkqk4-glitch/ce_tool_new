/**
 * ChunkLingo - 3-Mode Multi-Input (MP3 + Script / MP3 Only / Script Only)
 * - FELS 7대 약형 기능어 균일 빈칸 딕테이션 & 정답 채점
 * - 직독직해 빈칸 플립 카드 (문법 해설 없이 클릭 시 완전한 빈칸으로 전환)
 * - 원문 보기 토글 시 너비 불변 보장
 * - MP3 오디오 플레이어 & 배속 조절(0.8x, 1.0x, 1.2x) 내장
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. FELS (Function-Embedded Listening Skills) Engine
  // =========================================================================

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

  // =========================================================================
  // 2. Vocabulary & Grammar Knowledge Base for Local Translation
  // =========================================================================

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
  // 3. Intelligent Rule-Based Local Chunking & Translation Engine
  // =========================================================================

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
  // 4. AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
  // =========================================================================

  class AIEngine {
    constructor() {
      this.provider = localStorage.getItem('chunklingo_provider') || 'gemini';
      this.apiKey = localStorage.getItem('chunklingo_api_key') || '';
      this.customPrompt = localStorage.getItem('chunklingo_prompt') || '';
      this.activeGeminiModel = null;
    }

    saveSettings(provider, apiKey, customPrompt) {
      this.provider = provider;
      this.apiKey = apiKey;
      this.customPrompt = customPrompt;
      this.activeGeminiModel = null; // Reset cached model on settings update
      localStorage.setItem('chunklingo_provider', provider);
      localStorage.setItem('chunklingo_api_key', apiKey);
      localStorage.setItem('chunklingo_prompt', customPrompt);
    }

    hasKey() {
      return !!this.apiKey.trim();
    }

    /**
     * Dynamically resolve the best available Gemini model for generateContent
     */
    async resolveGeminiModel() {
      if (this.activeGeminiModel) {
        return this.activeGeminiModel;
      }

      const priorityOrder = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-flash-001',
        'gemini-2.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro'
      ];

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
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-002',
        'gemini-2.5-pro',
        'gemini-1.5-pro'
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

Respond ONLY with valid JSON:
{
  "script": "transcribed English text",
  "natural": "...",
  "chunk_text": "...",
  "chunks": [{ "en": "...", "ko": "..." }]
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

  // =========================================================================
  // 5. Application UI Controller
  // =========================================================================

  class AppController {
    constructor() {
      this.ruleEngine = new RuleChunkEngine();
      this.aiEngine = new AIEngine();
      this.history = JSON.parse(localStorage.getItem('chunklingo_history') || '[]');
      this.lastResult = null;
      this.lastRawEnglish = '';

      // Upload Mode State: 'both' | 'audio' | 'text' (default: 'text')
      this.currentMode = 'text';

      // Audio File & Player State
      this.uploadedAudioFile = null;
      this.uploadedAudioUrl = null;
      this.isPlayingAudio = false;

      // Web Audio API & Waveform State
      this.audioCtx = null;
      this.audioBuffer = null;
      this.waveformPeaks = [];
      this.waveformAnimFrame = null;

      // A-B Looper State
      this.loopStart = null;
      this.loopEnd = null;
      this.targetLoopCount = 3;
      this.currentLoopCount = 0;
      this.isShadowingWaiting = false;
      this.shadowTimer = null;

      // Mouse drag on waveform canvas
      this.isCanvasMouseDown = false;
      this.dragStartX = null;
      this.currentMouseX = null;
      this.isRangeDragging = false;

      // FELS State
      this.isFelsMode = true;
      this.felsBlanks = [];
      this.areAllCardsFlipped = false;
      this.stabilizedWidths = [];

      // Sentence Classification & Navigation State
      this.sentenceList = [];
      this.activeSentenceIndex = 0;
      this.isAutoAdvance = false;

      // Synthesized Audio State
      this.isSynthesizedAudio = false;

      this.cacheDOMElements();
      this.bindEvents();
      this.initWaveformEvents();
      this.initTheme();
      this.updateEngineBadge();
      this.setUploadMode('text');
      // Requirement 4: default 값은 우리말 해석이 보이면 안돼
      this.setRowVisibility('rowNatural', false);

      // Render baseline fallback waveform on startup
      this.generateFallbackPeaks();
      setTimeout(() => this.drawWaveform(), 60);
    }

    cacheDOMElements() {
      // Header
      this.btnSettings = document.getElementById('btnSettings');
      this.btnThemeToggle = document.getElementById('btnThemeToggle');
      this.themeIconSun = document.getElementById('themeIconSun');

      // Mode Selector Tabs
      this.tabModeBoth = document.getElementById('tabModeBoth');
      this.tabModeAudio = document.getElementById('tabModeAudio');
      this.tabModeText = document.getElementById('tabModeText');

      // Audio Upload & Player Elements
      this.audioUploadZone = document.getElementById('audioUploadZone');
      this.audioFileInput = document.getElementById('audioFileInput');
      this.audioDropArea = document.getElementById('audioDropArea');
      this.btnBrowseAudio = document.getElementById('btnBrowseAudio');
      this.audioPlayerCard = document.getElementById('audioPlayerCard');
      this.audioFileName = document.getElementById('audioFileName');
      this.audioFileSize = document.getElementById('audioFileSize');
      this.btnRemoveAudio = document.getElementById('btnRemoveAudio');
      this.shadowingIndicator = document.getElementById('shadowingIndicator');
      this.btnAudioPlayPause = document.getElementById('btnAudioPlayPause');
      this.playIcon = document.getElementById('playIcon');
      this.audioCurrentTime = document.getElementById('audioCurrentTime');
      this.audioDuration = document.getElementById('audioDuration');
      this.nativeAudioPlayer = document.getElementById('nativeAudioPlayer');
      this.audioOnlyBanner = document.getElementById('audioOnlyBanner');

      // Waveform Canvas & Looper HUD Elements
      this.waveformCanvas = document.getElementById('waveformCanvas');
      this.waveformLoading = document.getElementById('waveformLoading');
      this.loopStatusBadge = document.getElementById('loopStatusBadge');
      this.loopRangeLabel = document.getElementById('loopRangeLabel');
      this.loopCountLabel = document.getElementById('loopCountLabel');
      this.btnClearLoop = document.getElementById('btnClearLoop');

      // Script Input Elements
      this.scriptInputZone = document.getElementById('scriptInputZone');
      this.inputEnglish = document.getElementById('inputEnglish');
      this.charCount = document.getElementById('charCount');
      this.btnClear = document.getElementById('btnClear');
      this.presetsContainer = document.getElementById('presetsContainer');
      this.chkUseAI = document.getElementById('chkUseAI');
      this.btnTranslate = document.getElementById('btnTranslate');
      this.btnTranslateText = document.getElementById('btnTranslateText');
      this.engineLabel = document.getElementById('engineLabel');

      // Sentence Navigator Elements
      this.sentenceNavigator = document.getElementById('sentenceNavigator');
      this.totalSentenceCount = document.getElementById('totalSentenceCount');
      this.btnPrevSentence = document.getElementById('btnPrevSentence');
      this.currentSentenceIndicator = document.getElementById('currentSentenceIndicator');
      this.btnNextSentence = document.getElementById('btnNextSentence');
      this.chkAutoAdvance = document.getElementById('chkAutoAdvance');
      this.sentenceChipsTrack = document.getElementById('sentenceChipsTrack');

      // Output Rows
      this.rowChunks = document.getElementById('rowChunks');
      this.rowNatural = document.getElementById('rowNatural');

      // FELS & Card Controls in Row 1
      this.btnCheckAnswers = document.getElementById('btnCheckAnswers');
      this.btnToggleFelsOriginal = document.getElementById('btnToggleFelsOriginal');
      this.felsModeIcon = document.getElementById('felsModeIcon');
      this.felsModeLabel = document.getElementById('felsModeLabel');
      this.btnResetFels = document.getElementById('btnResetFels');
      this.btnFlipAllCards = document.getElementById('btnFlipAllCards');
      this.flipAllIcon = document.getElementById('flipAllIcon');
      this.flipAllLabel = document.getElementById('flipAllLabel');
      this.felsScoreBar = document.getElementById('felsScoreBar');
      this.felsScoreText = document.getElementById('felsScoreText');

      // Tracks and Output Containers
      this.trackChunks = document.getElementById('trackChunks');
      this.chunksContainer = document.getElementById('chunksContainer');
      this.txtNatural = document.getElementById('txtNatural');

      // Global visibility buttons
      this.btnShowAll = document.getElementById('btnShowAll');
      this.btnHideAll = document.getElementById('btnHideAll');

      // Modal
      this.settingsModal = document.getElementById('settingsModal');
      this.btnCloseModal = document.getElementById('btnCloseModal');
      this.btnSaveSettings = document.getElementById('btnSaveSettings');
      this.btnResetSettings = document.getElementById('btnResetSettings');
      this.selectProvider = document.getElementById('selectProvider');
      this.inputApiKey = document.getElementById('inputApiKey');
      this.inputCustomPrompt = document.getElementById('inputCustomPrompt');

      // Toast
      this.toastEl = document.getElementById('toast');
    }

    bindEvents() {
      // Mode Tab Buttons Click
      this.tabModeBoth.addEventListener('click', () => this.setUploadMode('both'));
      this.tabModeAudio.addEventListener('click', () => this.setUploadMode('audio'));
      this.tabModeText.addEventListener('click', () => this.setUploadMode('text'));

      // Audio File Drag & Drop & Browse
      this.btnBrowseAudio.addEventListener('click', () => this.audioFileInput.click());
      this.audioDropArea.addEventListener('click', (e) => {
        if (e.target !== this.btnBrowseAudio) this.audioFileInput.click();
      });

      this.audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleAudioFile(file);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        this.audioDropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.audioDropArea.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.audioDropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          this.audioDropArea.classList.remove('dragover');
        });
      });

      this.audioDropArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('audio/')) {
          this.handleAudioFile(file);
        } else if (file) {
          this.showToast('⚠️ 오디오 파일(.mp3, .wav, .m4a 등)만 업로드할 수 있습니다.');
        }
      });

      this.btnRemoveAudio.addEventListener('click', () => this.removeAudioFile());

      // Audio Player Controls
      this.btnAudioPlayPause.addEventListener('click', () => this.toggleAudioPlayback());
      this.nativeAudioPlayer.addEventListener('timeupdate', () => {
        this.updateAudioProgress();
        this.checkLoopBoundary();
      });
      this.nativeAudioPlayer.addEventListener('loadedmetadata', () => this.onAudioLoaded());
      this.nativeAudioPlayer.addEventListener('ended', () => this.onAudioEnded());
      this.nativeAudioPlayer.addEventListener('play', () => this.startWaveformPlaybackLoop());
      this.nativeAudioPlayer.addEventListener('pause', () => this.updatePlayPauseIcon(false));

      // Audio Speed Buttons
      document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = parseFloat(btn.getAttribute('data-speed') || '1.0');
          this.setPlaybackSpeed(speed, btn);
        });
      });

      // Looper Repeat Count Buttons
      document.querySelectorAll('.loop-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-count');
          this.targetLoopCount = val === 'Infinity' ? Infinity : parseInt(val, 10);
          document.querySelectorAll('.loop-count-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.updateLoopBadge();
          const label = this.targetLoopCount === Infinity ? '무한 반복' : `${this.targetLoopCount}회 반복`;
          this.showToast(`🔁 루프 반복 횟수 설정: ${label}`);
        });
      });

      // Clear Loop Button
      if (this.btnClearLoop) {
        this.btnClearLoop.addEventListener('click', () => this.clearLoopRange());
      }


      // Translate Trigger
      this.btnTranslate.addEventListener('click', () => this.handleTranslate());

      // Keyboard shortcut (Ctrl+Enter or Cmd+Enter)
      this.inputEnglish.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.handleTranslate();
        }
      });

      // Char count & Clear
      this.inputEnglish.addEventListener('input', () => {
        this.charCount.textContent = `${this.inputEnglish.value.length}자`;
      });
      this.btnClear.addEventListener('click', () => {
        this.inputEnglish.value = '';
        this.charCount.textContent = '0자';
        this.inputEnglish.focus();
      });

      // Preset Chips
      document.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-text');
          this.inputEnglish.value = text;
          this.charCount.textContent = `${text.length}자`;
          this.handleTranslate();
        });
      });

      // Sentence Navigator Events
      if (this.btnPrevSentence) {
        this.btnPrevSentence.addEventListener('click', () => this.prevSentence());
      }
      if (this.btnNextSentence) {
        this.btnNextSentence.addEventListener('click', () => this.nextSentence());
      }
      if (this.chkAutoAdvance) {
        this.chkAutoAdvance.addEventListener('change', (e) => {
          this.isAutoAdvance = e.target.checked;
          this.showToast(this.isAutoAdvance ? '⏭️ 자동 다음 문장 모드가 활성화되었습니다.' : '⏹️ 자동 다음 문장 모드가 비활성화되었습니다.');
        });
      }

      // =====================================================================
      // Unified Global Keyboard Shortcuts: Space, [, ], \, R, ←, →, S, T
      // =====================================================================
      window.addEventListener('keydown', (e) => {
        // 1. Protect text typing when inside input or textarea
        const isEditingField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
        if (isEditingField) {
          // Exception: Inside FELS quiz blanks, Alt + ← / → allows moving between sentences
          if (e.target.classList && e.target.classList.contains('fels-input') && e.altKey) {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              this.prevSentence();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              this.nextSentence();
            }
          }
          return;
        }

        const key = e.key;
        const code = e.code;

        // 1. Space: 재생 / 일시정지 (togglePlayPause)
        if (code === 'Space' || key === ' ') {
          if (this.nativeAudioPlayer.src) {
            e.preventDefault();
            this.togglePlayPause();
          }
          return;
        }

        // 2. [ : 반복 구간 시작점 설정 (setRegionStartFromCurrentTime)
        if (key === '[' || code === 'BracketLeft') {
          e.preventDefault();
          this.setRegionStartFromCurrentTime();
          return;
        }

        // 3. ] : 반복 구간 끝점 설정 & 재생 (setRegionEndFromCurrentTime)
        if (key === ']' || code === 'BracketRight') {
          e.preventDefault();
          this.setRegionEndFromCurrentTime();
          return;
        }

        // 4. \ (￦) : 반복 구간 해제 (clearSelectedRegion)
        if (key === '\\' || key === '₩' || code === 'Backslash' || code === 'IntlRo' || code === 'IntlYen') {
          e.preventDefault();
          this.clearSelectedRegion();
          return;
        }

        // 5. R : 구간 반복 재생 시작 (startRegionLoop)
        if (key === 'r' || key === 'R' || key === 'ㄱ' || code === 'KeyR') {
          e.preventDefault();
          this.startRegionLoop();
          return;
        }

        // 6. ← : 이전 문장 (prevSentence)
        if (key === 'ArrowLeft') {
          e.preventDefault();
          this.prevSentence();
          return;
        }

        // 7. → : 다음 문장 (nextSentence)
        if (key === 'ArrowRight') {
          e.preventDefault();
          this.nextSentence();
          return;
        }

        // 8. S : 약형 / Script 모드 전환 (toggleFelsMode)
        if (key === 's' || key === 'S' || key === 'ㄴ' || code === 'KeyS') {
          e.preventDefault();
          this.toggleFelsMode();
          return;
        }

        // 9. T : 해석 보기 / 숨기기 (toggleRowVisibility('rowNatural'))
        if (key === 't' || key === 'T' || key === 'ㅅ' || code === 'KeyT') {
          e.preventDefault();
          this.toggleRowVisibility('rowNatural');
          return;
        }
      });

      // Ensure clicking anywhere inside '청크 학습 카드' panel keeps focus for keyboard navigation
      const rowChunksEl = document.getElementById('rowChunks');
      if (rowChunksEl) {
        rowChunksEl.addEventListener('click', (e) => {
          if (!e.target.closest('input') && !e.target.closest('button')) {
            rowChunksEl.focus();
          }
        });
      }

      // FELS Action: Check Answers
      this.btnCheckAnswers.addEventListener('click', () => this.checkFelsAnswers());

      // FELS Action: Toggle between FELS Blanks and Original English
      this.btnToggleFelsOriginal.addEventListener('click', () => this.toggleFelsMode());

      // FELS Action: Reset blanks
      this.btnResetFels.addEventListener('click', () => this.resetFelsInputs());

      // Row 1 Action: Flip all cards
      this.btnFlipAllCards.addEventListener('click', () => this.toggleFlipAllCards());

      // Individual Row Visibility Toggles
      document.querySelectorAll('.btn-toggle-vis').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          this.toggleRowVisibility(targetId);
        });
      });

      // Click on masked cover to unhide
      document.querySelectorAll('.masked-cover').forEach(cover => {
        cover.addEventListener('click', () => {
          const rowCard = cover.closest('.stack-row-card');
          if (rowCard) {
            this.setRowVisibility(rowCard.id, true);
          }
        });
      });

      // Global visibility buttons
      this.btnShowAll.addEventListener('click', () => {
        ['rowChunks', 'rowNatural'].forEach(id => this.setRowVisibility(id, true));
        this.showToast('모든 행을 표시합니다.');
      });

      this.btnHideAll.addEventListener('click', () => {
        ['rowChunks', 'rowNatural'].forEach(id => this.setRowVisibility(id, false));
        this.showToast('모든 행을 숨깁니다.');
      });

      // Copy & Speak buttons
      document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target');
          this.copyResult(target, btn);
        });
      });

      document.querySelectorAll('.btn-speak').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target');
          this.speakResult(target);
        });
      });

      // AI Engine checkbox change
      this.chkUseAI.addEventListener('change', () => {
        if (this.chkUseAI.checked && !this.aiEngine.hasKey()) {
          this.showToast('⚠️ AI API 키가 없습니다. 설정 창을 엽니다.');
          this.openSettingsModal();
        }
        this.updateEngineBadge();
      });

      // Settings Modal
      this.btnSettings.addEventListener('click', () => this.openSettingsModal());
      this.btnCloseModal.addEventListener('click', () => this.closeSettingsModal());
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) this.closeSettingsModal();
      });

      this.btnSaveSettings.addEventListener('click', () => {
        this.aiEngine.saveSettings(
          this.selectProvider.value,
          this.inputApiKey.value.trim(),
          this.inputCustomPrompt.value.trim()
        );
        this.closeSettingsModal();
        this.showToast('✅ 설정이 안전하게 저장되었습니다.');
        this.updateEngineBadge();
      });

      this.btnResetSettings.addEventListener('click', () => {
        this.aiEngine.saveSettings('gemini', '', '');
        this.populateSettingsFields();
        this.showToast('설정이 초기화되었습니다.');
        this.updateEngineBadge();
      });

      // Theme toggle
      this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

      // Window resize
      window.addEventListener('resize', () => {
        if (this.lastResult && this.lastResult.chunks) {
          this.computeAndApplyStabilizedWidths();
        }
      });
    }

    /**
     * Switch between the 3 Upload Modes:
     * 1. 'both': mp3 음성과 script
     * 2. 'audio': mp3 음성만
     * 3. 'text': script만
     */
    setUploadMode(mode) {
      this.currentMode = mode;

      // Update Tab Buttons UI
      [this.tabModeBoth, this.tabModeAudio, this.tabModeText].forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });

      if (mode === 'both') {
        // Mode 1: MP3 + Script
        this.audioUploadZone.classList.remove('hidden');
        this.audioDropArea.classList.remove('hidden');
        this.scriptInputZone.classList.remove('hidden');
        this.presetsContainer.classList.remove('hidden');
        this.audioOnlyBanner.classList.add('hidden');
        this.btnTranslateText.textContent = '3x1 생성 및 음성 연동';
      } else if (mode === 'audio') {
        // Mode 2: MP3 Only
        this.audioUploadZone.classList.remove('hidden');
        this.audioDropArea.classList.remove('hidden');
        this.scriptInputZone.classList.add('hidden');
        this.presetsContainer.classList.add('hidden');
        this.audioOnlyBanner.classList.remove('hidden');
        this.btnTranslateText.textContent = '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
      } else {
        // Mode 3: Script Only (Default)
        this.audioUploadZone.classList.add('hidden');
        this.scriptInputZone.classList.remove('hidden');
        this.presetsContainer.classList.remove('hidden');
        this.audioOnlyBanner.classList.add('hidden');
        this.btnTranslateText.textContent = '3x1 해석 및 FELS 생성';
      }
    }

    /**
     * Handle MP3 Audio File Selection
     */
    async handleAudioFile(file) {
      this.uploadedAudioFile = file;
      this.isSynthesizedAudio = false;

      if (this.uploadedAudioUrl) {
        URL.revokeObjectURL(this.uploadedAudioUrl);
      }
      this.uploadedAudioUrl = URL.createObjectURL(file);
      this.nativeAudioPlayer.src = this.uploadedAudioUrl;
      // Unmute native player for authentic uploaded audio
      this.nativeAudioPlayer.muted = false;

      // Display file metadata
      this.audioFileName.textContent = file.name;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.audioFileSize.textContent = `${sizeMB} MB (${file.type || 'audio/mp3'})`;

      // Show player card
      this.audioPlayerCard.classList.remove('hidden');
      this.clearLoopRange();

      // Web Audio API Waveform Decoding
      await this.decodeWaveformAudio(file);

      // If sentences are already loaded, automatically map audio sentence boundaries!
      if (this.sentenceList && this.sentenceList.length > 0) {
        const rawSentences = this.sentenceList.map(s => s.text);
        const boundaries = this.detectAudioSentenceBoundaries(rawSentences);
        this.sentenceList.forEach((s, idx) => {
          s.audioStart = boundaries[idx]?.start ?? null;
          s.audioEnd = boundaries[idx]?.end ?? null;
        });
        this.renderSentenceNavigator();
        const activeStn = this.sentenceList[this.activeSentenceIndex];
        if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null) {
          this.setLoopRange(activeStn.audioStart, activeStn.audioEnd);
        } else {
          this.drawWaveform();
        }
      }

      this.showToast(`🎵 음성 파일 첨부 완료: ${file.name}`);
    }

    async decodeWaveformAudio(file) {
      if (!this.waveformCanvas) return;
      try {
        if (this.waveformLoading) this.waveformLoading.classList.remove('hidden');
        if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer.slice(0));
        this.audioBuffer = audioBuffer;
        this.extractWaveformPeaks(audioBuffer);
        if (this.waveformLoading) this.waveformLoading.classList.add('hidden');
        this.drawWaveform();
      } catch (err) {
        console.warn('Web Audio API decoding fallback:', err);
        if (this.waveformLoading) this.waveformLoading.classList.add('hidden');
        this.generateFallbackPeaks();
        this.drawWaveform();
      }
    }

    extractWaveformPeaks(audioBuffer) {
      const rawData = audioBuffer.getChannelData(0);
      const totalBars = 360;
      const blockSize = Math.floor(rawData.length / totalBars);
      this.waveformPeaks = [];

      let maxPeak = 0;
      for (let i = 0; i < totalBars; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, rawData.length);
        let sum = 0;
        for (let j = start; j < end; j += 4) {
          const val = Math.abs(rawData[j]);
          if (val > sum) sum = val;
        }
        this.waveformPeaks.push(sum);
        if (sum > maxPeak) maxPeak = sum;
      }

      if (maxPeak > 0) {
        this.waveformPeaks = this.waveformPeaks.map(p => Math.min(1, (p / maxPeak) * 0.92));
      }
    }

    generateFallbackPeaks() {
      this.waveformPeaks = [];
      for (let i = 0; i < 360; i++) {
        const wave = 0.25 + 0.45 * Math.sin(i * 0.12) * Math.cos(i * 0.06);
        this.waveformPeaks.push(Math.max(0.1, Math.min(0.85, Math.abs(wave))));
      }
    }

    /**
     * Synthesize Audio and Waveform from Script Text
     * Allows Waveform visualization, click-to-seek, and A-B looper to function for text-only inputs.
     * Clean synthesis with 0% noise by using pure silent PCM WAV for timing + Web Speech API for voice.
     */
    async synthesizeAudioFromScript(text) {
      if (!text || !text.trim()) return;

      const words = text.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return;

      // Realistic speech duration: ~0.40s per word + 0.6s boundary margin
      const estDuration = Math.max(2.0, Math.min(60, words.length * 0.40 + 0.6));

      // Ensure AudioContext
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        try { await this.audioCtx.resume(); } catch (e) {}
      }

      const sampleRate = 44100;
      const totalSamples = Math.floor(sampleRate * estDuration);
      const audioBuffer = this.audioCtx.createBuffer(1, totalSamples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // 1. Silent PCM WAV to completely eliminate synthetic noise, static & buzz
      channelData.fill(0);

      // 2. Synthesize speech rhythm waveform peaks matching diamond reference waveform
      const totalBars = 360;
      this.waveformPeaks = [];
      const wordCount = words.length;
      const barsPerWord = totalBars / wordCount;

      for (let i = 0; i < totalBars; i++) {
        const wordIdx = Math.floor(i / barsPerWord);
        const posInWord = (i % barsPerWord) / barsPerWord; // 0.0 ~ 1.0

        if (posInWord < 0.80) {
          // Active word articulation: smooth diamond envelope with slight acoustic texture
          const normPos = posInWord / 0.80; // 0.0 ~ 1.0
          const diamondEnv = Math.sin(normPos * Math.PI);
          const texture = 0.90 + 0.10 * Math.sin(i * 1.5) * Math.cos(i * 0.7);
          const peak = Math.max(0.12, Math.min(0.96, diamondEnv * texture * 0.88));
          this.waveformPeaks.push(peak);
        } else {
          // Inter-word pause interval: low baseline level
          const baseline = 0.07 + 0.03 * Math.sin(i * 0.8);
          this.waveformPeaks.push(baseline);
        }
      }

      // Encode silent AudioBuffer to standard PCM WAV Blob
      const wavBlob = this.audioBufferToWavBlob(audioBuffer);
      if (this.uploadedAudioUrl) {
        URL.revokeObjectURL(this.uploadedAudioUrl);
      }
      this.uploadedAudioUrl = URL.createObjectURL(wavBlob);
      this.nativeAudioPlayer.src = this.uploadedAudioUrl;
      // Mute HTML5 audio player so synthetic audio never outputs buzz/noise; sound is 100% cleanly handled by SpeechSynthesis
      this.nativeAudioPlayer.muted = true;
      this.audioBuffer = audioBuffer;
      this.isSynthesizedAudio = true;
      this.uploadedAudioFile = new File([wavBlob], 'tts_synthesized.wav', { type: 'audio/wav' });

      // Update Audio Player HUD
      this.audioFileName.textContent = '🎙️ 스크립트 음성 합성 (TTS 파형 연동)';
      this.audioFileSize.textContent = `${this.formatPreciseTime(estDuration)} (Clean Speech Synthesis)`;
      this.audioDuration.textContent = this.formatPreciseTime(estDuration);

      // Ensure top Waveform Box is visible
      if (this.audioPlayerCard) {
        this.audioPlayerCard.classList.remove('hidden');
      }

      this.drawWaveform();
    }

    /**
     * Convert AudioBuffer to 16-bit PCM WAV Blob
     */
    audioBufferToWavBlob(buffer) {
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

      for (let i = 0; i < buffer.length; i++) {
        for (let chan = 0; chan < numOfChan; chan++) {
          let sample = buffer.getChannelData(chan)[i];
          sample = Math.max(-1, Math.min(1, sample));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          view.setInt16(pos, sample, true);
          pos += 2;
        }
      }

      return new Blob([outBuffer], { type: 'audio/wav' });
    }

    /**
     * Extract or generate waveform peaks specifically for the active sentence unit
     */
    getSentencePeaks(stnIndex) {
      const totalBars = 360;
      if (!this.sentenceList || stnIndex < 0 || stnIndex >= this.sentenceList.length) {
        return (this.waveformPeaks && this.waveformPeaks.length) ? this.waveformPeaks : [];
      }

      const stn = this.sentenceList[stnIndex];
      if (!stn) return this.waveformPeaks || [];

      // Return cached peaks for this sentence if available
      if (stn.cachedPeaks && stn.cachedPeaks.length === totalBars) {
        return stn.cachedPeaks;
      }

      // 1. If decoded audioBuffer from real MP3 exists, slice exact PCM samples for this sentence
      if (this.audioBuffer && !this.isSynthesizedAudio) {
        try {
          const rawData = this.audioBuffer.getChannelData(0);
          const sr = this.audioBuffer.sampleRate;
          const startSample = Math.max(0, Math.floor((stn.audioStart || 0) * sr));
          const endSample = Math.min(rawData.length, Math.floor((stn.audioEnd || this.audioBuffer.duration) * sr));
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
            if (maxPeak > 0) {
              const normalized = peaks.map(p => Math.min(1, (p / maxPeak) * 0.92));
              stn.cachedPeaks = normalized;
              return normalized;
            }
            stn.cachedPeaks = peaks;
            return peaks;
          }
        } catch (e) {
          console.warn('Sentence audio peak slice error:', e);
        }
      }

      // 2. Synthesize word rhythm diamond peaks for this sentence unit
      const words = (stn.text || '').trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const peaks = [];
        const barsPerWord = totalBars / words.length;
        for (let i = 0; i < totalBars; i++) {
          const posInWord = (i % barsPerWord) / barsPerWord;
          if (posInWord < 0.80) {
            const normPos = posInWord / 0.80;
            const diamondEnv = Math.sin(normPos * Math.PI);
            const texture = 0.90 + 0.10 * Math.sin(i * 1.5) * Math.cos(i * 0.7);
            const peak = Math.max(0.14, Math.min(0.96, diamondEnv * texture * 0.88));
            peaks.push(peak);
          } else {
            const baseline = 0.08 + 0.04 * Math.sin(i * 0.8);
            peaks.push(baseline);
          }
        }
        stn.cachedPeaks = peaks;
        return peaks;
      }

      return (this.waveformPeaks && this.waveformPeaks.length) ? this.waveformPeaks : [];
    }

    initWaveformEvents() {
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

        const activeStn = (this.sentenceList && this.sentenceList.length > 0)
          ? this.sentenceList[this.activeSentenceIndex]
          : null;
        const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
          ? this.nativeAudioPlayer.duration
          : (this.audioBuffer ? this.audioBuffer.duration : 0);

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
            // Instant Seek on Click within sentence
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

      window.addEventListener('resize', () => {
        if (this.waveformPeaks.length || (this.sentenceList && this.sentenceList.length)) {
          this.drawWaveform();
        }
      });
    }

    drawWaveform() {
      if (!this.waveformCanvas) return;
      const canvas = this.waveformCanvas;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 800;
      const height = 110;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Dark sleek background
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

      // Active Sentence Time Window
      const activeStn = (this.sentenceList && this.sentenceList.length > 0)
        ? this.sentenceList[this.activeSentenceIndex]
        : null;

      const totalDuration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
        ? this.nativeAudioPlayer.duration
        : (this.audioBuffer ? this.audioBuffer.duration : 1);

      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
      const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : totalDuration;
      const stnDuration = Math.max(0.1, stnEnd - stnStart);

      const currentTime = this.nativeAudioPlayer.currentTime || 0;
      const sentenceProgress = Math.max(0, Math.min(1, (currentTime - stnStart) / stnDuration));
      const progressX = sentenceProgress * width;

      // 2. Draw A-B Loop Box (Semi-transparent cyan) or Start Marker [A]
      if (this.loopStart !== null) {
        const x1 = Math.max(0, Math.min(width, ((this.loopStart - stnStart) / stnDuration) * width));
        if (this.loopEnd !== null) {
          const x2 = Math.max(0, Math.min(width, ((this.loopEnd - stnStart) / stnDuration) * width));

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
          // [A] starting point only, waiting for ]
          ctx.save();
          ctx.strokeStyle = 'rgb(0, 255, 204)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(x1, 0); ctx.lineTo(x1, height);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = 'rgb(0, 255, 204)';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('[A] 시작점', Math.min(width - 65, x1 + 4), 14);
        }
      }

      // 3. Draw Range Drag Selection Preview
      if (this.isCanvasMouseDown && this.isRangeDragging && this.dragStartX !== null && this.currentMouseX !== null) {
        const x1 = Math.min(this.dragStartX, this.currentMouseX);
        const x2 = Math.max(this.dragStartX, this.currentMouseX);
        ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
        ctx.fillRect(x1, 0, x2 - x1, height);
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x1, 0, x2 - x1, height);
      }

      // 4. Draw Symmetrical Neon Mint Waveform Bars for Active Sentence
      const bars = this.getSentencePeaks(this.activeSentenceIndex);
      const totalBars = bars.length || 360;
      const barWidth = Math.max(1.8, (width / totalBars) * 0.72);

      for (let i = 0; i < totalBars; i++) {
        const bx = (i / totalBars) * width;
        const peak = bars[i] || 0.12;
        const bh = Math.max(2, peak * (height / 2) * 0.88);

        if (bx <= progressX) {
          // High-brightness Neon Mint highlight
          ctx.fillStyle = 'rgb(0, 255, 204)';
          ctx.shadowColor = 'rgba(0, 255, 204, 0.75)';
          ctx.shadowBlur = 4;
        } else {
          // Muted Neon Mint
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

      // 5. Draw Playhead (White vertical line + top/bottom dots)
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

      // 5.5 Sleek Sentence Unit Badge in Waveform (Top Left Badge)
      if (activeStn && this.sentenceList && this.sentenceList.length > 0) {
        ctx.shadowBlur = 0;
        const badgeText = `SENTENCE S${this.activeSentenceIndex + 1}/${this.sentenceList.length} (${this.formatPreciseTime(stnStart)} ~ ${this.formatPreciseTime(stnEnd)})`;
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

      // 6. Shadowing 0.5s pause indicator overlay
      if (this.isShadowingWaiting) {
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

    startWaveformPlaybackLoop() {
      if (this.waveformAnimFrame) cancelAnimationFrame(this.waveformAnimFrame);
      const loop = () => {
        if (!this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
          this.updateAudioProgress();
          this.checkLoopBoundary();
          this.drawWaveform();
          this.waveformAnimFrame = requestAnimationFrame(loop);
        } else {
          this.updateAudioProgress();
          this.drawWaveform();
        }
      };
      this.waveformAnimFrame = requestAnimationFrame(loop);
    }

    checkLoopBoundary() {
      if (this.loopStart !== null && this.loopEnd !== null && !this.isShadowingWaiting) {
        const cur = this.nativeAudioPlayer.currentTime;
        if (cur >= this.loopEnd) {
          this.nativeAudioPlayer.pause();
          this.currentLoopCount++;
          this.updateLoopBadge();

          if (this.targetLoopCount !== Infinity && this.currentLoopCount >= this.targetLoopCount) {
            this.showToast(`🔁 구간 ${this.targetLoopCount}회 반복 재생이 완료되었습니다.`);
            this.updatePlayPauseIcon(false);
            this.drawWaveform();

            // Auto-advance to next sentence if enabled
            if (this.isAutoAdvance && this.sentenceList && this.activeSentenceIndex < this.sentenceList.length - 1) {
              this.showToast('⏭️ 0.8초 후 다음 문장으로 자동 이동합니다...');
              setTimeout(() => {
                this.nextSentence();
              }, 800);
            }
          } else {
            // 0.5초 무음 대기 간격 (500ms)
            this.isShadowingWaiting = true;
            if (this.shadowingIndicator) this.shadowingIndicator.classList.remove('hidden');
            this.drawWaveform();

            clearTimeout(this.shadowTimer);
            this.shadowTimer = setTimeout(() => {
              this.isShadowingWaiting = false;
              if (this.shadowingIndicator) this.shadowingIndicator.classList.add('hidden');
              if (this.loopStart !== null) {
                this.nativeAudioPlayer.currentTime = this.loopStart;
                this.nativeAudioPlayer.play().then(() => {
                  this.updatePlayPauseIcon(true);
                  this.startWaveformPlaybackLoop();
                  if (this.isSynthesizedAudio && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const textToSpeak = this.lastRawEnglish || this.inputEnglish.value.trim();
                    const utter = new SpeechSynthesisUtterance(textToSpeak);
                    utter.lang = 'en-US';
                    utter.rate = 0.95;
                    window.speechSynthesis.speak(utter);
                  }
                }).catch(e => console.error(e));
              }
            }, 500);
          }
        }
      } else {
        // When loop is not active, bound playback strictly to current sentence end
        const activeStn = (this.sentenceList && this.sentenceList.length > 0)
          ? this.sentenceList[this.activeSentenceIndex]
          : null;
        if (activeStn && activeStn.audioEnd !== null && !this.isShadowingWaiting) {
          const cur = this.nativeAudioPlayer.currentTime;
          if (cur >= activeStn.audioEnd) {
            this.nativeAudioPlayer.pause();
            this.updatePlayPauseIcon(false);
            this.drawWaveform();
            if (this.isAutoAdvance && this.sentenceList && this.activeSentenceIndex < this.sentenceList.length - 1) {
              this.showToast('⏭️ 다음 문장으로 자동 이동합니다...');
              setTimeout(() => {
                this.nextSentence();
              }, 600);
            }
          }
        }
      }
    }

    setLoopRange(start, end) {
      if (Math.abs(end - start) < 0.2) return;
      this.loopStart = Math.min(start, end);
      this.loopEnd = Math.max(start, end);
      this.currentLoopCount = 0;
      this.isShadowingWaiting = false;
      clearTimeout(this.shadowTimer);
      if (this.shadowingIndicator) this.shadowingIndicator.classList.add('hidden');

      this.updateLoopBadge();
      this.nativeAudioPlayer.currentTime = this.loopStart;
      this.nativeAudioPlayer.play().then(() => {
        this.updatePlayPauseIcon(true);
        this.startWaveformPlaybackLoop();
        if (this.isSynthesizedAudio && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const textToSpeak = this.lastRawEnglish || this.inputEnglish.value.trim();
          const utter = new SpeechSynthesisUtterance(textToSpeak);
          utter.lang = 'en-US';
          utter.rate = 0.95;
          window.speechSynthesis.speak(utter);
        }
      }).catch(e => console.error(e));

      const countStr = this.targetLoopCount === Infinity ? '무한' : `${this.targetLoopCount}회`;
      this.showToast(`🔁 A-B 루프 설정: ${this.formatPreciseTime(this.loopStart)} ~ ${this.formatPreciseTime(this.loopEnd)} (${countStr} 반복)`);
      this.drawWaveform();
    }

    clearLoopRange() {
      this.loopStart = null;
      this.loopEnd = null;
      this.currentLoopCount = 0;
      this.isShadowingWaiting = false;
      clearTimeout(this.shadowTimer);
      if (this.shadowingIndicator) this.shadowingIndicator.classList.add('hidden');
      if (this.loopStatusBadge) this.loopStatusBadge.classList.add('hidden');
      this.drawWaveform();
    }

    updateLoopBadge() {
      if (!this.loopStatusBadge) return;
      if (this.loopStart !== null && this.loopEnd !== null) {
        this.loopStatusBadge.classList.remove('hidden');
        this.loopRangeLabel.textContent = `루프: ${this.formatPreciseTime(this.loopStart)} ~ ${this.formatPreciseTime(this.loopEnd)}`;
        const targetStr = this.targetLoopCount === Infinity ? '∞' : this.targetLoopCount;
        this.loopCountLabel.textContent = `(${Math.min(this.currentLoopCount + 1, this.targetLoopCount || 1)}/${targetStr}회)`;
      } else {
        this.loopStatusBadge.classList.add('hidden');
      }
    }

    /**
     * Shortcut Method: Space - togglePlayPause
     * 현재 문장 오디오를 재생하거나 일시정지합니다. 구간이 선택되어 있으면 해당 구간을 재생합니다.
     */
    togglePlayPause() {
      this.toggleAudioPlayback();
    }

    /**
     * Shortcut Method: [ - setRegionStartFromCurrentTime
     * 현재 오디오 재생 위치(currentTime)를 A-B 반복 재생 시작점으로 지정합니다.
     */
    setRegionStartFromCurrentTime() {
      if (!this.nativeAudioPlayer.src) {
        this.showToast('⚠️ 재생 가능한 오디오가 없습니다.');
        return;
      }
      const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;
      this.loopStart = cur;

      if (this.loopEnd !== null && this.loopEnd <= this.loopStart) {
        this.loopEnd = null;
      }

      if (this.loopEnd !== null) {
        this.setLoopRange(this.loopStart, this.loopEnd);
        this.showToast(`🚩 [A] 시작점 설정: ${this.formatPreciseTime(this.loopStart)} (루프: ${this.formatPreciseTime(this.loopStart)} ~ ${this.formatPreciseTime(this.loopEnd)})`);
      } else {
        this.currentLoopCount = 0;
        this.updateLoopBadge();
        if (this.loopStatusBadge) {
          this.loopStatusBadge.classList.remove('hidden');
          this.loopRangeLabel.textContent = `시작점 [A]: ${this.formatPreciseTime(this.loopStart)} ~ (']' 끝점 대기)`;
          this.loopCountLabel.textContent = '';
        }
        this.drawWaveform();
        this.showToast(`🚩 [A] 시작점 설정: ${this.formatPreciseTime(this.loopStart)} (']' 키를 눌러 끝점을 확정하세요)`);
      }
    }

    /**
     * Shortcut Method: ] - setRegionEndFromCurrentTime
     * 현재 오디오 재생 위치를 반복 구간 끝점으로 확정하고 즉시 구간 N회 반복 재생(A-B Looper)을 시작합니다.
     */
    setRegionEndFromCurrentTime() {
      if (!this.nativeAudioPlayer.src) {
        this.showToast('⚠️ 재생 가능한 오디오가 없습니다.');
        return;
      }
      const cur = Math.round((this.nativeAudioPlayer.currentTime || 0) * 10) / 10;

      const activeStn = (this.sentenceList && this.sentenceList.length > 0)
        ? this.sentenceList[this.activeSentenceIndex]
        : null;
      const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;

      let start = this.loopStart !== null ? this.loopStart : stnStart;
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
      const countStr = this.targetLoopCount === Infinity ? '무한' : `${this.targetLoopCount}회`;
      this.showToast(`🏁 [B] 끝점 확정: ${this.formatPreciseTime(end)} ➔ A-B 구간(${this.formatPreciseTime(start)} ~ ${this.formatPreciseTime(end)}) ${countStr} 반복 시작!`);
    }

    /**
     * Shortcut Method: \ (￦) - clearSelectedRegion
     * 설정된 반복 구간 파형 하이라이트를 즉시 제거하고 기본 전체 문장 모드로 복귀합니다.
     */
    clearSelectedRegion() {
      this.clearLoopRange();
      this.showToast('🔄 반복 구간이 해제되어 문장 전체 모드로 복귀했습니다.');
    }

    /**
     * Shortcut Method: R - startRegionLoop
     * 지정된 구간의 N회 반복(기본 3회, 0.5초 무음 대기 간격) 재생 엔진을 가동합니다.
     */
    startRegionLoop() {
      if (!this.nativeAudioPlayer.src) {
        this.showToast('⚠️ 재생 가능한 오디오가 없습니다.');
        return;
      }

      const activeStn = (this.sentenceList && this.sentenceList.length > 0)
        ? this.sentenceList[this.activeSentenceIndex]
        : null;

      if (this.loopStart !== null && this.loopEnd !== null) {
        this.currentLoopCount = 0;
        this.isShadowingWaiting = false;
        clearTimeout(this.shadowTimer);
        if (this.shadowingIndicator) this.shadowingIndicator.classList.add('hidden');
        this.updateLoopBadge();

        this.nativeAudioPlayer.currentTime = this.loopStart;
        this.nativeAudioPlayer.play().then(() => {
          this.updatePlayPauseIcon(true);
          this.startWaveformPlaybackLoop();
          if (this.isSynthesizedAudio && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const textToSpeak = this.lastRawEnglish || this.inputEnglish.value.trim();
            const utter = new SpeechSynthesisUtterance(textToSpeak);
            utter.lang = 'en-US';
            utter.rate = 0.95;
            window.speechSynthesis.speak(utter);
          }
        }).catch(e => console.error(e));

        const countStr = this.targetLoopCount === Infinity ? '무한' : `${this.targetLoopCount}회`;
        this.showToast(`🔁 구간 반복 재생 시작: ${this.formatPreciseTime(this.loopStart)} ~ ${this.formatPreciseTime(this.loopEnd)} (${countStr})`);
      } else if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null) {
        this.setLoopRange(activeStn.audioStart, activeStn.audioEnd);
        this.showToast(`🔁 S${this.activeSentenceIndex + 1} 문장 구간 반복 재생을 시작합니다.`);
      } else {
        const dur = this.nativeAudioPlayer.duration || 1;
        this.setLoopRange(0, dur);
        this.showToast('🔁 전체 오디오 구간 반복 재생을 시작합니다.');
      }
    }

    seekAudio(time) {
      this.nativeAudioPlayer.currentTime = Math.max(0, Math.min(this.nativeAudioPlayer.duration || time, time));
      this.updateAudioProgress();
      this.drawWaveform();
    }

    removeAudioFile() {
      if (this.uploadedAudioUrl) {
        URL.revokeObjectURL(this.uploadedAudioUrl);
        this.uploadedAudioUrl = null;
      }
      this.uploadedAudioFile = null;
      this.isSynthesizedAudio = false;
      this.nativeAudioPlayer.pause();
      this.nativeAudioPlayer.src = '';
      this.nativeAudioPlayer.muted = false;
      this.isPlayingAudio = false;
      this.updatePlayPauseIcon(false);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      this.clearLoopRange();
      this.audioFileInput.value = '';
      this.audioFileName.textContent = '음성 재생 준비 완료 (스크립트 입력 시 자동 연동)';
      this.audioFileSize.textContent = '00:00.0 (Web Audio)';
      this.audioDuration.textContent = '00:00.0';
      this.audioCurrentTime.textContent = '00:00.0';

      this.generateFallbackPeaks();
      this.drawWaveform();

      if (this.currentMode !== 'text') {
        this.audioDropArea.classList.remove('hidden');
      }
      this.showToast('오디오가 초기화되었습니다.');
    }

    toggleAudioPlayback() {
      if (!this.nativeAudioPlayer.src) return;

      if (this.nativeAudioPlayer.paused) {
        const activeStn = (this.sentenceList && this.sentenceList.length > 0)
          ? this.sentenceList[this.activeSentenceIndex]
          : null;
        const totalDuration = this.nativeAudioPlayer.duration || 1;
        const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
        const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : totalDuration;

        // If outside loop range or sentence range, seek to loopStart / stnStart
        if (this.loopStart !== null && this.loopEnd !== null) {
          if (this.nativeAudioPlayer.currentTime < this.loopStart || this.nativeAudioPlayer.currentTime >= this.loopEnd) {
            this.nativeAudioPlayer.currentTime = this.loopStart;
          }
        } else if (activeStn && activeStn.audioStart !== null && activeStn.audioEnd !== null) {
          if (this.nativeAudioPlayer.currentTime < stnStart || this.nativeAudioPlayer.currentTime >= stnEnd) {
            this.nativeAudioPlayer.currentTime = stnStart;
          }
        }

        this.nativeAudioPlayer.play().then(() => {
          this.updatePlayPauseIcon(true);
          this.startWaveformPlaybackLoop();
          if (this.isSynthesizedAudio && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const textToSpeak = this.lastRawEnglish || this.inputEnglish.value.trim();
            const utter = new SpeechSynthesisUtterance(textToSpeak);
            utter.lang = 'en-US';
            utter.rate = 0.95;
            window.speechSynthesis.speak(utter);
          }
        }).catch(err => {
          console.error(err);
        });
      } else {
        this.nativeAudioPlayer.pause();
        this.updatePlayPauseIcon(false);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    }

    updatePlayPauseIcon(isPlaying) {
      this.isPlayingAudio = isPlaying;
      if (isPlaying) {
        this.playIcon.innerHTML = `
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        `;
      } else {
        this.playIcon.innerHTML = `
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
      }
    }

    onAudioLoaded() {
      const dur = this.nativeAudioPlayer.duration || 0;
      const activeStn = (this.sentenceList && this.sentenceList.length > 0)
        ? this.sentenceList[this.activeSentenceIndex]
        : null;
      if (activeStn && activeStn.audioEnd !== null) {
        this.audioDuration.textContent = this.formatPreciseTime(activeStn.audioEnd);
      } else {
        this.audioDuration.textContent = this.formatPreciseTime(dur);
      }
      this.drawWaveform();
    }

    updateAudioProgress() {
      const cur = this.nativeAudioPlayer.currentTime || 0;
      this.audioCurrentTime.textContent = this.formatPreciseTime(cur);

      const activeStn = (this.sentenceList && this.sentenceList.length > 0)
        ? this.sentenceList[this.activeSentenceIndex]
        : null;
      if (activeStn && activeStn.audioEnd !== null) {
        this.audioDuration.textContent = this.formatPreciseTime(activeStn.audioEnd);
      } else {
        this.audioDuration.textContent = this.formatPreciseTime(this.nativeAudioPlayer.duration || 0);
      }
    }

    onAudioEnded() {
      this.updatePlayPauseIcon(false);
      this.audioCurrentTime.textContent = '00:00.0';
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.drawWaveform();
    }

    setPlaybackSpeed(speed, activeBtn) {
      this.nativeAudioPlayer.playbackRate = speed;
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
      this.showToast(`재생 속도: ${speed}x`);
    }

    formatPreciseTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00.0';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 10);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
    }

    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * Read uploaded file as base64 string
     */
    readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    toggleRowVisibility(rowId) {
      const rowEl = document.getElementById(rowId);
      if (!rowEl) return;
      const isCurrentlyHidden = rowEl.classList.contains('row-hidden');
      this.setRowVisibility(rowId, isCurrentlyHidden);
    }

    setRowVisibility(rowId, makeVisible) {
      const rowEl = document.getElementById(rowId);
      if (!rowEl) return;
      const btn = rowEl.querySelector('.btn-toggle-vis');
      const iconSpan = btn ? btn.querySelector('.vis-icon') : null;
      const labelSpan = btn ? btn.querySelector('.vis-label') : null;

      if (makeVisible) {
        rowEl.classList.remove('row-hidden');
        if (iconSpan) iconSpan.textContent = '👁️';
        if (labelSpan) labelSpan.textContent = '숨기기';
      } else {
        rowEl.classList.add('row-hidden');
        if (iconSpan) iconSpan.textContent = '🙈';
        if (labelSpan) labelSpan.textContent = '보이기';
      }
    }

    initTheme() {
      const savedTheme = localStorage.getItem('chunklingo_theme') || 'dark';
      document.body.setAttribute('data-theme', savedTheme);
      this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
      const current = document.body.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('chunklingo_theme', next);
      this.updateThemeIcon(next);
    }

    updateThemeIcon(theme) {
      if (theme === 'light') {
        this.themeIconSun.innerHTML = `
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        `;
        this.btnThemeToggle.setAttribute('title', '다크 모드로 전환');
      } else {
        this.themeIconSun.innerHTML = `
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path>
          <path d="m17.66 17.66 1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="m6.34 17.66-1.41 1.41"></path>
          <path d="m19.07 4.93-1.41 1.41"></path>
        `;
        this.btnThemeToggle.setAttribute('title', '라이트 모드로 전환');
      }
    }

    updateEngineBadge() {
      if (this.chkUseAI.checked && this.aiEngine.hasKey()) {
        const providerName = this.aiEngine.provider === 'gemini' ? 'Gemini 1.5' : 'GPT-4o mini';
        this.engineLabel.textContent = `AI FELS 모드 (${providerName})`;
      } else {
        this.engineLabel.textContent = '스마트 FELS 규칙 엔진 (즉시 실행)';
      }
    }

    openSettingsModal() {
      this.populateSettingsFields();
      this.settingsModal.classList.remove('hidden');
    }

    closeSettingsModal() {
      this.settingsModal.classList.add('hidden');
    }

    populateSettingsFields() {
      this.selectProvider.value = this.aiEngine.provider;
      this.inputApiKey.value = this.aiEngine.apiKey;
      this.inputCustomPrompt.value = this.aiEngine.customPrompt;
    }

    showToast(message) {
      this.toastEl.textContent = message;
      this.toastEl.classList.remove('hidden');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 3000);
    }

    /**
     * Automatic Sentence Splitting Engine
     * Splits text into individual sentences while preserving abbreviations and decimals.
     */
    splitIntoSentences(text) {
      if (!text) return [];
      const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie', 'u.s', 'e.g', 'i.e'];
      let processed = text.replace(/(\d+)\.(\d+)/g, '$1__DECIMAL_DOT__$2');
      abbreviations.forEach(abbr => {
        const re = new RegExp('\\b' + abbr.replace('.', '\\.') + '\\.', 'gi');
        processed = processed.replace(re, match => match.slice(0, -1) + '__ABBR_DOT__');
      });
      const parts = processed.split(/(?<=[.?!])\s+|\n+/);
      return parts
        .map(p => p.replace(/__DECIMAL_DOT__/g, '.').replace(/__ABBR_DOT__/g, '.').trim())
        .filter(Boolean);
    }

    /**
     * Audio Sentence Boundary Detection Engine
     * Combines Web Audio API PCM RMS energy silence detection with proportional time fallback.
     */
    detectAudioSentenceBoundaries(sentences) {
      if (!sentences || !sentences.length) return [];
      const duration = (this.nativeAudioPlayer && this.nativeAudioPlayer.duration && !isNaN(this.nativeAudioPlayer.duration))
        ? this.nativeAudioPlayer.duration
        : (this.audioBuffer ? this.audioBuffer.duration : 0);

      if (!duration || duration <= 0) {
        return sentences.map(() => ({ start: null, end: null }));
      }

      if (sentences.length === 1) {
        return [{ start: 0, end: Math.round(duration * 10) / 10 }];
      }

      // Step 1: Attempt PCM RMS silence dip detection if audioBuffer exists
      if (this.audioBuffer) {
        try {
          const rawData = this.audioBuffer.getChannelData(0);
          const sampleRate = this.audioBuffer.sampleRate;
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
      return this.proportionalSentenceBoundaries(sentences, duration);
    }

    proportionalSentenceBoundaries(sentences, totalDuration) {
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

    /**
     * Render Sentence Navigator UI
     */
    renderSentenceNavigator() {
      if (!this.sentenceNavigator) return;

      if (!this.sentenceList || this.sentenceList.length === 0) {
        this.sentenceNavigator.classList.add('hidden');
        return;
      }

      this.sentenceNavigator.classList.remove('hidden');
      this.totalSentenceCount.textContent = this.sentenceList.length;
      this.currentSentenceIndicator.textContent = `${this.activeSentenceIndex + 1} / ${this.sentenceList.length}`;

      if (this.btnPrevSentence) {
        this.btnPrevSentence.disabled = this.activeSentenceIndex <= 0;
      }
      if (this.btnNextSentence) {
        this.btnNextSentence.disabled = this.activeSentenceIndex >= this.sentenceList.length - 1;
      }

      // Populate sentence chips
      this.sentenceChipsTrack.innerHTML = '';
      this.sentenceList.forEach((stn, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `sentence-chip-item ${idx === this.activeSentenceIndex ? 'active' : ''}`;

        let timeLabel = '';
        if (stn.audioStart !== null && stn.audioEnd !== null) {
          timeLabel = `<span class="chip-time">${this.formatPreciseTime(stn.audioStart)} ~ ${this.formatPreciseTime(stn.audioEnd)}</span>`;
        }

        chip.innerHTML = `
          <span class="chip-num">S${idx + 1}</span>
          ${timeLabel}
          <span class="chip-preview">${this.escapeHtml(stn.text)}</span>
        `;

        chip.addEventListener('click', () => {
          this.selectSentence(idx);
        });

        this.sentenceChipsTrack.appendChild(chip);
      });

      const activeChip = this.sentenceChipsTrack.children[this.activeSentenceIndex];
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    /**
     * Select and focus a specific sentence
     */
    async selectSentence(idx) {
      if (!this.sentenceList || idx < 0 || idx >= this.sentenceList.length) return;
      this.activeSentenceIndex = idx;

      const targetStn = this.sentenceList[idx];

      // If chunk translation is not yet cached for this sentence, process it
      if (!targetStn.result) {
        if (this.chkUseAI.checked && this.aiEngine.hasKey()) {
          try {
            targetStn.result = await this.aiEngine.translate(targetStn.text);
          } catch (e) {
            targetStn.result = this.ruleEngine.process(targetStn.text);
          }
        } else {
          targetStn.result = this.ruleEngine.process(targetStn.text);
        }
      }

      this.lastResult = targetStn.result;
      this.lastRawEnglish = targetStn.text;
      this.isFelsMode = true;
      this.updateFelsModeButtonUI();

      // Render 3x1 FELS Cards & Translation for this sentence
      this.renderResults(targetStn.result, targetStn.text);

      // Synchronize Audio A-B Looper to sentence interval
      if (targetStn.audioStart !== null && targetStn.audioEnd !== null && this.nativeAudioPlayer.src) {
        this.setLoopRange(targetStn.audioStart, targetStn.audioEnd);
        const dur = (targetStn.audioEnd - targetStn.audioStart).toFixed(1);
        this.audioFileSize.textContent = `S${idx + 1} 문장 구간: ${this.formatPreciseTime(targetStn.audioStart)} ~ ${this.formatPreciseTime(targetStn.audioEnd)} (${dur}초)`;
      } else {
        this.drawWaveform();
      }

      this.renderSentenceNavigator();
    }

    prevSentence() {
      if (this.activeSentenceIndex > 0) {
        this.selectSentence(this.activeSentenceIndex - 1);
        this.showToast(`◀ 이전 문장 (S${this.activeSentenceIndex + 1})으로 이동했습니다.`);
      }
    }

    nextSentence() {
      if (this.sentenceList && this.activeSentenceIndex < this.sentenceList.length - 1) {
        this.selectSentence(this.activeSentenceIndex + 1);
        this.showToast(`다음 문장 (S${this.activeSentenceIndex + 1}) ▶ 으로 이동했습니다.`);
      }
    }

    async handleTranslate() {
      // Check Mode 2: MP3 Only
      if (this.currentMode === 'audio') {
        if (!this.uploadedAudioFile) {
          this.showToast('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
          return;
        }

        if (!this.aiEngine.hasKey()) {
          this.showToast('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 API 키를 입력하세요.');
          this.openSettingsModal();
          return;
        }

        this.setLoading(true);
        try {
          const base64Audio = await this.readFileAsBase64(this.uploadedAudioFile);
          const mimeType = this.uploadedAudioFile.type || 'audio/mp3';
          const aiResult = await this.aiEngine.transcribeAndTranslateAudio(base64Audio, mimeType);

          const scriptText = aiResult.script || '';
          this.inputEnglish.value = scriptText;
          this.charCount.textContent = `${scriptText.length}자`;

          // Automatic Sentence Classification for extracted STT script
          const rawSentences = this.splitIntoSentences(scriptText);
          const boundaries = this.detectAudioSentenceBoundaries(rawSentences);

          this.sentenceList = rawSentences.map((stnText, idx) => ({
            index: idx,
            text: stnText,
            audioStart: boundaries[idx]?.start ?? null,
            audioEnd: boundaries[idx]?.end ?? null,
            result: idx === 0 ? aiResult : null
          }));

          this.activeSentenceIndex = 0;
          this.renderSentenceNavigator();
          await this.selectSentence(0);

          this.addToHistory(scriptText, aiResult);
          this.showToast(`✨ MP3 스크립트 추출 및 총 ${rawSentences.length}개 문장 자동 분류 완료!`);
        } catch (err) {
          console.error(err);
          this.showToast(`❌ 음성 추출 오류: ${err.message}`);
        } finally {
          this.setLoading(false);
        }
        return;
      }

      // Mode 1 (Both) or Mode 3 (Text)
      const text = this.inputEnglish.value.trim();
      if (!text) {
        this.showToast('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
        this.inputEnglish.focus();
        return;
      }

      this.setLoading(true);

      try {
        // Requirement: script만 입력해도 음성 합성해서 wave 창을 보여줘야 해
        if (!this.uploadedAudioFile || this.isSynthesizedAudio) {
          await this.synthesizeAudioFromScript(text);
        }

        // Automatic Sentence Classification for Script Input
        const rawSentences = this.splitIntoSentences(text);
        if (rawSentences.length === 0) {
          rawSentences.push(text);
        }

        const boundaries = this.detectAudioSentenceBoundaries(rawSentences);

        this.sentenceList = rawSentences.map((stnText, idx) => ({
          index: idx,
          text: stnText,
          audioStart: boundaries[idx]?.start ?? null,
          audioEnd: boundaries[idx]?.end ?? null,
          result: null
        }));

        this.activeSentenceIndex = 0;
        this.renderSentenceNavigator();
        await this.selectSentence(0);

        if (this.uploadedAudioFile && !this.isSynthesizedAudio && this.currentMode === 'both') {
          this.showToast(`✨ 총 ${rawSentences.length}개 문장 및 오디오 구간이 자동 분류되었습니다.`);
        } else {
          this.showToast(`✨ 총 ${rawSentences.length}개 문장 자동 분류 & 음성 파형 연동 완료!`);
        }
      } catch (err) {
        console.error('Translation error:', err);
        this.showToast(`❌ 오류: ${err.message}`);
      } finally {
        this.setLoading(false);
      }
    }

    setLoading(isLoading) {
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
        const btnLabel = this.currentMode === 'audio' 
          ? '🎙️ 음성에서 스크립트 추출 및 3x1 생성' 
          : (this.currentMode === 'both' ? '3x1 생성 및 음성 연동' : '3x1 해석 및 FELS 생성');
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

    renderResults(result, originalText) {
      const chunks = result.chunks || [];
      const uniformBlankWidth = this.calculateUniformBlankWidth(chunks);

      this.renderChunkCards(chunks, uniformBlankWidth);

      this.txtNatural.textContent = result.natural || '';
      this.txtNatural.classList.remove('placeholder-text');

      this.felsScoreBar.classList.add('hidden');

      // Requirement 4: default 값은 우리말 해석이 보이면 안돼
      this.setRowVisibility('rowNatural', false);

      requestAnimationFrame(() => {
        this.computeAndApplyStabilizedWidths();
      });
    }

    calculateUniformBlankWidth(chunks) {
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

    /**
     * Render Unified Row 1: 3D Flip Chunk Cards with Draggable '||' Rechunking
     * Allows user to modify chunk boundaries by dragging '||' dividers between words.
     */
    renderChunkCards(chunks, uniformWidth) {
      this.chunksContainer.innerHTML = '';
      this.felsBlanks = [];
      this.areAllCardsFlipped = false;
      this.updateFlipAllButtonUI();

      if (!chunks.length) {
        this.chunksContainer.innerHTML = '<span class="placeholder-text">청크 정보가 없습니다.</span>';
        return;
      }

      // Collect all tokens for accurate global gap tracking
      const allTokens = chunks.flatMap(c => (c.en || '').trim().split(/\s+/).filter(Boolean));
      const totalWords = allTokens.length;
      let globalWordIdxFels = 0;
      let globalWordIdxOrig = 0;

      this.draggingDividerIndex = null;
      this.selectedDividerForMove = null;

      chunks.forEach((chunk, idx) => {
        // Draggable '||' Chunk Divider between cards
        if (idx > 0) {
          const dividerIdx = idx - 1;
          const divider = document.createElement('div');
          divider.className = 'chunk-divider';
          divider.draggable = true;
          divider.setAttribute('data-divider-idx', dividerIdx);
          divider.title = "마우스로 드래그하여 다른 단어 사이로 '||'를 이동하세요 (클릭하여 이동도 가능)";
          divider.innerHTML = `<span class="divider-grip">⋮⋮</span><span class="divider-symbol">||</span>`;

          divider.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', String(dividerIdx));
            e.dataTransfer.effectAllowed = 'move';
            this.draggingDividerIndex = dividerIdx;
            divider.classList.add('dragging');
            this.chunksContainer.classList.add('divider-dragging-active');
          });

          divider.addEventListener('dragend', () => {
            this.draggingDividerIndex = null;
            divider.classList.remove('dragging');
            this.chunksContainer.classList.remove('divider-dragging-active');
            this.chunksContainer.querySelectorAll('.chunk-drop-slot').forEach(s => s.classList.remove('drop-target-active'));
          });

          // Click-to-move support for mobile and mouse users
          divider.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedDividerForMove === dividerIdx) {
              this.selectedDividerForMove = null;
              divider.classList.remove('selected-for-move');
              this.chunksContainer.classList.remove('divider-dragging-active');
              this.showToast('청크 구분자 이동이 취소되었습니다.');
            } else {
              this.chunksContainer.querySelectorAll('.chunk-divider').forEach(d => d.classList.remove('selected-for-move'));
              this.selectedDividerForMove = dividerIdx;
              divider.classList.add('selected-for-move');
              this.chunksContainer.classList.add('divider-dragging-active');
              this.showToast(`'${idx}번째 ||' 선택됨: 이동할 단어 사이의 슬롯을 클릭하거나 드래그하세요.`);
            }
          });

          this.chunksContainer.appendChild(divider);
        }

        const card = document.createElement('div');
        card.className = 'chunk-card-3d';
        card.setAttribute('data-idx', idx);

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        // 1) FRONT FACE: English / FELS Weak-Form Blanks
        const frontFace = document.createElement('div');
        frontFace.className = 'card-face card-front';

        const frontTop = document.createElement('div');
        frontTop.className = 'card-top-bar';
        frontTop.innerHTML = `
          <span class="face-flip-btn" title="클릭하여 뒤집기">🔄</span>
        `;

        const felsWrap = document.createElement('div');
        felsWrap.className = 'chunk-tokens-wrap chunk-tokens-fels';
        if (!this.isFelsMode) felsWrap.style.display = 'none';

        const words = (chunk.en || '').trim().split(/\s+/).filter(Boolean);
        words.forEach((word) => {
          const felsInfo = getFelsInfo(word);

          if (felsInfo) {
            const inputWrap = document.createElement('div');
            inputWrap.className = 'fels-input-wrap';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'fels-input';
            input.setAttribute('data-answer', felsInfo.clean);
            input.setAttribute('data-original', word);
            input.setAttribute('data-category', felsInfo.label);
            input.placeholder = '[   ]';
            input.style.width = `${Math.max(62, felsInfo.clean.length * 12 + 20)}px`;
            input.spellcheck = false;
            input.autocomplete = 'off';

            const trailingPunct = word.match(/[.,!?;:]+$/);
            const punctStr = trailingPunct ? trailingPunct[0] : '';

            inputWrap.appendChild(input);
            if (punctStr) {
              const punctSpan = document.createElement('span');
              punctSpan.textContent = punctStr;
              inputWrap.appendChild(punctSpan);
            }

            felsWrap.appendChild(inputWrap);

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

          // Add drop slot between words inside chunk (except after the sentence's final word)
          if (globalWordIdxFels < totalWords - 1) {
            const slot = this.createDropSlot(globalWordIdxFels, allTokens, chunks);
            felsWrap.appendChild(slot);
          }
          globalWordIdxFels++;
        });

        // Original English Text Container
        const origWrap = document.createElement('div');
        origWrap.className = 'chunk-tokens-original';
        if (this.isFelsMode) origWrap.style.display = 'none';

        words.forEach((word) => {
          const origSpan = document.createElement('span');
          origSpan.className = 'orig-word-span';
          origSpan.textContent = word;
          origWrap.appendChild(origSpan);

          if (globalWordIdxOrig < totalWords - 1) {
            const slot = this.createDropSlot(globalWordIdxOrig, allTokens, chunks);
            origWrap.appendChild(slot);
          }
          globalWordIdxOrig++;
        });

        frontFace.appendChild(frontTop);
        frontFace.appendChild(felsWrap);
        frontFace.appendChild(origWrap);

        // 2) BACK FACE: Korean Chunk (Clean minimal card, '직독직해' & badge text removed)
        const backFace = document.createElement('div');
        backFace.className = 'card-face card-back';

        const backTop = document.createElement('div');
        backTop.className = 'card-top-bar';
        backTop.innerHTML = `
          <span class="face-flip-btn" title="클릭하여 뒤집기">🔄</span>
        `;

        const koWrap = document.createElement('div');
        koWrap.className = 'ko-chunk-content';
        koWrap.textContent = chunk.ko;

        backFace.appendChild(backTop);
        backFace.appendChild(koWrap);

        inner.appendChild(frontFace);
        inner.appendChild(backFace);
        card.appendChild(inner);

        // Card Click: Flip front ↔ back (Ignore if clicking inside input or drop slot)
        card.addEventListener('click', (e) => {
          if (e.target.closest('input') || e.target.closest('.fels-input-wrap') || e.target.closest('.chunk-drop-slot')) return;
          card.classList.toggle('flipped');
        });

        this.chunksContainer.appendChild(card);
      });
    }

    /**
     * Create interactive Drop Slot between words for '||' relocation
     */
    createDropSlot(gapIdx, allTokens, chunks) {
      const slot = document.createElement('span');
      slot.className = 'chunk-drop-slot';
      slot.setAttribute('data-gap-idx', gapIdx);
      slot.title = "이곳으로 청크 구분자(||) 이동";

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drop-target-active');
      });

      slot.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        slot.classList.remove('drop-target-active');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        slot.classList.remove('drop-target-active');
        const targetGap = parseInt(slot.getAttribute('data-gap-idx'), 10);
        if (isNaN(targetGap) || this.draggingDividerIndex === null) return;
        this.moveDividerToGap(this.draggingDividerIndex, targetGap, allTokens, chunks);
      });

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedDividerForMove !== null) {
          const targetGap = parseInt(slot.getAttribute('data-gap-idx'), 10);
          this.moveDividerToGap(this.selectedDividerForMove, targetGap, allTokens, chunks);
          this.selectedDividerForMove = null;
        }
      });

      return slot;
    }

    /**
     * Move '||' divider to the target word gap and reconstruct chunks
     */
    moveDividerToGap(dividerIdx, targetGap, allTokens, oldChunks) {
      // 1. Calculate current split gaps based on oldChunks
      let curGaps = [];
      let accum = 0;
      for (let i = 0; i < oldChunks.length - 1; i++) {
        const count = (oldChunks[i].en || '').trim().split(/\s+/).filter(Boolean).length;
        accum += count;
        curGaps.push(accum - 1);
      }

      if (dividerIdx < 0 || dividerIdx >= curGaps.length) return;
      if (curGaps[dividerIdx] === targetGap) return; // No position change

      curGaps[dividerIdx] = targetGap;
      // Filter unique and sort in ascending order
      curGaps = [...new Set(curGaps)].sort((a, b) => a - b);

      // 2. Reconstruct new chunks according to the updated split gaps
      const newChunks = [];
      let startIdx = 0;
      for (let i = 0; i <= curGaps.length; i++) {
        const endIdx = i < curGaps.length ? curGaps[i] + 1 : allTokens.length;
        const chunkTokens = allTokens.slice(startIdx, endIdx);
        if (chunkTokens.length > 0) {
          const chunkEn = chunkTokens.join(' ');
          const chunkKo = this.translateCustomChunk(chunkEn, oldChunks);
          newChunks.push({ en: chunkEn, ko: chunkKo });
        }
        startIdx = endIdx;
      }

      if (newChunks.length === 0) return;

      this.lastResult.chunks = newChunks;
      this.lastResult.chunk_text = newChunks.map(c => c.ko).join(' || ');

      if (this.sentenceList && this.sentenceList[this.activeSentenceIndex]) {
        this.sentenceList[this.activeSentenceIndex].result = this.lastResult;
      }

      this.renderResults(this.lastResult, this.lastRawEnglish);
      this.showToast(`✂️ '||' 이동 완료! 청크 단위가 ${newChunks.length}개로 재조정되었습니다.`);
    }

    /**
     * Generate Korean translation for customized chunks
     */
    translateCustomChunk(chunkEn, originalChunks = []) {
      const cleanEn = chunkEn.trim();
      if (!cleanEn) return '';

      // Check if exact chunk already existed in originalChunks
      const existing = (originalChunks || []).find(c => c.en && c.en.trim().toLowerCase() === cleanEn.toLowerCase());
      if (existing && existing.ko) return existing.ko;

      // Smart rule engine chunk interpretation
      try {
        const parsed = this.ruleEngine.process(cleanEn);
        if (parsed && parsed.chunks && parsed.chunks.length > 0) {
          return parsed.chunks.map(c => c.ko).join(' ');
        }
        if (parsed && parsed.natural) {
          return parsed.natural;
        }
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

    /**
     * Compute and Lock Natural Widths per Card (Front and back match within each card)
     */
    computeAndApplyStabilizedWidths() {
      const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
      if (!cards.length) return;

      this.stabilizedWidths = [];

      cards.forEach((card, idx) => {
        card.style.width = 'auto';

        const felsWrap = card.querySelector('.chunk-tokens-fels');
        const origWrap = card.querySelector('.chunk-tokens-original');
        const koWrap = card.querySelector('.ko-chunk-content');

        let wFels = 0;
        let wOrig = 0;
        let wKo = 0;

        if (felsWrap) {
          const prevDisplay = felsWrap.style.display;
          felsWrap.style.display = 'inline-flex';
          wFels = felsWrap.scrollWidth + 36;
          felsWrap.style.display = prevDisplay;
        }

        if (origWrap) {
          const prevDisplay = origWrap.style.display;
          origWrap.style.display = 'flex';
          wOrig = origWrap.scrollWidth + 36;
          origWrap.style.display = prevDisplay;
        }

        if (koWrap) {
          wKo = koWrap.scrollWidth + 36;
        }

        const targetW = Math.ceil(Math.max(wFels, wOrig, wKo, 80));
        this.stabilizedWidths[idx] = targetW;
        card.style.width = `${targetW}px`;
      });
    }

    /**
     * Toggle FELS blanks vs Original Text (Width remains 100% constant)
     */
    toggleFelsMode() {
      if (!this.lastResult || !this.lastResult.chunks) return;

      this.isFelsMode = !this.isFelsMode;
      this.updateFelsModeButtonUI();

      const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
      cards.forEach((card, idx) => {
        const felsWrap = card.querySelector('.chunk-tokens-fels');
        const origWrap = card.querySelector('.chunk-tokens-original');

        if (felsWrap && origWrap) {
          if (this.isFelsMode) {
            felsWrap.style.display = 'inline-flex';
            origWrap.style.display = 'none';
          } else {
            felsWrap.style.display = 'none';
            origWrap.style.display = 'flex';
          }
        }

        if (this.stabilizedWidths[idx]) {
          card.style.width = `${this.stabilizedWidths[idx]}px`;
        }
      });

      this.showToast(this.isFelsMode ? '✏️ FELS 빈칸 모드로 전환되었습니다.' : '📖 원문 전체 보기 모드로 전환되었습니다.');
    }

    updateFelsModeButtonUI() {
      if (this.isFelsMode) {
        this.felsModeIcon.textContent = '🔤';
        this.felsModeLabel.textContent = '원문 보기';
      } else {
        this.felsModeIcon.textContent = '✏️';
        this.felsModeLabel.textContent = 'FELS 빈칸';
      }
    }

    /**
     * FELS: Check user answers
     */
    checkFelsAnswers() {
      if (!this.felsBlanks.length) {
        this.showToast('확인할 FELS 빈칸이 없습니다.');
        return;
      }

      if (!this.isFelsMode) {
        this.toggleFelsMode();
      }

      let correctCount = 0;
      const totalCount = this.felsBlanks.length;

      this.felsBlanks.forEach(item => {
        const userVal = item.inputEl.value.trim().toLowerCase();
        const expected = item.answer.toLowerCase();

        const parent = item.inputEl.parentElement;
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();

        if (userVal === expected) {
          correctCount++;
          item.inputEl.classList.remove('is-wrong');
          item.inputEl.classList.add('is-correct');
        } else {
          item.inputEl.classList.remove('is-correct');
          item.inputEl.classList.add('is-wrong');

          const revealBadge = document.createElement('span');
          revealBadge.className = 'fels-answer-reveal';
          revealBadge.textContent = item.answer;
          revealBadge.title = `기능어: ${item.answer}`;
          parent.appendChild(revealBadge);
        }
      });

      const percentage = Math.round((correctCount / totalCount) * 100);

      this.felsScoreText.innerHTML = `
        🎯 <strong>채점 결과:</strong> 총 ${totalCount}개 중 <strong>${correctCount}개</strong> 정답 (${percentage}%) 
        <span style="font-weight: 500; font-size: 0.8rem; margin-left: 8px;">
          ${percentage === 100 ? '🎉 완벽합니다! 약형 기능어를 모두 청취했습니다.' : '💡 오답 항목 아래 표시된 초록색 정답을 확인해보세요.'}
        </span>
      `;
      this.felsScoreBar.classList.remove('hidden');

      this.showToast(`채점 완료! 정답: ${correctCount}/${totalCount}개 (${percentage}%)`);
    }

    resetFelsInputs() {
      this.felsBlanks.forEach(item => {
        item.inputEl.value = '';
        item.inputEl.classList.remove('is-correct', 'is-wrong');
        const parent = item.inputEl.parentElement;
        const oldReveal = parent.querySelector('.fels-answer-reveal');
        if (oldReveal) oldReveal.remove();
      });
      this.felsScoreBar.classList.add('hidden');
      if (this.felsBlanks.length > 0) {
        this.felsBlanks[0].inputEl.focus();
      }
      this.showToast('빈칸이 초기화되었습니다. 다시 입력해 보세요.');
    }

    /**
     * Flip all chunk cards simultaneously (Front: English ⇄ Back: Korean Chunk)
     */
    toggleFlipAllCards() {
      const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
      if (!cards.length) return;

      this.areAllCardsFlipped = !this.areAllCardsFlipped;
      cards.forEach(card => {
        card.classList.toggle('flipped', this.areAllCardsFlipped);
      });
      this.updateFlipAllButtonUI();

      this.showToast(this.areAllCardsFlipped ? '🔄 모든 카드를 해석(뒷면)으로 뒤집었습니다.' : '🔄 모든 카드를 영어(앞면)로 뒤집었습니다.');
    }

    updateFlipAllButtonUI() {
      if (!this.flipAllLabel) return;
      if (this.areAllCardsFlipped) {
        this.flipAllLabel.textContent = '영어 앞면';
        this.flipAllIcon.textContent = '🔤';
      } else {
        this.flipAllLabel.textContent = '해석 뒷면';
        this.flipAllIcon.textContent = '🔄';
      }
    }

    copyResult(target, btn) {
      let text = '';
      if (target === 'en') {
        text = this.lastRawEnglish || this.inputEnglish.value.trim();
      } else if (target === 'chunk') {
        text = this.lastResult?.chunks ? this.lastResult.chunks.map(c => c.ko).join(' || ') : '';
      } else if (target === 'natural') {
        text = this.txtNatural.textContent;
      }

      if (!text || text.includes('영어') || text.includes('표시됩니다')) {
        this.showToast('⚠️ 복사할 내용이 없습니다.');
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        const textSpan = btn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = '완료!';
        this.showToast('📋 클립보드에 복사되었습니다.');

        setTimeout(() => {
          btn.classList.remove('copied');
          if (textSpan) textSpan.textContent = '복사';
        }, 2000);
      }).catch(() => {
        this.showToast('복사에 실패했습니다.');
      });
    }

    speakResult(target) {
      // If uploaded MP3 exists and user requests English audio in Row 1:
      if (target === 'en' && this.uploadedAudioFile && this.nativeAudioPlayer.src) {
        this.nativeAudioPlayer.currentTime = 0;
        this.nativeAudioPlayer.play().then(() => {
          this.updatePlayPauseIcon(true);
          this.showToast('🎵 첨부된 MP3 음원을 재생합니다.');
        }).catch(() => {
          this.fallbackTts(this.lastRawEnglish || this.inputEnglish.value.trim(), 'en-US');
        });
        return;
      }

      // Default Speech Synthesis TTS
      let text = '';
      let lang = 'ko-KR';

      if (target === 'en') {
        text = this.lastRawEnglish || this.inputEnglish.value.trim();
        lang = 'en-US';
      } else if (target === 'chunk') {
        text = this.lastResult?.chunks ? this.lastResult.chunks.map(c => c.ko).join(', ') : '';
        lang = 'ko-KR';
      } else if (target === 'natural') {
        text = this.txtNatural.textContent;
        lang = 'ko-KR';
      }

      if (!text || text.includes('영어') || text.includes('표시됩니다')) {
        this.showToast('⚠️ 읽을 텍스트가 없습니다.');
        return;
      }

      this.fallbackTts(text, lang);
    }

    fallbackTts(text, lang = 'ko-KR') {
      if (!('speechSynthesis' in window)) {
        this.showToast('⚠️ 현재 브라우저는 음성 재생을 지원하지 않습니다.');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  // Initialize on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    new AppController();
  });
})();
