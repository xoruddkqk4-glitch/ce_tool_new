/**
 * Test: Brand Logo Click Navigation to Page 1 ('input')
 */
import assert from 'node:assert';
import { AppRouter } from '../src/ui/router.js';

console.log('🧪 Testing Brand Logo Click Navigation...');

// Mock DOM elements
let clickCallback = null;
let keydownCallback = null;

const mockBrand = {
  addEventListener: (event, cb) => {
    if (event === 'click') clickCallback = cb;
    if (event === 'keydown') keydownCallback = cb;
  }
};

global.document = {
  querySelector: (sel) => {
    if (sel === '.brand') return mockBrand;
    return null;
  },
  querySelectorAll: () => [],
  getElementById: (id) => ({
    id,
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {},
      toggle: () => {}
    }
  })
};

global.window = {
  addEventListener: () => {},
  location: { hash: '' },
  scrollTo: () => {}
};

const router = new AppRouter();
assert.ok(router, 'AppRouter created');
assert.ok(clickCallback, 'Brand click listener registered');
assert.ok(keydownCallback, 'Brand keydown listener registered');

// Test navigating from 'practice' to 'input' by clicking brand
router.currentPage = 'practice';
router.hasNavigated = true;

clickCallback();
assert.strictEqual(router.currentPage, 'input', 'Clicking .brand should navigate to "input" page');

// Test keydown Enter from 'memorize' to 'input'
router.currentPage = 'memorize';
keydownCallback({ key: 'Enter', preventDefault: () => {} });
assert.strictEqual(router.currentPage, 'input', 'Pressing Enter on .brand should navigate to "input" page');

console.log('🎉 Brand Logo Navigation test passed successfully!');
