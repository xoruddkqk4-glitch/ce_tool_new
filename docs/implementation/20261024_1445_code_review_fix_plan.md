# [구현 계획서] 전체 코드 검증 결과 및 버그 수정 계획

**문서 번호**: PLAN-20261024-CODE-REVIEW-FIX
**작성 일시**: 2026-10-24 14:45 (KST)
**요청 구분**: 프로젝트 기능 확인 및 전체 코드 정밀 검증 → 수정 계획 수립 (`/ask` 정책 준수, 소스 코드 미수정)
**검증 범위**: `src/` 28개 모듈 전체, `index.html`, `tools/`, `scratch/` 테스트 46개, 배포 번들 `app.js` / `styles.css`

---

## 0. 요약 (TL;DR)

1. **가장 시급한 문제는 배포 번들 `app.js`가 옛날 버전이라는 점입니다.** `index.html`이 실제로 불러오는 작업 사본의 `app.js`는 현재 `src/`로 빌드한 결과와 다릅니다. 멀티 AI 제공자(OpenAI/Claude/OpenRouter), 자동 페일오버, 연결 테스트, 파형 최적화가 빠진 이전 빌드입니다. 반면 커밋(HEAD)된 `app.js`는 `src/`와 정확히 일치합니다. `npm test` 실패 5건은 모두 이 때문이며, 새로 빌드한 번들로는 **46/46 전부 통과**합니다.
2. 소스 자체에서는 **실제 동작 버그 High 7건, Medium 약 20건, Low 다수**를 확인했습니다. XSS는 발견되지 않았습니다. 사용자·LLM 텍스트는 모두 `escapeHtml` 또는 `textContent`를 거칩니다.
3. 수정은 4단계로 나눕니다: **0단계(번들 복구)** → **1단계(High)** → **2단계(Medium)** → **3단계(Low/정리)**.

---

## 1. 프로젝트 기능 개요

| 페이지 | 주요 기능 |
| :--- | :--- |
| **1. 입력 (Input)** | 오디오+스크립트 / 오디오만(Gemini STT) / 스크립트만 3가지 입력. 문장 분리 → AI 정렬 또는 VAD 무음 감지로 문장 구간 산출(한국어 안내 건너뛰기) → 규칙 엔진·AI 청크 분할, 직독직해·자연 해석. 문장 카드 편집(청크 분할·병합, 문장 결합·분리, 재해석), 마스터 파형 타임라인(경계 드래그, 무음 스냅, 줌), 구간 정밀 조정 모달, A4 유인물 인쇄/다운로드 |
| **2. 연습 (Practice)** | 문장 파형 플레이어(A-B 구간 반복, 쉐도잉 무음 간격, 배속), 3D 청크 카드(1–9 뒤집기), FELS 약형 빈칸 받아쓰기(S/F5/Enter), 해석 모달(T), 문장 내비게이터(←/→, F6/F7), 전체 문장 연속 재생(F11) |
| **3. 암기 (Memorize)** | 전체 스크립트 청크 그리드(전체 보기 / 청크 가리기), 행별 재생·전체 연속 재생, 교실용 대형 모달(한국어 앞면 → 영어 정답 뒷면, ←/→, F, 1–9, Esc) |
| **공통** | `.ceproject` 저장/열기(File System Access API, 오디오 base64 내장), 다크/라이트 테마, AI 설정 모달(4개 제공자 키, 자동 페일오버, 연결 테스트), 전역 단축키 |

---

## 2. 검증 수행 내역 및 결과

| 검증 항목 | 결과 |
| :--- | :--- |
| `npm run check` (28개 소스 `node --check`) | ✅ 전부 통과 |
| `npm test` (작업 사본 `app.js` 기준) | ❌ 41/46 통과 (5건 실패) |
| `npm test` (임시 폴더에서 `src/`로 새로 빌드한 번들 기준) | ✅ **46/46 통과** |
| 새 빌드 `app.js` vs HEAD `app.js` | 일치 |
| 새 빌드 `app.js` vs 작업 사본 `app.js` | **불일치** (공백 무시 기준 339줄 추가 / 1,551줄 삭제) |
| 새 빌드 `styles.css` vs 작업 사본 `styles.css` | 일치 |
| 모듈별 정밀 코드 리뷰 (서비스·설정 / 오디오 엔진 / 연습·암기 뷰 / 입력 뷰·코어) | 아래 3~6절 |

