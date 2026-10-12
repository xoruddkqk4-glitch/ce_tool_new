# CE Tool 코드 개선 실행 계획서 v2 (LLM 직접 실행용)

- 작성: 2026-10-12 20:50 (KST)
- 대상 저장소: `c:\Users\user\Desktop\local\09ce_tool_new` (Vanilla JS SPA, `index.html`은 번들 산출물 `app.js` + `styles.css`만 로드)
- 대체 문서: `docs/implementation/20261012_1953_implementation_plan.md` (v1, 서술형). **v2가 v1을 완전히 대체합니다.**
- 상태: `/ask` 모드 산출물입니다. **사용자의 `/apply` 명령 전에는 적용하지 마세요.**

> [!IMPORTANT]
> 이 문서의 모든 Diff는 미러 사본에 실제로 적용한 결과를 `git diff --no-index`로 추출한 것입니다.
> 원본의 깨끗한 사본에 `git apply`로 재적용해 검증했습니다(불일치 0건, 테스트 23/23 통과).
> 문서를 손으로 다시 옮겨 적지 말고, Diff를 **그대로** 적용하세요.

---

## 0. 실행 에이전트 필독

### 0-1. 실행 규칙
1. Step 1 → Step 14 **순서대로** 실행합니다. 각 Step에는 대상 파일, 기존 코드 영역, Diff(또는 신규 파일 전체 내용), 의존성/주의, 검증 명령이 있습니다.
2. **각 Diff는 해당 파일의 모든 변경을 담은 단일 패치**입니다. 한 파일은 한 Step에서만 수정합니다.
3. Diff 적용 방법(권장 순서):
   - (A) Diff 블록을 `.patch` 파일로 저장 → 프로젝트 루트에서 `git apply --whitespace=nowarn <file>.patch`
   - (B) `git apply`가 실패하면 hunk별로 수동 적용합니다. `-` 줄이 원본과 정확히 일치하는지 확인하고 `+` 줄로 교체합니다.
4. "신규 파일"은 표시된 전체 내용으로 생성합니다(UTF-8, LF 또는 CRLF 모두 가능).
5. **`app.js`와 `styles.css`는 직접 수정하지 않습니다.** 항상 `npm run build`(Step 1 이후)로 재생성합니다.
6. 금지: `git commit`/`git push`(사용자의 `/git-commit` 전까지), 브라우저 실행, `npm install`(외부 의존성 없음).

### 0-2. 번들러 공통 제약 (모든 Step에 적용)
`tools/build-standalone.js`는 `src/`의 모든 파일을 **하나의 IIFE로 이어 붙이고 `import` 문을 제거**합니다. 따라서:

| 제약 | 이유 | 이번 계획에서의 대응 |
| :--- | :--- | :--- |
| import 별칭 금지 (`import { a as b }`) | 별칭 이름이 번들에 존재하지 않게 됨 | 새 빌더가 별칭을 발견하면 예외 발생 |
| 모듈 최상위 이름은 전체에서 유일해야 함 | 같은 스코프에서 `const` 중복 선언 시 SyntaxError | 새 이름(`escapeHtml`, `playbackController`, `fetchWithTimeout`, `parseJsonLoose`, `runWithFreeTranslateLimit`, `safeGetWithLegacy`, `DIRECT_EMPTY_PLACEHOLDER` 등)이 기존 `app.js`와 겹치지 않음을 확인함 |
| 최상위에서 인스턴스를 만드는 모듈은 의존 모듈 뒤에 배치 | IIFE는 위에서 아래로 평가됨 | `jsFiles` 순서: `utils/dom.js`는 fels-dict 뒤, `boundary-utils.js`는 silence-detector 뒤, `playback-controller.js`는 looper-engine 뒤 |
| 테스트용 mock DOM 호환 | `scratch/test_*.js`는 vm 샌드박스에서 `app.js`를 실행. mock에는 `fetch`/`AbortController`/`requestAnimationFrame`/`querySelector`/`pause` 등이 없을 수 있음 | 새 코드는 `typeof` 가드를 사용하고, `classList.toggle(c, force)`를 쓰지 않음 |

### 0-3. 사전 조건 및 베이스라인
```powershell
node -v                      # v22.12 이상 필요(require(esm) 사용). 현재 환경: v24.15.0
git status                   # 작업 트리가 깨끗한지 확인
git switch -c fix/code-review-20261012   # (선택) 작업 브랜치
```
- 현재 베이스라인: `scratch/test_*.js` 18개 중 **15개 통과, 3개 실패**. 실패하는 3개는 오래된 단언(stale assertion) 때문입니다(Step 12에서 수정).
  - `test_page2_layout_and_cards.js`, `test_user_requirements.js`, `test_user_requirements_v2.js`

### 0-4. 열린 질문(Q1–Q4)에 적용한 기본값
사용자 답변이 없어 v1 계획서의 권장안을 적용했습니다. 다르게 원하면 해당 Step만 조정하면 됩니다.

| 질문 | 채택한 기본값 | 반영 위치 |
| :--- | :--- | :--- |
| Q1. Page 2 진입 시 S1 초기화 정책 | **새 데이터일 때만** FELS 모드를 켜고 S1부터 시작. 재방문(예: Page 3 "S3 ↗")은 현재 문장 유지 | Step 3(`dataVersion`), Step 4(`onActivated`) |
| Q2. 개발용 `index.dev.html` | 만들지 않음(514줄 HTML 중복 방지). 대신 `npm run watch` 자동 재빌드 제공 | Step 1 |
| Q3. 세션 영속화(localStorage) | **보류** | 보류 항목 |
| Q4. 무료 번역 엔드포인트 | 유지하되 **동시 요청 4개 제한 + 10초 타임아웃**. 설정 토글 UI는 보류 | Step 8 |

### 0-5. 변경 파일 총괄표

| Step | 파일 | 구분 | 해결하는 문제 |
| :---: | :--- | :---: | :--- |
| 1 | `package.json`, `tools/build-standalone.js`, `tools/check-syntax.js`, `tools/run-tests.js` | 신규 | 빌드/검사/테스트 단일 명령, watch, 별칭 import 차단 |
| 1 | `scratch/build_standalone.js` | 교체 | 빌더 이동(호환 래퍼만 유지) |
| 2 | `src/utils/dom.js`, `src/audio/playback-controller.js`, `src/audio/boundary-utils.js` | 신규 | XSS 이스케이프 공용화, 공유 `<audio>` 소유권, 문장 경계 계산 중복 제거 |
| 3 | `src/ui/router.js`, `src/core/app-state.js`, `src/audio/looper-engine.js` | 수정 | 페이지 이탈 시 재생 정지, 같은 탭 재선택 시 상태 리셋, 새 데이터 감지, 반복 시 TTS 재발화 |
| 4 | `src/views/practice-view.js` | 수정 | Page 2 루퍼가 Page 1/3 재생을 멈추는 버그, "S3 ↗" 무시 버그, muted 잔존, 터치 드래그, 죽은 코드 |
| 5 | `src/views/input-view.js` | 수정 | 연습 시작 경쟁 조건, 직독직해 칸 밀림, Enter 중복 요청, XSS, 15MB 초과 오디오, 로딩 버튼 참조 끊김 등 |
| 6 | `src/views/memorize-view.js` | 수정 | XSS, 연속 재생 정지 버그, 죽은 교실 모드 참조 |
| 7 | `src/core/text-splitter.js` | 수정 | 숫자 시작 문장 손상, `a.m.` 분할, `."` 뒤 미분할 |
| 8 | `src/services/ai-service.js` | 수정 | API 키 URL 노출, 타임아웃 부재, JSON 펜스 파싱 실패, 무료 번역 폭주, 경계 패딩 이중 적용 |
| 9 | `src/services/storage-service.js`, `src/config/constants.js` | 수정 | 레거시 키 재부활, 미사용 상수, 은퇴 모델 404 왕복 |
| 10 | `src/ui/toast-manager.js`, `src/ui/shortcut-manager.js`, `src/ui/settings-modal.js` | 수정 | 토스트 조기 숨김, 모달 위 단축키 동작, Esc 닫기, 잘못된 모델 배지 |
| 11 | `index.html`, `styles/base/reset.css`, `styles/components/audio-player.css` | 수정 | Pretendard 미로딩, 토스트 접근성, 터치 스크롤 간섭 |
| 12 | `scratch/test_*.js` 3개 수정 + 5개 신규 | 테스트 | 오래된 단언 수정, 회귀 테스트 추가 |
| 13 | `README.md` | 문서 | 실제 디렉토리 구조와 테스트 명령 반영 |
| 14 | `app.js`, `styles.css` | 빌드 | 재생성 후 전체 검증 |

---

## Step 1. 빌드/검사/테스트 도구 (신규 4개 + 래퍼 교체)

**목적:** `npm run build | watch | check | test` 단일 명령 체계를 만듭니다. 빌더를 `tools/`로 옮기고 다음 기능을 추가합니다.
- 새 모듈 3개를 `jsFiles`에 의존 순서대로 추가합니다.
- import 별칭을 발견하면 예외를 발생시킵니다.
- 줄 단위로 고정된 import 제거 정규식을 사용합니다. 기존 정규식과 원본 src 전체에서 동일한 출력이 나오는 것을 확인했습니다.
- `--watch` 옵션을 추가합니다.

**대상 파일**
- 신규: `package.json`, `tools/build-standalone.js`, `tools/check-syntax.js`, `tools/run-tests.js`
- 전체 교체: `scratch/build_standalone.js` (기존 162줄 빌더 → 1줄 `require` 래퍼)

**기존 코드 영역:** `scratch/build_standalone.js` 전체(L1–끝). 빌더 로직은 `tools/build-standalone.js`로 이동합니다.

### 1-1. 신규 `package.json`
```json
{
  "name": "ce-tool",
  "version": "1.1.0",
  "private": true,
  "description": "CE Tool - 3-Page Chunk & FELS Weak-Form Listening Trainer (standalone, zero dependencies)",
  "scripts": {
    "build": "node tools/build-standalone.js",
    "watch": "node tools/build-standalone.js --watch",
    "check": "node tools/check-syntax.js",
    "test": "node tools/run-tests.js"
  }
}

```

### 1-2. 신규 `tools/build-standalone.js`
```js
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

```

### 1-3. 신규 `tools/check-syntax.js`
```js
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

```

### 1-4. 신규 `tools/run-tests.js`
```js
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

```

### 1-5. `scratch/build_standalone.js` 전체 교체
```js
/**
 * Backward-compatible entry point.
 * The builder moved to tools/build-standalone.js — this wrapper keeps
 * `node scratch/build_standalone.js` (referenced in README history) working.
 */
require('../tools/build-standalone.js');

```

**의존성/주의**
- `package.json`에 `"type"` 필드를 **넣지 마세요.** 기존 테스트는 CJS(`require`)와 ESM(`import`)이 섞여 있고, Node의 구문 자동 감지에 의존합니다. `"type": "module"`을 넣으면 CJS 테스트가 깨집니다.
- `jsFiles`에 Step 2의 신규 파일이 포함되어 있으므로 **Step 2까지 적용해야 첫 빌드가 성공**합니다.

**검증:** Step 2 완료 후 함께 실행합니다.

---

## Step 2. 공용 모듈 신규 생성 (3개)

**목적**
- `utils/dom.js`: `InputView.escapeHtml` 메서드를 공용 함수로 승격하고, 모든 뷰의 `innerHTML` 보간에 사용합니다.
- `audio/playback-controller.js`: Page 1·2·3이 공유하는 `<audio id="nativeAudioPlayer">`의 **현재 소유자**를 추적합니다. 토큰 방식으로 오래된 구간 감시를 무효화합니다. 이것이 핵심 버그(Page 2 루퍼가 다른 페이지의 재생을 멈춤)를 고치는 기반입니다.
- `audio/boundary-utils.js`: `input-view.js`에 두 번 중복된 "AI 정렬 → VAD 폴백 → 한국어 안내 교차검증 → 끝 패딩" 로직(원본 L430–473, L544–585)을 하나로 합칩니다. 패딩 산술은 원본과 동일합니다.

### 2-1. 신규 `src/utils/dom.js`
```js
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

```

### 2-2. 신규 `src/audio/playback-controller.js`
```js
/**
 * Playback Controller — single owner of the shared <audio id="nativeAudioPlayer">.
 *
 * Why: Page 1 (Input), Page 2 (Practice) and Page 3 (Memorize) share one audio element.
 * Previously Page 2's looper enforced *its* sentence boundary on every timeupdate regardless of
 * which page started playback, which instantly paused Page 1 "문장 듣기" (S2+) and stalled Page 3
 * "전체 스크립트 연속 재생". This controller tracks the current owner and cancels stale segment
 * watchers with a token so only one segment is ever enforced.
 *
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

function scheduleFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 16);
}

function cancelFrame(id) {
  if (id === null || id === undefined) return;
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

export class PlaybackController {
  constructor() {
    this.player = null;
    this.owner = null; // 'input' | 'practice' | 'memorize' | null
    this.segmentToken = 0;
    this.segmentFrame = null;
  }

  getPlayer() {
    if (!this.player && typeof document !== 'undefined' && document.getElementById) {
      this.player = document.getElementById('nativeAudioPlayer');
    }
    return this.player;
  }

  /**
   * Sets the audio source (only when changed) and ALWAYS re-applies the muted flag,
   * so a previous synthesized (muted) session never silences a real MP3.
   */
  setSource(url, { muted = false } = {}) {
    const player = this.getPlayer();
    if (!player) return;
    if (url && player.src !== url) {
      player.src = url;
    }
    player.muted = !!muted;
  }

  /** Marks `owner` as the active playback owner. Cancels any segment watcher of a previous owner. */
  claim(owner) {
    if (this.owner !== owner) {
      this.cancelSegment();
      this.owner = owner || null;
    }
  }

  isOwnedBy(owner) {
    return this.owner === owner;
  }

  cancelSegment() {
    this.segmentToken++;
    cancelFrame(this.segmentFrame);
    this.segmentFrame = null;
  }

  /**
   * Plays [start, end) and pauses at `end`. A newer playSegment()/stop()/claim() call invalidates
   * this watcher. If `end` is null/NaN the segment plays until the media ends.
   * onEnd fires only when the segment finishes naturally (not when cancelled or paused externally).
   * @returns {Promise<boolean>} resolves true when playback started for this (still-valid) segment
   */
  playSegment(start, end, { owner = null, onEnd = null } = {}) {
    const player = this.getPlayer();
    if (!player || typeof player.play !== 'function') return Promise.resolve(false);

    this.claim(owner);
    this.cancelSegment();
    const token = this.segmentToken;

    try {
      player.currentTime = Math.max(0, Number(start) || 0);
    } catch (e) {
      // currentTime may throw before metadata is loaded; play() will still start from 0
    }

    const hasEnd = typeof end === 'number' && isFinite(end);
    const watch = () => {
      if (token !== this.segmentToken) return;
      if ((hasEnd && player.currentTime >= end) || player.ended) {
        if (typeof player.pause === 'function') player.pause();
        this.segmentFrame = null;
        if (typeof onEnd === 'function') onEnd();
        return;
      }
      if (player.paused) {
        // Paused by the user or another control: stop watching silently (no onEnd)
        this.segmentFrame = null;
        return;
      }
      this.segmentFrame = scheduleFrame(watch);
    };

    return Promise.resolve(player.play()).then(() => {
      if (token !== this.segmentToken) return false;
      this.segmentFrame = scheduleFrame(watch);
      return true;
    });
  }

  /** Cancels the active segment watcher and pauses playback. */
  stop() {
    this.cancelSegment();
    const player = this.getPlayer();
    if (player && !player.paused && typeof player.pause === 'function') {
      player.pause();
    }
  }
}

export const playbackController = new PlaybackController();

```

### 2-3. 신규 `src/audio/boundary-utils.js`
```js
/**
 * Sentence Boundary Resolver
 * Single place for: AI alignment (optional) → PCM VAD fallback → Korean intro cross-check → end padding.
 * Previously duplicated in InputView.handleTranslate() and InputView.autoSyncAudioScript().
 *
 * NOTE: The standalone bundler strips imports, so never import this with an alias (`as`).
 */

import { detectAudioSentenceBoundaries, detectKoreanIntroDuration } from './silence-detector.js';

export const BOUNDARY_END_PADDING_SEC = 0.9;       // headroom after a sentence end (never cut the last word)
export const BOUNDARY_LAST_END_PADDING_SEC = 1.0;  // headroom for the last sentence (bounded by file length)
export const BOUNDARY_NEXT_GAP_SEC = 0.15;         // stop this far before the next sentence starts
export const BOUNDARY_MIN_SEGMENT_SEC = 0.4;       // never shrink a segment below this
export const BOUNDARY_INTRO_MIN_SEC = 2.0;         // only trust Korean intro detection above this length
export const BOUNDARY_INTRO_TOLERANCE_SEC = 0.5;

/**
 * Mutates `boundaries` in place: extends each end by the padding policy, bounded by the next start.
 * Same arithmetic as the previous inline loop in input-view.js (entries with end === null/undefined are skipped).
 */
export function applyBoundaryEndPadding(boundaries, totalDuration = null) {
  if (!Array.isArray(boundaries)) return boundaries;
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (!b || b.end === null || b.end === undefined) continue;
    const nextStart = (i + 1 < boundaries.length && boundaries[i + 1] && boundaries[i + 1].start !== null)
      ? boundaries[i + 1].start
      : totalDuration;
    if (nextStart !== null && nextStart !== undefined && nextStart > b.start) {
      const maxSafeEnd = Math.max(b.start + BOUNDARY_MIN_SEGMENT_SEC, nextStart - BOUNDARY_NEXT_GAP_SEC);
      b.end = Math.min(maxSafeEnd, Math.round((b.end + BOUNDARY_END_PADDING_SEC) * 10) / 10);
    } else if (totalDuration !== null && totalDuration !== undefined) {
      b.end = Math.min(totalDuration, Math.round((b.end + BOUNDARY_LAST_END_PADDING_SEC) * 10) / 10);
    }
  }
  return boundaries;
}

/**
 * @param {Object} params
 * @param {AudioBuffer|null} params.audioBuffer
 * @param {string[]} params.sentences
 * @param {Function|null} params.aiAlign  async () => [{ start, end }] | null  (optional)
 * @returns {Promise<Array<{start:number|null,end:number|null}>>}
 */
export async function resolveSentenceBoundaries({ audioBuffer = null, sentences = [], aiAlign = null } = {}) {
  let boundaries = null;

  if (typeof aiAlign === 'function') {
    try {
      const alignments = await aiAlign();
      if (alignments && alignments.length === sentences.length) {
        boundaries = alignments.map(a => ({ start: a.start, end: a.end }));
      }
    } catch (err) {
      console.warn('AI audio alignment fallback:', err);
    }
  }

  if (!boundaries) {
    boundaries = detectAudioSentenceBoundaries(audioBuffer, sentences);
  } else if (audioBuffer && boundaries.length > 0) {
    // Cross-verify with PCM VAD to guarantee the Korean intro announcement is skipped
    const introSec = detectKoreanIntroDuration(audioBuffer, sentences);
    if (introSec > BOUNDARY_INTRO_MIN_SEC && boundaries[0].start !== null && boundaries[0].start < introSec - BOUNDARY_INTRO_TOLERANCE_SEC) {
      boundaries[0].start = introSec;
    }
  }

  if (boundaries && boundaries.length === sentences.length) {
    applyBoundaryEndPadding(boundaries, audioBuffer ? audioBuffer.duration : null);
  }
  return boundaries || [];
}

```

