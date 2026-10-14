/**
 * Global Constants & Configurations for CE Tool
 */

export const CONSTANTS = {
  // Waveform display
  TOTAL_WAVEFORM_BARS: 360,
  
  // Looper & Shadowing
  SHADOWING_PAUSE_MS: 1000, // default 1.0s pause between loop repeats
  DEFAULT_REPEAT_COUNT: 3,
  DEFAULT_REWIND_SEC: 0.5,
  DEFAULT_SECTION_SILENT_SEC: 1.0,
  
  // Fallback realistic speech timing
  SPEECH_WORD_DURATION_SEC: 0.40,
  SPEECH_BOUNDARY_MARGIN_SEC: 0.60,
  
  // Supported Gemini candidate models in priority order
  // (Updated for active 2026 Gemini 3.x Flash lineup: gemini-3.8-flash, gemini-3.5-flash, gemini-3.1-pro-preview)
  GEMINI_CANDIDATE_MODELS: [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash'
  ]
};

export const WAVEFORM_SEGMENT_COLORS = [
  {
    fill: 'rgba(99, 102, 241, 0.18)',
    stroke: 'rgba(129, 140, 248, 0.85)',
    tag: '#818cf8',
    glow: 'rgba(99, 102, 241, 0.45)',
    bgTint: 'rgba(99, 102, 241, 0.10)',
    badgeBg: 'rgba(99, 102, 241, 0.28)'
  }, // S1: Indigo
  {
    fill: 'rgba(16, 185, 129, 0.18)',
    stroke: 'rgba(52, 211, 153, 0.85)',
    tag: '#34d399',
    glow: 'rgba(16, 185, 129, 0.45)',
    bgTint: 'rgba(16, 185, 129, 0.10)',
    badgeBg: 'rgba(16, 185, 129, 0.28)'
  }, // S2: Emerald
  {
    fill: 'rgba(245, 158, 11, 0.18)',
    stroke: 'rgba(251, 191, 36, 0.85)',
    tag: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.45)',
    bgTint: 'rgba(245, 158, 11, 0.10)',
    badgeBg: 'rgba(245, 158, 11, 0.28)'
  }, // S3: Amber
  {
    fill: 'rgba(236, 72, 153, 0.18)',
    stroke: 'rgba(244, 114, 182, 0.85)',
    tag: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.45)',
    bgTint: 'rgba(236, 72, 153, 0.10)',
    badgeBg: 'rgba(236, 72, 153, 0.28)'
  }, // S4: Pink
  {
    fill: 'rgba(14, 165, 233, 0.18)',
    stroke: 'rgba(56, 189, 248, 0.85)',
    tag: '#38bdf8',
    glow: 'rgba(14, 165, 233, 0.45)',
    bgTint: 'rgba(14, 165, 233, 0.10)',
    badgeBg: 'rgba(14, 165, 233, 0.28)'
  }, // S5: Cyan
  {
    fill: 'rgba(168, 85, 247, 0.18)',
    stroke: 'rgba(192, 132, 252, 0.85)',
    tag: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.45)',
    bgTint: 'rgba(168, 85, 247, 0.10)',
    badgeBg: 'rgba(168, 85, 247, 0.28)'
  }  // S6: Purple
];
