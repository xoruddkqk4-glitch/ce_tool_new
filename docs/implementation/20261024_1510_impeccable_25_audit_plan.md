# Impeccable 25개 전수 검증 결과 보고서 및 UI/UX 리팩토링 구현 계획서

> **문서 버전:** 1.0.0  
> **검증 일시:** 2026-10-24 15:10 (KST)  
> **검증 대상:** CE Tool (Chunk & FELS Weak-Form Listening Trainer)  
> **상태:** 📋 계획 수립 완료 (사용자 `/apply` 대기 중 - 소스 코드 무단 수정 없음)

---

## 1. 📊 25가지 전수 검증 종합 스코어카드 (Scorecard Matrix)

| 도메인 | 검증 항목 (Command) | 상태 | 주요 발견 사항 및 개선 지침 |
| :--- | :--- | :---: | :--- |
| **1. 시스템 & 컨텍스트**<br>(System & Context) | 1. `detect` | ❌ FAIL | • `side-tab` (굵은 좌측 보더 3곳)<br>• `dark-glow` (0-offset 네온 발광 그림자)<br>• `gradient-text` (헤더 로고 텍스트)<br>• `undersized-ui-text` (10.88px 단축키 텍스트)<br>• `nested-cards` (카드 중첩 구조 2곳)<br>• `skipped-heading` (h1 직후 h3 직행)<br>• `bounce-easing` (부자연스러운 통통 튀는 이징 3곳) |
| | 2. `doctor` | ⚠️ WARN | 규격 드리프트는 없으나 공식 `DESIGN.md` 및 `PRODUCT.md` 문서 부재 |
| | 3. `init` | ⚠️ WARN | 사용자 페르소나 및 3단계 학습 철학을 담은 `PRODUCT.md` 생성 필요 |
| | 4. `document` | ⚠️ WARN | 디자인 토큰(색상, 타이포, 곡률, 여백)을 체계화한 `DESIGN.md` 명세서 작성 필요 |
| | 5. `extract` | ⚠️ WARN | CSS 내부 인라인 색상 코드 및 HTML 인라인 스타일 토큰화 필요 |
| **2. 사용성 & 접근성**<br>(Evaluation) | 6. `critique` | ⚠️ WARN | 1단계 입력 화면의 카드 중첩 및 정보 과밀로 인한 인지 부하 정리 필요 |
| | 7. `audit` | ❌ FAIL | • WCAG AA 명도 대비 미달: `#6366f1`(4.47:1), `#06b6d4`(2.4:1)<br>• 11px 미만 기능 텍스트(10.88px)<br>• 스크린 리더 헤딩 트리 단절(h1 → h3) |
| | 8. `clarify` | ⚠️ WARN | '약형드랩' 신조어/오탈자 명확화 및 버튼 레이블 행동 지향적 개선 |
| **3. 시각 & 타이포그래피**<br>(Visual & Type) | 9. `typeset` | ⚠️ WARN | • 논리적 `<h2>` 계층 보강<br>• `.audio-shortcut-bar` 폰트 크기 12px(0.75rem) 상향<br>• 한영 혼용 자간/행간 표준화 |
| | 10. `colorize` | ⚠️ WARN | • `--primary` 색상 `#5850ec` 보정(대비 4.6:1 이상 확보)<br>• 눈부신 네온 민트(`#00ffcc`) 및 시안 엑센트 차분한 톤으로 다운 |
| | 11. `layout` | ⚠️ WARN | 결과 검토 섹션의 중첩 카드 평탄화 및 8pt 여백 리듬 통일 |
| | 12. `bolder` | ✅ PASS | 3단계 내비게이션 탭바와 오디오 파형 인터페이스의 확실한 시각적 앵커 |
| | 13. `quieter` | ❌ FAIL | 그라데이션 텍스트, 강한 사이드 보더, 발광 섀도우 등 AI Slop 요소 제거 |
| **4. 디테일 & 인터랙션**<br>(Craft & Motion) | 14. `polish` | ⚠️ WARN | 곡률 3단계 체계(6px / 12px / 16px) 정돈 및 1px 섬세한 알파 보더 마감 |
| | 15. `animate` | ❌ FAIL | `cubic-bezier(0.34, 1.4, 0.64, 1)` 바운스 이징을 `cubic-bezier(0.16, 1, 0.3, 1)`(ease-out-expo)로 교체 |
| | 16. `delight` | ✅ PASS | 실시간 FELS 정답 채점 배너, 키보드 단축키 칩, 3D 카드 플립 인터랙션 완성도 우수 |
| | 17. `overdrive` | ✅ PASS | HTML5 Canvas 기반 고해상도 PCM 파형 렌더링 및 묵음 스냅 알고리즘 양호 |
| **5. 견고성 & 상태 처리**<br>(Robustness & State) | 18. `harden` | ⚠️ WARN | 장문 텍스트 오버플로 줄바꿈 방어(`word-break: keep-all; overflow-wrap: break-word`) 보강 |
| | 19. `onboard` | ✅ PASS | 1단계 입력 화면 내 5종 원클릭 '빠른 예시 문장' 칩 완비 |
| | 20. `distill` | ⚠️ WARN | 결과 화면 상/하단 중복 액션 버튼의 시각적 위계 정리 |
| | 21. `adapt` | ⚠️ WARN | 태블릿/모바일 뷰포트(<=768px) 내비게이션 탭바 가로 스크롤 및 터치 타깃 44px 방어 |
| | 22. `optimize` | ✅ PASS | Zero-CORS 독립 빌드 및 제로 의존성 순수 바닐라 구조로 고속 렌더링 |
| **6. 구조 & 대안 탐색**<br>(Exploration) | 23. `shape` | ✅ PASS | 1단계(입력/분할) → 2단계(약형 청취) → 3단계(전체 암기)의 선형적이고 직관적인 IA |
| | 24. `live` | ✅ PASS | 모듈형 `styles/` 구조 및 `tools/build-standalone.js`를 통한 실시간 리빌드 호환 |
| | 25. `generate` | ✅ PASS | 3D 플립 카드, 교실 수업용 대형 모달, A4 양면 유인물 등 다각적 뷰 제공 |