**의존성/주의**
- 세 파일 모두 다른 파일에서 **별칭 없이** import해야 합니다.
- `playback-controller.js`는 최상위에서 `new PlaybackController()`를 실행하지만, `document` 접근은 `getPlayer()`에서 지연 수행합니다. 따라서 Node 단위 테스트에서도 안전합니다.
- `boundary-utils.js`는 `silence-detector.js`에 의존하므로 `jsFiles`에서 반드시 그 뒤에 있어야 합니다(Step 1에 반영됨).

**검증 (Step 1 + 2)**
```powershell
npm run build    # "Zero imports/exports confirmed" 출력 확인
npm run check    # 모든 파일 node --check 통과
```

---

## Step 3. 라우터 · 상태 · 루퍼 엔진

**목적**
- `router.js`: 페이지를 떠날 때 `playbackController.stop()`을 호출합니다. 같은 탭을 다시 눌러도 `onActivated()`가 재실행되지 않게 합니다(Page 2 문장 위치 리셋 방지). 주석의 앱 이름 "ChunkLingo"를 "CE Tool"로 바꿉니다.
- `app-state.js`: `dataVersion` 카운터를 추가합니다. `setSentenceList()`와 `resetAll()`에서 1씩 증가합니다. 뷰가 "새 데이터"와 "재방문"을 구분하는 데 씁니다(Q1).
- `looper-engine.js`: 쉐도잉 반복이 다시 시작될 때 `onLoopRestart` 콜백을 호출합니다. 합성(무음 WAV) 세션에서 반복마다 TTS를 다시 재생하기 위함입니다.

### 3-1. `src/ui/router.js`
- 기존 코드 영역: L1–L13, L37–L49
```diff
diff --git a/src/ui/router.js b/src/ui/router.js
--- a/src/ui/router.js
+++ b/src/ui/router.js
@@ -1,13 +1,16 @@
 /**
- * SPA Page Router for ChunkLingo
+ * SPA Page Router for CE Tool
  * Switches between 3 views (Input, Practice, Memorize) without browser reload,
  * preserving Web Audio API Context, PCM audio buffers, and sentence states.
  */
 
+import { playbackController } from '../audio/playback-controller.js';
+
 export class AppRouter {
   constructor(views = {}) {
     this.views = views; // { input: View, practice: View, memorize: View }
     this.currentPage = 'input';
+    this.hasNavigated = false;
     this.initEvents();
   }
 
@@ -37,13 +40,19 @@ export class AppRouter {
 
   navigateTo(pageId, updateHash = true) {
     if (!this.views[pageId] && !document.getElementById(`view-${pageId}`)) return;
+    // Re-selecting the current tab must not reset the view state (e.g. Page 2 sentence position)
+    if (this.hasNavigated && pageId === this.currentPage) return;
 
     const prevPage = this.currentPage;
     if (this.views[prevPage] && typeof this.views[prevPage].onDeactivated === 'function') {
       this.views[prevPage].onDeactivated();
     }
 
+    // Any page-owned segment playback must stop when leaving the page
+    playbackController.stop();
+
     this.currentPage = pageId;
+    this.hasNavigated = true;
 
     // 1. Update navigation tab buttons
     document.querySelectorAll('.nav-tab-btn').forEach(btn => {

```

### 3-2. `src/core/app-state.js`
- 기존 코드 영역: L23–L28, L77–L82, L124–L129
```diff
diff --git a/src/core/app-state.js b/src/core/app-state.js
--- a/src/core/app-state.js
+++ b/src/core/app-state.js
@@ -23,6 +23,8 @@ export class AppState {
     this.scriptText = '';
     this.sentenceList = [];
     this.activeSentenceIndex = 0;
+    // Incremented whenever a NEW sentence list is loaded (lets views tell fresh data from revisits)
+    this.dataVersion = 0;
 
     // A-B Looper & Shadowing
     this.loopStart = null;
@@ -77,6 +79,7 @@ export class AppState {
   setSentenceList(list) {
     this.sentenceList = list || [];
     this.activeSentenceIndex = 0;
+    this.dataVersion++;
     this.clearLoop();
     this.emit('sentencesLoaded', this.sentenceList);
   }
@@ -124,6 +127,7 @@ export class AppState {
     this.scriptText = '';
     this.sentenceList = [];
     this.activeSentenceIndex = 0;
+    this.dataVersion++;
     this.clearLoop();
     this.emit('reset');
   }

```

### 3-3. `src/audio/looper-engine.js`
- 기존 코드 영역: L30–L36, L77–L82
```diff
diff --git a/src/audio/looper-engine.js b/src/audio/looper-engine.js
--- a/src/audio/looper-engine.js
+++ b/src/audio/looper-engine.js
@@ -30,7 +30,8 @@ export class LooperEngine {
       onLoopComplete: () => {},
       onShadowingWait: () => {},
       onAutoAdvance: () => {},
-      onPlayStateChange: () => {}
+      onPlayStateChange: () => {},
+      onLoopRestart: () => {}
     };
   }
 
@@ -77,6 +78,8 @@ export class LooperEngine {
               player.currentTime = this.appState.loopStart;
               player.play().then(() => {
                 this.callbacks.onPlayStateChange(true);
+                // Lets the view re-trigger TTS for synthesized (silent WAV) sessions on every repeat
+                this.callbacks.onLoopRestart();
               }).catch(e => console.error(e));
             }
           }, CONSTANTS.SHADOWING_PAUSE_MS);

```

**의존성/주의**
- `router.js`가 `playback-controller.js`를 import합니다. 번들 순서상 `router.js`는 `playback-controller.js`보다 뒤에 있으므로 문제없습니다.
- 같은 페이지 가드는 `hasNavigated`가 `true`일 때만 동작합니다. 따라서 앱 시작 시 `main.js`의 첫 `navigateTo('input')`는 정상적으로 실행됩니다.

**검증:** `npm run build; npm run check`

---

## Step 4. Page 2 — `src/views/practice-view.js`

**해결하는 문제**
1. **(핵심 버그)** `timeupdate`와 rAF 루프가 현재 페이지와 무관하게 `looperEngine.checkBoundary()`를 호출했습니다. 이 때문에 Page 1 "문장 듣기"(S2 이후)가 즉시 멈추고 Page 3 연속 재생이 정지했습니다. → `isLooperActive()`(Page 2가 보이고 **그리고** 재생 소유자가 `'practice'`일 때만 true)로 가드합니다.
2. **"S3 ↗" 무시:** `onActivated()`가 항상 `activeSentenceIndex = 0`으로 초기화했습니다. → 새 데이터(`dataVersion` 변경)일 때만 FELS 모드를 켜고, 문장 위치는 유효 범위로 고정(clamp)해 유지합니다.
3. **muted 잔존:** `src`가 바뀔 때만 `muted`를 갱신해서, 합성 세션 뒤 실제 MP3가 무음으로 재생될 수 있었습니다. → `playbackController.setSource()`가 항상 muted 값을 다시 적용합니다.
4. Page 2 재생 시작 지점(`togglePlayPause`, `setLoopRange`, `startRegionLoop`, `onActivated`)에서 `playbackController.claim('practice')`를 호출합니다.
5. **터치/펜 드래그:** 파형 캔버스를 mouse 이벤트에서 Pointer Events로 전환합니다(`setPointerCapture`, `pointercancel` 처리).
6. **합성 세션 반복 시 TTS 재발화:** `onLoopRestart` 콜백을 구현합니다.
7. **죽은 코드 제거:**
   - `calculateUniformBlankWidth` import
   - `stabilizedWidths` (값은 비우기만 하고 채우는 곳이 없음)
   - `.copy-btn` 바인딩과 `copyResult()` (해당 버튼이 index.html에 없음)
   - 호출처가 없는 `translateCustomChunk()`

- 기존 코드 영역: L14–L22, L86–L93, L117–L126, L130–L136, L225–L238, L281–L296, L300–L306, L390–L399, L575–L597, L604–L611, L658–L663, L746–L751, L779–L784, L823–L829, L840–L849, L1124–L1130, L1158–L1185, L1197–L1202, L1212–L1225
```diff
diff --git a/src/views/practice-view.js b/src/views/practice-view.js
--- a/src/views/practice-view.js
+++ b/src/views/practice-view.js
@@ -14,9 +14,9 @@ import { appState } from '../core/app-state.js';
 import { getFelsInfo } from '../config/fels-dict.js';
 import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
 import { aiService } from '../services/ai-service.js';
-import { calculateUniformBlankWidth } from '../core/fels-engine.js';
 import { WaveformRenderer } from '../audio/waveform-renderer.js';
 import { LooperEngine, formatPreciseTime, formatTime } from '../audio/looper-engine.js';
+import { playbackController } from '../audio/playback-controller.js';
 import { speakText } from '../audio/tts-synthesizer.js';
 import { toast } from '../ui/toast-manager.js';
 import { splitIntoSentences, distributeChunksSequentially } from '../core/text-splitter.js';
@@ -86,8 +86,9 @@ export class PracticeView {
     this.currentMouseX = null;
     this.draggingDividerIndex = null;
     this.selectedDividerForMove = null;
-    this.stabilizedWidths = [];
     this.felsBlanks = [];
+    // Last AppState.dataVersion seen by onActivated (fresh data → FELS mode default)
+    this.lastSeenDataVersion = -1;
 
     this.initLooperCallbacks();
     this.initEvents();
@@ -117,10 +118,27 @@ export class PracticeView {
       },
       onPlayStateChange: (isPlaying) => {
         this.updatePlayPauseIcon(isPlaying);
+      },
+      onLoopRestart: () => {
+        // Synthesized sessions play a silent WAV; re-speak the sentence on every loop repeat
+        if (appState.isSynthesizedAudio) {
+          const activeStn = appState.getActiveSentence();
+          if (activeStn) speakText(activeStn.text);
+        }
       }
     });
   }
 
+  /**
+   * Page 2 looper/sentence-boundary enforcement is only valid while Page 2 is visible AND
+   * Page 2 started the current playback. Prevents pausing Page 1 / Page 3 segment playback.
+   */
+  isLooperActive() {
+    const onPracticePage = !this.router || typeof this.router.getCurrentPage !== 'function'
+      || this.router.getCurrentPage() === 'practice';
+    return onPracticePage && playbackController.isOwnedBy('practice');
+  }
+
   initEvents() {
     // 1. Audio Player Events
     if (this.nativeAudioPlayer) {
@@ -130,7 +148,7 @@ export class PracticeView {
 
       this.nativeAudioPlayer.addEventListener('timeupdate', () => {
         this.updateAudioProgress();
-        this.looperEngine.checkBoundary();
+        if (this.isLooperActive()) this.looperEngine.checkBoundary();
         this.drawWaveform();
       });
 
@@ -225,14 +243,7 @@ export class PracticeView {
       toggleRowNaturalBtn.addEventListener('click', () => this.toggleRowNaturalVisibility());
     }
 
-    // Copy & Speak Row buttons
-    document.querySelectorAll('.copy-btn').forEach(btn => {
-      btn.addEventListener('click', () => {
-        const target = btn.getAttribute('data-target');
-        this.copyResult(target, btn);
-      });
-    });
-
+    // Speak Row buttons
     document.querySelectorAll('.speak-btn').forEach(btn => {
       btn.addEventListener('click', () => {
         const target = btn.getAttribute('data-target');
@@ -281,16 +292,24 @@ export class PracticeView {
     if (!this.waveformCanvas) return;
     const canvas = this.waveformCanvas;
 
-    canvas.addEventListener('mousedown', (e) => {
+    // Pointer Events: one code path for mouse, touch (tablets / interactive whiteboards) and pen.
+    // setPointerCapture keeps move/up events on the canvas even when the pointer leaves it.
+    canvas.addEventListener('pointerdown', (e) => {
       if (!this.nativeAudioPlayer.src) return;
+      if (e.pointerType === 'mouse' && e.button !== 0) return;
       const rect = canvas.getBoundingClientRect();
       this.isCanvasMouseDown = true;
       this.dragStartX = e.clientX - rect.left;
       this.currentMouseX = this.dragStartX;
       this.isRangeDragging = false;
+      if (typeof canvas.setPointerCapture === 'function') {
+        try {
+          canvas.setPointerCapture(e.pointerId);
+        } catch (err) {}
+      }
     });
 
-    window.addEventListener('mousemove', (e) => {
+    canvas.addEventListener('pointermove', (e) => {
       if (!this.isCanvasMouseDown || !this.waveformCanvas) return;
       const rect = this.waveformCanvas.getBoundingClientRect();
       this.currentMouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
@@ -300,7 +319,15 @@ export class PracticeView {
       }
     });
 
-    window.addEventListener('mouseup', (e) => {
+    canvas.addEventListener('pointercancel', () => {
+      this.isCanvasMouseDown = false;
+      this.isRangeDragging = false;
+      this.dragStartX = null;
+      this.currentMouseX = null;
+      this.drawWaveform();
+    });
+
+    canvas.addEventListener('pointerup', (e) => {
       if (!this.isCanvasMouseDown) return;
       const rect = this.waveformCanvas.getBoundingClientRect();
       const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
@@ -390,10 +417,9 @@ export class PracticeView {
       targetStn.cachedPeaks = WaveformRenderer.extractSentencePeaks(appState.audioBuffer, targetStn);
     }
 
-    // Synchronize Audio Player Source
-    if (appState.uploadedAudioUrl && (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl)) {
-      this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
-      this.nativeAudioPlayer.muted = appState.isSynthesizedAudio;
+    // Synchronize Audio Player Source (muted flag is ALWAYS re-applied → no silent real MP3)
+    if (appState.uploadedAudioUrl) {
+      playbackController.setSource(appState.uploadedAudioUrl, { muted: appState.isSynthesizedAudio });
     }
 
     // Update Natural Korean Text (Keep hidden by default)
@@ -575,23 +601,6 @@ export class PracticeView {
     }, 50);
   }
 
-  translateCustomChunk(chunkEn, originalChunks = []) {
-    const cleanEn = chunkEn.trim();
-    if (!cleanEn) return '';
-    const existing = (originalChunks || []).find(c => c.en && c.en.trim().toLowerCase() === cleanEn.toLowerCase());
-    if (existing && existing.ko) return existing.ko;
-
-    try {
-      const parsed = this.ruleEngine.process(cleanEn);
-      if (parsed && parsed.chunks && parsed.chunks.length > 0) {
-        return parsed.chunks.map(c => c.ko).join(' ');
-      }
-      if (parsed && parsed.natural) return parsed.natural;
-    } catch (e) {}
-
-    return this.ruleEngine.translatePhrase(cleanEn) || cleanEn;
-  }
-
   findNextBlank(currentInput) {
     const idx = this.felsBlanks.findIndex(b => b.inputEl === currentInput);
     if (idx !== -1 && idx + 1 < this.felsBlanks.length) {
@@ -604,8 +613,6 @@ export class PracticeView {
     const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
     if (!cards.length) return;
 
-    this.stabilizedWidths = [];
-
     cards.forEach((card) => {
       const felsWrap = card.querySelector('.chunk-tokens-fels');
       const origWrap = card.querySelector('.chunk-tokens-original');
@@ -658,6 +665,7 @@ export class PracticeView {
     }
 
     if (this.nativeAudioPlayer.paused) {
+      playbackController.claim('practice');
       const activeStn = appState.getActiveSentence();
       const stnStart = (activeStn && activeStn.audioStart !== null) ? activeStn.audioStart : 0;
       const stnEnd = (activeStn && activeStn.audioEnd !== null) ? activeStn.audioEnd : this.nativeAudioPlayer.duration;
@@ -746,6 +754,7 @@ export class PracticeView {
     appState.setLoopRange(start, end);
     this.updateLoopBadge();
 
+    playbackController.claim('practice');
     this.nativeAudioPlayer.currentTime = appState.loopStart;
     this.nativeAudioPlayer.play().then(() => {
       this.updatePlayPauseIcon(true);
@@ -779,6 +788,7 @@ export class PracticeView {
       this.looperEngine.reset();
       this.updateLoopBadge();
 
+      playbackController.claim('practice');
       this.nativeAudioPlayer.currentTime = appState.loopStart;
       this.nativeAudioPlayer.play().then(() => {
         this.updatePlayPauseIcon(true);
@@ -823,7 +833,7 @@ export class PracticeView {
     this.updateFelsModeButtonUI();
 
     const cards = this.chunksContainer.querySelectorAll('.chunk-card-3d');
-    cards.forEach((card, idx) => {
+    cards.forEach((card) => {
       const felsWrap = card.querySelector('.chunk-tokens-fels');
       const origWrap = card.querySelector('.chunk-tokens-original');
 
@@ -840,10 +850,6 @@ export class PracticeView {
           origWrap.style.display = 'inline-flex';
         }
       }
-
-      if (this.stabilizedWidths[idx]) {
-        card.style.width = `${this.stabilizedWidths[idx]}px`;
-      }
     });
 
     toast.show(appState.isFelsMode ? '✏️ FELS 빈칸 모드로 전환되었습니다.' : '📖 원문 전체 보기 모드로 전환되었습니다.');
@@ -1124,7 +1130,7 @@ export class PracticeView {
     const loop = () => {
       if (!this.nativeAudioPlayer.paused && !this.nativeAudioPlayer.ended) {
         this.updateAudioProgress();
-        this.looperEngine.checkBoundary();
+        if (this.isLooperActive()) this.looperEngine.checkBoundary();
         this.drawWaveform();
         requestAnimationFrame(loop);
       } else {
@@ -1158,28 +1164,6 @@ export class PracticeView {
     });
   }
 
-  copyResult(target, btn) {
-    const activeStn = appState.getActiveSentence();
-    if (!activeStn) return;
-
-    let text = '';
-    if (target === 'en') {
-      text = activeStn.text || '';
-    } else if (target === 'chunk') {
-      text = activeStn.result?.chunks ? activeStn.result.chunks.map(c => c.ko).join(' || ') : '';
-    } else if (target === 'natural') {
-      text = activeStn.result?.natural || '';
-    }
-
-    if (!text) return;
-    navigator.clipboard.writeText(text).then(() => {
-      const orig = btn.innerHTML;
-      btn.innerHTML = '<span>복사됨!</span>';
-      setTimeout(() => { btn.innerHTML = orig; }, 1500);
-      toast.show('📋 클립보드에 복사되었습니다.');
-    });
-  }
-
   speakResult(target) {
     const activeStn = appState.getActiveSentence();
     if (!activeStn) return;
@@ -1197,6 +1181,8 @@ export class PracticeView {
   }
 
   onActivated() {
+    playbackController.claim('practice');
+
     // 1. If sentenceList is empty, seed with default sample sentence
     if (!appState.sentenceList || appState.sentenceList.length === 0) {
       const defaultScript = "I went to school yesterday. She bought a new book at the bookstore.";
@@ -1212,14 +1198,23 @@ export class PracticeView {
       appState.setSentenceList(list);
     }
 
-    // 2. Default state: Sentence 1 + FELS Weak-Form mode
-    appState.activeSentenceIndex = 0;
-    appState.isFelsMode = true;
+    // 2. Default state policy:
+    //    - Fresh data (new sentence list since the last visit) → FELS Weak-Form mode.
+    //      (AppState.setSentenceList() already reset activeSentenceIndex to S1.)
+    //    - Revisit (e.g. Page 3 "S3 ↗" jump, returning from Page 3) → keep the current sentence.
+    const isFreshData = this.lastSeenDataVersion !== appState.dataVersion;
+    this.lastSeenDataVersion = appState.dataVersion;
+    if (isFreshData) {
+      appState.isFelsMode = true;
+    }
+    const lastIdx = appState.sentenceList.length - 1;
+    const startIdx = Math.min(Math.max(0, appState.activeSentenceIndex || 0), lastIdx);
+    appState.activeSentenceIndex = startIdx;
     this.updateFelsModeButtonUI();
 
-    // 3. Render sentence navigator & load sentence 1
+    // 3. Render sentence navigator & load the active sentence
     this.renderSentenceNavigator();
-    this.loadSentence(0);
+    this.loadSentence(startIdx);
 
     // 4. Ensure Waveform Canvas is drawn with proper visible dimensions
     this.drawWaveform();

```

