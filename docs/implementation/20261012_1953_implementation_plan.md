# CE Tool 코드 점검 결과 및 개선 구현 계획서

- **작성 일시**: 2026-10-12 19:53 (KST)
- **모드**: `/ask` (계획서 전용 — 소스 코드 미수정, `/apply` 전까지 실행 금지)
- **점검 범위**: `src/` 21개 모듈(약 7,100줄), `index.html`, `styles/` 12개 CSS, `scratch/build_standalone.js`, `scratch/test_*.js` 18개

---

## 0. 점검 요약

| 항목 | 결과 |
| :--- | :--- |
| `node --check` (src 21개 + app.js) | ✅ 전부 통과 |
| `app.js` / `styles.css` 번들 ↔ `src/` 동기화 | ✅ 일치 (임시 디렉터리 재빌드 후 해시 비교) |
| `scratch/test_*.js` 18개 실행 | ⚠️ **3개 실패** (`test_page2_layout_and_cards.js`, `test_user_requirements.js`, `test_user_requirements_v2.js`) — 이후 레이아웃 변경으로 낡은 CSS 단언이 깨진 상태 |
| 실사용 기능 버그 | 🔴 **11건** (Phase 1) |
| 보안 / 데이터 무결성 | 🟠 4건 (Phase 2) |
| 구조 / 유지보수 | 🟡 7건 (Phase 3) |
| UX / 테스트 / 문서 | 🔵 5건 (Phase 4) |

> [!IMPORTANT]
> 가장 심각한 문제는 **세 페이지가 `<audio id="nativeAudioPlayer">` 하나를 같이 쓰는데, Page 2의 루퍼가 현재 페이지와 상관없이 항상 돌아간다는 점**입니다. 그래서 Page 1의 "🔊 문장 듣기"(S2 이후)와 Page 3의 "전체 스크립트 연속 재생"이 실제 MP3에서 곧바로 멈추거나 진행되지 않습니다. (1-1 참고)

---

## Phase 1 — 실사용 기능 버그 (P0, 최우선)

