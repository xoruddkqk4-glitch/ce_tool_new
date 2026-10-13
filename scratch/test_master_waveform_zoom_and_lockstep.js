/**
 * Test Master Waveform Timeline:
 * 1. Ctrl+Wheel Zoom scaling and clamping
 * 2. Non-overlapping lockstep boundary adjustment between adjacent sentences (S1 & S2)
 */

const assert = require('assert');

// Mock DOM environment for Node
class MockCanvas {
  constructor() {
    this.width = 1000;
    this.height = 86;
    this.style = {};
    this.parentElement = {
      clientWidth: 1000,
      scrollLeft: 0,
      getBoundingClientRect: () => ({ left: 0, right: 1000, width: 1000, top: 0, bottom: 86 }),
      addEventListener: () => {}
    };
  }
  getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      strokeRect: () => {},
      closePath: () => {},
      fill: () => {}
    };
  }
  addEventListener() {}
  getBoundingClientRect() {
    return { left: 0, right: this.width, width: this.width, top: 0, bottom: 86 };
  }
}

global.window = {
  addEventListener: () => {}
};

async function run() {
  const { MasterWaveformTimeline } = await import('../src/audio/master-waveform.js');

  const canvas = new MockCanvas();
  let zoomChangedTo = null;
  const changes = [];

  const timeline = new MasterWaveformTimeline(canvas, {
    onZoomChange: (z) => { zoomChangedTo = z; },
    onSegmentChange: (idx, start, end, isFinal, adjInfo) => {
      changes.push({ idx, start, end, isFinal, adjInfo });
    }
  });

  // Mock audio buffer
  const sampleRate = 44100;
  const duration = 20.0;
  const pcm = new Float32Array(sampleRate * duration);
  const audioBuffer = {
    duration,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => pcm
  };

  timeline.setAudioBuffer(audioBuffer);

  // Initial sentences: S1 (0.0 ~ 5.0), S2 (5.0 ~ 12.0), S3 (12.0 ~ 18.0)
  const sentenceList = [
    { index: 0, audioStart: 0.0, audioEnd: 5.0 },
    { index: 1, audioStart: 5.0, audioEnd: 12.0 },
    { index: 2, audioStart: 12.0, audioEnd: 18.0 }
  ];
  timeline.setSentenceList(sentenceList);
  timeline.setSnapEnabled(false); // disable silence snapping for exact coordinate testing

  console.log('1. Testing Zoom functionality...');
  assert.strictEqual(timeline.zoomLevel, 1.0, 'Default zoom must be 1.0');
  assert.strictEqual(canvas.width, 1000, 'Base width should be 1000');

  // Zoom to 2.5x
  timeline.setZoom(2.5);
  assert.strictEqual(timeline.zoomLevel, 2.5, 'Zoom should be 2.5');
  assert.strictEqual(canvas.width, 2500, 'Canvas width should scale to 2500');
  assert.strictEqual(zoomChangedTo, 2.5, 'onZoomChange callback should fire');

  // Clamp testing: min 1.0x, max 10.0x
  timeline.setZoom(0.3);
  assert.strictEqual(timeline.zoomLevel, 1.0, 'Zoom below 1.0 must clamp to 1.0');

  timeline.setZoom(15.0);
  assert.strictEqual(timeline.zoomLevel, 10.0, 'Zoom above 10.0 must clamp to 10.0');

  // Reset to 1.0x
  timeline.setZoom(1.0);
  assert.strictEqual(timeline.zoomLevel, 1.0, 'Reset zoom back to 1.0');
  assert.strictEqual(canvas.width, 1000, 'Canvas width back to 1000');

  console.log('2. Testing Lockstep Boundary Adjustment (S1 end dragged right)...');
  // S1 is 0.0~5.0, S2 is 5.0~12.0.
  // Drag S1 right edge (end) to 7.0s
  timeline.activeDrag = {
    index: 0,
    listIdx: 0,
    edge: 'end',
    startX: 250,
    origStart: 0.0,
    origEnd: 5.0
  };

  // Move mouse to coordinate corresponding to 7.0s (7.0 / 20.0 * 1000 = 350px)
  timeline.handleWindowMouseMove({ clientX: 350 });

  assert.strictEqual(sentenceList[0].audioEnd, 7.0, 'S1 end should increase to 7.0s');
  assert.strictEqual(sentenceList[1].audioStart, 7.0, 'S2 start should automatically move to 7.0s in lockstep');
  assert.strictEqual(sentenceList[0].audioEnd, sentenceList[1].audioStart, 'S1 and S2 must share the exact boundary without gap/overlap');

  const lastChange = changes[changes.length - 1];
  assert.strictEqual(lastChange.idx, 0, 'Change event should be for S1');
  assert.strictEqual(lastChange.end, 7.0, 'S1 end 7.0s');
  assert.deepStrictEqual(lastChange.adjInfo, { index: 1, audioStart: 7.0, audioEnd: 12.0 }, 'adjInfo should report S2 new start');

  console.log('3. Testing Lockstep Boundary Adjustment (S2 start dragged left)...');
  // S2 start dragged from 7.0s to 4.0s
  timeline.activeDrag = {
    index: 1,
    listIdx: 1,
    edge: 'start',
    startX: 350,
    origStart: 7.0,
    origEnd: 12.0
  };

  // Move mouse to 4.0s (4.0 / 20.0 * 1000 = 200px)
  timeline.handleWindowMouseMove({ clientX: 200 });

  assert.strictEqual(sentenceList[1].audioStart, 4.0, 'S2 start should move to 4.0s');
  assert.strictEqual(sentenceList[0].audioEnd, 4.0, 'S1 end should automatically move to 4.0s in lockstep');
  assert.strictEqual(sentenceList[0].audioEnd, sentenceList[1].audioStart, 'S1 and S2 must share boundary');

  console.log('4. Testing Minimum Duration Boundary Protection...');
  // Try dragging S1 end beyond S2 end (e.g. to 13.0s, while S2 end is 12.0s)
  timeline.activeDrag = {
    index: 0,
    listIdx: 0,
    edge: 'end',
    startX: 200,
    origStart: 0.0,
    origEnd: 4.0
  };

  // Move mouse to 13.0s (650px)
  timeline.handleWindowMouseMove({ clientX: 650 });

  // S2 end is 12.0, so S1 end can at most be 12.0 - 0.2 = 11.8s
  assert(sentenceList[0].audioEnd <= 11.8, 'S1 cannot expand into S2 past minimum duration');
  assert(sentenceList[1].audioStart <= 11.8, 'S2 start stays matched');
  assert(Math.round((sentenceList[1].audioEnd - sentenceList[1].audioStart) * 10) / 10 >= 0.2, 'S2 preserves at least 0.2s duration');

  timeline.handleWindowMouseUp();
  assert.strictEqual(timeline.activeDrag, null, 'activeDrag should be cleared on mouseUp');

  console.log('✅ All MasterWaveform zoom & lockstep tests passed successfully!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