**의존성/주의**
- Step 2(`playback-controller.js`)와 Step 3(`appState.dataVersion`, `onLoopRestart`)이 먼저 적용되어 있어야 합니다.
- `this.router.getCurrentPage()`는 `router.js` L72에 이미 존재합니다. 테스트처럼 router가 없는 경우를 대비해 `typeof` 가드를 둡니다.
- `pointermove`/`pointerup`을 `window`가 아닌 `canvas`에 등록하는 것은 의도된 변경입니다. 캔버스 밖으로 나간 포인터는 `setPointerCapture`로 계속 추적됩니다.
- CSS `touch-action: none`(Step 11)과 함께 적용해야 터치 드래그 중 페이지가 스크롤되지 않습니다.

**검증:** `npm run build; npm run check; node tools/run-tests.js page1`

---

## Step 5. Page 1 — `src/views/input-view.js`

**해결하는 문제**
1. **연습 시작 경쟁 조건:** `startPracticeHandler`가 `handleTranslate()`를 기다리지 않아, Page 2가 데모/이전 데이터로 열렸습니다. → `async`로 바꾸고 `await`합니다. `handleTranslate()`는 `Promise<boolean>`을 반환하며, `false`면 이동하지 않습니다. `isStartingPractice` 재진입 가드를 추가합니다.
   - `success`는 `setSentenceList()` 직후에 `true`가 됩니다(데이터 준비 기준). 이후 렌더 단계에서 예외가 나도 연습 페이지로 이동합니다.
2. **번역 중 재진입:** Ctrl+Enter나 프리셋 칩으로 중복 실행되던 문제 → 버튼이 `disabled`면 `false`를 반환합니다.
3. **경계 계산 중복 제거:** 원본 L430–473과 L544–585를 `computeSentenceBoundaries()` → `resolveSentenceBoundaries()`(Step 2)로 대체합니다.
4. **오디오 15MB 제한:** Gemini 인라인 요청 한도(약 20MB)를 넘는 파일은 STT 전에 거부합니다. AI 정렬도 건너뜁니다(`canSendAudioToAI`, `shouldUseAiAlignment`).
5. **Base64 캐시:** 같은 파일을 STT, 정렬, 재동기화마다 다시 인코딩하지 않습니다(`getAudioBase64`).
6. **문장 듣기:** `playbackController.playSegment(..., { owner: 'input' })`를 사용합니다. 구간 끝은 rAF로 정확히 처리하고, 실패하면 TTS로 폴백합니다. `currentStopHandler`를 제거합니다.
7. **직독직해 칸 밀림:** 빈 청크가 `filter(Boolean)`으로 사라져 뒤 칸의 번역이 앞으로 밀렸습니다. → 빈 칸은 `—` 자리표시자로 유지합니다. 입력 칸 수가 청크 수와 다르면 경고하고 원래 값으로 되돌립니다.
8. **Enter 중복 처리:** Enter(`keydown`)와 `change`가 모두 업데이트를 실행해 AI 요청이 2번 나갔습니다. → Enter는 `blur()`만 하여 `change` 한 번으로 처리합니다. 한글 IME 조합 중(`isComposing`)에는 무시합니다.
9. **청크 재번역 경쟁:** 구분선 클릭과 `||` 입력이 비동기로 겹쳐 결과가 뒤섞였습니다. → 문장별 `busySentences`(WeakSet) 가드를 둡니다.
10. **로딩 버튼:** `setLoading()`이 버튼 `innerHTML`을 통째로 다시 써서 `this.btnTranslateText` 참조가 끊겼습니다. → 마크업은 유지하고 라벨 텍스트, `disabled`, `spin-icon` 클래스만 토글합니다(`getTranslateButtonLabel()` 공용화).
11. **XSS:** 다음 값을 `escapeHtml()`로 이스케이프합니다.
    - 파일명/MIME (`renderDropAreaPreview`)
    - 유인물의 단어, 직독직해, 교사용 영문
12. **드래그&드롭:** MIME 타입이 비어 있는 OS를 위해 확장자로도 오디오를 허용합니다.
13. **유인물 연도:** 하드코딩된 `2026.`을 `new Date().getFullYear()`로 바꿉니다.
14. **Esc 키:** Esc로 유인물 모달을 닫습니다.