### 1-1. 공유 오디오 플레이어 경합으로 Page 1/3 재생이 바로 멈춤 🔴
- **원인**
  - [practice-view.js:L131-135](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L131-L135): `timeupdate` 이벤트마다 `looperEngine.checkBoundary()`를 **현재 페이지를 확인하지 않고** 호출합니다. `play` 이벤트에 연결된 rAF 루프([L1123-1136](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L1123-L1136))도 마찬가지입니다.
  - [looper-engine.js:L86-98](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/audio/looper-engine.js#L86-L98): `currentTime >= activeSentence.audioEnd`이면 `pause()`합니다. 활성 문장은 기본값이 S1입니다.
  - 결과 ①: Page 1에서 S2 이후 문장을 들으면 시작 위치가 이미 S1 끝보다 뒤이므로 약 0.25초 안에 멈춥니다 ([input-view.js:L1350-1392](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1350-L1392)).
  - 결과 ②: Page 3 전체 재생([memorize-view.js:L375-427](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L375-L427))은 S2로 넘어가는 순간 루퍼가 멈추고, `checkEnd` rAF는 `paused` 상태를 처리하지 않아서 **끝나지 않고 계속 대기**합니다.
  - 결과 ③: Page 1의 `currentStopHandler`는 끝 시점에 도달해야만 해제되므로, 중간에 멈추면 남아 있다가 나중에 Page 2 재생까지 엉뚱한 시점에 멈춥니다.
  - 결과 ④: Page 3에서 `playSingleSentence`를 빠르게 연속 클릭하면 rAF `checkEnd` 루프가 쌓이고, 이전 루프가 새 재생을 이전 문장 끝 시점에 멈춥니다 ([memorize-view.js:L429-454](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L429-L454)).
- **수정 방안**
  1. 신규 `src/audio/playback-controller.js`: 플레이어를 소유하는 단일 클래스를 만듭니다.
     - `playSegment(start, end, { owner, onEnd })`: 새로 호출하면 **이전 세그먼트 토큰을 무효화**합니다. rAF로 끝 시점을 감시하고, 일시정지·소스 변경·소유자 변경 시 자동 정리합니다.
     - `stop()`, `setSource(url, { muted })`, `isOwnedBy(owner)`
  2. `PracticeView`의 `timeupdate`/rAF 안에서 `checkBoundary()`를 호출하는 조건에 `router.getCurrentPage() === 'practice' && controller.owner === 'practice'`를 추가합니다.
  3. Input/Memorize 뷰가 직접 `currentTime`/`play()`/rAF를 다루던 부분을 `controller.playSegment()` 호출로 바꿉니다.
  4. `router.navigateTo()`에서 페이지를 바꿀 때 `controller.stop()`을 호출합니다.
- **검증**: `node --check`를 실행하고, vm 샌드박스 단위 테스트 `scratch/test_playback_controller.js`를 새로 추가합니다(가짜 Audio 객체로 세그먼트 교체·소유자 교체·일시정지 정리 확인).

### 1-2. "2단계 연습 시작" 클릭 시 샘플 문장이 먼저 표시됨 (race) 🔴
- **원인**: [input-view.js:L181-188](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L181-L188)에서 `handleTranslate()`(async)를 `await`하지 않고 바로 `navigateTo('practice')`합니다. 그러면 [practice-view.js:L1199-1213](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L1199-L1213)이 목록이 비었다고 보고 **샘플 문장("I went to school yesterday…")을 넣습니다.** 번역 중에 학생이 입력한 빈칸은 이후 덮어써지고, 번역이 실패하면 샘플 데이터가 그대로 남습니다.
- **수정**: `startPracticeHandler`를 `async`로 바꾸고, 파싱이 필요하면 `await this.handleTranslate()` 후 `sentenceList.length > 0`일 때만 이동합니다. 처리 중에는 세 버튼을 모두 `disabled` 처리합니다. `handleTranslate`가 성공 여부(boolean)를 반환하도록 합니다.

### 1-3. Page 3의 `S3 ↗` 점프가 무시되고 항상 S1로 이동 🔴
- **원인**: [memorize-view.js:L187-193](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L187-L193)에서 `setActiveSentenceIndex(sIdx)` 후 이동하지만, [practice-view.js:L1216-1222](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L1216-L1222) `onActivated()`가 무조건 `activeSentenceIndex = 0`으로 되돌립니다. 같은 탭을 다시 클릭할 때도 진행 위치가 초기화됩니다.
- **수정**: `onActivated(params)`가 진입 사유를 받도록 합니다.
  - AppState에 `dataVersion` 카운터를 추가하고 `setSentenceList` 때마다 증가시킵니다. PracticeView는 마지막으로 본 버전과 다를 때만 S1과 FELS 모드로 초기화합니다(README에 적힌 "기본 진입 = S1" 정책 유지).
  - 버전이 같으면(Page 3에서 돌아온 경우 등) 현재 `activeSentenceIndex`를 유지합니다.
  - Router는 같은 페이지로 다시 이동하는 요청을 무시합니다.
- ❓ **결정 필요 Q1** (아래 '결정 필요 사항' 참고)

### 1-4. TTS(스크립트만) 모드에서 구간 반복 2회차부터 소리가 나지 않음 🔴
- **원인**: [looper-engine.js:L72-82](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/audio/looper-engine.js#L72-L82)에서 반복할 때 무음 WAV만 `play()`하고, `speakText()`는 첫 재생 경로([practice-view.js:L675-681](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L675-L681))에서만 호출됩니다.
- **수정**: `LooperEngine.setCallbacks`에 `onLoopRestart` 콜백을 추가하고, PracticeView에서 `isSynthesizedAudio`이면 `speakText(activeStn.text)`를 호출합니다.

### 1-5. 직독직해 입력 필드와 청크 인덱스가 어긋남 🔴
- **원인**: [input-view.js:L1345-1348](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1345-L1348) `getDirectChunkString()`이 `filter(Boolean)`으로 **빈 `ko`를 지웁니다.** 그 상태에서 사용자가 수정하면 [L1266-1280](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1266-L1280)이 인덱스 순서대로 다시 넣기 때문에 해석이 한 칸씩 밀립니다.
- **수정**: 빈 청크는 `—`(placeholder)로 자리를 유지하고, 다시 넣을 때 `—`는 빈 문자열로 되돌립니다. 입력한 조각 수가 청크 수와 다르면 경고 토스트를 띄우고 반영하지 않습니다.

### 1-6. 입력 필드에서 Enter 한 번에 저장/AI 요청이 2회 실행됨 🟠
- **원인**: [input-view.js:L1014-1051](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1014-L1051)이 `keydown(Enter)`와 `change`를 둘 다 처리합니다. Chrome/Firefox는 Enter로 확정할 때 `change`도 발생시키므로, `updateChunksFromTextInput`과 `generateDirectChunks`(네트워크)가 두 번 실행되고 토스트도 두 번 뜹니다.
- **수정**: `keydown(Enter)`에서는 `input.blur()`만 하고 처리는 `change`에서만 합니다. 처리 함수에는 진행 중이면 다시 실행하지 않는 플래그(`stn._busy`)를 추가합니다. 단어 구분선 클릭([L1166-1181](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1166-L1181))에도 같은 잠금을 적용합니다.

### 1-7. 문장 분리기가 숫자를 지우고 일부 문장을 잘못 나눔 🔴 (실측으로 재현 확인)
- **재현 결과** ([text-splitter.js:L24-56](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/core/text-splitter.js#L24-L56)):
  | 입력 | 현재 출력 |
  | :--- | :--- |
  | `20 minutes later, we left.` | `minutes later, we left.` ❌ |
  | `3D printers are cool.` | `D printers are cool.` ❌ |
  | `1990 was a great year.` | `was a great year.` ❌ |
  | `I woke up at 7 a.m. today.` | `I woke up at 7 a.m.` / `today.` ❌ |
  | `He said, "Hi." Then he left.` | 분리되지 않음 ❌ |
- **원인**: L29 정규식 `^[0-9가-힣\s.:,·()\[\]\-]+(?=[A-Za-z])`이 앞부분의 **숫자까지** 지웁니다. 약어 목록에 `a.m.`/`p.m.`이 없습니다. 분리 기준 lookbehind가 `."` 같은 따옴표 뒤의 마침표를 처리하지 않습니다.
- **수정**
  - 앞부분 제거 정규식에서 숫자는 **한글 문제 번호 형식(`1번`, `[2]`, `3.` 바로 뒤에 한글이나 화자 태그가 오는 경우)**일 때만 지우도록 좁힙니다.
  - 약어 목록에 `a.m`, `p.m`, `no`, `st`, `mt`, `approx`를 추가합니다.
  - 분리 정규식을 `/(?<=[.?!]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])|\n+/`로 개선합니다.
- **검증**: 위 표를 회귀 테스트 `scratch/test_text_splitter.js`로 고정합니다.

### 1-8. 생성 버튼 라벨이 모드를 바꿔도 갱신되지 않음 🟡
- **원인**: [input-view.js:L1718-1743](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1718-L1743) `setLoading()`이 `btnTranslate.innerHTML`을 통째로 다시 만들어서, 생성자에서 저장한 `this.btnTranslateText`([L40](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L40))가 DOM에서 떨어진 요소를 가리키게 됩니다. 그래서 첫 생성 이후 `setMode()`의 라벨 변경([L237-246](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L237-L246))이 화면에 반영되지 않습니다.
- **수정**: 라벨 span은 그대로 두고 `textContent`와 스피너 class만 바꿉니다. 모드별 라벨은 `getModeLabel(mode)` 하나로 통일합니다(지금은 두 곳에 중복).

### 1-9. 실제 MP3인데 소리가 나지 않는 경우 (muted 상태가 남음) 🟡
- **원인**: [practice-view.js:L393-397](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L393-L397)은 `src`가 바뀔 때만 `muted`를 설정하고, Input/Memorize 뷰는 `src`를 직접 바꾸면서 `muted`를 신경 쓰지 않습니다. TTS 모드(`muted=true`)를 쓴 뒤 MP3를 올리고 Page 1에서 들으면 소리가 나지 않습니다.
- **수정**: 1-1의 `controller.setSource(url, { muted: appState.isSynthesizedAudio })`로 통일합니다.

### 1-10. Page 3 교실 모달의 데드 참조와 `T` 키 🟡
- [memorize-view.js:L40-44](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L40-L44): `classroomFullText`, `classroomNaturalSection`, `btnToggleClassroomNatural`은 HTML에서 이미 삭제됐습니다. `T` 키는 토스트만 띄우고 아무 동작도 하지 않습니다.
- **수정**: 관련 코드와 `T` 키 처리를 삭제하고, 모달 하단 안내 문구와 맞춥니다.

### 1-11. 토스트가 바로 사라지는 현상 🟡
- [toast-manager.js:L25-31](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/ui/toast-manager.js#L25-L31): 안쪽 300ms 타이머를 취소하지 않아서, 숨김이 시작된 직후 새 토스트를 띄우면 새 토스트가 곧바로 숨겨집니다.
- **수정**: `this.hideTimer`도 따로 보관하고 `clearTimeout`합니다. `aria-live="polite"`를 추가합니다.

---

## Phase 2 — 보안 / 데이터 무결성 (P1)

### 2-1. `innerHTML` 이스케이프 누락 (XSS / 화면 깨짐) 🟠
사용자가 붙여 넣은 스크립트나 AI 응답이 이스케이프 없이 HTML로 삽입됩니다. `Use <b> tags.` 같은 문장만 넣어도 레이아웃이 깨지고, **다운로드한 유인물 HTML 파일에도 그대로 남습니다.**
| 위치 | 삽입 값 |
| :--- | :--- |
| [memorize-view.js:L176-184](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L176-L184) | `stn.text` |
| [memorize-view.js:L247-257](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L247-L257) | `chunk.en`, `chunk.ko` |
| [memorize-view.js:L692-703](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/memorize-view.js#L692-L703) | `enText`, `koText`, `longestText` |
| [input-view.js:L1443-1489](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1443-L1489) | 유인물 `w`, `koText`, `stn.text` |
| [input-view.js:L275-284](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L275-L284) | `file.name` |
- **수정**: 신규 `src/utils/dom.js`에 `escapeHtml()`을 공용으로 두고(지금은 InputView 안에만 있음), 위 모든 위치에 적용합니다. 카드처럼 구조가 단순한 곳은 `textContent` 기반 DOM 생성으로 바꿉니다.

### 2-2. API 키가 URL 쿼리에 노출되고 타임아웃이 없음 🟠
- [ai-service.js:L41](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/services/ai-service.js#L41), [L89](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/services/ai-service.js#L89)의 `?key=${apiKey}`는 브라우저 기록, 프록시 로그, DevTools에 남습니다.
- **수정**
  - 키는 `x-goog-api-key` 헤더로 보냅니다.
  - 모든 `fetch`를 `fetchWithTimeout(url, opts, ms=30000)`(AbortController)로 감쌉니다. 오디오 요청은 120초로 합니다.
  - `JSON.parse` 실패 시 ```` ```json ```` 코드 펜스를 벗겨 한 번 더 시도합니다.
  - `storage-service.js`가 레거시 `chunklingo_*` 키에 **API 키를 두 번 저장**하는 부분을 없애고, 읽기 쪽에서만 1회 마이그레이션한 뒤 레거시 키를 삭제합니다.

### 2-3. 대용량 오디오 처리 🟠
- Gemini `inlineData`는 요청 전체 약 20MB 제한이 있는데, 지금은 확인 없이 base64(+33%)로 보냅니다. `readFileAsBase64`도 같은 파일을 여러 번 다시 인코딩합니다.
- **수정**: 업로드할 때 크기를 확인해서 15MB를 넘으면 안내 토스트와 함께 AI 정렬을 건너뛰고 VAD 결과만 씁니다. base64 결과는 `appState.uploadedAudioBase64`에 캐시하고 파일을 바꾸면 무효화합니다. 드롭 시 확장자 검사를 보강합니다(Windows는 `.m4a`의 `type`이 빈 문자열인 경우가 있음).

### 2-4. 비공식 Google Translate 엔드포인트 의존 🟠
- [ai-service.js:L173](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/services/ai-service.js#L173), [L251](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/services/ai-service.js#L251)의 `translate.googleapis.com/translate_a/single?client=gtx`는 비공식 API라서 레이트리밋, CORS 정책 변경, 약관 문제가 생길 수 있습니다. 지금은 문장 수 × 청크 수만큼 **동시에 요청**합니다.
- **수정**: 동시 요청 수를 4로 제한하는 큐를 둡니다. 실패하면 로컬 규칙 엔진으로 전환하고, 엔진 배지에 "무료 번역 사용 중" 상태를 표시합니다.
- ❓ **결정 필요 Q4**

---

## Phase 3 — 구조 / 유지보수 (P2)

### 3-1. 문장 경계 후처리 중복과 3중 패딩
- [input-view.js:L445-473](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L445-L473)과 [L560-585](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L560-L585)가 거의 같은 코드입니다.
- 끝 지점 패딩이 세 번 적용됩니다: AI 프롬프트(+0.6s) → [ai-service.js:L484-499](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/services/ai-service.js#L484-L499)(+0.6/0.8s) → input-view(+0.9/1.0s). 결과적으로 거의 모든 문장이 `nextStart - 0.15` 상한에 걸려 잘립니다.
- **수정**: 신규 `src/audio/boundary-utils.js`에 `resolveSentenceBoundaries({ audioBuffer, base64, mimeType, sentences })`를 만들어 AI 정렬, VAD 대체, 인트로 교차 검증, **단일 패딩 정책**(`END_PADDING_SEC` 상수)을 한곳에서 처리합니다. `handleTranslate`와 `autoSyncAudioScript`는 이 함수 하나만 호출합니다.
- [silence-detector.js:L55-117](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/audio/silence-detector.js#L55-L117)의 거의 같은 두 분기도 `findBestIntroSegment()` 하나로 합칩니다. 매직 넘버는 `constants.js`로 옮깁니다.

### 3-2. AppState를 거치지 않는 직접 변경
- Input 뷰가 `appState.sentenceList`를 직접 `splice`하거나 필드를 바꾸기 때문에 이벤트가 발생하지 않습니다. 그래서 Practice/Memorize 뷰가 이전 렌더 결과(`cachedPeaks`, 카드)를 그대로 보여 줄 수 있습니다.
- **수정**: AppState에 `updateSentence(idx, patch)`, `mergeSentences(idx)`, `splitSentence(idx, wordIdx, parts)`를 추가하고 `sentenceUpdated` / `sentencesLoaded`를 발생시킵니다. 비동기 번역 콜백은 `data-stn-idx` 대신 **문장 고유 id**(`stn.id`, 생성 시 부여)로 대상을 찾습니다. 지금은 병합·분할 후 인덱스가 바뀌면 다른 문장에 결과가 들어갈 수 있습니다([input-view.js:L646-652](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L646-L652), [L725-739](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L725-L739)).

### 3-3. 데드 코드 정리
| 대상 | 위치 |
| :--- | :--- |
| `copyResult()`, `.copy-btn` 바인딩 (버튼은 이미 삭제됨) | practice-view.js |
| `translateCustomChunk()` (호출하는 곳 없음) | practice-view.js |
| `stabilizedWidths` (값을 넣는 곳이 없어 항상 빈 배열) | practice-view.js |
| `calculateUniformBlankWidth` import (사용 안 함), `verifyAnswer`, `parseTokenPunctuation` | fels-engine.js |
| `CONSTANTS.STORAGE_KEYS` (사용 안 함) | constants.js |
| 교실 모달 데드 참조 (1-10) | memorize-view.js |
| 퇴역한 `gemini-1.5-*` 후보 모델 | constants.js |
| `legacy_backup/` 폴더 (git 이력과 중복, 약 200KB) | 루트 |

### 3-4. 빌드/개발 체계
- `index.html`은 번들된 `app.js`만 불러오기 때문에 `src/`를 고친 뒤 **빌드를 잊으면 화면에 반영되지 않습니다**(AGENTS.md가 전제하는 HMR도 없음). 빌드 도구가 `scratch/`(임시 폴더) 안에 있습니다.
- 번들러의 import 제거 정규식 `import\s+[\s\S]*?from\s+'…'`([build_standalone.js:L69](file:///c:/Users/user/Desktop/local/09ce_tool_new/scratch/build_standalone.js#L69))은 lazy 매칭이 여러 줄에 걸쳐 동작하므로, 문자열이나 주석에 `import `가 들어 있으면 그 뒤 코드까지 지울 수 있습니다.
- **수정**
  - `tools/build-standalone.js`로 옮깁니다(이전 경로는 안내만 출력하는 래퍼로 남김).
  - 정규식은 **줄 시작에 고정**합니다: `^\s*import\s[\s\S]*?from\s*['"][^'"]+['"];?\s*$` (multiline).
  - `package.json`(의존성 없음)을 추가합니다: `"build"`, `"check"`(src 전체 `node --check`), `"test"`(테스트 러너) 스크립트.
  - 개발용 `index.dev.html`을 추가합니다: `<script type="module" src="src/main.js">`와 `styles/main.css`를 써서 빌드 없이 바로 확인(정적 서버 필요).
- ❓ **결정 필요 Q2**

### 3-5. CSS 유지보수성
- `!important` **총 129개**(input-view.css 66, chunk-cards.css 36, memorize-view.css 17 등)와 하드코딩된 hex 색상 201개가 테마 변수를 우회합니다. day 모드 버그(README 06d1189)가 반복된 원인이기도 합니다.
- **수정 (단계적)**: 테마에 의존하는 색상부터 `variables.css` 토큰(`--card-text`, `--accent-mint` 등)으로 옮기고, 명시도 충돌은 `:where()`나 레이어(`@layer base, components, views`)로 정리해 `!important`를 30개 이하로 줄입니다. 이번 차수에서는 **chunk-cards.css만** 진행합니다(화면 회귀 위험 최소화).

### 3-6. 폰트 로딩 결함
- [index.html:L12](file:///c:/Users/user/Desktop/local/09ce_tool_new/index.html#L12): **Pretendard는 Google Fonts에 없습니다.** 실제 요청해 보니 Plus Jakarta Sans만 받아지고 Pretendard 선언은 빠져 있어, 한글은 시스템 폰트로 대체됩니다.
- **수정**: Pretendard는 jsDelivr CDN(`pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css`)으로 따로 불러오고, Google Fonts URL에서는 제거합니다.

### 3-7. 입력 유효성
- 청크 텍스트 입력([input-view.js:L1224-1264](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1224-L1264))은 문장 원문과 단어가 맞는지 확인하지 않아, 원문과 청크가 서로 달라질 수 있습니다.
- **수정**: 공백과 구두점을 정규화한 단어 배열이 원문과 다르면 경고 토스트를 띄우고 "원문을 청크 기준으로 갱신할까요?" 확인을 받습니다.

---

## Phase 4 — UX / 테스트 / 문서 (P3)

### 4-1. 세션 자동 저장 (새로고침하면 모든 작업이 사라짐)
- 지금은 API 설정과 테마만 저장됩니다. 문장, 청크, 해석 편집 결과는 새로고침하면 사라집니다.
- **수정**: `StorageService.saveSession()` — `sentenceList`(cachedPeaks 제외)와 `scriptText`, `currentMode`를 localStorage에 저장합니다(디바운스 1초, `sentencesLoaded`/`sentenceUpdated` 시점). 시작할 때 "이전 작업 복원" 토스트를 보여 줍니다. 오디오 파일은 IndexedDB에 저장합니다(선택).
- JSON 내보내기/가져오기 버튼을 추가합니다(교사가 수업 자료를 재사용하는 용도).
- ❓ **결정 필요 Q3**

### 4-2. 모달 접근성
- 설정과 유인물 모달은 `Esc`로 닫히지 않고 `role="dialog"`나 포커스 트랩이 없습니다. 모달이 열린 상태에서도 Page 2 전역 단축키(Space 등)가 동작합니다.
- **수정**: 공용 `ModalManager`(열기/닫기, Esc, 포커스 복귀)를 만들고, ShortcutManager는 모달이 열려 있으면 처리를 건너뜁니다.

### 4-3. 파형 터치/펜 지원
- 파형 캔버스가 `mouse*` 이벤트만 처리합니다([practice-view.js:L280-338](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/practice-view.js#L280-L338)). 교실의 태블릿이나 전자칠판에서는 A-B 구간을 드래그할 수 없습니다.
- **수정**: `pointerdown/move/up` 이벤트와 `setPointerCapture`로 바꾸고, `touch-action: none`을 지정합니다.

### 4-4. 테스트 정비
- 실패하는 낡은 테스트 3개는 현재 레이아웃 기준으로 단언을 고치거나 폐기합니다.
- README에 적힌 `test_all_interactions.js`, `test_shortcut_manager.js`, `test_page1_editor_and_handout.js` 등 **10개 이상이 실제로는 없습니다.**
- **수정**: `tests/` 폴더로 옮기고 `tests/run-all.js` 러너를 둡니다(`npm test`). 신규 단위 테스트는 splitter(1-7), playback-controller(1-1), escapeHtml(2-1), boundary-utils(3-1), 직독직해 자리 유지(1-5)입니다.

### 4-5. 문서 및 기타 정합성
- README 디렉터리 구조가 실제와 다릅니다(`src/engine/`, `chunk-parser.js`, `api-client.js`, `theme-manager.js` 등은 없음 → 실제는 `src/core`, `src/config`, `src/services`). Page 3 모드 설명도 실제 4개 모드와 다릅니다.
- 유인물 날짜 칸에 연도 `2026.`이 하드코딩돼 있습니다([input-view.js:L1525](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1525), [L1587](file:///c:/Users/user/Desktop/local/09ce_tool_new/src/views/input-view.js#L1587)). `new Date().getFullYear()`로 바꿉니다.
- 엔진 배지는 "OpenAI GPT-4o"로 표시되지만 실제 모델은 `gpt-4o-mini`입니다.
- `router.js` 주석에 옛 이름 "ChunkLingo"가 남아 있습니다.

---

## 결정 필요 사항

| # | 질문 | 권장안 |
| :---: | :--- | :--- |
| Q1 | Page 2에 다시 들어올 때 항상 S1로 초기화할지 | **새 데이터를 생성한 직후에만 S1로 초기화**하고, 그 외에는 위치 유지(Page 3 `S↗` 점프 정상화) |
| Q2 | `file://`로 바로 실행되는 단일 번들(`app.js`)을 유지할지 | **유지 + `index.dev.html` 추가**(배포는 번들, 개발은 모듈) |
| Q3 | 세션 저장 범위 | **텍스트 데이터는 localStorage**, 오디오 IndexedDB 저장은 2차로 미룸 |
| Q4 | 비공식 무료 번역 엔드포인트 | **유지하되 동시 요청 제한과 실패 시 로컬 엔진 전환**, 설정에서 끌 수 있는 토글 추가 |

---

## 권장 적용 순서 및 변경 파일

| 단계 | 항목 | 주요 변경 파일 | 위험도 |
| :---: | :--- | :--- | :---: |
| 1 | 1-1, 1-9 | 신규 `audio/playback-controller.js`, `practice-view.js`, `input-view.js`, `memorize-view.js`, `router.js`, `main.js` | 중 |
| 2 | 1-2, 1-3 | `input-view.js`, `practice-view.js`, `app-state.js`, `router.js` | 낮음 |
| 3 | 1-4 ~ 1-8, 1-10, 1-11 | `looper-engine.js`, `input-view.js`, `text-splitter.js`, `memorize-view.js`, `toast-manager.js` | 낮음 |
| 4 | 2-1 ~ 2-4 | 신규 `utils/dom.js`, `ai-service.js`, `storage-service.js`, 각 view | 낮음 |
| 5 | 3-1 ~ 3-4, 3-6, 3-7 | 신규 `audio/boundary-utils.js`, `silence-detector.js`, `app-state.js`, `tools/`, `package.json`, `index.dev.html`, `index.html` | 중 |
| 6 | 3-5, 4-1 ~ 4-5 | CSS, `storage-service.js`, 신규 `ui/modal-manager.js`, `tests/`, `README.md` | 중 |

> [!NOTE]
> 단계마다 끝나면 `node tools/build-standalone.js`(번들 재생성, `node -c` 포함)와 `node --check src/**/*.js`, 관련 단위 테스트만 실행합니다(AGENTS.md Rule 2). 브라우저 시각 검증은 사용자가 `/scratchpad`를 요청할 때만 합니다.

> [!WARNING]
> `src/`를 수정할 때마다 **번들(`app.js`, `styles.css`)을 다시 빌드해야** 실제 화면에 반영됩니다. 3-4단계 전까지는 각 단계 끝에 빌드를 반드시 포함합니다.
