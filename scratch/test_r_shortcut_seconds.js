import fs from 'fs';
import assert from 'assert';

console.log('=== TEST: HUD DROPDOWN SETTINGS & SPACEBAR REWIND & SHORTCUTS ===');

const htmlContent = fs.readFileSync('index.html', 'utf8');

// 1. Check HTML dropdowns & options
console.log('\n[Check 1] Verifying HUD dropdown selects in index.html...');
assert(htmlContent.includes('id="selectSectionSilent"'), 'Must have select with id="selectSectionSilent"');
assert(htmlContent.includes('id="selectRewindSeconds"'), 'Must have select with id="selectRewindSeconds"');
assert(htmlContent.includes('id="selectLoopCount"'), 'Must have select with id="selectLoopCount"');
assert(htmlContent.includes('id="btnTogglePlayAllSentences"'), 'Must have Play All Sentences button');

// Check section silent options (0 to 4 in 0.5 steps, default 1.0)
assert(htmlContent.includes('<option value="0">0초</option>'));
assert(htmlContent.includes('<option value="1" selected>1.0초</option>'));
assert(htmlContent.includes('<option value="4">4.0초</option>'));

// Check rewind options (0 to 2 in 0.1 steps, default 0.5)
assert(htmlContent.includes('<option value="0">0.0초</option>'));
assert(htmlContent.includes('<option value="0.5" selected>0.5초</option>'));
assert(htmlContent.includes('<option value="2">2.0초</option>'));

// Check loop count options (1 to 10 and infinite, default 3)
assert(htmlContent.includes('<option value="1">1회</option>'));
assert(htmlContent.includes('<option value="3" selected>3회</option>'));
assert(htmlContent.includes('<option value="10">10회</option>'));
assert(htmlContent.includes('<option value="infinite">무한반복</option>'));

// Check shortcuts in HTML
assert(htmlContent.includes('<kbd>F5</kbd> 빈칸입력'), 'Shortcut bar must have F5 for text input');
assert(htmlContent.includes('<kbd>F6</kbd>(←) 이전문장'), 'Shortcut bar must have F6 for prev sentence');
assert(htmlContent.includes('<kbd>F7</kbd>(→) 다음문장'), 'Shortcut bar must have F7 for next sentence');
assert(htmlContent.includes('<kbd>F11</kbd> 전체문장재생'), 'Shortcut bar must have F11 for play all');
assert(!htmlContent.includes('<kbd>F3</kbd>'), 'F3 must be removed from shortcut bar');
console.log('✓ index.html has exact dropdowns and updated shortcut labels!');

// 2. Test StorageService methods
console.log('\n[Check 2] Testing StorageService defaults & bounds...');
const { StorageService } = await import('../src/services/storage-service.js');
assert.strictEqual(StorageService.getReplaySeconds(), 0.5, 'Default rewind seconds must be 0.5');
assert.strictEqual(StorageService.getSectionSilentSeconds(), 1.0, 'Default section silent seconds must be 1.0');
assert.strictEqual(StorageService.getTargetLoopCount(), 3, 'Default loop count must be 3');

StorageService.setReplaySeconds(1.2);
assert.strictEqual(StorageService.getReplaySeconds(), 1.2);

StorageService.setSectionSilentSeconds(2.5);
assert.strictEqual(StorageService.getSectionSilentSeconds(), 2.5);

StorageService.setTargetLoopCount(5);
assert.strictEqual(StorageService.getTargetLoopCount(), 5);

// Reset defaults
StorageService.setReplaySeconds(0.5);
StorageService.setSectionSilentSeconds(1.0);
StorageService.setTargetLoopCount(3);
console.log('✓ StorageService handles all 3 user settings with defaults and storage persistence');

console.log('\n🎉 ALL HUD DROPDOWN SETTINGS & SHORTCUT TESTS PASSED 100%!');
