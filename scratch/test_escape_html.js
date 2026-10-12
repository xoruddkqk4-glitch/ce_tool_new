// scratch/test_escape_html.js
// escapeHtml util + bundle wiring (Plan Step 2-1)
import assert from 'assert';
import fs from 'fs';
import { escapeHtml } from '../src/utils/dom.js';

assert.strictEqual(
  escapeHtml('<img src=x onerror="alert(1)">&\''),
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'
);
assert.strictEqual(escapeHtml(null), '');
assert.strictEqual(escapeHtml(undefined), '');
assert.strictEqual(escapeHtml(0), '0');
assert.strictEqual(escapeHtml('직독직해'), '직독직해');

// The standalone bundle must contain the util and use it in the views
const appJs = fs.readFileSync('app.js', 'utf8');
assert.ok(appJs.includes('function escapeHtml(str)'), 'app.js must include utils/dom.js');
assert.ok(appJs.includes('${escapeHtml(chunk.en)}'), 'memorize chunk cards must escape chunk.en');
assert.ok(appJs.includes('${escapeHtml(stn.text)}'), 'sentence text must be escaped');
assert.ok(!/from\s+['"]\.\.?\//.test(appJs), 'app.js must not contain leftover ESM imports');

console.log('✅ test_escape_html: all assertions passed');