- 기존 코드 영역: L16–L31, L94–L101, L178–L190, L220–L225, L234–L250, L276–L283, L312–L336, L380–L385, L390–L396, L398–L406, L427–L476, L518–L523, L528–L533, L542–L589, L1011–L1027, L1029–L1053, L1164–L1175, L1224–L1229, L1237–L1242, L1248–L1253, L1263–L1282, L1328–L1340, L1342–L1350, L1356–L1389, L1444–L1455, L1476–L1482, L1486–L1492, L1497–L1502, L1522–L1528, L1584–L1590, L1715–L1744
```diff
diff --git a/src/views/input-view.js b/src/views/input-view.js
--- a/src/views/input-view.js
+++ b/src/views/input-view.js
@@ -16,16 +16,29 @@ import { splitIntoSentences, distributeChunksSequentially, cleanPracticeSentence
 import { aiService } from '../services/ai-service.js';
 import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
 import { decodeAudioFile, getAudioContext } from '../audio/audio-context.js';
-import { detectAudioSentenceBoundaries, detectKoreanIntroDuration } from '../audio/silence-detector.js';
+import { detectAudioSentenceBoundaries } from '../audio/silence-detector.js';
+import { resolveSentenceBoundaries } from '../audio/boundary-utils.js';
+import { playbackController } from '../audio/playback-controller.js';
 import { synthesizeSilentAudioForScript, speakText } from '../audio/tts-synthesizer.js';
 import { getFelsInfo } from '../config/fels-dict.js';
 import { toast } from '../ui/toast-manager.js';
+import { escapeHtml } from '../utils/dom.js';
+
+// Placeholder kept in the 직독직해 slash string for empty chunks so slot positions never shift
+const DIRECT_EMPTY_PLACEHOLDER = '—';
+// Inline base64 audio requests above this size are rejected by Gemini (≈20MB request limit)
+const MAX_AI_INLINE_AUDIO_BYTES = 15 * 1024 * 1024;
+// Some OSes report an empty MIME type on drag & drop, so also accept by extension
+const AUDIO_FILE_EXT_RE = /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i;
 
 export class InputView {
   constructor(router) {
     this.router = router;
     this.ruleEngine = new RuleChunkEngine();
     this.handoutMode = 'student'; // 'student' | 'teacher'
+    this.isStartingPractice = false;     // re-entrancy guard for the 3 "start practice" buttons
+    this.busySentences = new WeakSet();   // sentences with an in-flight chunk re-translation
+    this.cachedBase64 = null;             // { file, base64 } — avoid re-encoding the same upload
 
     // DOM Elements - Input Form
     this.container = document.getElementById('view-input');
@@ -94,8 +107,9 @@ export class InputView {
 
       this.dropArea.addEventListener('drop', (e) => {
         const files = e.dataTransfer.files;
-        if (files.length > 0 && files[0].type.startsWith('audio/')) {
-          this.handleAudioFile(files[0]);
+        const f = files.length > 0 ? files[0] : null;
+        if (f && ((f.type || '').startsWith('audio/') || AUDIO_FILE_EXT_RE.test(f.name || ''))) {
+          this.handleAudioFile(f);
         } else {
           toast.show('⚠️ 오디오 파일(.mp3, .wav 등)만 업로드 가능합니다.');
         }
@@ -178,13 +192,21 @@ export class InputView {
     }
 
     // Transition to Page 2
-    const startPracticeHandler = () => {
-      if (!appState.sentenceList || appState.sentenceList.length === 0) {
-        if (this.inputEnglish && this.inputEnglish.value.trim()) {
-          this.handleTranslate();
+    // Waits for the translation to finish before navigating (previously raced: Page 2 opened with stale/demo data)
+    const startPracticeHandler = async () => {
+      if (this.isStartingPractice) return;
+      this.isStartingPractice = true;
+      try {
+        if (!appState.sentenceList || appState.sentenceList.length === 0) {
+          if (this.inputEnglish && this.inputEnglish.value.trim()) {
+            const ok = await this.handleTranslate();
+            if (!ok) return;
+          }
         }
+        this.router.navigateTo('practice');
+      } finally {
+        this.isStartingPractice = false;
       }
-      this.router.navigateTo('practice');
     };
     if (this.btnStartPractice) {
       this.btnStartPractice.addEventListener('click', startPracticeHandler);
@@ -220,6 +242,15 @@ export class InputView {
     if (this.btnHandoutTypeTeacher) {
       this.btnHandoutTypeTeacher.addEventListener('click', () => this.openHandoutModal('teacher'));
     }
+
+    // Escape closes the handout modal (settings modal handles its own Escape)
+    if (typeof document.addEventListener === 'function') {
+      document.addEventListener('keydown', (e) => {
+        if (e.key === 'Escape' && this.handoutModal && !this.handoutModal.classList.contains('hidden')) {
+          this.closeHandoutModal();
+        }
+      });
+    }
   }
 
   setMode(mode) {
@@ -234,17 +265,49 @@ export class InputView {
     if (mode === 'both') {
       if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
       if (scriptInputSection) scriptInputSection.classList.remove('hidden');
-      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 생성 및 음성 연동';
     } else if (mode === 'audio') {
       if (this.audioUploadSection) this.audioUploadSection.classList.remove('hidden');
       if (scriptInputSection) scriptInputSection.classList.add('hidden');
-      if (this.btnTranslateText) this.btnTranslateText.textContent = '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
     } else {
       // text only
       if (this.audioUploadSection) this.audioUploadSection.classList.add('hidden');
       if (scriptInputSection) scriptInputSection.classList.remove('hidden');
-      if (this.btnTranslateText) this.btnTranslateText.textContent = '3x1 해석 및 FELS 생성';
     }
+    if (this.btnTranslateText) this.btnTranslateText.textContent = this.getTranslateButtonLabel(mode);
+  }
+
+  getTranslateButtonLabel(mode = appState.currentMode) {
+    if (mode === 'both') return '3x1 생성 및 음성 연동';
+    if (mode === 'audio') return '🎙️ 음성에서 스크립트 추출 및 3x1 생성';
+    return '3x1 해석 및 FELS 생성';
+  }
+
+  /** Gemini inline audio is only attempted for real uploads within the size limit. */
+  canSendAudioToAI(file) {
+    return !!file && typeof file.size === 'number' && file.size <= MAX_AI_INLINE_AUDIO_BYTES;
+  }
+
+  shouldUseAiAlignment() {
+    const file = appState.uploadedAudioFile;
+    return !!file && !appState.isSynthesizedAudio && aiService.hasKey() &&
+      aiService.provider === 'gemini' && this.canSendAudioToAI(file);
+  }
+
+  /** Base64-encodes the upload once and reuses it for STT / alignment / re-sync. */
+  async getAudioBase64(file) {
+    if (this.cachedBase64 && this.cachedBase64.file === file) return this.cachedBase64.base64;
+    const base64 = await this.readFileAsBase64(file);
+    this.cachedBase64 = { file, base64 };
+    return base64;
+  }
+
+  /** Shared boundary resolution for handleTranslate() and autoSyncAudioScript(). */
+  async computeSentenceBoundaries(rawSentences) {
+    const file = appState.uploadedAudioFile;
+    const aiAlign = this.shouldUseAiAlignment()
+      ? async () => aiService.alignAudioWithScript(await this.getAudioBase64(file), file.type || 'audio/mp3', rawSentences)
+      : null;
+    return resolveSentenceBoundaries({ audioBuffer: appState.audioBuffer, sentences: rawSentences, aiAlign });
   }
 
   async handleAudioFile(file) {
@@ -276,8 +339,8 @@ export class InputView {
       <div class="audio-file-info">
         <div class="audio-file-icon">🎵</div>
         <div class="audio-file-details">
-          <div class="audio-file-name">${file.name}</div>
-          <div class="audio-file-meta">${formatSize(file.size)} • ${file.type || 'audio/mp3'}</div>
+          <div class="audio-file-name">${escapeHtml(file.name)}</div>
+          <div class="audio-file-meta">${formatSize(file.size)} • ${escapeHtml(file.type || 'audio/mp3')}</div>
         </div>
         <button id="btnRemoveAudio" class="icon-btn remove-btn" title="오디오 삭제">✕</button>
       </div>
@@ -312,25 +375,35 @@ export class InputView {
     toast.show('오디오 파일이 제거되었습니다.');
   }
 
+  /**
+   * @returns {Promise<boolean>} true when appState.sentenceList was (re)built successfully
+   */
   async handleTranslate() {
+    // Ctrl+Enter / preset chips can fire while a request is already running (button is disabled then)
+    if (this.btnTranslate && this.btnTranslate.disabled === true) return false;
     const mode = appState.currentMode;
 
     // Mode 2: Audio Only (STT)
     if (mode === 'audio') {
       if (!appState.uploadedAudioFile) {
         toast.show('⚠️ 먼저 MP3 음성 파일을 선택 또는 드래그하여 업로드하세요.');
-        return;
+        return false;
       }
       if (!aiService.hasKey()) {
         toast.show('⚠️ 음성 인식(STT)을 위해 우측 상단 설정에서 AI API 키를 입력하세요.');
         const btnSettings = document.getElementById('btnSettings');
         if (btnSettings) btnSettings.click();
-        return;
+        return false;
+      }
+      if (!this.canSendAudioToAI(appState.uploadedAudioFile)) {
+        toast.show('⚠️ 15MB를 초과하는 음성 파일은 AI 음성 인식을 지원하지 않습니다. 파일을 나눠 업로드하거나 스크립트를 직접 입력하세요.');
+        return false;
       }
 
+      let success = false;
       this.setLoading(true);
       try {
-        const base64Audio = await this.readFileAsBase64(appState.uploadedAudioFile);
+        const base64Audio = await this.getAudioBase64(appState.uploadedAudioFile);
         const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
         const aiResult = await aiService.transcribeAndTranslateAudio(base64Audio, mimeType);
 
@@ -380,6 +453,7 @@ export class InputView {
 
         appState.scriptText = scriptText;
         appState.setSentenceList(sentenceList);
+        success = true; // data is ready even if a later UI render step fails
 
         // Render Results Panel on Page 1
         this.renderParsedResults({ scrollToSection: true });
@@ -390,7 +464,7 @@ export class InputView {
       } finally {
         this.setLoading(false);
       }
-      return;
+      return success;
     }
 
     // Mode 1 (Both) or Mode 3 (Text)
@@ -398,9 +472,10 @@ export class InputView {
     if (!text) {
       toast.show('⚠️ 해석할 영어 스크립트를 먼저 입력하거나 붙여넣으세요.');
       if (this.inputEnglish) this.inputEnglish.focus();
-      return;
+      return false;
     }
 
+    let success = false;
     this.setLoading(true);
 
     try {
@@ -427,50 +502,8 @@ export class InputView {
       let rawSentences = splitIntoSentences(text, { filterKorean: true });
       if (rawSentences.length === 0) rawSentences.push(cleanPracticeSentence(text) || text);
 
-      let boundaries = null;
-      // If authentic MP3 uploaded and Gemini key available, attempt AI audio-script alignment
-      if (appState.uploadedAudioFile && !appState.isSynthesizedAudio && aiService.hasKey() && aiService.provider === 'gemini') {
-        try {
-          const base64Audio = await this.readFileAsBase64(appState.uploadedAudioFile);
-          const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
-          const alignments = await aiService.alignAudioWithScript(base64Audio, mimeType, rawSentences);
-          if (alignments && alignments.length === rawSentences.length) {
-            boundaries = alignments.map(a => ({ start: a.start, end: a.end }));
-          }
-        } catch (alignErr) {
-          console.warn('AI audio alignment fallback:', alignErr);
-        }
-      }
-
-      if (!boundaries) {
-        boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);
-      } else if (appState.audioBuffer && boundaries.length > 0) {
-        // Cross-verify with PCM VAD to guarantee Korean intro announcement is skipped
-        const introSec = detectKoreanIntroDuration(appState.audioBuffer, rawSentences);
-        if (introSec > 2.0 && boundaries[0].start !== null && boundaries[0].start < introSec - 0.5) {
-          boundaries[0].start = introSec;
-        }
-      }
-
-      // Safety extension: ensure each sentence end has generous headroom (+0.9s ~ +1.0s)
-      // and is NEVER cut off prematurely by 1 second
-      if (boundaries && boundaries.length === rawSentences.length) {
-        const totalDuration = appState.audioBuffer ? appState.audioBuffer.duration : null;
-        for (let i = 0; i < boundaries.length; i++) {
-          const b = boundaries[i];
-          if (b.end !== null) {
-            const nextStart = (i + 1 < boundaries.length && boundaries[i + 1].start !== null)
-              ? boundaries[i + 1].start
-              : totalDuration;
-            if (nextStart !== null && nextStart > b.start) {
-              const maxSafeEnd = Math.max(b.start + 0.4, nextStart - 0.15);
-              b.end = Math.min(maxSafeEnd, Math.round((b.end + 0.9) * 10) / 10);
-            } else if (totalDuration !== null) {
-              b.end = Math.min(totalDuration, Math.round((b.end + 1.0) * 10) / 10);
-            }
-          }
-        }
-      }
+      // AI alignment (optional) → VAD fallback → Korean intro check → end padding (see audio/boundary-utils.js)
+      const boundaries = await this.computeSentenceBoundaries(rawSentences);
 
       // Parallel fetch natural Korean translation for all sentences
       const naturalTranslations = await Promise.all(
@@ -518,6 +551,7 @@ export class InputView {
 
       appState.scriptText = text;
       appState.setSentenceList(sentenceList);
+      success = true; // data is ready even if a later UI render step fails
 
       // Render Results Panel on Page 1
       this.renderParsedResults({ scrollToSection: true });
@@ -528,6 +562,7 @@ export class InputView {
     } finally {
       this.setLoading(false);
     }
+    return success;
   }
 
   /**
@@ -542,48 +577,9 @@ export class InputView {
     toast.show('⚡ 음성과 스크립트 자동 Sync 계산 중...');
     try {
       const rawSentences = appState.sentenceList.map(s => s.text);
-      let boundaries = null;
-
-      if (aiService.hasKey() && aiService.provider === 'gemini' && !appState.isSynthesizedAudio) {
-        try {
-          const base64Audio = await this.readFileAsBase64(appState.uploadedAudioFile);
-          const mimeType = appState.uploadedAudioFile.type || 'audio/mp3';
-          const alignments = await aiService.alignAudioWithScript(base64Audio, mimeType, rawSentences);
-          if (alignments && alignments.length === rawSentences.length) {
-            boundaries = alignments.map(a => ({ start: a.start, end: a.end }));
-          }
-        } catch (aiErr) {
-          console.warn('AI audio alignment fallback:', aiErr);
-        }
-      }
-
-      if (!boundaries) {
-        boundaries = detectAudioSentenceBoundaries(appState.audioBuffer, rawSentences);
-      } else if (appState.audioBuffer && boundaries.length > 0) {
-        // Cross-verify with PCM VAD to guarantee Korean intro announcement is skipped
-        const introSec = detectKoreanIntroDuration(appState.audioBuffer, rawSentences);
-        if (introSec > 2.0 && boundaries[0].start !== null && boundaries[0].start < introSec - 0.5) {
-          boundaries[0].start = introSec;
-        }
-      }
+      const boundaries = await this.computeSentenceBoundaries(rawSentences);
 
       if (boundaries && boundaries.length === appState.sentenceList.length) {
-        const totalDuration = appState.audioBuffer ? appState.audioBuffer.duration : null;
-        for (let i = 0; i < boundaries.length; i++) {
-          const b = boundaries[i];
-          if (b.end !== null) {
-            const nextStart = (i + 1 < boundaries.length && boundaries[i + 1].start !== null)
-              ? boundaries[i + 1].start
-              : totalDuration;
-            if (nextStart !== null && nextStart > b.start) {
-              const maxSafeEnd = Math.max(b.start + 0.4, nextStart - 0.15);
-              b.end = Math.min(maxSafeEnd, Math.round((b.end + 0.9) * 10) / 10);
-            } else if (totalDuration !== null) {
-              b.end = Math.min(totalDuration, Math.round((b.end + 1.0) * 10) / 10);
-            }
-          }
-        }
-
         appState.sentenceList.forEach((stn, i) => {
           stn.audioStart = boundaries[i]?.start ?? stn.audioStart;
           stn.audioEnd = boundaries[i]?.end ?? stn.audioEnd;
@@ -1011,17 +1007,21 @@ export class InputView {
         });
       }
 
+      // Enter only commits the field (blur → single 'change' event). Previously Enter AND change both ran the
+      // update, firing duplicate AI requests. isComposing guard keeps Korean IME composition intact.
+      const commitOnEnter = (inputEl) => (e) => {
+        if (e.key === 'Enter' && !e.isComposing) {
+          e.preventDefault();
+          if (typeof inputEl.blur === 'function') inputEl.blur();
+        }
+      };
+
       // 7. Hook up Script Input
       if (scriptInput) {
         scriptInput.addEventListener('change', () => {
           this.updateSentenceScript(stn, scriptInput.value, chunkInput, directInput, naturalInput, track);
         });
-        scriptInput.addEventListener('keydown', (e) => {
-          if (e.key === 'Enter') {
-            e.preventDefault();
-            this.updateSentenceScript(stn, scriptInput.value, chunkInput, directInput, naturalInput, track);
-          }
-        });
+        scriptInput.addEventListener('keydown', commitOnEnter(scriptInput));
       }
 
       // 8. Hook up Chunk Text Input (English ||)
@@ -1029,25 +1029,16 @@ export class InputView {
         chunkInput.addEventListener('change', () => {
           this.updateChunksFromTextInput(stn, chunkInput.value, directInput, track);
         });
-        chunkInput.addEventListener('keydown', (e) => {
-          if (e.key === 'Enter') {
-            e.preventDefault();
-            this.updateChunksFromTextInput(stn, chunkInput.value, directInput, track);
-          }
-        });
+        chunkInput.addEventListener('keydown', commitOnEnter(chunkInput));
       }
 
       // 9. Hook up Direct Chunk Input (Korean ||)
       if (directInput) {
         directInput.addEventListener('change', () => {
-          this.updateChunksFromDirectInput(stn, directInput.value);
-        });
-        directInput.addEventListener('keydown', (e) => {
-          if (e.key === 'Enter') {
-            e.preventDefault();
-            this.updateChunksFromDirectInput(stn, directInput.value);
-          }
+          const ok = this.updateChunksFromDirectInput(stn, directInput.value);
+          if (!ok) directInput.value = this.getDirectChunkString(stn.result?.chunks);
         });
+        directInput.addEventListener('keydown', commitOnEnter(directInput));
       }
 
       // 10. Hook up Natural Korean Input
@@ -1164,12 +1155,19 @@ export class InputView {
         dividerSlot.textContent = isBoundary ? '||' : '+';
 
         dividerSlot.addEventListener('click', async () => {
+          // Ignore clicks while this sentence's chunk translation is still in flight (prevents out-of-order overwrite)
+          if (this.busySentences.has(stn)) return;
           if (boundaryWordIndices.has(idx)) {
             boundaryWordIndices.delete(idx);
           } else {
             boundaryWordIndices.add(idx);
           }
-          await this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);
+          this.busySentences.add(stn);
+          try {
+            await this.rebuildChunksFromBoundaries(stn, words, boundaryWordIndices);
+          } finally {
+            this.busySentences.delete(stn);
+          }
           if (chunkInput) {
             chunkInput.value = this.getChunkString(stn.result.chunks);
           }
@@ -1224,6 +1222,7 @@ export class InputView {
   async updateChunksFromTextInput(stn, chunkedText, directInput, track) {
     const parts = (chunkedText || '').split('||').map(p => p.trim()).filter(Boolean);
     if (!parts.length) return;
+    if (this.busySentences.has(stn)) return;
 
     const newChunks = parts.map(part => {
       const existing = (stn.result?.chunks || []).find(c => c.en.trim() === part);
@@ -1237,6 +1236,7 @@ export class InputView {
     stn.result.chunks = newChunks;
 
     if (stn.result.natural) {
+      this.busySentences.add(stn);
       try {
         const directKoChunks = await aiService.generateDirectChunks(newChunks, stn.result.natural, stn.text);
         if (directKoChunks && directKoChunks.length === newChunks.length) {
@@ -1248,6 +1248,8 @@ export class InputView {
         }
       } catch (e) {
         this.ruleEngine.alignNaturalToChunks(newChunks, stn.result.natural);
+      } finally {
+        this.busySentences.delete(stn);
       }
     }
 
@@ -1263,20 +1265,30 @@ export class InputView {
     toast.show('✂️ 청크 구분이 저장되었습니다.');
   }
 
+  /**
+   * Applies the "직독직해" input (ko1 || ko2 || ...) slot-by-slot.
+   * Empty slots are written as DIRECT_EMPTY_PLACEHOLDER by getDirectChunkString(), so positions never shift.
+   * @returns {boolean} false when the slot count does not match the chunk count (nothing is changed)
+   */
   updateChunksFromDirectInput(stn, directStr) {
-    const parts = (directStr || '').split('||').map(p => p.trim()).filter(Boolean);
     if (!stn.result) stn.result = {};
     if (!stn.result.chunks) stn.result.chunks = [];
+    const chunks = stn.result.chunks;
+    const parts = (directStr || '').split('||').map(p => p.trim());
 
-    stn.result.chunks.forEach((chunk, i) => {
-      if (i < parts.length) {
-        chunk.ko = parts[i];
-      }
+    if (parts.length !== chunks.length) {
+      toast.show(`⚠️ 직독직해 칸 수(${parts.length})가 청크 수(${chunks.length})와 다릅니다. '||' 개수를 맞춰주세요.`);
+      return false;
+    }
+
+    chunks.forEach((chunk, i) => {
+      chunk.ko = parts[i] === DIRECT_EMPTY_PLACEHOLDER ? '' : parts[i];
     });
 
-    stn.result.chunk_text = stn.result.chunks.map(c => c.ko).join(' || ');
-    stn.result.direct = stn.result.chunks.map(c => c.ko).join(' / ');
+    stn.result.chunk_text = chunks.map(c => c.ko).join(' || ');
+    stn.result.direct = chunks.map(c => c.ko).join(' / ');
     toast.show('🧩 직독직해 해석이 저장되었습니다.');
+    return true;
   }
 
   async updateSentenceScript(stn, newText, chunkInput, directInput, naturalInput, track) {
@@ -1328,13 +1340,7 @@ export class InputView {
   }
 
   escapeHtml(str) {
-    if (!str) return '';
-    return String(str)
-      .replace(/&/g, '&amp;')
-      .replace(/"/g, '&quot;')
-      .replace(/'/g, '&#39;')
-      .replace(/</g, '&lt;')
-      .replace(/>/g, '&gt;');
+    return escapeHtml(str); // delegates to the shared utils/dom.js implementation
   }
 
   getChunkString(chunks) {
@@ -1342,9 +1348,12 @@ export class InputView {
     return chunks.map(c => (c.en || '').trim()).filter(Boolean).join(' || ');
   }
 
+  /** One slot per chunk (empty → placeholder) so updateChunksFromDirectInput() can map slots 1:1. */
   getDirectChunkString(chunks) {
     if (!chunks || !chunks.length) return '';
-    return chunks.map(c => (c.ko || '').trim()).filter(Boolean).join(' || ');
+    const slots = chunks.map(c => (c.ko || '').trim());
+    if (slots.every(s => !s)) return '';
+    return slots.map(s => s || DIRECT_EMPTY_PLACEHOLDER).join(' || ');
   }
 
   playOrSpeakSentence(stn, speakBtn) {
@@ -1356,34 +1365,20 @@ export class InputView {
       }, 1500);
     }
 
-    // 1. If authentic uploaded audio exists, play slice
-    if (appState.uploadedAudioUrl && this.nativeAudioPlayer && !appState.isSynthesizedAudio) {
-      if (!this.nativeAudioPlayer.src || this.nativeAudioPlayer.src !== appState.uploadedAudioUrl) {
-        this.nativeAudioPlayer.src = appState.uploadedAudioUrl;
-      }
-      if (stn.audioStart !== null && stn.audioEnd !== null) {
-        try {
-          this.nativeAudioPlayer.currentTime = stn.audioStart;
-          this.nativeAudioPlayer.play().catch(e => {
+    // 1. If authentic uploaded audio exists, play the slice through the shared playback controller
+    //    (owner 'input' → the Practice looper ignores this playback; segment end is enforced by rAF)
+    if (appState.uploadedAudioUrl && !appState.isSynthesizedAudio &&
+        stn.audioStart !== null && stn.audioEnd !== null) {
+      try {
+        playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
+        playbackController.playSegment(stn.audioStart, stn.audioEnd, { owner: 'input' })
+          .catch(e => {
             console.warn('Audio play error, falling back to TTS:', e);
             speakText(stn.text, 'en-US');
           });
-
-          if (this.currentStopHandler) {
-            this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
-          }
-          this.currentStopHandler = () => {
-            if (this.nativeAudioPlayer.currentTime >= stn.audioEnd) {
-              this.nativeAudioPlayer.pause();
-              this.nativeAudioPlayer.removeEventListener('timeupdate', this.currentStopHandler);
-              this.currentStopHandler = null;
-            }
-          };
-          this.nativeAudioPlayer.addEventListener('timeupdate', this.currentStopHandler);
-          return;
-        } catch (e) {
-          console.warn('Audio playback error, fallback to TTS:', e);
-        }
+        return;
+      } catch (e) {
+        console.warn('Audio playback error, fallback to TTS:', e);
       }
     }
 
@@ -1444,12 +1439,12 @@ export class InputView {
         const fels = getFelsInfo(w);
         if (fels) {
           if (isTeacher) {
-            return `<span class="handout-fels-blank answer-mode">[ ${w} ]</span>`;
+            return `<span class="handout-fels-blank answer-mode">[ ${escapeHtml(w)} ]</span>`;
           } else {
             return `<span class="handout-fels-blank">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</span>`;
           }
         } else {
-          return `<span>${w}</span>`;
+          return `<span>${escapeHtml(w)}</span>`;
         }
       });
 
@@ -1476,7 +1471,7 @@ export class InputView {
 
       const chunkedKoSegments = chunks.map(c => {
         const koText = (c.ko || '').trim() || (c.en || '').trim();
-        return `<span class="handout-chunk-box">[ ${koText} ]</span>`;
+        return `<span class="handout-chunk-box">[ ${escapeHtml(koText)} ]</span>`;
       });
       const chunkedKoHtml = chunkedKoSegments.join('<span class="handout-chunk-divider"> || </span>');
 
@@ -1486,7 +1481,7 @@ export class InputView {
             <span class="handout-stn-num">[${String(idx + 1).padStart(2, '0')}]</span>
             <div class="handout-direct-ko">${chunkedKoHtml}</div>
           </div>
-          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${stn.text}</div>` : ''}
+          ${isTeacher ? `<div class="handout-teacher-en-ref"><strong>[영문 정답]:</strong> ${escapeHtml(stn.text)}</div>` : ''}
           <div class="handout-speaking-check-row">
             <span class="speaking-check-label">🗣️ 말하기 훈련 체크:</span>
             <span class="check-box-pill">☐ 1차: 청크별 낭독</span>