실패한 5개 테스트: `test_classroom_modal_full_width`, `test_fels_enter_next_sentence`(`areAllFelsAnswersCorrect is not a function`), `test_page2_dynamic_scaling_single_row`, `test_page3_classroom_and_single_line`, `test_user_requirements_v11`. 모두 옛 번들에 해당 기능이 없어서 실패한 것입니다.

참고: 2026-10-14 계획서(`20261014_1455_light_mode_waveform_brightening.md`)의 rAF 단일 루프 가드(`isWaveformLoopRunning`) 등은 이미 `src/`에 반영되어 있고 HEAD 번들에도 포함되어 있습니다. 작업 사본의 `app.js`만 그 이전 상태로 되돌아가 있습니다.

---

## 3. [0단계] 배포 번들 복구 — 최우선

| 항목 | 내용 |
| :--- | :--- |
| 문제 | 작업 사본 `app.js`가 `src/`보다 오래된 빌드라서 사용자가 실제로 쓰는 앱에 최신 기능·수정이 빠져 있음 |
| 조치 | `npm run build`로 `app.js`와 `styles.css`를 재생성 (결과는 HEAD 번들과 동일해짐) |
| 재발 방지 | `tools/run-tests.js` 시작 시 `src/` 빌드 결과와 `app.js`가 다르면 경고(또는 실패)하는 신선도 검사 추가 |
| 검증 | `npm test` 46/46 통과, `git diff --ignore-cr-at-eol app.js` 차이 없음 |

---

## 4. [1단계] High — 기능이 실제로 고장나는 버그

### H1. Page 2 전체 문장 연속 재생(F11)이 TTS 경로에서 첫 문장 후 멈춤
- **위치**: `src/views/practice-view.js:1281`, `src/audio/tts-synthesizer.js:96`
- **원인**: `speakText(text, lang = 'en-US', rate)` 시그니처인데 `speakText(stn.text, { onEnd: ... })`로 객체를 넘김. `lang.toLowerCase()`에서 TypeError가 나고 catch에 삼켜짐. `speakText`에는 `onEnd` 처리 자체가 없음.
- **수정**: `speakText(text, langOrOpts, rate)`로 확장해 두 번째 인자가 객체면 `{ lang, rate, onEnd }`를 꺼냄. `utter.onend`/`utter.onerror`에서 `onEnd` 호출. 기존 문자열 호출부는 그대로 동작.

### H2. Page 1에서 새 오디오를 올려도 `<audio>` 소스가 바뀌지 않음
- **위치**: `src/views/input-view.js:561-589` (`handleAudioFile`), `:614` (`resetAudioFile`)
- **원인**: `appState.uploadedAudioUrl`만 갱신하고 `playbackController.setSource()`를 호출하지 않음. 첫 업로드 직후 마스터 재생 버튼(`:340`)이 "재생 가능한 오디오 파일이 없습니다"를 표시. 파일 교체 시 이전 파일 또는 이미 revoke된 URL을 재생. 삭제(✕) 시 재생도 멈추지 않음.
- **수정**: 두 함수에서 `playbackController.stop()` 후 새 URL로 `setSource()`(삭제 시에는 `src` 제거 + `load()`).

### H3. 오디오 디코딩 경쟁 / 실패 시 이전 파형이 남음
- **위치**: `src/views/input-view.js:570-578`, `src/services/project-service.js:228-234`
- **원인**: 파일 A 업로드 직후 B를 올리면 A의 늦은 디코드 결과가 `appState.audioBuffer`를 덮음. 디코드 실패 시 `audioBuffer`를 비우지 않아 이전 파일의 파형·구간 계산이 그대로 쓰임.
- **수정**: 시작 시 `appState.audioBuffer = null`, `const token = ++this.audioLoadToken`으로 await 뒤 토큰 비교.

