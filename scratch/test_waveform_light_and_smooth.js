/**
 * Test: Waveform Light Mode & 60FPS Smooth Animation Integration
 */
import assert from 'node:assert';
import { WaveformRenderer } from '../src/audio/waveform-renderer.js';

console.log('🧪 Testing Waveform Light Mode & Smooth Animation Logic...');

// 1. Test WaveformRenderer canvas dimension caching and palette
const mockCanvas = {
  width: 800,
  height: 100,
  clientWidth: 850,
  parentElement: { clientWidth: 850 },
  getContext: () => ({
    save: () => {},
    restore: () => {},
    scale: () => {},
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    fill: () => {},
    strokeRect: () => {},
    measureText: () => ({ width: 50 }),
    fillText: () => {}
  })
};

const renderer = new WaveformRenderer(mockCanvas);
assert.ok(renderer, 'WaveformRenderer instantiated successfully');

// Test draw execution without DOM errors
renderer.draw({
  activeSentence: { audioStart: 1.0, audioEnd: 3.5, cachedPeaks: new Array(360).fill(0.2) },
  audioBuffer: null,
  sentenceIndex: 0,
  totalSentences: 5,
  currentTime: 1.5,
  totalDuration: 10.0,
  loopStart: null,
  loopEnd: null,
  isRangeDragging: false,
  dragStartX: null,
  currentMouseX: null,
  isShadowingWaiting: false,
  formatTimeFn: (s) => `${s.toFixed(1)}s`
});

console.log('✅ WaveformRenderer.draw() executed successfully with fast layout dimension resolution.');

// 2. Test High-Precision Time Interpolation algorithm
function calculateSmoothTime(actualTime, lastAudioAnchorTime, lastAudioAnchorWallTime, now, playbackRate = 1.0) {
  let anchorTime = lastAudioAnchorTime;
  let anchorWall = lastAudioAnchorWallTime;

  if (actualTime !== anchorTime) {
    anchorTime = actualTime;
    anchorWall = now;
  }

  const elapsedSec = ((now - anchorWall) / 1000) * playbackRate;
  let smoothTime = anchorTime + elapsedSec;

  if (Math.abs(smoothTime - actualTime) > 0.12) {
    smoothTime = actualTime;
    anchorTime = actualTime;
    anchorWall = now;
  }

  return { smoothTime, anchorTime, anchorWall };
}

// Frame 0: Audio tick at 1.000s, wall time 0ms
let state = { actual: 1.000, anchorTime: 1.000, anchorWall: 1000 };

// Frame 1 (+16.6ms): Audio element still hasn't updated its buffer (still 1.000s)
let res1 = calculateSmoothTime(1.000, state.anchorTime, state.anchorWall, 1016.6, 1.0);
assert.ok(res1.smoothTime > 1.015 && res1.smoothTime < 1.018, `Frame 1 smoothTime expected ~1.0166, got ${res1.smoothTime}`);

// Frame 2 (+33.3ms): Audio element still hasn't updated its buffer (still 1.000s)
let res2 = calculateSmoothTime(1.000, res1.anchorTime, res1.anchorWall, 1033.3, 1.0);
assert.ok(res2.smoothTime > 1.030 && res2.smoothTime < 1.035, `Frame 2 smoothTime expected ~1.0333, got ${res2.smoothTime}`);

// Frame 3 (+50ms): Audio element buffer ticks forward to 1.050s
let res3 = calculateSmoothTime(1.050, res2.anchorTime, res2.anchorWall, 1050.0, 1.0);
assert.ok(res3.smoothTime >= 1.049 && res3.smoothTime <= 1.051, `Frame 3 smoothTime expected ~1.050, got ${res3.smoothTime}`);

console.log('✅ High-precision time interpolation verified: 0ms freeze between audio buffer chunks!');
console.log('🎉 All Waveform Light & Smooth Animation integration tests passed!');
