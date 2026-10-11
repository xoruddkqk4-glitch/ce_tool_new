/**
 * Standalone Zero-CORS Builder for CE Tool
 * Generates standalone app.js and styles.css directly from modular src/ and styles/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const jsFiles = [
  'src/config/constants.js',
  'src/config/fels-dict.js',
  'src/core/text-splitter.js',
  'src/core/fels-engine.js',
  'src/core/rule-chunk-engine.js',
  'src/core/app-state.js',
  'src/services/storage-service.js',
  'src/services/ai-service.js',
  'src/audio/audio-context.js',
  'src/audio/silence-detector.js',
  'src/audio/tts-synthesizer.js',
  'src/audio/waveform-renderer.js',
  'src/audio/looper-engine.js',
  'src/ui/toast-manager.js',
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
  // First strip multi-line imports: import { ... } from '...';
  let cleaned = content.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, '');
  // Strip single-line imports
  cleaned = cleaned.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  cleaned = cleaned.replace(/import\s+['"][^'"]+['"];?/g, '');

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

try {
  buildStyles();
  buildAppJs();
} catch (e) {
  console.error('Build failed:', e);
  process.exit(1);
}
