/**
 * Global Constants & Configurations for CE Tool
 */

export const CONSTANTS = {
  // Waveform display
  TOTAL_WAVEFORM_BARS: 360,
  
  // Looper & Shadowing
  SHADOWING_PAUSE_MS: 500, // 0.5s pause between loop repeats
  DEFAULT_REPEAT_COUNT: 3,
  
  // Fallback realistic speech timing
  SPEECH_WORD_DURATION_SEC: 0.40,
  SPEECH_BOUNDARY_MARGIN_SEC: 0.60,
  
  // Supported Gemini candidate models in priority order
  // (gemini-1.5-* removed: retired models only added 404 round-trips to the fallback loop)
  GEMINI_CANDIDATE_MODELS: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-pro'
  ]
};