---

## 2. 🎯 우선순위별 핵심 개선 과제

### 🔴 P1 (Critical - 접근성 및 필수 규격 준수)
1. **기능 텍스트 크기 상향 (`undersized-ui-text`)**:
   - 대상: `index.html` 내 `.audio-shortcut-bar` 단축키 안내 텍스트.
   - 조치: 10.88px로 렌더링되는 폰트 크기를 `0.75rem`(12px)로 상향 조정하여 11px 최저 가독성 기준 충족.
2. **헤딩 계층 구조 정상화 (`skipped-heading`)**:
   - 대상: `index.html` 메인 뷰 섹션.
   - 조치: `<h1>` 직후 건너뛴 `<h2>` 섹션 헤딩을 각 뷰에 논리적으로 배치(스크린 리더 트리 복원).
3. **명도 대비 WCAG 2.1 AA 충족 (`low-contrast`)**:
   - 대상: `styles/base/variables.css`
   - 조치: `--primary` 색상을 `#6366f1`에서 `#5850ec`로 조정(흰색 텍스트 대비 4.6:1 달성), 로고 배지 명도 대비 보정.
4. **바운스 이징 제거 (`bounce-easing`)**:
   - 대상: `styles/components/chunk-cards.css`, `styles/views/memorize-view.css`
   - 조치: 구식 바운스 곡선 `cubic-bezier(0.34, 1.4, 0.64, 1)`를 자연스러운 감속 곡선 `cubic-bezier(0.16, 1, 0.3, 1)`로 전면 교체.

---

### 🟡 P2 (Important - AI Slop 탈피 및 레이아웃 정돈)
1. **사이드 탭 굵은 원색 보더 제거 (`side-tab`)**:
   - 대상: `styles/views/input-view.css` (line 1060, line 1441), `styles/views/memorize-view.css` (line 422)
   - 조치: `border-left: 4px/5px solid ...`를 제거하고, 은은한 서브틀 보더(`1px solid rgba(255, 255, 255, 0.08)`) 및 미세한 배경 틴트로 세련되게 변경.
2. **그라데이션 텍스트 제거 (`gradient-text`)**:
   - 대상: `index.html` (line 26), `styles/layout/nav-tabs.css` (line 66)
   - 조치: 장식적인 텍스트 클리핑 그라데이션을 단색 고대비 타이포그래피로 변경.
