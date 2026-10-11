/**
 * Local Storage Service for CE Tool
 * Handles API provider, keys, custom prompt, and theme persistence.
 */

export class StorageService {
  static getProvider() {
    return localStorage.getItem('ce_tool_provider') || localStorage.getItem('chunklingo_provider') || 'gemini';
  }

  static getApiKey() {
    return localStorage.getItem('ce_tool_api_key') || localStorage.getItem('chunklingo_api_key') || '';
  }

  static getCustomPrompt() {
    return localStorage.getItem('ce_tool_prompt') || localStorage.getItem('chunklingo_prompt') || '';
  }

  static saveApiSettings(provider, apiKey, customPrompt) {
    localStorage.setItem('ce_tool_provider', provider);
    localStorage.setItem('ce_tool_api_key', apiKey);
    localStorage.setItem('ce_tool_prompt', customPrompt);
    // Backward compatibility
    localStorage.setItem('chunklingo_provider', provider);
    localStorage.setItem('chunklingo_api_key', apiKey);
    localStorage.setItem('chunklingo_prompt', customPrompt);
  }

  static getTheme() {
    return localStorage.getItem('ce_tool_theme') || localStorage.getItem('chunklingo_theme') || 'dark';
  }

  static saveTheme(theme) {
    localStorage.setItem('ce_tool_theme', theme);
    localStorage.setItem('chunklingo_theme', theme);
  }
}
