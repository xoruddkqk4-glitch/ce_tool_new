// scratch/test_rule_engine_align.js
const { DICTIONARY } = require('../src/config/fels-dict.js');

const EXTRA_DICT = {
  'hello': ['안녕'],
  'hi': ['안녕'],
  'visitor': ['방문객', '방문자', '손님'],
  'visitors': ['방문객', '방문자', '여러분', '손님'],
  'beach': ['비치', '해변', '바다'],
  'beaches': ['비치', '해변', '바다'],
  'cryston': ['크리스톤']
};

function cleanStr(s) {
  return (s || '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();
}

function matchScore(enText, koWord, translatedKoChunk = '') {
  const cleanKo = cleanStr(koWord);
  if (!cleanKo) return 0;
  if (translatedKoChunk) {
    const cleanTrans = cleanStr(translatedKoChunk);
    if (cleanTrans.includes(cleanKo)) return 10;
  }
  const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
  for (const token of enTokens) {
    if (EXTRA_DICT[token]) {
      for (const root of EXTRA_DICT[token]) {
        if (cleanKo.includes(root)) return 8;
      }
    }
    if (DICTIONARY[token]) {
      const koVal = DICTIONARY[token];
      if (cleanKo.includes(koVal) || koVal.includes(cleanKo)) return 8;
    }
    if (cleanKo.includes(token)) return 6;
  }
  return 0;
}

const chunks = [
  { en: 'Hello, visitors', ko: '' },
  { en: 'to Cryston Beach.', ko: '' }
];
const natWords = '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.'.split(/\s+/);
const scores = natWords.map(w => chunks.map(c => matchScore(c.en, w, c.ko)));
console.log('Words and scores:');
natWords.forEach((w, i) => console.log(w, scores[i]));
