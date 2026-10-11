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

export class StorageService {
  static getProvider() {
    return safeGet('ce_tool_provider') || safeGet('chunklingo_provider') || 'gemini';
  }

  static getApiKey() {
    return safeGet('ce_tool_api_key') || safeGet('chunklingo_api_key') || '';
  }

  static getCustomPrompt() {
    return safeGet('ce_tool_prompt') || safeGet('chunklingo_prompt') || '';
  }

  static saveApiSettings(provider, apiKey, customPrompt) {
    safeSet('ce_tool_provider', provider);
    safeSet('ce_tool_api_key', apiKey);
    safeSet('ce_tool_prompt', customPrompt);
    // Backward compatibility
    safeSet('chunklingo_provider', provider);
    safeSet('chunklingo_api_key', apiKey);
    safeSet('chunklingo_prompt', customPrompt);
  }

  static getTheme() {
    return safeGet('ce_tool_theme') || safeGet('chunklingo_theme') || 'dark';
  }

  static saveTheme(theme) {
    safeSet('ce_tool_theme', theme);
    safeSet('chunklingo_theme', theme);
  }
}
