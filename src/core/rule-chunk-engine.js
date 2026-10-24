/**
 * Intelligent Rule-Based Local Chunking & Translation Engine
 * Operates offline without external API dependencies.
 */

import { PRESETS, PREPOSITIONS, ADVERBS, DICTIONARY, VERB_MAP, PRONOUNS } from '../config/fels-dict.js';

/** Own-property lookup so prototype keys like `constructor` never match a dictionary. */
function ownGet(dict, key) {
  return (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : undefined;
}

export class RuleChunkEngine {
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
        const dictVal = ownGet(DICTIONARY, token);
        if (dictVal !== undefined) {
          const koVal = cleanStr(dictVal);
          if (koVal && (cleanKo.includes(koVal) || koVal.includes(cleanKo))) return 12;
        }
        const vObj = ownGet(VERB_MAP, token);
        if (vObj !== undefined) {
          const vList = typeof vObj === 'string' ? [vObj] : Object.values(vObj || {});
          for (const vVal of vList) {
            const vKo = cleanStr(vVal);
            if (vKo && (cleanKo.includes(vKo) || vKo.includes(cleanKo))) return 11;
          }
        }
        const pObj = ownGet(PRONOUNS, token);
        if (pObj !== undefined) {
          const pList = typeof pObj === 'string' ? [pObj] : Object.values(pObj);
          for (const pVal of pList) {
            const pKo = cleanStr(pVal);
            if (pKo && (cleanKo.includes(pKo) || pKo.includes(cleanKo))) return 11;
          }
        }
        const aVal = ownGet(ADVERBS, token);
        if (aVal !== undefined) {
          const aKo = cleanStr(aVal);
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
      if (ownGet(PREPOSITIONS, word) !== undefined) {
        const prepChunk = this.extractPrepositionalPhrase(words, i);
        chunks.push(prepChunk);
        i = prepChunk.nextIndex;
        continue;
      }

      // Adverb
      const advKo = ownGet(ADVERBS, word);
      if (advKo !== undefined) {
        chunks.push({
          en: words[i],
          ko: advKo,
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

    const subjPron = ownGet(PRONOUNS, w0);
    if (subjPron) {
      return {
        en: words[startIndex],
        ko: subjPron.subj,
        type: 'subject',
        nextIndex: startIndex + 1
      };
    }

    if (w0.endsWith('ing') && this.isVerb(w0.slice(0, -3)) || ownGet(VERB_MAP, w0)) {
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
      const d = ownGet(DICTIONARY, l);
      if (d !== undefined) return d;
      const v = ownGet(VERB_MAP, l);
      if (v && v.base) return v.base.replace(/다$/, '');
      const p = ownGet(PRONOUNS, l);
      if (p) return p.poss;
      return t;
    }).filter(Boolean);

    return parts.join(' ');
  }

  translateWord(w) {
    const lower = w.toLowerCase();
    const d = ownGet(DICTIONARY, lower);
    return d !== undefined ? d : w;
  }

  isVerb(w) {
    const lower = w.toLowerCase();
    return ownGet(VERB_MAP, lower) !== undefined || ['is', 'are', 'was', 'were', 'am'].includes(lower);
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