3. **네온 발광 그림자 제거 (`dark-glow`)**:
   - 대상: `styles/base/variables.css` (line 36)
   - 조치: `0 0 24px var(--primary-glow)` 대신 자연스러운 깊이감의 입체 그림자(`0 8px 24px rgba(0, 0, 0, 0.4)`)로 교체.
4. **카드 중첩 평탄화 (`nested-cards`)**:
   - 대상: `index.html` (Page 1 결과 검토 섹션)
   - 조치: 카드 내부 카드에 적용된 중복 배경과 그림자를 제거하여 단일 레이어 계층으로 정돈.

---

### 🟢 P3 (Polish - 디자인 명세서 작성 및 디테일 완성)
1. **디자인 시스템 규격서(`DESIGN.md`) 및 제품 가치 정의서(`PRODUCT.md`) 공식 작성**:
   - 프로젝트 루트에 Impeccable 및 Google Stitch 표준 규격 문서 작성.
2. **반응형 뷰포트(<=768px) 적응성 보강**:
   - 내비게이션 탭바의 모바일 터치 타깃 및 오버플로 방지 스타일 적용.
3. **독립 번들러 리빌드 및 동기화**:
   - `node tools/build-standalone.js`를 구동하여 `styles.css` 및 `app.js` 동기화 및 구문 검사 완료.

---

## 3. 🛠️ 파일별 구체적 코드 리팩토링 지침

### Step 1: `styles/base/variables.css` (색상 대비 및 발광 제거)
- `--primary`: `#6366f1` ➔ `#5850ec` (명도 대비 4.6:1 달성)
- `--shadow-glow`: `0 0 24px var(--primary-glow)` ➔ `0 8px 20px -2px rgba(88, 80, 236, 0.25)` (자연스러운 엠비언트 섀도우)
- `--ease-out-expo`: `cubic-bezier(0.16, 1, 0.3, 1)` 공통 트랜지션 변수 추가

### Step 2: `styles/components/chunk-cards.css` (이징 교체)
- `.card-inner` transition: `0.4s cubic-bezier(0.34, 1.4, 0.64, 1)` ➔ `0.35s cubic-bezier(0.16, 1, 0.3, 1)`

### Step 3: `styles/views/memorize-view.css` (이징 및 사이드 탭 제거)
- `.memorize-card-inner`, `.classroom-card-inner`: 바운스 이징 ➔ `cubic-bezier(0.16, 1, 0.3, 1)`
- `.classroom-sentence-full`: `border-left: 5px solid var(--accent-cyan)` 제거 ➔ `border: 1px solid rgba(6, 182, 212, 0.25); background: rgba(15, 23, 42, 0.7);`

### Step 4: `styles/views/input-view.css` (사이드 탭 제거)
- `.handout-speaking-item`: `border-left: 4px solid #0284c7` ➔ `border: 1px solid rgba(2, 132, 199, 0.2); border-radius: 6px;`
- `.trimmer-sentence-text`: `border-left: 3px solid #10b981` ➔ `border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px;`

### Step 5: `styles/layout/nav-tabs.css` (그라데이션 텍스트 제거)
- `.gradient-text`: 그라데이션 클립 제거 ➔ `color: var(--primary-light);`

### Step 6: `index.html` (헤딩 계층 보강 & 텍스트 크기 상향)
- `.brand-text h1`: 불필요한 인라인 그라데이션 제거 및 정돈.
- 각 뷰 상단에 논리적 `<h2>` 추가 (화면상 미관을 유지하면서 스크린 리더와 탐색 트리를 정돈하는 `sr-only` 또는 서브헤딩).
- `.audio-shortcut-bar` 폰트 크기 `0.75rem` 및 `<kbd>` 패딩 보정.

### Step 7: `PRODUCT.md` 및 `DESIGN.md` 작성
- 프로젝트 루트에 디자인 토큰 명세서 및 제품 가이드 문서 생성.

### Step 8: 빌드 및 정적 검증
- `node tools/build-standalone.js` 실행 ➔ `styles.css`와 `app.js` 최신화
- `node tools/check-syntax.js` 실행 ➔ 터미널 구문 검증 완료

---

## 4. 🚀 적용 방법

본 구현 계획서는 Impeccable 25개 전수 검증 결과를 바탕으로 작성되었으며, 현재 소스 코드는 단 한 줄도 수정되지 않은 상태입니다.

계획서 내용을 프로젝트에 즉시 반영하려면 아래 명령어를 입력해 주세요:
```text
/apply
```