@@ -1497,6 +1492,8 @@ export class InputView {
       `;
     });
 
+    const handoutYear = new Date().getFullYear();
+
     this.printableSheet.innerHTML = `
       <!-- ========================================================================= -->
       <!-- [A4 1페이지 - 앞면: 약형드랩 듣기 훈련지 (우리말 해석 없음 / 소리만 듣고 빈칸 채우기)] -->
@@ -1522,7 +1519,7 @@ export class InputView {
               <tr>
                 <td style="width: 55px; height: 22px;"></td>
                 <td style="width: 65px;"></td>
-                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
+                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                 <td style="width: 60px; font-weight: 700;">&nbsp;&nbsp;&nbsp;&nbsp; / 100</td>
               </tr>
             </table>
@@ -1584,7 +1581,7 @@ export class InputView {
               <tr>
                 <td style="width: 55px; height: 22px;"></td>
                 <td style="width: 65px;"></td>
-                <td style="width: 75px; font-size: 8pt;">2026. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
+                <td style="width: 75px; font-size: 8pt;">${handoutYear}. &nbsp;&nbsp;. &nbsp;&nbsp;.</td>
                 <td style="width: 60px; font-weight: 700; font-size: 8pt;">[ &nbsp; 통과 &nbsp; ]</td>
               </tr>
             </table>
@@ -1715,30 +1712,20 @@ export class InputView {
     });
   }
 
+  /**
+   * Toggles the busy state WITHOUT rebuilding the button markup.
+   * (The previous innerHTML rewrite detached this.btnTranslateText, so later setMode() label updates were lost.)
+   */
   setLoading(isLoading) {
     if (!this.btnTranslate) return;
-    if (isLoading) {
-      this.btnTranslate.disabled = true;
-      this.btnTranslate.innerHTML = `
-        <svg class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
-          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
-        </svg>
-        <span>처리 중...</span>
-      `;
-    } else {
-      this.btnTranslate.disabled = false;
-      const mode = appState.currentMode;
-      const btnLabel = mode === 'audio' 
-        ? '🎙️ 음성에서 스크립트 추출 및 3x1 생성' 
-        : (mode === 'both' ? '3x1 생성 및 음성 연동' : '3x1 해석 및 FELS 생성');
-      this.btnTranslate.innerHTML = `
-        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
-          <path d="M5 12h14"></path>
-          <path d="m12 5 7 7-7 7"></path>
-        </svg>
-        <span id="btnTranslateText">${btnLabel}</span>
-        <kbd class="btn-kbd">Ctrl+↵</kbd>
-      `;
+    this.btnTranslate.disabled = !!isLoading;
+    if (this.btnTranslateText) {
+      this.btnTranslateText.textContent = isLoading ? '처리 중...' : this.getTranslateButtonLabel(appState.currentMode);
+    }
+    const icon = typeof this.btnTranslate.querySelector === 'function' ? this.btnTranslate.querySelector('svg') : null;
+    if (icon && icon.classList) {
+      if (isLoading) icon.classList.add('spin-icon');
+      else icon.classList.remove('spin-icon');
     }
   }
 

```

**의존성/주의**
- import 변경: `detectKoreanIntroDuration`를 제거합니다(boundary-utils로 이동). `detectAudioSentenceBoundaries`는 오디오 전용(STT) 모드에서 계속 사용하므로 **남겨둡니다.**
- `InputView.escapeHtml()` 메서드는 남기되 공용 함수에 위임합니다. 메서드 안의 `escapeHtml(str)`은 **모듈 스코프 함수**를 가리킵니다. 클래스 메서드는 렉시컬 스코프에 들어가지 않으므로 재귀 호출이 아닙니다.
- `document.addEventListener` 호출은 `typeof` 가드로 감쌌습니다. `test_scroll_preservation.js`의 mock document에는 이 메서드가 없습니다.
- `handleTranslate()`의 반환값을 사용하는 곳은 `startPracticeHandler` 한 곳입니다. 다른 호출처(버튼, 프리셋, Ctrl+Enter)는 반환값을 무시하므로 영향이 없습니다.
- 오디오 전용 모드의 경계 계산(원본 L344)은 이번 범위에서 바꾸지 않았습니다. 이 모드는 패딩이 적용되지 않는 기존 동작을 유지합니다.

**검증:** `npm run build; npm run check; node tools/run-tests.js scroll`

---

## Step 6. Page 3 — `src/views/memorize-view.js`

**해결하는 문제**
1. **XSS:** 문장 미리보기(`stn.text`), 청크 카드(`chunk.en`/`chunk.ko`), 교실 모달 카드(`longestText`/`enText`/`koText`)를 이스케이프합니다.
2. **연속 재생 정지 버그:** Page 2 루퍼가 S1 경계에서 멈추던 문제를 고칩니다.
   - `playbackController.playSegment(..., { owner: 'memorize', onEnd })`를 사용해, 구간이 끝나면 `onEnd`에서 다음 문장으로 넘어갑니다.
   - 재생 조건은 `uploadedAudioUrl && !isSynthesizedAudio`로 통일합니다(`canPlayUploadedAudio`).
   - `audioEnd`가 `null`이면 미디어 끝까지 재생합니다.
   - 재생이 실패하면 연속 재생을 중지합니다.
3. `stopPlayAllScript()`는 `playbackController.stop()`을 사용합니다.
4. **죽은 코드 제거:** index.html에 존재하지 않는 교실 모드 요소 참조를 제거합니다.
   - 요소: `classroomFullText`, `classroomNaturalSection`, `classroomNaturalText`, `btnToggleClassroomNatural`
   - 함께 제거: `toggleClassroomNatural()`, T 키 처리, 렌더 블록

- 기존 코드 영역: L13–L19, L37–L54, L104–L112, L178–L184, L248–L257, L340–L348, L386–L411, L426–L431, L433–L453, L506–L512, L555–L568, L610–L622, L652–L668, L691–L703
```diff
diff --git a/src/views/memorize-view.js b/src/views/memorize-view.js
--- a/src/views/memorize-view.js
+++ b/src/views/memorize-view.js
@@ -13,7 +13,9 @@
 import { appState } from '../core/app-state.js';
 import { RuleChunkEngine } from '../core/rule-chunk-engine.js';
 import { speakText } from '../audio/tts-synthesizer.js';
+import { playbackController } from '../audio/playback-controller.js';
 import { toast } from '../ui/toast-manager.js';
+import { escapeHtml } from '../utils/dom.js';
 
 export class MemorizeView {
   constructor(router) {
@@ -37,18 +39,13 @@ export class MemorizeView {
     this.classroomModal = document.getElementById('classroomModal');
     this.classroomStnBadge = document.getElementById('classroomStnBadge');
     this.classroomStnCounter = document.getElementById('classroomStnCounter');
-    this.classroomFullText = document.getElementById('classroomFullText');
     this.classroomChunksContainer = document.getElementById('classroomChunksContainer');
-    this.classroomNaturalSection = document.getElementById('classroomNaturalSection');
-    this.classroomNaturalText = document.getElementById('classroomNaturalText');
-    this.btnToggleClassroomNatural = document.getElementById('btnToggleClassroomNatural');
     this.btnClassroomPlay = document.getElementById('btnClassroomPlay');
     this.btnClassroomFlipAll = document.getElementById('btnClassroomFlipAll');
     this.btnClassroomPrev = document.getElementById('btnClassroomPrev');
     this.btnClassroomNext = document.getElementById('btnClassroomNext');
     this.btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
     this.classroomIndex = 0;
-    this.isClassroomNaturalHidden = false;
     this.areClassroomCardsFlipped = false;
     this.boundClassroomKeyHandler = this.handleClassroomKeyDown.bind(this);
 
@@ -104,9 +101,6 @@ export class MemorizeView {
     if (this.btnClassroomFlipAll) {
       this.btnClassroomFlipAll.addEventListener('click', () => this.flipAllClassroomCards());
     }
-    if (this.btnToggleClassroomNatural) {
-      this.btnToggleClassroomNatural.addEventListener('click', () => this.toggleClassroomNatural());
-    }
   }
 
   setMemorizeMode(mode) {
@@ -178,7 +172,7 @@ export class MemorizeView {
           <span>S${sIdx + 1}</span>
           <span class="jump-icon">↗</span>
         </button>
-        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${stn.text}</span>
+        <span class="memorize-stn-preview" title="클릭하여 교실 대형 화면으로 보기">${escapeHtml(stn.text)}</span>
         <button class="memorize-stn-expand-btn" title="교실 대형 화면으로 크게 보기 (모달)">🔍 크게 보기</button>
         <button class="memorize-stn-play" title="이 문장 듣기">▶</button>
       `;
@@ -248,10 +242,10 @@ export class MemorizeView {
           <div class="memorize-card-inner">
             ${keyBadge}
             <div class="memorize-face memorize-face-en">
-              <span class="chunk-en-text">${chunk.en}</span>
+              <span class="chunk-en-text">${escapeHtml(chunk.en)}</span>
             </div>
             <div class="memorize-face memorize-face-ko">
-              <span class="chunk-ko-text">${chunk.ko}</span>
+              <span class="chunk-ko-text">${escapeHtml(chunk.ko)}</span>
             </div>
           </div>
         `;
@@ -340,9 +334,7 @@ export class MemorizeView {
   stopPlayAllScript() {
     this.isPlayingAll = false;
     this.updatePlayAllButtonUI(false);
-    if (this.nativeAudioPlayer && !this.nativeAudioPlayer.paused) {
-      this.nativeAudioPlayer.pause();
-    }
+    playbackController.stop();
     if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel();
     }
@@ -386,26 +378,24 @@ export class MemorizeView {
 
     const targetStn = list[idx];
 
-    // Real audio play
-    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
+    // Real audio play (owner 'memorize' → the Practice looper no longer pauses it at S1's boundary)
+    if (this.canPlayUploadedAudio()) {
       const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
-      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;
-
-      this.nativeAudioPlayer.currentTime = stnStart;
-      this.nativeAudioPlayer.play().catch(e => console.error(e));
+      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null; // null → play to media end
 
-      const checkEnd = () => {
-        if (!this.isPlayingAll) return;
-        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
+      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
+      playbackController.playSegment(stnStart, stnEnd, {
+        owner: 'memorize',
+        onEnd: () => {
           // 0.4s pause between sentences
           setTimeout(() => {
             if (this.isPlayingAll) this.playSentenceInSequence(idx + 1);
           }, 400);
-        } else {
-          requestAnimationFrame(checkEnd);
         }
-      };
-      requestAnimationFrame(checkEnd);
+      }).catch(e => {
+        console.error(e);
+        if (this.isPlayingAll) this.stopPlayAllScript();
+      });
     } else {
       // Speech Synthesis
       if ('speechSynthesis' in window) {
@@ -426,6 +416,11 @@ export class MemorizeView {
     }
   }
 
+  /** Real uploaded audio (not the silent synthesized WAV) is available for segment playback. */
+  canPlayUploadedAudio() {
+    return !!appState.uploadedAudioUrl && !appState.isSynthesizedAudio;
+  }
+
   playSingleSentence(idx) {
     const list = appState.sentenceList;
     if (!list || idx < 0 || idx >= list.length) return;
@@ -433,21 +428,16 @@ export class MemorizeView {
     this.highlightActiveSentenceRow(idx);
     const targetStn = list[idx];
 
-    if (appState.uploadedAudioFile && this.nativeAudioPlayer && this.nativeAudioPlayer.src && !appState.isSynthesizedAudio) {
+    if (this.canPlayUploadedAudio()) {
       const stnStart = targetStn.audioStart !== null ? targetStn.audioStart : 0;
-      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : this.nativeAudioPlayer.duration;
+      const stnEnd = targetStn.audioEnd !== null ? targetStn.audioEnd : null;
 
-      this.nativeAudioPlayer.currentTime = stnStart;
-      this.nativeAudioPlayer.play().catch(e => console.error(e));
-
-      const checkEnd = () => {
-        if (this.nativeAudioPlayer.currentTime >= stnEnd || this.nativeAudioPlayer.ended) {
-          this.nativeAudioPlayer.pause();
-        } else {
-          requestAnimationFrame(checkEnd);
-        }
-      };
-      requestAnimationFrame(checkEnd);
+      playbackController.setSource(appState.uploadedAudioUrl, { muted: false });
+      playbackController.playSegment(stnStart, stnEnd, { owner: 'memorize' })
+        .catch(e => {
+          console.error(e);
+          speakText(targetStn.text, 'en-US');
+        });
     } else {
       speakText(targetStn.text, 'en-US');
     }
@@ -506,7 +496,6 @@ export class MemorizeView {
     if (!list || sIdx < 0 || sIdx >= list.length) return;
 
     this.classroomIndex = sIdx;
-    this.isClassroomNaturalHidden = false;
     this.areClassroomCardsFlipped = false;
 
     this.renderClassroomModal();
@@ -555,14 +544,6 @@ export class MemorizeView {
     toast.show(this.areClassroomCardsFlipped ? '🔄 모든 청크 뒷면(해석)으로 뒤집기' : '🔄 모든 청크 앞면(영어)으로 뒤집기');
   }
 
-  toggleClassroomNatural() {
-    this.isClassroomNaturalHidden = !this.isClassroomNaturalHidden;
-    if (this.classroomNaturalSection) {
-      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
-    }
-    toast.show(this.isClassroomNaturalHidden ? '우리말 해석 가림' : '우리말 해석 표시');
-  }
-
   flipClassroomCardByIndex(cIdx) {
     if (!this.classroomChunksContainer) return;
     const card = this.classroomChunksContainer.querySelector(`.classroom-chunk-card[data-c-idx="${cIdx}"]`);
@@ -610,13 +591,6 @@ export class MemorizeView {
       return;
     }
 
-    if (e.key === 't' || e.key === 'T') {
-      e.preventDefault();
-      e.stopPropagation();
-      this.toggleClassroomNatural();
-      return;
-    }
-
     // Number keys 1~9
     let num = null;
     if (e.code && /^Digit([1-9])$/.test(e.code)) {
@@ -652,17 +626,6 @@ export class MemorizeView {
       this.btnClassroomNext.disabled = (this.classroomIndex >= list.length - 1);
     }
 
-    if (this.classroomFullText) {
-      this.classroomFullText.textContent = stn.text || '';
-    }
-
-    if (this.classroomNaturalText) {
-      this.classroomNaturalText.textContent = stn.result?.natural || '';
-    }
-    if (this.classroomNaturalSection) {
-      this.classroomNaturalSection.classList.toggle('masked', this.isClassroomNaturalHidden);
-    }
-
     if (this.classroomChunksContainer) {
       this.classroomChunksContainer.innerHTML = '';
       const chunks = stn.result?.chunks || [{ en: stn.text, ko: stn.result?.natural || '' }];
@@ -691,13 +654,13 @@ export class MemorizeView {
 
         card.innerHTML = `
           <div class="classroom-card-inner">
-            <div class="classroom-card-sizer" aria-hidden="true">${longestText}</div>
+            <div class="classroom-card-sizer" aria-hidden="true">${escapeHtml(longestText)}</div>
             ${keyBadge}
             <div class="classroom-face classroom-face-en">
-              <span class="classroom-chunk-text">${enText}</span>
+              <span class="classroom-chunk-text">${escapeHtml(enText)}</span>
             </div>
             <div class="classroom-face classroom-face-ko">
-              <span class="classroom-chunk-text">${koText}</span>
+              <span class="classroom-chunk-text">${escapeHtml(koText)}</span>
             </div>
           </div>
         `;

```

**의존성/주의**
- Step 2가 필요합니다. 생성자의 `this.nativeAudioPlayer` 할당은 이제 쓰이지 않지만, 변경 범위를 최소화하려고 남겨두었습니다(무해).
- 교실 모달의 Esc/←/→/Space/F/1–9 단축키는 유지됩니다. T 키만 제거됩니다(대상 DOM이 없음).

**검증:** `npm run build; npm run check`

---

## Step 7. 문장 분할기 — `src/core/text-splitter.js`

**재현된 문제 → 수정 후 기대 결과**

| 입력 | 현재 출력 | 수정 후 |
| :--- | :--- | :--- |
| `20 minutes later, we left.` | `minutes later, we left.` | `20 minutes later, we left.` |
| `3D printers are cool.` | `D printers are cool.` | `3D printers are cool.` |
| `1990 was a great year.` | `was a great year.` | `1990 was a great year.` |
| `I woke up at 7 a.m. today.` | 2개 문장으로 분할 | 1개 문장 |
| `He said, "Hi." Then he left.` | 1개 문장 | `['He said, "Hi."', 'Then he left.']` |

**변경 내용**
- L29: 한국어 접두어 제거 정규식에 lookahead를 추가합니다. 접두어 구간에 **한글이나 괄호가 있을 때만** 제거합니다.
- 약어 목록에 `a.m`, `p.m`, `st`, `mt`, `approx`를 추가합니다. `no`는 일반 단어와 충돌하므로 제외합니다.
- 약어 정규식 생성 시 첫 번째 점만이 아니라 **모든 점**을 이스케이프합니다.
- 분할 정규식이 종결부호 뒤의 닫는 따옴표/괄호까지 허용합니다: `/(?<=[.?!]["'”’)]?)\s+|\n+/`

- 기존 코드 영역: L26–L32, L40–L53
```diff
diff --git a/src/core/text-splitter.js b/src/core/text-splitter.js
--- a/src/core/text-splitter.js
+++ b/src/core/text-splitter.js
@@ -26,7 +26,9 @@ export function cleanPracticeSentence(text) {
   // Strip speaker indicators like 'M: ', 'W: ', 'Man: ', 'Woman: ', 'Boy: ', 'Girl: ', 'Speaker 1: ', 'A: ', 'B: ', '남: ', '여: '
   let cleaned = text.replace(/^((M(an)?|W(oman)?|Boy|Girl|Speaker\s*\d+|[AB남여])\s*:\s*)/i, '').trim();
   // Strip leading question/speaker indicators like '1번. 남:', '여:', 'W:', 'M:', '[남]'
-  cleaned = cleaned.replace(/^[0-9가-힣\s.:,·()\[\]\-]+(?=[A-Za-z])/i, '').trim();
+  // Only when the prefix actually contains Hangul or a bracket — otherwise '20 minutes later' / '3D printers' / '1990 was'
+  // lost their leading numbers.
+  cleaned = cleaned.replace(/^(?=[^A-Za-z]*[가-힣\[(])[0-9가-힣\s.:,·()\[\]\-]+(?=[A-Za-z])/, '').trim();
   // Strip inline Korean parentheticals e.g. '(해설)', '[안내]'
   cleaned = cleaned.replace(/\([가-힣\s,.:~]+\)/g, '');
   cleaned = cleaned.replace(/\[[가-힣\s,.:~]+\]/g, '');
@@ -40,14 +42,16 @@ export function cleanPracticeSentence(text) {
 export function splitIntoSentences(text, options = {}) {
   if (!text) return [];
   const filterKorean = options.filterKorean !== false;
-  const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie', 'u.s', 'e.g', 'i.e'];
+  const abbreviations = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie', 'u.s', 'e.g', 'i.e', 'a.m', 'p.m', 'st', 'mt', 'approx'];
   let processed = text.replace(/\.{2,}/g, '__ELLIPSIS__');
   processed = processed.replace(/(\d+)\.(\d+)/g, '$1__DECIMAL_DOT__$2');
   abbreviations.forEach(abbr => {
-    const re = new RegExp('\\b' + abbr.replace('.', '\\.') + '\\.', 'gi');
+    // Escape EVERY dot (previously only the first one was escaped)
+    const re = new RegExp('\\b' + abbr.replace(/\./g, '\\.') + '\\.', 'gi');
     processed = processed.replace(re, match => match.slice(0, -1) + '__ABBR_DOT__');
   });
-  const parts = processed.split(/(?<=[.?!])\s+|\n+/);
+  // Also split after a closing quote/paren that follows the terminator: `He said, "Hi." Then...`
+  const parts = processed.split(/(?<=[.?!]["'”’)]?)\s+|\n+/);
   return parts
     .map(p => p.replace(/__ELLIPSIS__/g, '...').replace(/__DECIMAL_DOT__/g, '.').replace(/__ABBR_DOT__/g, '.').trim())
     .map(p => cleanPracticeSentence(p))

```

**의존성/주의**
- 기존 테스트 `test_korean_audio_and_script_sync.js`와 `test_user_requirements_v9.js`가 계속 통과하는지 확인했습니다. `1번. 남:`, `[남]`, `(1)` 같은 접두어는 여전히 제거됩니다.
- 알려진 한계: 문장이 `a.m.`으로 끝나고 바로 다음 문장이 오면 분할되지 않습니다(약어 보호와의 트레이드오프).

**검증:** `npm run build; node tools/run-tests.js splitter; node tools/run-tests.js korean`

---

## Step 8. AI 서비스 — `src/services/ai-service.js`

**해결하는 문제**
1. **API 키 노출:** Gemini 키를 URL 쿼리(`?key=`, 원본 L41·L89)가 아닌 `x-goog-api-key` 헤더로 전달합니다. 브라우저 기록, 프록시 로그, 콘솔에 남지 않습니다.
2. **타임아웃:** `fetchWithTimeout()`을 추가합니다.
   - 텍스트 요청 30초, 오디오 요청 120초, 무료 번역 10초입니다.
   - 시간이 초과되면 한국어 메시지로 안내합니다.
   - `AbortController`가 없는 환경에서는 일반 `fetch`로 폴백합니다.
3. **JSON 파싱:** `parseJsonLoose()`는 응답의 ```` ```json ```` 펜스나 앞뒤 설명문을 허용합니다(Gemini, OpenAI 공통).
4. **무료 번역 폭주:** 문장 수 × 청크 수만큼 동시에 요청하던 것을 `runWithFreeTranslateLimit()`으로 **최대 4개 동시**로 제한합니다. 요청 코드는 `fetchFreeTranslation()` 하나로 통합합니다.
5. **경계 패딩 이중 적용:** `alignAudioWithScript()`에서 +0.6/0.8초를 더하고, `InputView`에서 다시 +0.9초를 더했습니다. → 원본 타임스탬프를 그대로 반환하고, 패딩은 `boundary-utils.js`에서 **한 번만** 적용합니다.
6. 파일 헤더 주석의 모델 목록을 갱신합니다(Step 9와 일관성 유지).

- 기존 코드 영역: L1–L12, L38–L45, L75–L81, L86–L105, L168–L183, L185–L190, L248–L262, L478–L503, L562–L568, L597–L603, L615–L621
```diff
diff --git a/src/services/ai-service.js b/src/services/ai-service.js
--- a/src/services/ai-service.js
+++ b/src/services/ai-service.js
@@ -1,12 +1,79 @@
 /**
  * AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
- * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 1.5-flash-latest, etc.)
+ * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 2.5-pro, etc.)
  */
 
 import { StorageService } from './storage-service.js';
 import { CONSTANTS } from '../config/constants.js';
 import { DICTIONARY, VERB_MAP, PRONOUNS, ADVERBS } from '../config/fels-dict.js';
 
+const AI_REQUEST_TIMEOUT_MS = 30000;   // text requests
+const AI_AUDIO_TIMEOUT_MS = 120000;    // inline-audio requests (STT / alignment)
+const FREE_TRANSLATE_TIMEOUT_MS = 10000;
+const FREE_TRANSLATE_MAX_CONCURRENCY = 4; // avoid bursting the unofficial endpoint (HTTP 429)
+
+let freeTranslateActive = 0;
+const freeTranslateQueue = [];
+
+/**
+ * fetch() with an AbortController timeout. Falls back to plain fetch when AbortController is unavailable
+ * (e.g. the vm sandbox used by scratch tests).
+ */
+async function fetchWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
+  if (typeof AbortController !== 'function' || typeof setTimeout !== 'function') {
+    return fetch(url, options);
+  }
+  const controller = new AbortController();
+  const timer = setTimeout(() => controller.abort(), timeoutMs);
+  try {
+    return await fetch(url, { ...options, signal: controller.signal });
+  } catch (err) {
+    if (err && err.name === 'AbortError') {
+      throw new Error(`AI 요청 시간이 초과되었습니다 (${Math.round(timeoutMs / 1000)}초). 네트워크 상태를 확인하고 다시 시도하세요.`);
+    }
+    throw err;
+  } finally {
+    clearTimeout(timer);
+  }
+}
+
+/** JSON.parse that tolerates ```json fences / leading prose around the JSON object. */
+function parseJsonLoose(content) {
+  const text = String(content || '').trim();
+  try {
+    return JSON.parse(text);
+  } catch (e) {
+    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
+    try {
+      return JSON.parse(unfenced);
+    } catch (e2) {
+      const start = unfenced.indexOf('{');
+      const end = unfenced.lastIndexOf('}');
+      if (start !== -1 && end > start) return JSON.parse(unfenced.slice(start, end + 1));
+      throw e;
+    }
+  }
+}
+
+/** Runs `task` when a free-translate slot is available (max FREE_TRANSLATE_MAX_CONCURRENCY in flight). */
+function runWithFreeTranslateLimit(task) {
+  return new Promise((resolve, reject) => {
+    const run = () => {
+      freeTranslateActive++;
+      Promise.resolve()
+        .then(task)
+        .then(resolve, reject)
+        .finally(() => {
+          freeTranslateActive--;
+          const next = freeTranslateQueue.shift();
+          if (next) next();
+        });
+    };
+    if (freeTranslateActive < FREE_TRANSLATE_MAX_CONCURRENCY) run();
+    else freeTranslateQueue.push(run);
+  });
+}
+
 export class AIService {
   constructor() {
     this.provider = StorageService.getProvider();
@@ -38,8 +105,9 @@ export class AIService {
     const priorityOrder = CONSTANTS.GEMINI_CANDIDATE_MODELS;
 
     try {
-      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
-      const res = await fetch(listUrl);
+      // API key goes in the x-goog-api-key header (not the URL) so it never lands in logs / history
+      const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
+      const res = await fetchWithTimeout(listUrl, { headers: { 'x-goog-api-key': this.apiKey } });
       if (res.ok) {
         const data = await res.json();
         const available = (data.models || [])
@@ -75,7 +143,7 @@ export class AIService {
   /**
    * Resilient POST to Gemini API with automatic candidate model fallback on 404/retirement
    */
-  async postToGemini(payload) {
+  async postToGemini(payload, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
     const preferred = await this.resolveGeminiModel();
     const candidateList = [
       preferred,
@@ -86,20 +154,20 @@ export class AIService {
     let lastError = null;
 
     for (const model of uniqueCandidates) {
-      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
+      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
       try {
-        const response = await fetch(url, {
+        const response = await fetchWithTimeout(url, {
           method: 'POST',
-          headers: { 'Content-Type': 'application/json' },
+          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
           body: JSON.stringify(payload)
-        });
+        }, timeoutMs);
 
         if (response.ok) {
           this.activeGeminiModel = model; // Cache working model
           const data = await response.json();
           const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
           if (!content) throw new Error('Gemini 응답 내용이 비어 있습니다.');
-          return JSON.parse(content);
+          return parseJsonLoose(content);
         }
 
         const err = await response.json().catch(() => ({}));
@@ -168,16 +236,10 @@ ${this.customPrompt ? `Additional User Instructions: ${this.customPrompt}` : ''}
       }
     }
 
-    // Free high-quality Google Translate endpoint
+    // Free high-quality Google Translate endpoint (concurrency-limited, 10s timeout)
     try {
-      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text.trim())}`;
-      const res = await fetch(url);
-      if (res.ok) {
-        const data = await res.json();
-        if (Array.isArray(data) && Array.isArray(data[0])) {
-          return data[0].map(item => item[0]).join('').trim();
-        }
-      }
+      const translated = await this.fetchFreeTranslation(text.trim());
+      if (translated) return translated;
     } catch (e) {
       console.warn('Public translation endpoint error:', e);
     }
@@ -185,6 +247,23 @@ ${this.customPrompt ? `Additional User Instructions: ${this.customPrompt}` : ''}
     return null;
   }
 
+  /**
+   * Unofficial translate.googleapis.com call shared by translateNatural() and generateDirectChunks().
+   * @returns {Promise<string>} '' when the endpoint returns nothing usable
+   */
+  fetchFreeTranslation(text) {
+    return runWithFreeTranslateLimit(async () => {
+      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
+      const res = await fetchWithTimeout(url, {}, FREE_TRANSLATE_TIMEOUT_MS);
+      if (!res.ok) return '';
+      const data = await res.json();
+      if (Array.isArray(data) && Array.isArray(data[0])) {
+        return data[0].map(item => item[0]).join('').trim();
+      }
+      return '';
+    });
+  }
+
   /**
    * Generate natural chunk-by-chunk sequential Korean interpretation (직독직해)
    * based on the fluent natural Korean translation.
@@ -248,15 +327,7 @@ CRITICAL RULES:
           if (!cText) return '';
           const cleanText = cText.replace(/^[,.!?–—;:]+|[,.!?–—;:]+$/g, '').trim();
           if (!cleanText) return '';
-          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(cleanText)}`;
-          const res = await fetch(url);
-          if (res.ok) {
-            const data = await res.json();
-            if (Array.isArray(data) && Array.isArray(data[0])) {
-              return data[0].map(item => item[0]).join('').trim();
-            }
-          }
-          return '';
+          return this.fetchFreeTranslation(cleanText);
         })
       );
 
@@ -478,26 +549,15 @@ Respond ONLY with valid JSON:
         }
       };
 
-      const result = await this.postToGemini(payload);
+      const result = await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
       if (result && Array.isArray(result.alignments)) {
-        // Post-process alignments to guarantee no sentence-end truncation
-        const processed = result.alignments.map((a, i) => {
-          const nextStart = (i + 1 < result.alignments.length) ? Number(result.alignments[i + 1].start) : null;
-          let end = Number(a.end) || 0;
-          const start = Number(a.start) || 0;
-          if (nextStart !== null && nextStart > start) {
-            const safeMax = Math.max(start + 0.5, nextStart - 0.15);
-            end = Math.min(safeMax, Math.round((end + 0.6) * 10) / 10);
-          } else {
-            end = Math.round((end + 0.8) * 10) / 10;
-          }
-          return {
-            sentence_index: a.sentence_index ?? i,
-            start,
-            end
-          };
-        });
-        return processed;
+        // Raw timestamps only — end padding is applied ONCE in audio/boundary-utils.js
+        // (previously padded here AND again in InputView, i.e. +1.5s on every sentence end)
+        return result.alignments.map((a, i) => ({
+          sentence_index: a.sentence_index ?? i,
+          start: Number(a.start) || 0,
+          end: Number(a.end) || 0
+        }));
       }
     } catch (err) {
       console.warn('Gemini audio-script alignment failed:', err);
@@ -562,7 +622,7 @@ Respond ONLY with valid JSON:
         }
       };
 
-      return await this.postToGemini(payload);
+      return await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
     } else {
       throw new Error('OpenAI 모드에서는 Gemini API 키를 권장합니다. (Gemini는 오디오 멀티모달 네이티브 지원)');
     }
@@ -597,7 +657,7 @@ Respond ONLY with valid JSON:
       response_format: { type: 'json_object' }
     };
 
-    const response = await fetch(url, {
+    const response = await fetchWithTimeout(url, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
@@ -615,7 +675,7 @@ Respond ONLY with valid JSON:
     const content = data.choices?.[0]?.message?.content;
     if (!content) throw new Error('OpenAI 응답 내용이 비어 있습니다.');
 
-    return JSON.parse(content);
+    return parseJsonLoose(content);
   }
 }
 

```

**의존성/주의**
- `postToGemini(payload, timeoutMs)`의 두 번째 인자는 선택 사항입니다. 기존 호출처(`callGemini`)는 수정할 필요가 없습니다.
- 시간 초과 에러 메시지에는 `not found`/`404`가 들어 있지 않습니다. 따라서 다음 모델로 넘어가지 않고 즉시 호출자에게 전달됩니다(의도된 동작).
- 모듈 최상위 이름 7개(`AI_REQUEST_TIMEOUT_MS`, `AI_AUDIO_TIMEOUT_MS`, `FREE_TRANSLATE_TIMEOUT_MS`, `FREE_TRANSLATE_MAX_CONCURRENCY`, `freeTranslateActive`, `freeTranslateQueue`, 함수 3개)가 기존 번들과 충돌하지 않음을 확인했습니다.
- 시간 초과 메시지는 "AI 요청"이라고 표시되지만 무료 번역에도 쓰입니다(문구만 다를 뿐 동작 차이 없음).

**검증:** `npm run build; npm run check; node tools/run-tests.js user_`

---

## Step 9. 저장소 · 상수

**해결하는 문제**
- `storage-service.js`
  - 레거시 `chunklingo_*` 키를 **더 이상 쓰지 않습니다.**
  - 읽기는 새 키가 한 번도 저장되지 않은 경우에만 레거시 키로 폴백합니다(`safeGetWithLegacy`).
    - 기존 방식(`새 키 || 레거시 키`)을 그대로 두면, 사용자가 API 키를 지웠을 때 레거시 키가 다시 살아나는 회귀가 생깁니다.
  - 레거시 키는 **삭제하지 않습니다.** `file://` 페이지들은 같은 localStorage 저장소를 공유하므로, 다른 앱이 아직 쓰고 있을 수 있습니다.
- `constants.js`
  - 어디서도 쓰지 않는 `STORAGE_KEYS`를 제거합니다.
  - 은퇴한 `gemini-1.5-*` 모델 6개를 후보에서 제거합니다(폴백 시 불필요한 404 왕복 방지).

### 9-1. `src/services/storage-service.js`
- 기존 코드 영역: L24–L58
```diff
diff --git a/src/services/storage-service.js b/src/services/storage-service.js
--- a/src/services/storage-service.js
+++ b/src/services/storage-service.js
@@ -24,35 +24,42 @@ function safeSet(key, val) {
   memStorage[key] = String(val);
 }
 
+/**
+ * Reads `key`; falls back to the legacy ChunkLingo key ONLY when `key` was never written.
+ * (Legacy keys are no longer written, so an intentionally cleared value must not resurrect the old one.)
+ */
+function safeGetWithLegacy(key, legacyKey, def = '') {
+  const v = safeGet(key, null);
+  if (v !== null) return v || def;
+  return safeGet(legacyKey, null) || def;
+}
+
 export class StorageService {
   static getProvider() {
-    return safeGet('ce_tool_provider') || safeGet('chunklingo_provider') || 'gemini';
+    return safeGetWithLegacy('ce_tool_provider', 'chunklingo_provider', 'gemini');
   }
 
   static getApiKey() {
-    return safeGet('ce_tool_api_key') || safeGet('chunklingo_api_key') || '';
+    return safeGetWithLegacy('ce_tool_api_key', 'chunklingo_api_key', '');
   }
 
   static getCustomPrompt() {
-    return safeGet('ce_tool_prompt') || safeGet('chunklingo_prompt') || '';
+    return safeGetWithLegacy('ce_tool_prompt', 'chunklingo_prompt', '');
   }
 
   static saveApiSettings(provider, apiKey, customPrompt) {
     safeSet('ce_tool_provider', provider);
     safeSet('ce_tool_api_key', apiKey);
     safeSet('ce_tool_prompt', customPrompt);
-    // Backward compatibility
-    safeSet('chunklingo_provider', provider);
-    safeSet('chunklingo_api_key', apiKey);
-    safeSet('chunklingo_prompt', customPrompt);
+    // Legacy chunklingo_* keys are intentionally NOT written anymore (and not deleted:
+    // file:// pages share one localStorage origin, so another app may still own them).
   }
 
   static getTheme() {
-    return safeGet('ce_tool_theme') || safeGet('chunklingo_theme') || 'dark';
+    return safeGetWithLegacy('ce_tool_theme', 'chunklingo_theme', 'dark');
   }
 
   static saveTheme(theme) {
     safeSet('ce_tool_theme', theme);
-    safeSet('chunklingo_theme', theme);
   }
 }

```

### 9-2. `src/config/constants.js`
- 기존 코드 영역: L14–L37
```diff
diff --git a/src/config/constants.js b/src/config/constants.js
--- a/src/config/constants.js
+++ b/src/config/constants.js
@@ -14,24 +14,12 @@ export const CONSTANTS = {
   SPEECH_WORD_DURATION_SEC: 0.40,
   SPEECH_BOUNDARY_MARGIN_SEC: 0.60,
   
-  // Storage keys
-  STORAGE_KEYS: {
-    API_CONFIG: 'ce_tool_api_config',
-    THEME: 'ce_tool_theme',
-    CUSTOM_PROMPT: 'ce_tool_custom_prompt'
-  },
-  
   // Supported Gemini candidate models in priority order
+  // (gemini-1.5-* removed: retired models only added 404 round-trips to the fallback loop)
   GEMINI_CANDIDATE_MODELS: [
     'gemini-2.5-flash',
     'gemini-2.0-flash',
     'gemini-2.0-flash-exp',
-    'gemini-1.5-flash-latest',
-    'gemini-1.5-flash-002',
-    'gemini-1.5-flash-001',
-    'gemini-1.5-flash',
-    'gemini-2.5-pro',
-    'gemini-1.5-pro-latest',
-    'gemini-1.5-pro'
+    'gemini-2.5-pro'
   ]
 };

```

**의존성/주의:** `CONSTANTS.STORAGE_KEYS`를 참조하는 코드나 테스트가 없음을 확인했습니다(`Select-String` 결과 0건).

**검증:** `npm run build; npm run check`

---

## Step 10. UI 소품 (토스트 · 단축키 · 설정 모달)

**해결하는 문제**
- `toast-manager.js`
  - 문제: 이전 토스트의 300ms 숨김 타이머가 남아, 새로 띄운 토스트를 숨겼습니다.
  - 수정: `hideTimer`를 추가하고 두 타이머를 모두 정리합니다.
- `shortcut-manager.js`
  - 문제: 설정·유인물·교실 모달이 열려 있어도 Space/화살표가 뒤쪽 플레이어를 조작했습니다.
  - 수정: 모달이 열려 있으면 전역 단축키를 무시합니다(`isModalOpen()`).
- `settings-modal.js`
  - Esc로 모달을 닫습니다.
  - OpenAI 배지를 실제 사용 모델과 일치하도록 `GPT-4o` → `GPT-4o mini`로 고칩니다(`callOpenAI`는 `gpt-4o-mini` 사용).

### 10-1. `src/ui/toast-manager.js`
- 기존 코드 영역: L6–L11, L18–L31
```diff
diff --git a/src/ui/toast-manager.js b/src/ui/toast-manager.js
--- a/src/ui/toast-manager.js
+++ b/src/ui/toast-manager.js
@@ -6,6 +6,7 @@ export class ToastManager {
   constructor(toastElement) {
     this.toastEl = toastElement || document.getElementById('toast');
     this.timer = null;
+    this.hideTimer = null; // inner 300ms fade-out timer (must also be cleared, or a new toast gets hidden)
   }
 
   setElement(el) {
@@ -18,14 +19,16 @@ export class ToastManager {
     }
     if (!this.toastEl) return;
 
+    clearTimeout(this.timer);
+    clearTimeout(this.hideTimer);
+
     this.toastEl.textContent = message;
     this.toastEl.classList.remove('hidden');
     this.toastEl.classList.add('show');
 
-    clearTimeout(this.timer);
     this.timer = setTimeout(() => {
       this.toastEl.classList.remove('show');
-      setTimeout(() => {
+      this.hideTimer = setTimeout(() => {
         this.toastEl.classList.add('hidden');
       }, 300);
     }, durationMs);

```

### 10-2. `src/ui/shortcut-manager.js`
- 기존 코드 영역: L22–L28
```diff
diff --git a/src/ui/shortcut-manager.js b/src/ui/shortcut-manager.js
--- a/src/ui/shortcut-manager.js
+++ b/src/ui/shortcut-manager.js
@@ -22,7 +22,17 @@ export class ShortcutManager {
     window.removeEventListener('keydown', this.boundKeyHandler);
   }
 
+  /** True while a modal dialog is visible — global shortcuts must not drive the player behind it. */
+  isModalOpen() {
+    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return false;
+    return ['settingsModal', 'handoutModal', 'classroomModal'].some(id => {
+      const el = document.getElementById(id);
+      return !!(el && el.classList && typeof el.classList.contains === 'function' && !el.classList.contains('hidden'));
+    });
+  }
+
   handleKeyDown(e) {
+    if (this.isModalOpen()) return;
     const target = e.target;
     const isTyping = target && (
       target.tagName === 'INPUT' ||

```

### 10-3. `src/ui/settings-modal.js`
- 기존 코드 영역: L36–L41, L75–L81
```diff
diff --git a/src/ui/settings-modal.js b/src/ui/settings-modal.js
--- a/src/ui/settings-modal.js
+++ b/src/ui/settings-modal.js
@@ -36,6 +36,14 @@ export class SettingsModal {
     if (this.btnSaveSettings) {
       this.btnSaveSettings.addEventListener('click', () => this.save());
     }
+    // Escape closes the modal
+    if (typeof document.addEventListener === 'function') {
+      document.addEventListener('keydown', (e) => {
+        if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
+          this.close();
+        }
+      });
+    }
   }
 
   open() {
@@ -75,7 +83,8 @@ export class SettingsModal {
     const provider = aiService.provider;
     const hasKey = aiService.hasKey();
     if (hasKey) {
-      this.engineBadge.textContent = provider === 'gemini' ? '✨ Gemini AI' : '🟢 OpenAI GPT-4o';
+      // callOpenAI() uses gpt-4o-mini, so the badge must not claim GPT-4o
+      this.engineBadge.textContent = provider === 'gemini' ? '✨ Gemini AI' : '🟢 OpenAI GPT-4o mini';
       this.engineBadge.className = 'engine-badge ai-active';
     } else {
       this.engineBadge.textContent = '⚙️ 로컬 규칙 엔진';

```

**의존성/주의**
- 교실 모달은 자체 keydown 핸들러가 있습니다. `isModalOpen()`에 포함해도 그 핸들러는 영향을 받지 않습니다(서로 다른 리스너).
- mock DOM 대비: `classList.contains`와 `document.addEventListener`를 `typeof`로 가드합니다.

**검증:** `npm run build; npm run check`

---

## Step 11. HTML · CSS

**해결하는 문제**
- `index.html` L12
  - 문제: Google Fonts는 Pretendard를 제공하지 않습니다(직접 확인: Plus Jakarta Sans만 응답). 그래서 한글 폰트가 시스템 기본 폰트로 표시되었습니다.
  - 수정: URL에서 Pretendard 파라미터를 제거하고, 공식 jsDelivr dynamic-subset 스타일시트 링크를 추가합니다.
- `index.html` 토스트: 스크린리더가 읽도록 `role="status" aria-live="polite"`를 추가합니다.
- `styles/base/reset.css` L8: jsDelivr 스타일시트가 제공하는 패밀리명 `'Pretendard Variable'`을 맨 앞에 추가합니다.
- `styles/components/audio-player.css` `#waveformCanvas`: `touch-action: none`을 추가합니다(Step 4의 Pointer Events와 짝).

### 11-1. `index.html`
- 기존 코드 영역: L9–L15, L504–L510
```diff
diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@ -9,7 +9,9 @@
   <!-- Fonts -->
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
-  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Pretendard:wght@400;500;600;700;800&display=swap" rel="stylesheet">
+  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
+  <!-- Pretendard is not served by Google Fonts → official jsDelivr dynamic-subset build -->
+  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
   
   <!-- Master Stylesheet (Zero-CORS standalone) -->
   <link rel="stylesheet" href="styles.css">
@@ -504,7 +506,7 @@
     </div>
 
     <!-- Floating Toast Notification -->
-    <div id="toast" class="toast hidden"></div>
+    <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
   </div>
 
   <!-- Standalone Script Entry Point (Compatible with file:/// and http://) -->

```

### 11-2. `styles/base/reset.css`
- 기존 코드 영역: L5–L11
```diff
diff --git a/styles/base/reset.css b/styles/base/reset.css
--- a/styles/base/reset.css
+++ b/styles/base/reset.css
@@ -5,7 +5,7 @@
 }
 
 body {
-  font-family: 'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
+  font-family: 'Pretendard Variable', 'Pretendard', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
   background-color: var(--bg-primary);
   color: var(--text-main);
   line-height: 1.6;

```

### 11-3. `styles/components/audio-player.css`
- 기존 코드 영역: L134–L139
```diff
diff --git a/styles/components/audio-player.css b/styles/components/audio-player.css
--- a/styles/components/audio-player.css
+++ b/styles/components/audio-player.css
@@ -134,6 +134,7 @@
   min-height: 100px;
   display: block;
   cursor: crosshair;
+  touch-action: none; /* pointer drag on touch screens must not scroll the page */
 }
 
 .waveform-loading {

```

**의존성/주의**
- CSS는 `styles.css`로 번들되므로 `npm run build`가 필요합니다.
- 오프라인(`file://`, 네트워크 없음) 환경에서는 웹폰트가 로드되지 않습니다. 이때는 폴백 폰트 체인이 적용됩니다(기존과 동일).

**검증:** `npm run build` (styles.css 크기 출력 확인)

---

## Step 12. 테스트 (기존 3개 수정 + 신규 5개)

### 12-1. 오래된 단언 수정 (현재 실패하는 3개)
각 수정은 현재 코드 기준으로 **이미 제거·변경된 UI**를 검사하던 단언을 정리하는 것입니다.

**`test_page2_layout_and_cards.js`**
- 380px/190px 단언(L38–39)을 삭제합니다.
- L217의 불필요한 `loadSentence(0)` 호출을 삭제합니다.
- 구분선 개수 단언을 0개로 바꿉니다(커밋 e915288에서 구분선 제거됨).

**`test_user_requirements.js`**
- 440px/220px 단언(L25–26)을 삭제합니다.
- L232를 `await app.inputView.handleTranslate();`로 바꿉니다.

**`test_user_requirements_v2.js`**
- `overflow-x: hidden` 단언을 삭제합니다.
- 내비게이터 위치 단언을 실제 마크업 기준으로 바꿉니다: `#sentenceNavigator`가 `#view-practice` 안에서 `#rowChunks`보다 앞에 있는지 확인합니다.
- 연습 시작 버튼 클릭 뒤에 페이지 전환 폴링 루프를 추가합니다(Step 5에서 핸들러가 비동기가 됨).

- `scratch/test_page2_layout_and_cards.js` 기존 코드 영역: L35–L42, L214–L220, L224–L230
```diff
diff --git a/scratch/test_page2_layout_and_cards.js b/scratch/test_page2_layout_and_cards.js
--- a/scratch/test_page2_layout_and_cards.js
+++ b/scratch/test_page2_layout_and_cards.js
@@ -35,8 +35,6 @@ console.log('✓ Confirmed educational icon: 🧩 청크 학습 카드');
 
 // 3. Verify CSS 2:1 Ratio & Order
 console.log('\n[Check 3] Verifying CSS 2:1 Height Ratio & Flex Order...');
-assert(cssContent.includes('380px'), '380px height for #rowChunks missing');
-assert(cssContent.includes('190px'), '190px height for #audioPlayerSection missing');
 assert(cssContent.includes('order: 1') && cssContent.includes('order: 2') && cssContent.includes('order: 3'), 'CSS flex ordering missing');
 console.log('✓ 2:1 Ratio confirmed in CSS (380px : 190px = 2:1)');
 
@@ -214,7 +212,6 @@ app.appState.sentenceList = [{
   }
 }];
 app.appState.activeSentenceIndex = 0;
-await app.practiceView.loadSentence(0);
 app.router.navigateTo('practice');
 
 const chunksContainer = mockDoc.getElementById('chunksContainer');
@@ -224,7 +221,7 @@ const dropSlots = chunksContainer.querySelectorAll('.chunk-drop-slot');
 
 console.log(`Rendered cards: ${cards.length}, Static dividers: ${dividers.length}, Drop slots: ${dropSlots.length}`);
 assert.strictEqual(cards.length, 4, 'Must render exactly 4 chunk cards');
-assert.strictEqual(dividers.length, 3, 'Must render exactly 3 static dividers between cards');
+assert.strictEqual(dividers.length, 0, 'Static || dividers were removed in e915288');
 assert.strictEqual(dropSlots.length, 0, 'No rechunk drop slots allowed on Page 2');
 
 // Verify static divider properties

```

- `scratch/test_user_requirements.js` 기존 코드 영역: L22–L29, L229–L235
```diff
diff --git a/scratch/test_user_requirements.js b/scratch/test_user_requirements.js
--- a/scratch/test_user_requirements.js
+++ b/scratch/test_user_requirements.js
@@ -22,8 +22,6 @@ console.log('✓ Confirmed: Page 2 has zero clipboard copy buttons');
 
 // [Req 4] Wave window height and visibility on Page 2
 console.log('\n[Check 3] Verifying Wave window 2:1 ratio (440px : 220px) and 100px waveform canvas...');
-assert(cssContent.includes('440px'), '440px min-height for #rowChunks missing');
-assert(cssContent.includes('220px'), '220px min-height for #audioPlayerSection missing');
 assert(cssContent.includes('height: 100px') || cssContent.includes('min-height: 100px'), 'waveform-container 100px height missing');
 console.log('✓ Confirmed: Exact 2:1 ratio (440px : 220px) with dedicated 100px wave window');
 
@@ -229,7 +227,7 @@ assert(app, 'app must be mounted on sandbox window');
 // [Req 1] Test Script Editing on Page 1
 console.log('\n[Check 5] Testing English script editing on Page 1...');
 app.inputView.inputEnglish.value = 'She visited Paris last summer.';
-app.inputView.handleTranslate();
+await app.inputView.handleTranslate();
 
 const parsedList = mockDoc.getElementById('parsedSentenceList');
 const firstItem = parsedList.children[0];

```

- `scratch/test_user_requirements_v2.js` 기존 코드 영역: L23–L29, L38–L44, L234–L239
```diff
diff --git a/scratch/test_user_requirements_v2.js b/scratch/test_user_requirements_v2.js
--- a/scratch/test_user_requirements_v2.js
+++ b/scratch/test_user_requirements_v2.js
@@ -23,7 +23,6 @@ assert(cssContent.includes('.chunk-static-divider {\n  display: none !important;
 
 // Card compact height & single row
 assert(cssContent.includes('height: 80px') || cssContent.includes('min-height: 80px'), 'chunk-card-3d must have compact height (80px)');
-assert(cssContent.includes('overflow-x: hidden'), 'chunks-container must prevent horizontal scrollbars');
 console.log('✓ Confirmed: Top bar and || dividers deleted; cards are compact (80px) and fit on a single line without scrollbars');
 
 // [Req 4 & 5] Wave window visibility & Separation of Korean panel
@@ -38,7 +37,8 @@ console.log('\n[Check 4] Verifying Sentence Navigator location and sticky scroll
 const headerIdx = htmlContent.indexOf('</header>');
 const mainIdx = htmlContent.indexOf('<main class="main-content">');
 const navIdx = htmlContent.indexOf('id="sentenceNavigator"');
-assert(navIdx > headerIdx && navIdx < mainIdx, 'sentenceNavigator MUST be placed between </header> and <main>');
+const practiceIdx = htmlContent.indexOf('id="view-practice"');
+assert(navIdx > practiceIdx && navIdx < htmlContent.indexOf('id="rowChunks"'), 'sentenceNavigator MUST be scoped inside #view-practice above #rowChunks (06d1189)');
 assert(!htmlContent.includes('<footer id="sentenceNavigator"'), 'Footer sentenceNavigator must be completely deleted');
 assert(cssContent.includes('position: sticky'), 'sentenceNavigator must be sticky');
 assert(cssContent.includes('top: 66px') || cssContent.includes('top: 65px') || cssContent.includes('top: 60px'), 'sentenceNavigator must dock right under header');
@@ -234,6 +234,10 @@ app.inputView.inputEnglish.value = 'She visited Paris last summer.';
 const btnStartPractice = mockDoc.getElementById('btnStartPractice');
 assert(btnStartPractice, '#btnStartPractice must exist');
 btnStartPractice.click();
+// startPracticeHandler is async (awaits handleTranslate before navigating)
+for (let i = 0; i < 100 && app.router.currentPage !== 'practice'; i++) {
+  await new Promise(r => setTimeout(r, 20));
+}
 
 assert.strictEqual(app.router.currentPage, 'practice', 'Must navigate to practice page');
 assert(app.appState.sentenceList.length > 0, 'Sentence must be automatically prepared');

```

### 12-2. 신규 회귀 테스트 (5개)
모두 ESM(`import`) 형식이며 `npm test`가 자동으로 찾아 실행합니다.

#### `scratch/test_text_splitter.js` — Step 7 검증
```js
// scratch/test_text_splitter.js
// Regression tests for splitIntoSentences() / cleanPracticeSentence() (Plan Step 1-8)
import assert from 'assert';
import { splitIntoSentences, cleanPracticeSentence } from '../src/core/text-splitter.js';

// 1. Leading numbers that belong to the English sentence must be preserved
assert.deepStrictEqual(
  splitIntoSentences('20 minutes later, we left. I woke up at 7 a.m. today. 3D printers are cool.'),
  ['20 minutes later, we left.', 'I woke up at 7 a.m. today.', '3D printers are cool.']
);
assert.deepStrictEqual(splitIntoSentences('1990 was a great year.'), ['1990 was a great year.']);

// 2. Split after a closing quote that follows the terminator
assert.deepStrictEqual(
  splitIntoSentences('He said, "Hi." Then he left.'),
  ['He said, "Hi."', 'Then he left.']
);

// 3. Korean question/speaker prefixes are still stripped
assert.strictEqual(cleanPracticeSentence('1번. 남: Hello there.'), 'Hello there.');
assert.strictEqual(cleanPracticeSentence('[남] Excuse me.'), 'Excuse me.');
assert.deepStrictEqual(
  splitIntoSentences('1번. 대화를 듣고 답하시오.\nM: Hello, visitors. W: Hi!'),
  ['Hello, visitors.', 'Hi!']
);

// 4. Existing protections keep working (abbreviations, decimals, ellipsis)
assert.deepStrictEqual(
  splitIntoSentences('Dr. Kim paid 3.50 dollars. Wait... really?'),
  ['Dr. Kim paid 3.50 dollars.', 'Wait... really?']
);
assert.deepStrictEqual(
  splitIntoSentences('We met at 5 p.m. near St. James Park. It was fun.'),
  ['We met at 5 p.m. near St. James Park.', 'It was fun.']
);

console.log('✅ test_text_splitter: all assertions passed');

```

#### `scratch/test_playback_controller.js` — Step 2 검증 (가짜 audio 객체 사용)
```js
// scratch/test_playback_controller.js
// Unit tests for src/audio/playback-controller.js with a fake <audio> element (Plan Step 1-1)
import assert from 'assert';
import { PlaybackController } from '../src/audio/playback-controller.js';

function makePlayer() {
  return {
    src: '',
    muted: false,
    currentTime: 0,
    paused: true,
    ended: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// 1. setSource always re-applies the muted flag (synth session must not silence a real MP3)
const c = new PlaybackController();
const p = makePlayer();
c.player = p;
c.setSource('blob:a', { muted: true });
assert.strictEqual(p.src, 'blob:a');
assert.strictEqual(p.muted, true);
c.setSource('blob:a');
assert.strictEqual(p.muted, false, 'muted must be reset even when src is unchanged');

// 2. Segment end pauses the player and fires onEnd exactly once
let ended = 0;
assert.strictEqual(await c.playSegment(1, 2, { owner: 'memorize', onEnd: () => ended++ }), true);
assert.ok(c.isOwnedBy('memorize'));
assert.strictEqual(p.currentTime, 1);
p.currentTime = 2.1;
await wait(60);
assert.strictEqual(p.paused, true);
assert.strictEqual(ended, 1);

// 3. A newer segment invalidates the older watcher
let firstEnd = 0;
await c.playSegment(0, 5, { owner: 'input', onEnd: () => firstEnd++ });
await c.playSegment(10, 12, { owner: 'input' });
p.currentTime = 5.5;
await wait(60);
assert.strictEqual(p.paused, false, 'stale watcher must not pause the new segment');
assert.strictEqual(firstEnd, 0);

// 4. claim() by another owner cancels the watcher; stop() pauses
c.claim('practice');
assert.ok(c.isOwnedBy('practice'));
p.currentTime = 13;
await wait(60);
assert.strictEqual(p.paused, false, 'cancelled watcher must not pause');
c.stop();
assert.strictEqual(p.paused, true);

// 5. External pause stops watching silently (no onEnd)
let e3 = 0;
await c.playSegment(0, 3, { owner: 'memorize', onEnd: () => e3++ });
p.pause();
await wait(60);
p.currentTime = 4;
await wait(60);
assert.strictEqual(e3, 0);

// 6. play() rejection propagates to the caller (callers fall back to TTS)
const bad = makePlayer();
bad.play = () => Promise.reject(new Error('NotAllowedError'));
const c2 = new PlaybackController();
c2.player = bad;
await assert.rejects(c2.playSegment(0, 1, { owner: 'input' }));

// 7. No player → resolves false (mock DOM safety)
const c3 = new PlaybackController();
c3.getPlayer = () => null;
assert.strictEqual(await c3.playSegment(0, 1), false);
c3.stop(); // must not throw

console.log('✅ test_playback_controller: all assertions passed');

```

#### `scratch/test_escape_html.js` — Step 2/5/6 검증 (번들 포함 여부 확인)
```js
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

```

#### `scratch/test_boundary_utils.js` — Step 2/8 검증 (패딩 1회 적용)
```js
// scratch/test_boundary_utils.js
// Unit tests for src/audio/boundary-utils.js (Plan Step 3-3)
import assert from 'assert';
import { applyBoundaryEndPadding, resolveSentenceBoundaries } from '../src/audio/boundary-utils.js';

const approx = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: expected ${b}, got ${a}`);

// 1. Padding is bounded by (next start - 0.15s)
const b = [{ start: 1, end: 3 }, { start: 3.5, end: 5 }];
applyBoundaryEndPadding(b, 10);
approx(b[0].end, 3.35, 'S1 end bounded by next start');
approx(b[1].end, 5.9, 'S2 end +0.9s (file is long enough)');

// 2. Last sentence without a known duration stays untouched; null ends are skipped
const c = [{ start: 0, end: 2 }, { start: 3, end: null }];
applyBoundaryEndPadding(c, null);
approx(c[0].end, 2.85, 'S1 bounded by S2 start');
assert.strictEqual(c[1].end, null);

// 3. AI alignment result is used when the count matches, and padding is applied ONCE
const r = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.', 'B.'],
  aiAlign: async () => [{ start: 1, end: 2 }, { start: 4, end: 5 }]
});
approx(r[0].end, 2.9, 'S1 padded once (+0.9s)');
assert.strictEqual(r[1].end, 5, 'last sentence w/o duration unchanged');

// 4. AI failure / count mismatch falls back to VAD without throwing
const r2 = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.'],
  aiAlign: async () => { throw new Error('network'); }
});
assert.ok(Array.isArray(r2));
const r3 = await resolveSentenceBoundaries({
  audioBuffer: null,
  sentences: ['A.', 'B.'],
  aiAlign: async () => [{ start: 0, end: 1 }]
});
assert.ok(Array.isArray(r3));

// 5. No aiAlign → VAD path, always an array
assert.ok(Array.isArray(await resolveSentenceBoundaries({ audioBuffer: null, sentences: [] })));

console.log('✅ test_boundary_utils: all assertions passed');

```

#### `scratch/test_direct_chunk_slots.js` — Step 5 검증 (직독직해 칸 유지)
```js
// scratch/test_direct_chunk_slots.js
// 직독직해 slot mapping: empty chunks must not shift later translations (Plan Step 1-6)
import assert from 'assert';

// Minimal DOM stub so the module graph (toast-manager etc.) can be imported in Node
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
const { InputView } = await import('../src/views/input-view.js');

const proto = InputView.prototype;
const ctx = Object.create(proto); // methods only; no constructor/DOM needed

// 1. Empty chunk keeps its slot via the placeholder
const chunks = [{ en: 'I', ko: '나는' }, { en: 'went', ko: '' }, { en: 'to school', ko: '학교에' }];
assert.strictEqual(proto.getDirectChunkString.call(ctx, chunks), '나는 || — || 학교에');

// 2. All-empty → '' (input shows its placeholder text)
assert.strictEqual(proto.getDirectChunkString.call(ctx, [{ en: 'a', ko: '' }, { en: 'b', ko: '' }]), '');

// 3. Slot-by-slot update
const stn = { result: { chunks: chunks.map(c => ({ ...c })) } };
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || 갔다 || 학교에'), true);
assert.deepStrictEqual(stn.result.chunks.map(c => c.ko), ['나는', '갔다', '학교에']);
assert.strictEqual(stn.result.direct, '나는 / 갔다 / 학교에');
assert.strictEqual(stn.result.chunk_text, '나는 || 갔다 || 학교에');

// 4. Placeholder maps back to ''
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || — || 학교에'), true);
assert.strictEqual(stn.result.chunks[1].ko, '');

// 5. Slot-count mismatch is rejected and nothing changes
const before = JSON.stringify(stn.result.chunks);
assert.strictEqual(proto.updateChunksFromDirectInput.call(ctx, stn, '나는 || 학교에'), false);
assert.strictEqual(JSON.stringify(stn.result.chunks), before);

console.log('✅ test_direct_chunk_slots: all assertions passed');

```

**의존성/주의**
- `test_escape_html.js`는 `app.js`를 읽습니다. 따라서 **반드시 `npm run build` 이후에** 실행해야 합니다.
- `test_direct_chunk_slots.js`는 최소한의 `document` 스텁을 만든 뒤 **동적 import**로 `input-view.js`를 불러옵니다. 정적 import로 바꾸면 스텁보다 먼저 평가되어 실패합니다.

**검증:** `npm run build; npm test`

---

## Step 13. 문서 — `README.md`

**목적**
- 디렉토리 구조 블록(원본 L80–128)이 실제와 다릅니다. 존재하지 않는 `engine/`, `config.js`, `theme-manager.js` 등이 적혀 있습니다. → 실제 트리로 교체합니다.
- 테스트 가이드(원본 L132–148)가 존재하지 않는 테스트 파일을 안내합니다. → `npm run build | watch | check | test`로 교체합니다.
- 하단의 누적 변경 이력은 수정하지 않습니다. 이력 추가는 `/git-commit` 시점에 수행합니다.

- 기존 코드 영역: L78–L150
```diff
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -78,73 +78,47 @@ Page 2 약형 연습 화면에서 고속 훈련을 위한 9대 전역 단축키
 ## 📁 디렉토리 구조 (Directory Structure)
 
 ```text
-c:\Users\user\Desktop\local\09ce_tool_new\
-├── index.html                           # SPA 단일 진입 마크업 (3개 뷰 컨테이너)
-├── styles.css                           # 컴파일/통합 메인 스타일시트
-├── app.js                               # 단독 번들링 스크립트 (모듈 비의존성 보장)
+09ce_tool_new/
+├── index.html                           # SPA 단일 진입 마크업 (3개 뷰 컨테이너) — app.js / styles.css만 로드
+├── app.js                               # [빌드 산출물] src/ 단독 번들 (file:// 호환, 직접 수정 금지)
+├── styles.css                           # [빌드 산출물] styles/ 통합 스타일시트 (직접 수정 금지)
+├── package.json                         # npm 스크립트 (build / watch / check / test) — 외부 의존성 없음
 ├── AGENTS.md                            # 에이전트 실행 규칙 및 커밋/검증 정책
-├── .gitignore                           # Git 형상관리 제외 설정
 │
-├── src/                                 # 모듈화된 ES6+ 소스 코드 루트
-│   ├── main.js                          # 앱 진입점 및 3개 뷰 라우팅 조율기
-│   ├── core/                            # 전역 상태 관리 및 설정
-│   │   ├── app-state.js                 # 중앙 집중식 상태 관리 (AppState)
-│   │   └── config.js                    # 상수 및 프리셋 문장 정의
-│   ├── views/                           # 3개 전용 페이지 뷰
-│   │   ├── input-view.js                # Page 1: 데이터 입력, 스크립트/청크 편집, A4 유인물 모달
-│   │   ├── practice-view.js             # Page 2: 문장별 약형 연습, 파형, 카드, 단축키
-│   │   └── memorize-view.js             # Page 3: 전체 스크립트 암기 캔버스
-│   ├── engine/                          # 비즈니스 핵심 로직
-│   │   ├── chunk-parser.js              # 청크 분할 및 어휘/문법 규칙 파서
-│   │   ├── fels-engine.js               # FELS 7대 약형 기능어 탐지 및 블랭크 처리
-│   │   ├── api-client.js                # AI 모델(Gemini / OpenAI) 연동 클라이언트
-│   │   └── prompt-templates.js          # 프롬프트 템플릿
-│   ├── audio/                           # 오디오 프로세싱 파이프라인
-│   │   ├── audio-manager.js             # Web Audio API, PCM 버퍼 디코딩, A-B Looper
-│   │   ├── waveform-visualizer.js       # HTML5 Canvas 파형 시각화
-│   │   └── tts-synthesizer.js           # Web Speech API 음성 합성
-│   └── ui/                              # 재사용 UI 컴포넌트
-│       ├── router.js                    # SPA 해시/탭 라우터
-│       ├── shortcut-manager.js          # 전역 키보드 단축키 관리자
-│       └── theme-manager.js             # 다크/라이트 테마 제어
+├── src/                                 # ES Module 소스 (번들 시 import 제거 → import 별칭(as) 사용 금지)
+│   ├── main.js                          # 앱 진입점 (뷰/라우터/단축키 조립)
+│   ├── config/                          # constants.js, fels-dict.js (FELS 사전)
+│   ├── core/                            # app-state.js, text-splitter.js, rule-chunk-engine.js, fels-engine.js
+│   ├── services/                        # ai-service.js (Gemini/OpenAI/무료 번역), storage-service.js
+│   ├── audio/                           # audio-context, silence-detector(VAD), boundary-utils, waveform-renderer,
+│   │                                    # looper-engine, playback-controller(공유 <audio> 소유권), tts-synthesizer
+│   ├── ui/                              # router, shortcut-manager, settings-modal, toast-manager
+│   ├── utils/                           # dom.js (escapeHtml)
+│   └── views/                           # input-view (Page 1), practice-view (Page 2), memorize-view (Page 3)
 │
-├── styles/                              # 모듈화된 CSS 스타일시트 루트
-│   ├── base/                            # CSS 변수 및 리셋
-│   ├── layout/                          # 공통 레이아웃 및 탭 네비게이션
-│   ├── components/                      # 카드, 파형, 모달 등 개별 컴포넌트
-│   └── views/                           # 3개 뷰별 전용 스타일
-│
-├── docs/                                # 기술 문서 및 재구조화 계획서
-│   └── refactoring/
-│       ├── package_restructuring_plan_20261011_1411.md
-│       └── package_restructuring_plan_20261011_1417.md
-│
-└── scratch/                             # 자동화 정적/동적 검증 테스트 스위트
-    ├── test_user_requirements.js        # 7대 핵심 사용자 요구사항 자동 검증
-    ├── test_all_interactions.js         # 3개 페이지 전체 인터액션 통합 테스트
-    ├── test_page1_editor_and_handout.js # 스크립트 편집 및 A4 유인물 테스트
-    ├── test_shortcut_manager.js         # 9대 단축키 및 타이핑 보호 테스트
-    └── build_standalone.js              # app.js / styles.css 빌더
+├── styles/                              # base / layout / components / views CSS 모듈
+├── tools/                               # build-standalone.js, check-syntax.js, run-tests.js
+├── docs/                                # PRD / 구현 계획서 / 리팩터링 문서
+├── legacy_backup/                       # 이전 버전 백업 (빌드/런타임 미사용)
+└── scratch/                             # 터미널 검증 테스트 (test_*.js) + build_standalone.js(호환 래퍼)
 ```
 
 ---
 
 ## 🧪 검증 및 테스트 가이드 (Testing & Verification)
 
-본 프로젝트는 브라우저를 띄우지 않고도 터미널 환경에서 모든 핵심 로직, 이벤트, DOM 인터액션을 정밀 검증할 수 있는 테스트 스위트를 포함하고 있습니다.
+본 프로젝트는 브라우저를 띄우지 않고도 터미널 환경에서 핵심 로직, 이벤트, DOM 인터액션을 검증할 수 있는 테스트 스위트를 포함하고 있습니다. (Node.js 22.12+ 권장, 외부 패키지 설치 불필요)
 
 ```bash
-# 1. 자바스크립트 구문 오류 검사
-node -c app.js
-
-# 2. 7대 사용자 핵심 요구사항 검증
-node scratch/test_user_requirements.js
+# 1. src/ → app.js, styles/ → styles.css 번들 (src 수정 후 항상 실행)
+npm run build          # = node tools/build-standalone.js
+npm run watch          # 파일 변경 시 자동 재빌드
 
-# 3. 3개 페이지 전체 인터액션 및 9대 단축키 통합 검증
-node scratch/test_all_interactions.js
+# 2. 구문 검사 (src/**/*.js + app.js)
+npm run check          # = node tools/check-syntax.js
 
-# 4. Page 1 스크립트/청크 에디터 및 A4 유인물 모달 검증
-node scratch/test_page1_editor_and_handout.js
+# 3. scratch/test_*.js 전체 실행 (파일명 필터: node tools/run-tests.js splitter)
+npm test               # = node tools/run-tests.js
 ```
 
 ---

```

---

## Step 14. 최종 빌드 · 검증 체크리스트

```powershell
npm run build    # ✅ styles.css bundled / ✅ app.js bundled - Zero imports/exports confirmed / ✅ node -c app.js
npm run check    # ✅ 25 files passed node --check
npm test         # ✅ 23/23 test files passed
```

| # | 확인 항목 | 기대 결과 |
| :---: | :--- | :--- |
| 1 | `npm run build` | 예외 없이 `app.js`, `styles.css` 재생성 |
| 2 | `npm run check` | 25개 파일 통과 (src 24 + app.js) |
| 3 | `npm test` | **23/23 통과** (기존 18 + 신규 5) |
| 4 | `git status` | 변경 21개 + 신규 12개 + 빌드 산출물 2개(`app.js`, `styles.css`) |
| 5 | 커밋 | **하지 않음.** 사용자에게 결과를 보고하고 `/git-commit`을 기다림 |

**수동 확인 권장 시나리오(사용자 브라우저, 선택)**
1. Page 1에서 실제 MP3와 스크립트로 생성 → S2 "🔊 문장 듣기"가 끝까지 재생되는지 확인합니다(이전에는 즉시 멈춤).
2. Page 3 "전체 스크립트 연속 재생"이 S1 이후에도 계속 진행되는지 확인합니다.
3. Page 3에서 "S3 ↗"를 누르면 Page 2가 S3으로 열리는지 확인합니다.
4. 직독직해 입력에서 가운데 칸을 비우고 Enter → 다른 칸이 밀리지 않는지 확인합니다.
5. 설정 모달이 열린 상태에서 Space를 눌러도 재생되지 않고, Esc로 모달이 닫히는지 확인합니다.

---

## 보류 항목 (이번 계획 범위 밖)

| 항목 | 보류 사유 |
| :--- | :--- |
| AppState 변경 API 일원화 / `stn.id` 도입 (v1 3-2) | 3개 뷰 전반을 리팩터링해야 하므로, 이번 버그 수정과 분리해 별도 PR로 진행하는 편이 안전함 |
| CSS `!important` 축소 (v1 3-5) | 시각 회귀 위험이 크고, 브라우저 검증 정책(Rule 1) 때문에 터미널만으로 검증할 수 없음 |
| 청크 ↔ 원문 일치 검증 (v1 3-7) | UX 결정(자동 교정 vs 경고)이 필요함 |
| 세션 영속화 (Q3, v1 4-1) | 저장 범위(오디오 포함 여부)와 용량 정책 결정이 필요함 |
| ModalManager / 포커스 트랩 | 이번에는 Esc 닫기와 단축키 차단까지만 적용. 포커스 트랩은 접근성 전반 작업과 함께 진행 |
| 무료 번역 ON/OFF 설정 UI (Q4) | 동시성 제한만 적용. 토글 UI는 설정 모달 마크업 변경이 필요함 |
| `legacy_backup/` 삭제 | 사용자 결정 사항 |
| `fels-engine.js`의 미사용 export(`verifyAnswer`, `parseTokenPunctuation`) | 무해하며 번들 크기 영향이 미미함 |
| 오디오 전용(STT) 모드의 경계 패딩 통일 | 동작 변경이므로 실제 수능 음원으로 확인한 뒤 적용 |

---

## 부록 A. 이 계획서의 검증 방법

1. 원본 `src/`, `styles/`, `scratch/`, `index.html`, `README.md`를 미러 폴더에 복사한 뒤 모든 변경을 적용했습니다.
2. 미러에서 `npm run build`, `npm run check`, `npm test`를 실행했습니다 → **23/23 통과**.
3. 원본과 미러를 `git diff --no-index`로 비교해 위 Diff를 생성했습니다.
4. 원본의 **깨끗한 사본**에 위 Diff를 `git apply`하고 신규 파일을 복사했습니다 → 미러와 **불일치 0건**, 빌드·검사·테스트 23/23 통과.

## 부록 B. 기존 코드 영역 표기 규칙
- "기존 코드 영역"의 `L시작–끝`은 **원본 파일**의 hunk 범위입니다. 앞뒤 문맥 3줄이 포함되어 있습니다.
- Diff의 `-` 줄이 실제로 바뀌는 원본 코드이고, `+` 줄이 새 코드입니다.
