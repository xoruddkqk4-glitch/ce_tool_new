/**
 * Backward-compatible entry point.
 * The builder moved to tools/build-standalone.js — this wrapper keeps
 * `node scratch/build_standalone.js` (referenced in README history) working.
 */
require('../tools/build-standalone.js');