### H4. Page 2를 떠나도 재생 타이머가 살아 있어 다른 페이지에서 오디오가 재생됨
- **위치**: `src/views/practice-view.js:2006-2020` (`onDeactivated`), `src/audio/looper-engine.js:94-98`
- **원인**: `onDeactivated`가 pause와 TTS cancel만 수행. 쉐도잉 대기 타이머(`shadowTimer`), 전체 재생 타이머(`playAllTimer`, `isPlayingAllSentences`), 해석 모달이 정리되지 않음. 타이머가 만료되면 Page 1/3에서 `restartLoop()`/다음 문장 재생이 실행됨.
- **수정**: `onDeactivated`에서 `stopPlayAllSentences()`, `looperEngine.reset()`, `clearTimeout(playAllTimer)`, `closeTranslationModal()` 호출. 쉐도잉 타이머 콜백 첫 줄에 `if (!appState.isShadowingWaiting) return;` 가드 추가.

### H5. 프로젝트를 열면 이전 화면의 빈칸 입력값이 복원된 답안을 덮어씀
- **위치**: `src/views/practice-view.js:319-322`, `:434-453`
- **원인**: `sentencesLoaded` → `loadSentence(0)` → `saveCurrentSentenceAnswers()`가 옛 `currentRenderedSentenceIndex`와 화면에 남은 옛 input 값을 **새 목록**의 문장에 기록하고 `markDirty()`까지 호출.
- **수정**: `sentencesLoaded` 핸들러에서 저장 전에 `this.currentRenderedSentenceIndex = null; this.felsBlanks = [];`로 초기화.

### H6. AI 제공자를 바꾸면 다른 제공자의 API 키가 전송되고, 지운 키가 계속 사용됨
- **위치**: `src/services/ai-service.js:91-117`, 호출부 `:826`, `:861`, `:919`
- **원인**: `this.apiKey = this.getKeyForProvider(provider) || apiKey;` — 새 제공자 키가 비어 있으면 이전(예: Gemini) 키가 남고, `getKeyForProvider('openai')`가 `this.apiKey`로 폴백해 **Gemini 키를 `Bearer`로 OpenAI에 전송**. 키를 지워도 메모리와 `ce_tool_api_key`에 남음.
- **수정**: `getKeyForProvider`는 해당 제공자 필드만 반환. `callOpenAI/callClaude/callOpenRouter`의 `|| this.apiKey` 폴백 제거. `saveSettings`에서 선택 제공자 키만 `apiKey`로 설정, 빈 키는 저장소에서 제거. (레거시 `ce_tool_api_key`는 최초 1회 `geminiKey`로 이관)

### H7. 오프라인 직독직해 정렬에서 동사 사전 매칭이 항상 성공함
- **위치**: `src/services/ai-service.js:567-569`
- **원인**: `VERB_MAP` 값은 객체(`{ base, past, ... }`)인데 `cleanStr()`이 비문자열을 `''`로 바꿈 → `'...'.includes('')`는 항상 true → 동사가 있는 청크가 모든 한국어 단어에 점수 11을 받아 첫 동사 청크로 몰림.
- **수정**: 대명사 처리처럼 `Object.values(VERB_MAP[token])`을 순회하고 빈 문자열은 건너뜀. 사전 조회는 `Object.hasOwn`으로(아래 M14와 함께).

---

## 5. [2단계] Medium — 특정 조건에서 오동작

### AI 서비스 / 프로젝트 저장
| ID | 위치 | 문제 | 수정 |
| :--- | :--- | :--- | :--- |
| M1 | `ai-service.js:124-126` | Gemini 60초 쿨다운이 Gemini가 **기본** 제공자일 때만 동작. 페일오버/오디오 경로에서는 매 요청 7개 모델을 모두 재시도. 반대로 Gemini 쿨다운 중엔 다른 제공자가 있어도 AI를 건너뜀 | `isGeminiCoolingDown()`(시간만 검사)로 분리, AI 분기는 `getCandidateProviders().length`로 판단 |
| M2 | `ai-service.js:205-320` | 429 이후에도 7개 모델을 모두 시도, 오디오는 매번 전체 base64 재전송(최대 7×120초) | 첫 429에서 중단, 오디오 재시도는 1–2개 모델로 제한 |
| M3 | `project-service.js:306,315-322` | 손상된 프로젝트 파일 열기 시 오류 토스트 없이 두 번째 파일 선택창 시도(사용자 제스처 만료로 무시될 수 있음), 상태가 반쯤 적용됨 | picker 호출만 try로 감싸고, 파싱/검증 실패는 별도 catch로 "불러오기 실패" 토스트. 검증 후 적용 |
| M4 | `project-service.js:364-370,400-407` | 저장 중 편집한 내용이 파일엔 없는데 "저장됨"으로 표시 | 직렬화 전 버전 번호를 잡고 변하지 않았을 때만 `markClean` |

