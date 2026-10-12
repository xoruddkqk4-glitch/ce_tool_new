/**
 * Runs every scratch/test_*.js file in its own Node process (cwd = project root) and prints a summary.
 * Usage: node tools/run-tests.js            (or: npm test)
 *        node tools/run-tests.js splitter   (only files whose name contains "splitter")
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'scratch');
const filter = process.argv[2] || '';

const files = fs.readdirSync(TEST_DIR)
  .filter(f => /^test_.*\.js$/.test(f) && f.includes(filter))
  .sort();

let failed = 0;
const started = Date.now();

for (const file of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(TEST_DIR, file)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000
  });
  const ms = Date.now() - t0;
  if (r.status === 0) {
    console.log(`✅ ${file} (${ms}ms)`);
  } else {
    failed++;
    const tail = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').slice(-12).join('\n');
    console.log(`❌ ${file} (exit=${r.status}, ${ms}ms)\n${tail}\n`);
  }
}

console.log(`\n${failed ? '❌' : '✅'} ${files.length - failed}/${files.length} test files passed (${Date.now() - started}ms)`);
process.exit(failed ? 1 : 0);
