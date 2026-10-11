// scratch/test_more_cases.js
const { alignChunksWithNatural } = require('./test_align_algorithm_fn.js');

async function runTests() {
  const cases = [
    {
      name: 'User Screenshot Case (2 chunks)',
      chunks: ['Hello, visitors', 'to Cryston Beach.'],
      natural: '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.',
      translated: ['안녕하세요 방문객 여러분', '크리스톤 비치로.']
    },
    {
      name: 'User Screenshot Case (3 chunks)',
      chunks: ['Hello,', 'visitors', 'to Cryston Beach.'],
      natural: '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.',
      translated: ['안녕하세요,', '방문객 여러분', '크리스톤 비치로.']
    },
    {
      name: 'Sentence with Relative Clause',
      chunks: ['This is the book', 'that I bought yesterday.'],
      natural: '이것은 내가 어제 산 책이다.',
      translated: ['이것은 그 책이다', '내가 어제 샀던 것.']
    },
    {
      name: 'Going to School',
      chunks: ['I went to school', 'with my friends.'],
      natural: '나는 친구들과 함께 학교에 갔다.',
      translated: ['나는 학교에 갔다', '친구들과 함께.']
    }
  ];

  for (const c of cases) {
    console.log(`\n=== [${c.name}] ===`);
    console.log('EN Chunks:', c.chunks.join(' || '));
    console.log('Natural  :', c.natural);
    const res = alignChunksWithNatural(c.chunks, c.natural, c.translated);
    console.log('Result   :', res.join(' || '));
  }
}

runTests();
