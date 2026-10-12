// scratch/test_boundary_utils.js
// Unit tests for src/audio/boundary-utils.js (Plan Step 3-3)
import assert from 'assert';
import { applyBoundaryEndPadding, resolveSentenceBoundaries } from '../src/audio/boundary-utils.js';

const approx = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: expected ${b}, got ${a}`);

// 1. Padding is bounded by (next start - 0.15s)
const b = [{ start: 1, end: 3 }, { start: 3.5, end: 5 }];
applyBoundaryEndPadding(b, 10);
approx(b[0].end, 3.35, 'S1 end bounded by next start');
approx(b[1].end, 5.9, 'S2 end +0.9s (file is long enough)');

// 2. Last sentence without a known duration stays untouched; null ends are skipped
const c = [{ start: 0, end: 2 }, { start: 3, end: null }];
applyBoundaryEndPadding(c, null);
approx(c[0].end, 2.85, 'S1 bounded by S2 start');
assert.strictEqual(c[1].end, null);

// 3. AI alignment result is used when the count matches, and padding is applied ONCE
const r = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.', 'B.'],
  aiAlign: async () => [{ start: 1, end: 2 }, { start: 4, end: 5 }]
});
approx(r[0].end, 2.9, 'S1 padded once (+0.9s)');
assert.strictEqual(r[1].end, 5, 'last sentence w/o duration unchanged');

// 4. AI failure / count mismatch falls back to VAD without throwing
const r2 = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.'],
  aiAlign: async () => { throw new Error('network'); }
});
assert.ok(Array.isArray(r2));
const r3 = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.', 'B.'],
  aiAlign: async () => [{ start: 0, end: 1 }]
});
assert.ok(Array.isArray(r3));

// 5. No aiAlign → VAD path, always an array
assert.ok(Array.isArray(await resolveSentenceBoundaries({ audioBuffer: null, sentences: [] })));

console.log('✅ test_boundary_utils: all assertions passed');
