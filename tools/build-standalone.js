/**
 * Standalone Zero-CORS Builder for CE Tool
 * Generates standalone app.js and styles.css directly from modular src/ and styles/
 *
 * Usage:
 *   node tools/build-standalone.js           # one-shot build (+ node -c syntax check)
 *   node tools/build-standalone.js --watch   # rebuild on every change in src/ or styles/
 *
 * Bundler constraints (all modules share ONE IIFE scope):
 *   - Import statements are stripped → never use import aliases (`import { a as b }`).
 *   - Top-level names (const/let/class/function) must be unique across ALL modules.
 *   - New modules must be added to `jsFiles` AFTER every module they depend on at evaluation time.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const jsFiles = [
  'src/config/constants.js',
  'src/config/fels-dict.js',
  'src/utils/dom.js',
  'src/core/text-splitter.js',
  'src/core/fels-engine.js',
  'src/core/rule-chunk-engine.js',
  'src/core/app-state.js',
  'src/services/storage-service.js',
  'src/services/ai-service.js',
  'src/audio/audio-context.js',
  'src/audio/silence-detector.js',
  'src/audio/boundary-utils.js',
  'src/audio/tts-synthesizer.js',
  'src/audio/waveform-renderer.js',
  'src/audio/looper-engine.js',
  'src/audio/playback-controller.js',
  'src/ui/toast-manager.js',
  'src/services/project-service.js',
  'src/ui/settings-modal.js',
  'src/ui/router.js',
  'src/ui/shortcut-manager.js',
  'src/views/input-view.js',
  'src/views/practice-view.js',
  'src/views/memorize-view.js',
  'src/main.js'
];

const cssFiles = [
  'styles/base/variables.css',
  'styles/base/reset.css',
  'styles/layout/layout.css',
  'styles/layout/nav-tabs.css',
  'styles/components/audio-player.css',
  'styles/components/chunk-cards.css',
  'styles/components/sentence-navigator.css',
  'styles/components/modal-toast.css',
  'styles/components/project-toolbar.css',
  'styles/views/input-view.css',
  'styles/views/practice-view.css',
  'styles/views/memorize-view.css'
];

function buildStyles() {
  let combined = `/* ==========================================================================\n   CE Tool Standalone Stylesheet Bundle (Generated from styles/)\n   ========================================================================== */\n\n`;
  for (const relPath of cssFiles) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CSS file not found: ${relPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    combined += `/* --- File: ${relPath} --- */\n` + content + '\n\n';
  }
  const destPath = path.join(ROOT, 'styles.css');
  fs.writeFileSync(destPath, combined, 'utf8');
  console.log(`✅ styles.css bundled (${(Buffer.byteLength(combined, 'utf8') / 1024).toFixed(1)} KB)`);
}

function cleanModuleContent(content, relPath) {
  // Import aliases cannot survive import stripping (the alias name would be undefined in the bundle)
  const aliasImport = content.match(/^[ \t]*import\s*\{[^}]*\bas\b[^}]*\}\s*from/m);
  if (aliasImport) {
    throw new Error(`Import aliases are not supported by the standalone bundler (${relPath}): ${aliasImport[0].trim()}`);
  }

  // Strip import statements anchored at line start (single-line or multi-line `import { ... } from '...'`).
  // [^;]*? cannot cross a statement boundary, so code following a stray "import " word is never eaten.
  let cleaned = content.replace(/^[ \t]*import\s+[^;]*?\s*from\s*['"][^'"]+['"];?[ \t]*$/gm, '');
  // Side-effect imports: import './x.js';
  cleaned = cleaned.replace(/^[ \t]*import\s+['"][^'"]+['"];?[ \t]*$/gm, '');

  const lines = cleaned.split('\n');
  const result = [];
  let inMultiComment = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Check multi-line comment state
    if (trimmed.startsWith('/*')) inMultiComment = true;
    if (inMultiComment) {
      if (trimmed.includes('*/')) inMultiComment = false;
      result.push(line);
      continue;
    }

    // Skip any stray import lines
    if (/^import\s+/.test(trimmed)) {
      continue;
    }

    // Strip exports
    if (/^export\s+default\s+/.test(trimmed)) {
      line = line.replace(/^(\s*)export\s+default\s+/, '$1');
    } else if (/^export\s+(const|let|var|function|class|async\s+function)\s+/.test(trimmed)) {
      line = line.replace(/^(\s*)export\s+/, '$1');
    } else if (/^export\s*\{[\s\S]*?\};?$/.test(trimmed)) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function buildAppJs() {
  let bundle = `/**
 * CE Tool - 3-Page Multi-Input AI Chunk & FELS Weak-Form Listening Trainer
 * Standalone Zero-CORS Distribution Bundle (Compatible with file:/// and http://)
 * Generated from modular src/ package
 */

(function () {
  'use strict';
`;

  for (const relPath of jsFiles) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`JS file not found: ${relPath}`);
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cleaned = cleanModuleContent(raw, relPath);

    bundle += `\n  // =========================================================================\n  // Module: ${relPath}\n  // =========================================================================\n\n`;
    bundle += cleaned + '\n';
  }

  // Close IIFE
  bundle += `
})();
`;

  // Verify ZERO import or export statements remain in standalone bundle
  const forbiddenImport = bundle.match(/^\s*import\s+.*/m);
  if (forbiddenImport) {
    throw new Error(`Forbidden import found in app.js: ${forbiddenImport[0]}`);
  }
  const forbiddenExport = bundle.match(/^\s*export\s+.*/m);
  if (forbiddenExport) {
    throw new Error(`Forbidden export found in app.js: ${forbiddenExport[0]}`);
  }

  const destPath = path.join(ROOT, 'app.js');
  fs.writeFileSync(destPath, bundle, 'utf8');
  console.log(`✅ app.js bundled (${(Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1)} KB) - Zero imports/exports confirmed`);

  // Verify syntax with node -c
  execSync(`node -c "${destPath}"`, { stdio: 'inherit' });
  console.log(`✅ node -c app.js syntax check passed!`);
}

function buildAll() {
  buildStyles();
  buildAppJs();
}

function watch() {
  let timer = null;
  const rebuild = (eventType, filename) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\n🔄 Change detected (${filename || eventType}) → rebuilding...`);
      try {
        buildAll();
      } catch (e) {
        console.error('❌ Build failed:', e.message);
      }
    }, 150);
  };
  ['src', 'styles'].forEach(dir => {
    fs.watch(path.join(ROOT, dir), { recursive: true }, rebuild);
  });
  console.log('👀 Watching src/ and styles/ for changes (Ctrl+C to stop)...');
}

try {
  buildAll();
} catch (e) {
  console.error('Build failed:', e);
  process.exit(1);
}

if (process.argv.includes('--watch')) {
  watch();
}
