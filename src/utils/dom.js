/**
 * DOM Utility Helpers (shared across views)
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

/**
 * Escapes a value for safe interpolation into innerHTML / attribute strings.
 * null/undefined → '' (prevents literal "undefined" from leaking into the UI).
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
