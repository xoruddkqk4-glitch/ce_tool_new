// scratch/test_user_chunk_verification.js
const { RuleChunkEngine } = require('../src/core/rule-chunk-engine.js');
const { AIService } = require('../src/services/ai-service.js');

async function testUserSentence() {
  console.log('--- Testing User Sentence Chunk Alignment ---');
  const engine = new RuleChunkEngine();
  const aiService = new AIService();

  const script = 'Hello, visitors to Cryston Beach.';
  const natural = '안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분.';
  const chunks = [
    { en: 'Hello, visitors', ko: '' },
    { en: 'to Cryston Beach.', ko: '' }
  ];

  // 1. RuleChunkEngine verification
  engine.alignNaturalToChunks(chunks, natural);
  console.log('RuleChunkEngine Chunks:');
  chunks.forEach((c, i) => console.log(`  [Chunk ${i + 1}] en: "${c.en}" => ko: "${c.ko}"`));

  if (chunks[0].ko.includes('크리스톤')) {
    throw new Error('FAIL: Chunk 1 incorrectly contains 크리스톤!');
  }
  if (!chunks[1].ko.includes('크리스톤')) {
    throw new Error('FAIL: Chunk 2 should contain 크리스톤!');
  }
  console.log('✅ RuleChunkEngine semantic chunk alignment PASSED!');

  // 2. AIService generateDirectChunks verification
  const directChunks = await aiService.generateDirectChunks(
    chunks,
    natural,
    script
  );
  console.log('\nAIService generateDirectChunks:');
  directChunks.forEach((d, i) => console.log(`  [Chunk ${i + 1}] "${d}"`));

  if (directChunks[0].includes('크리스톤')) {
    throw new Error('FAIL: AIService Chunk 1 incorrectly contains 크리스톤!');
  }
  if (!directChunks[1].includes('크리스톤')) {
    throw new Error('FAIL: AIService Chunk 2 should contain 크리스톤!');
  }
  console.log('✅ AIService generateDirectChunks PASSED!');

  console.log('\nFull Direct String:');
  console.log(directChunks.join(' || '));
}

testUserSentence().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