### 입력 뷰 (Page 1)
| ID | 위치 | 문제 | 수정 |
| :--- | :--- | :--- | :--- |
| M5 | `input-view.js:732-929, 934` | 분석 중 "전체 초기화"/파일 교체해도 끝난 요청이 데이터를 되살림. `autoSyncAudioScript`는 중복 실행 방지·로딩 상태 없음 | `analysisGen` 세대 토큰, autoSync 실행 중 플래그 |
| M6 | `ai-service.js:732-736`, `boundary-utils.js:53-55,66-68` | AI 정렬 타임스탬프 미검증(`end` 누락 → 0 → `end < start`), 인트로 보정 후 첫 문장 `start > end` 가능 | `sentence_index` 정렬, `0 ≤ start < end ≤ duration` 및 단조 증가 검사, 실패 시 VAD 폴백. 인트로 보정 시 `end`도 함께 밀기 |
| M7 | `input-view.js:1385-1397` | 구간 조정 모달 저장 시 인접 문장이 음수 길이가 될 수 있음 | 인접 구간 최소 길이(0.2초) 고정, 저장 시 `sentenceList[idx] === stn` 확인 |
| M8 | `input-view.js:1045-1058` | 문장 분리 시 `Math.max(0.6, 길이)` 때문에 `splitTime`이 `audioEnd`를 넘음 | 실제 길이 사용, `[start, end]`로 clamp |
| M9 | `input-view.js:1806-1823, 1700, 1010-1016, 1090-1104, 1158` | 늦게 도착한 번역 응답이 다른/새 문장을 덮어씀(리비전 확인 없음, DOM을 인덱스로 재조회). `busySentences`는 선언만 됨 | 모든 편집 경로에서 `_chunkRevision++` 후 응답 시 비교, `sentenceList.includes(stn)` 확인, `busySentences` 적용 |
| M10 | `input-view.js:775` | 오디오 전용(STT) 모드에서 AI 문장 배열을 인덱스로만 매칭, 경계 보정(`resolveSentenceBoundaries`) 미적용 | 문장 수·텍스트 일치 시에만 매칭, 경계 계산 경로 통일 |

### 연습·암기 뷰 / 단축키
| ID | 위치 | 문제 | 수정 |
| :--- | :--- | :--- | :--- |
| M11 | `practice-view.js:1277,1894`, `looper-engine.js:76-99` | 전체 재생 중에도 루퍼 경계 검사가 동작해 문장이 반복되거나 끊김 (추정) | `isLooperActive()`에 `&& !this.isPlayingAllSentences` |
| M12 | `practice-view.js:456-533` | 빠른 문장 이동 시 늦게 끝난 `loadSentence`가 다른 문장 카드를 렌더. `translate`가 null이면 TypeError | `loadToken` 비교, falsy 결과는 규칙 엔진으로 대체 |
| M13 | `shortcut-manager.js:63-68,203-206,273-278` | `SELECT`에 포커스 중에도 ←/→/Space가 가로채임, Page 2에서 포커스된 버튼을 Enter로 누를 수 없음 | `SELECT`를 입력 중으로 간주, `BUTTON`/`[role=button]` 포커스 시 Enter/Space 통과, `e.repeat` 무시 |
| M14 | `practice-view.js:345` | `appState.currentView`가 어디서도 설정되지 않아 칩 컨테이너 ResizeObserver가 항상 무시됨 | `this.router.getCurrentPage() === 'practice'`로 교체 |

