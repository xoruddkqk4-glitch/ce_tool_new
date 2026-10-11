/**
 * Web Audio Context Singleton & PCM Audio Decoding
 */

let globalAudioCtx = null;

export function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

export async function ensureAudioContextRunning() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('AudioContext resume error:', e);
    }
  }
  return ctx;
}

export async function decodeAudioFile(file) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) throw new Error('Web Audio API is not supported in this browser.');
  const arrayBuffer = await file.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}
