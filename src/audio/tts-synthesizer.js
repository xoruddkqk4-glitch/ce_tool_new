/**
 * TTS Synthesizer & Silent PCM WAV Generator
 * Completely eliminates noise/static for text-only inputs by generating pure silent PCM WAV
 * for waveform timing synchronization, while using clean SpeechSynthesis for authentic voice.
 */

import { CONSTANTS } from '../config/constants.js';

export function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  let pos = 0;

  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // Subchunk1Size
  setUint16(1);          // AudioFormat: PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);         // BitsPerSample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  const channels = [];
  for (let c = 0; c < numOfChan; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let chan = 0; chan < numOfChan; chan++) {
      let sample = channels[chan][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

export function synthesizeSilentAudioForScript(text, audioCtx) {
  if (!text || !text.trim() || !audioCtx) return null;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;

  const estDuration = Math.max(2.0, Math.min(60, words.length * CONSTANTS.SPEECH_WORD_DURATION_SEC + CONSTANTS.SPEECH_BOUNDARY_MARGIN_SEC));
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * estDuration);
  const audioBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Pure silent PCM WAV to avoid any audio static or buzz
  channelData.fill(0);

  // Synthesize diamond rhythm waveform peaks matching speech syllables
  const totalBars = CONSTANTS.TOTAL_WAVEFORM_BARS;
  const waveformPeaks = [];
  const barsPerWord = totalBars / words.length;

  for (let i = 0; i < totalBars; i++) {
    const posInWord = (i % barsPerWord) / barsPerWord; // 0.0 ~ 1.0

    if (posInWord < 0.80) {
      const normPos = posInWord / 0.80;
      const diamondEnv = Math.sin(normPos * Math.PI);
      const texture = 0.90 + 0.10 * Math.sin(i * 1.5) * Math.cos(i * 0.7);
      const peak = Math.max(0.12, Math.min(0.96, diamondEnv * texture * 0.88));
      waveformPeaks.push(peak);
    } else {
      const baseline = 0.07 + 0.03 * Math.sin(i * 0.8);
      waveformPeaks.push(baseline);
    }
  }

  const wavBlob = audioBufferToWavBlob(audioBuffer);

  return {
    estDuration,
    audioBuffer,
    waveformPeaks,
    wavBlob
  };
}

/**
 * Speak text via Web Speech API.
 * Usage: speakText(text, 'en-US', 0.95)  or  speakText(text, { lang, rate, onEnd })
 * `onEnd` fires exactly once when speech finishes, errors, or TTS is unavailable
 * (so "play all" sequences never stall).
 */
export function speakText(text, langOrOpts = 'en-US', rateArg = 0.95) {
  let lang = 'en-US';
  let rate = rateArg;
  let onEnd = null;
  if (langOrOpts && typeof langOrOpts === 'object') {
    if (typeof langOrOpts.lang === 'string') lang = langOrOpts.lang;
    if (typeof langOrOpts.rate === 'number') rate = langOrOpts.rate;
    if (typeof langOrOpts.onEnd === 'function') onEnd = langOrOpts.onEnd;
  } else if (typeof langOrOpts === 'string') {
    lang = langOrOpts;
  }

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    if (onEnd) onEnd();
  };

  if (!('speechSynthesis' in window) || !text) {
    finish();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.onend = finish;
    utter.onerror = (ev) => {
      // cancel()/interrupt by a newer utterance must not advance a sequence
      if (ev && (ev.error === 'canceled' || ev.error === 'interrupted')) return;
      finish();
    };

    // Pick authentic voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const matchVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]) && (v.name.includes('Natural') || v.name.includes('Google') || !v.localService)) ||
                         voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]));
      if (matchVoice) utter.voice = matchVoice;
    }
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS playback error:', e);
    finish();
  }
}
