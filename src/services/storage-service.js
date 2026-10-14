/**
 * Local Storage Service for CE Tool
 * Handles API provider, keys, custom prompt, and theme persistence.
 */

const memStorage = {};

function safeGet(key, def = '') {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) ?? def;
    }
  } catch (e) {}
  return memStorage[key] ?? def;
}

function safeSet(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch (e) {}
  memStorage[key] = String(val);
}

/**
 * Reads `key`; falls back to the legacy ChunkLingo key ONLY when `key` was never written.
 * (Legacy keys are no longer written, so an intentionally cleared value must not resurrect the old one.)
 */
function safeGetWithLegacy(key, legacyKey, def = '') {
  const v = safeGet(key, null);
  if (v !== null) return v || def;
  return safeGet(legacyKey, null) || def;
}

export class StorageService {
  static getProvider() {
    return safeGetWithLegacy('ce_tool_provider', 'chunklingo_provider', 'gemini');
  }

  static getApiKey() {
    return safeGetWithLegacy('ce_tool_api_key', 'chunklingo_api_key', '');
  }

  static getCustomPrompt() {
    return safeGetWithLegacy('ce_tool_prompt', 'chunklingo_prompt', '');
  }

  static saveApiSettings(provider, apiKey, customPrompt) {
    safeSet('ce_tool_provider', provider);
    safeSet('ce_tool_api_key', apiKey);
    safeSet('ce_tool_prompt', customPrompt);
    // Legacy chunklingo_* keys are intentionally NOT written anymore (and not deleted:
    // file:// pages share one localStorage origin, so another app may still own them).
  }

  static getTheme() {
    return safeGetWithLegacy('ce_tool_theme', 'chunklingo_theme', 'dark');
  }

  static saveTheme(theme) {
    safeSet('ce_tool_theme', theme);
  }

  static getReplaySeconds() {
    const val = parseFloat(safeGet('ce_tool_replay_seconds', '0.5'));
    return (!isNaN(val) && val >= 0 && val <= 2) ? Math.round(val * 10) / 10 : 0.5;
  }

  static setReplaySeconds(sec) {
    safeSet('ce_tool_replay_seconds', String(sec));
  }

  static getSectionSilentSeconds() {
    const val = parseFloat(safeGet('ce_tool_section_silent_seconds', '1.0'));
    return (!isNaN(val) && val >= 0 && val <= 4) ? Math.round(val * 10) / 10 : 1.0;
  }

  static setSectionSilentSeconds(sec) {
    safeSet('ce_tool_section_silent_seconds', String(sec));
  }

  static getTargetLoopCount() {
    const raw = safeGet('ce_tool_target_loop_count', '3');
    if (raw === 'infinite') return Infinity;
    const val = parseInt(raw, 10);
    return (!isNaN(val) && val >= 1 && val <= 10) ? val : 3;
  }

  static setTargetLoopCount(count) {
    safeSet('ce_tool_target_loop_count', count === Infinity ? 'infinite' : String(count));
  }
}