### 오디오 엔진
| ID | 위치 | 문제 | 수정 |
| :--- | :--- | :--- | :--- |
| M15 | `looper-engine.js:53,76` | 마지막 문장 끝이 미디어 길이 이상이면 `ended`로 먼저 return해 반복이 안 됨 | `effectiveEnd = min(end, duration - 0.05)` 또는 `ended`도 경계 처리 |
| M16 | `playback-controller.js:13-16,104` | 구간 정지 감시가 rAF에만 의존해 백그라운드 탭에서 끝을 지나 계속 재생 | `timeupdate` 보조 감시(토큰 무효화) |
| M17 | `playback-controller.js:107` | `play()` 실패(AbortError/NotAllowedError)가 처리되지 않은 Promise 거부 | `.catch(() => false)` |
| M18 | `silence-detector.js:358-366,400` | 문장이 많고 오디오가 짧으면 경계가 역전되거나 `start > end` | 탐색 범위 역전 시 clamp, 생성 후 `start < end ≤ duration` 정규화 |
| M19 | `rule-chunk-engine.js:218,264,453`, `ai-service.js:563` | 사전이 일반 객체라 `constructor` 같은 단어가 프로토타입 속성과 매칭 → `"undefined"`, `"function Object()..."` 출력 | `Object.hasOwn()` 조회 헬퍼로 통일 |

---

## 6. [3단계] Low — 품질·정리 항목

**오디오/파형**
- `looper-engine.js:12` `formatPreciseTime(2.3)`이 `"00:02.2"` 출력(부동소수점) → `Math.round(seconds*10) % 10`.
- `looper-engine.js:9,17` `Infinity` duration 시 `"Infinity:NaN"` → `Number.isFinite` 검사.
- `waveform-renderer.js:197-203` `audioStart === undefined`이면 NaN으로 파형이 비어 보임 → `!= null`/`Number.isFinite`.
- `waveform-renderer.js:171` 높이 100px 하드코딩 → `canvas.clientHeight`.
- `waveform-renderer.js:272-302` 막대마다 `fill()`(프레임당 약 720회) → 단일 path 누적 후 1회 fill.
- `master-waveform.js:311-313` devicePixelRatio 미반영(HiDPI 흐림), `:440` 매 mousemove 전체 재그리기, `:443` 우클릭 드래그·텍스트 선택.
- `boundary-utils.js:27-35` 마지막 문장 끝 0.15초가 항상 잘리고 `BOUNDARY_LAST_END_PADDING_SEC` 분기가 사실상 미사용.
- `silence-detector.js:161-168` 끝 구간 길이 0.05초 오차, 최소 길이 필터 누락.
- `tts-synthesizer.js:43` WAV 변환 연산자 우선순위(영향 1LSB), `voiceschanged` 미처리.

**서비스/설정**
- `storage-service.js:101-108` API 키가 `file://` 공용 localStorage에 평문 저장 → 경고 문구 또는 "키 기억하기" 옵션(sessionStorage).
- `project-service.js:128-141` 빈 세션이 이전 프로젝트 이름을 물려받아 "다른 이름 저장" 시 덮어쓰기 위험.
- `project-service.js:261-263` 불러온 재생 속도 범위 미검증(`playbackRate` 예외).
- `project-service.js:435`, `input-view.js:2179` 다운로드 직후 `revokeObjectURL` → `setTimeout`으로 지연.
- `project-service.js:366-368,402-404` 쓰기 실패 시 `writable.abort()` 미호출. `:98-107` IndexedDB `tx.onabort` 미처리.
- `storage-service.js:8-25` localStorage 쓰기 실패 시 메모리 값보다 옛 localStorage 값을 먼저 읽음.
- `ai-service.js:864-869,1050` 퇴역 추정 Claude 3 / Gemini 1.5 모델 ID(추정) → 최신 모델 목록 점검.
- `settings-modal.js:34` `#engineBadge`가 `index.html`에 없음(`updateEngineBadge` 무효).

