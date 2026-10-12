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
}
