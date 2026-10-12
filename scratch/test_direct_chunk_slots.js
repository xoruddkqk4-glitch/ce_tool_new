// scratch/test_direct_chunk_slots.js
// 직독직해 slot mapping: empty chunks must not shift later translations (Plan Step 1-6)
import assert from 'assert';

// Minimal DOM stub so the module graph (toast-manager etc.) can be imported in Node
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
const { InputView } = await import('../src/views/input-view.js');

const proto = InputView.prototype;
const ctx = Object.create(proto); // methods only; no constructor/DOM needed

// 1. Empty chunk keeps its slot via the placeholder
const chunks = [{ en: 'I', ko: '나는' }, { en: 'went', ko: '' }, { en: 'to school', ko: '학교에' }];
assert.strictEqual(proto.getDirectChunkString.call(ctx, chunks), '나는 || — || 학교에');

// 2. All-empty → '' (input shows its placeholder text)
assert.strictEqual(proto.getDirectChunkString.call(ctx, [{ en: 'a', ko: '' }, { en: 'b', ko: '' }]), '');

// 3. Slot-by-slot update
const stn = { result: { chunks: chunks.map(c => ({ ...c })) } };
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || 갔다 || 학교에'), true);
assert.deepStrictEqual(stn.result.chunks.map(c => c.ko), ['나는', '갔다', '학교에']);
assert.strictEqual(stn.result.direct, '나는 / 갔다 / 학교에');
assert.strictEqual(stn.result.chunk_text, '나는 || 갔다 || 학교에');

// 4. Placeholder maps back to ''
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || — || 학교에'), true);
assert.strictEqual(stn.result.chunks[1].ko, '');

// 5. Slot-count mismatch is rejected and nothing changes
const before = JSON.stringify(stn.result.chunks);
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || 학교에'), false);
assert.strictEqual(JSON.stringify(stn.result.chunks), before);

console.log('✅ test_direct_chunk_slots: all assertions passed');
