/**
 * Static syntax check for every module in src/ plus the standalone bundle.
 * Usage: node tools/check-syntax.js   (or: npm run check)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function collectJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = [...collectJs(path.join(ROOT, 'src')), path.join(ROOT, 'app.js')];
let failed = 0;

for (const file of files) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    failed++;
    console.error(`❌ ${path.relative(ROOT, file)}\n${r.stderr}`);
  }
}

if (failed) {
  console.error(`\n❌ ${failed}/${files.length} files failed node --check`);
  process.exit(1);
}
console.log(`✅ ${files.length} files passed node --check`);
