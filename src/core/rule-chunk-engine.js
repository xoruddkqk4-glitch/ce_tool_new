/**
 * Intelligent Rule-Based Local Chunking & Translation Engine
 * Operates offline without external API dependencies.
 */

import { PRESETS, PREPOSITIONS, ADVERBS, DICTIONARY, VERB_MAP, PRONOUNS } from '../config/fels-dict.js';

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

    const chunkWeights = chunks.map(c => Math.max(1, (c.en || '').split(/\s+/).filter(Boolean).length));
    const totalWeight = chunkWeights.reduce((a, b) => a + b, 0);

    let curWordIdx = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (i === chunks.length - 1) {
        chunks[i].ko = words.slice(curWordIdx).join(' ').trim();
      } else {
        const count = Math.max(1, Math.round(words.length * (chunkWeights[i] / totalWeight)));
        const sliceEnd = Math.min(words.length - (chunks.length - 1 - i), curWordIdx + count);
        chunks[i].ko = words.slice(curWordIdx, sliceEnd).join(' ').trim();
        curWordIdx = sliceEnd;
      }
    }
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