**뷰/UX**
- 다음 편집 경로에서 `markDirty()` 누락: `autoSyncAudioScript`, `updateChunksFromDirectInput`, 해석 입력, `updateSentenceScript`, `retranslateSentence`. 반대로 `saveCurrentSentenceAnswers`는 변경 없이도 항상 `markDirty()`(문장 이동만 해도 "수정됨").
- `input-view.js:999-1000,1079-1080` 문장 결합·분리가 `sentenceList.splice`로 직접 변경 → `dataVersion`·이벤트·`activeSentenceIndex` 범위 미조정. `app-state.js:103` `setActiveSentenceIndex(NaN)` 허용.
- `input-view.js:864-866` 문장 수만큼 `translateNatural` 동시 호출 → 동시성 제한(예: 3).
- `shortcut-manager.js` 헤더에 적힌 `R` 단축키 미구현(`onRewindAndPlay`, `onStartLoop` 연결만 됨) → 구현 또는 주석 정리.
- `memorize-view.js:533-556` 전체 재생 중지 후 400ms 안에 재시작 시 이전 체인이 끼어듦 → `playRunId`. 빈 목록일 때 통계 배지 미갱신.
- `practice-view.js:190-193` 다른 페이지 재생 시에도 숨겨진 Page 2 캔버스를 60fps로 그림 → 현재 페이지 확인.
- `text-splitter.js:54` lookbehind 정규식(Safari 16.4 미만에서 앱 전체 로드 실패, 지원 대상 확인 필요). `etc.`/`U.S.` 문장 끝, 이니셜, 따옴표 안 문장, `(Laughs)` 처리.
- `fels-engine.js:30-34` 둥근 아포스트로피(`’`) 미정규화로 `don’t` ≠ `don't` (추정).
- `sentence-trimmer-modal.js` Escape 닫기·터치 미지원, `ctx.roundRect` 미지원 브라우저 예외.
- 죽은 코드: `#btnStartPractice` 핸들러, `.speak-btn`, `StorageService.saveAutoFailover/getApiKey`, 미사용 상수 3개.

---

## 7. 수정 대상 파일 요약

```
[0단계] app.js, styles.css (재빌드), tools/run-tests.js (번들 신선도 검사)
[1단계] src/audio/tts-synthesizer.js, src/views/practice-view.js, src/views/input-view.js,
        src/services/ai-service.js, src/services/project-service.js, src/audio/looper-engine.js
[2단계] 위 파일 + src/audio/boundary-utils.js, src/audio/playback-controller.js,
        src/audio/silence-detector.js, src/core/rule-chunk-engine.js, src/ui/shortcut-manager.js
[3단계] 위 파일 + src/audio/waveform-renderer.js, src/audio/master-waveform.js,
        src/services/storage-service.js, src/ui/settings-modal.js, src/core/app-state.js,
        src/core/text-splitter.js, src/core/fels-engine.js, src/views/memorize-view.js,
        src/ui/sentence-trimmer-modal.js
```

---

## 8. 검증 계획

1. 각 단계 후 `npm run check`(구문) → `npm run build` → `npm test`(46개 회귀) 실행.
2. 1단계 버그별 회귀 테스트를 `scratch/`에 추가:
   - `test_tts_play_all_onend.js` — `speakText` 객체 인자·`onEnd` 호출 (H1)
   - `test_audio_source_swap.js` — 업로드/교체/삭제 시 `setSource`·`stop` 호출, 디코드 경쟁 (H2, H3)
   - `test_practice_deactivate_timers.js` — 페이지 이탈 후 타이머 만료 시 재생 없음 (H4)
   - `test_project_load_answers.js` — 프로젝트 로드 시 `userAnswers` 보존 (H5)
   - `test_ai_key_isolation.js` — 제공자 전환/키 삭제 시 다른 키 미전송 (H6)
   - `test_verb_map_alignment.js` — 동사 포함 청크 정렬 분포 (H7)
3. 2단계는 경계값 단위 테스트(정렬 타임스탬프 검증, 문장 분리 시간, 루퍼 끝점, `Object.hasOwn` 사전 조회) 위주로 추가.

---

## 9. 실행 안내

- 본 계획서는 `/ask` 정책에 따라 작성되었으며 **소스 코드는 수정하지 않았습니다.**
- 승인하시면 `/apply`를 입력해 주세요. 단계별로 적용 범위를 정하실 수도 있습니다(예: "0~1단계만 /apply").
- 커밋/푸시는 `/git-commit` 명령 전까지 수행하지 않습니다.
