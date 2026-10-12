// scratch/test_text_splitter.js
// Regression tests for splitIntoSentences() / cleanPracticeSentence() (Plan Step 1-8)
import assert from 'assert';
import { splitIntoSentences, cleanPracticeSentence } from '../src/core/text-splitter.js';

// 1. Leading numbers that belong to the English sentence must be preserved
assert.deepStrictEqual(
  splitIntoSentences('20 minutes later, we left. I woke up at 7 a.m. today. 3D printers are cool.'),
  ['20 minutes later, we left.', 'I woke up at 7 a.m. today.', '3D printers are cool.']
);
assert.deepStrictEqual(splitIntoSentences('1990 was a great year.'), ['1990 was a great year.']);

// 2. Split after a closing quote that follows the terminator
assert.deepStrictEqual(
  splitIntoSentences('He said, "Hi." Then he left.'),
  ['He said, "Hi."', 'Then he left.']
);

// 3. Korean question/speaker prefixes are still stripped
assert.strictEqual(cleanPracticeSentence('1번. 남: Hello there.'), 'Hello there.');
assert.strictEqual(cleanPracticeSentence('[남] Excuse me.'), 'Excuse me.');
assert.deepStrictEqual(
  splitIntoSentences('1번. 대화를 듣고 답하시오.\nM: Hello, visitors. W: Hi!'),
  ['Hello, visitors.', 'Hi!']
);

// 4. Existing protections keep working (abbreviations, decimals, ellipsis)
assert.deepStrictEqual(
  splitIntoSentences('Dr. Kim paid 3.50 dollars. Wait... really?'),
  ['Dr. Kim paid 3.50 dollars.', 'Wait... really?']
);
assert.deepStrictEqual(
  splitIntoSentences('We met at 5 p.m. near St. James Park. It was fun.'),
  ['We met at 5 p.m. near St. James Park.', 'It was fun.']
);

console.log('✅ test_text_splitter: all assertions passed');
