// scratch/test_playback_controller.js
// Unit tests for src/audio/playback-controller.js with a fake <audio> element (Plan Step 1-1)
import assert from 'assert';
import { PlaybackController } from '../src/audio/playback-controller.js';

function makePlayer() {
  return {
    src: '',
    muted: false,
    currentTime: 0,
    paused: true,
    ended: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// 1. setSource always re-applies the muted flag (synth session must not silence a real MP3)
const c = new PlaybackController();
const p = makePlayer();
c.player = p;
c.setSource('blob:a', { muted: true });
assert.strictEqual(p.src, 'blob:a');
assert.strictEqual(p.muted, true);
c.setSource('blob:a');
assert.strictEqual(p.muted, false, 'muted must be reset even when src is unchanged');

// 2. Segment end pauses the player and fires onEnd exactly once
let ended = 0;
assert.strictEqual(await c.playSegment(1, 2, { owner: 'memorize', onEnd: () => ended++ }), true);
assert.ok(c.isOwnedBy('memorize'));
assert.strictEqual(p.currentTime, 1);
p.currentTime = 2.1;
await wait(60);
assert.strictEqual(p.paused, true);
assert.strictEqual(ended, 1);

// 3. A newer segment invalidates the older watcher
let firstEnd = 0;
await c.playSegment(0, 5, { owner: 'input', onEnd: () => firstEnd++ });
await c.playSegment(10, 12, { owner: 'input' });
p.currentTime = 5.5;
await wait(60);
assert.strictEqual(p.paused, false, 'stale watcher must not pause the new segment');
assert.strictEqual(firstEnd, 0);

// 4. claim() by another owner cancels the watcher; stop() pauses
c.claim('practice');
assert.ok(c.isOwnedBy('practice'));
p.currentTime = 13;
await wait(60);
assert.strictEqual(p.paused, false, 'cancelled watcher must not pause');
c.stop();
assert.strictEqual(p.paused, true);

// 5. External pause stops watching silently (no onEnd)
let e3 = 0;
await c.playSegment(0, 3, { owner: 'memorize', onEnd: () => e3++ });
p.pause();
await wait(60);
p.currentTime = 4;
await wait(60);
assert.strictEqual(e3, 0);

// 6. play() rejection propagates to the caller (callers fall back to TTS)
const bad = makePlayer();
bad.play = () => Promise.reject(new Error('NotAllowedError'));
const c2 = new PlaybackController();
c2.player = bad;
await assert.rejects(c2.playSegment(0, 1, { owner: 'input' }));

// 7. No player → resolves false (mock DOM safety)
const c3 = new PlaybackController();
c3.getPlayer = () => null;
assert.strictEqual(await c3.playSegment(0, 1), false);
c3.stop(); // must not throw

console.log('✅ test_playback_controller: all assertions passed');
