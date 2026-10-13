# 2단계 약형드랩 기능키(F2/F3/F4) 단축키 개편 구현 계획서

## 1. 개요 및 배경
- **현상 및 문제점**:
  - 2단계 약형드랩 학습 시 사용자는 빈칸(`<input class="fels-blank-input">`)에 단어를 타이핑하면서 동시에 오디오를 재생/일시정지하거나 구간을 반복 청취해야 함.
  - 기존에는 재생/정지가 <kbd>Space</kbd>, 되감기가 <kbd>R</kbd>로 할당되어 있어, 입력창 내부에서 타이핑할 때 일반 텍스트 입력과의 충돌을 피하기 위해 전역 단축키를 차단(`isTyping` 가드)하고 있었음.
  - 이로 인해 타이핑 중에 소리를 멈추거나 다시 들으려면 반드시 빈칸 밖으로 빠져나와야만 하는 치명적인 사용성 불편이 발생함.
- **사용자 제안**:
  - 재생/일시정지: <kbd>Space</kbd> ➔ **<kbd>F3</kbd>**
  - 되감기 재생(반복): <kbd>R</kbd> ➔ **<kbd>F4</kbd>**
  - 빈칸 입력 진입/해제: **<kbd>F2</kbd>** 유지
  - 불필요한 <kbd>E</kbd> 단축키 제거

---

## 2. 설계 분석 및 타당성 평가

### 2.1 제안의 탁월성 (적극 찬성)
1. **타이핑 충돌 완전 해결 (Zero-Conflict In-Input Control)**
   - 기능키(<kbd>F2</kbd>, <kbd>F3</kbd>, <kbd>F4</kbd>)는 알파벳 문자나 스페이스바와 물리적으로 절대 겹치지 않습니다.
   - 따라서 **커서가 빈칸 안에 머물러 있는 상태에서도 포커스를 잃지 않고 자유롭게 재생/일시정지(<kbd>F3</kbd>) 및 되감기(<kbd>F4</kbd>)가 가능**해집니다.
2. **키보드 인체공학적 물리적 배치 (F1~F4 클러스터)**
   - 대다수 표준 키보드에서 `[Esc] [F1] [F2] [F3] [F4]`는 4개 단위 블록으로 모여 있습니다.
   - 왼손으로 안 보고도 <kbd>F2</kbd>(입력 모드), <kbd>F3</kbd>(재생/정지), <kbd>F4</kbd>(되감기)를 직관적으로 조작할 수 있습니다.
3. **<kbd>E</kbd> 단축키 제거의 적합성**
   - 영단어에 빈번하게 등장하는 'e' 키를 단축키에서 완전히 제거함으로써 타이핑 오작동 및 혼선을 원천 방지합니다.

### 2.2 세부 동작 정책 결정
- **입력창 내부 (`isFelsBlank = true`)**:
  - <kbd>F3</kbd>: 오디오 재생/일시정지 (포커스 유지)
  - <kbd>F4</kbd>: 설정된 시간(0.5s~2s) 되감기 후 재생 (포커스 유지)
  - <kbd>F2</kbd> 또는 <kbd>Escape</kbd>: 빈칸 입력 모드 해제 (포커스 아웃 / blur)
  - <kbd>Enter</kbd>: 다음 빈칸 이동 또는 정답 확인
  - <kbd>Space</kbd>, <kbd>R</kbd>: 문자 입력에 사용되므로 전역 오디오 단축키로 가로채지 않음
- **입력창 외부 (일반 탐색 모드)**:
  - <kbd>F2</kbd>: 빈칸 입력 모드 진입 (첫 번째 빈칸 focus & select)
  - <kbd>F3</kbd> 및 <kbd>Space</kbd>: 재생/일시정지 (스페이스바 병행 허용으로 일반 청취 편의성 보장)
  - <kbd>F4</kbd> 및 <kbd>R</kbd>: 되감기 재생 (R키 병행 허용)
  - <kbd>←</kbd> / <kbd>→</kbd>: 이전/다음 문장 이동
  - <kbd>S</kbd>: 약형 모드 토글
  - <kbd>T</kbd>: 우리말 해석 토글

---

## 3. 변경 대상 파일 및 구현 상세

### 3.1 `src/ui/shortcut-manager.js`
- **`isTyping` 가드 내부 개선**:
  - `isFelsBlank`인 경우, 기존의 <kbd>F2</kbd>, <kbd>Escape</kbd> 뿐만 아니라 **<kbd>F3</kbd>**과 **<kbd>F4</kbd>**를 가로채어 `e.preventDefault()` 후 `handlers.onPlayPause()`, `handlers.onRewindAndPlay()`를 즉시 호출하도록 추가.
- **일반 모드 단축키 갱신**:
  - <kbd>E</kbd>, <kbd>e</kbd>, <kbd>ㄷ</kbd> 바인딩 완전 제거 (오직 <kbd>F2</kbd>로만 토글).
  - <kbd>F3</kbd>을 `onPlayPause`에 추가 (기존 <kbd>Space</kbd>와 듀얼 지원).
  - <kbd>F4</kbd>를 `onRewindAndPlay`에 추가 (기존 <kbd>R</kbd>과 듀얼 지원).
  - 브라우저 기본 <kbd>F3</kbd>(페이지 찾기) 동작 방지를 위해 `e.preventDefault()` 필수 적용.

### 3.2 `src/views/practice-view.js`
- `toggleTextInputMode()` 토스트 안내 문구 갱신:
  - `"✏️ 빈칸 입력 모드 (F3: 재생, F4: 되감기, F2/Esc: 해제)"` 등으로 사용자에게 키 가이드 안내.

### 3.3 `index.html`
- 하단 오디오 단축키 바 (`.audio-shortcut-bar`) UI 텍스트 갱신:
  - 기존: `<kbd>Space</kbd> 재생/정지`, `<kbd>R</kbd> 되감기재생`, `<kbd>F2</kbd>(<kbd>E</kbd>) 빈칸입력`
  - 변경: `<kbd>F3</kbd>(Space) 재생/정지`, `<kbd>F4</kbd>(R) 되감기재생`, `<kbd>F2</kbd> 빈칸입력`

---

## 4. 검증 계획
1. **단위 테스트 작성 (`scratch/test_stage2_function_keys.js`)**:
   - 빈칸에 포커스가 있는 상태에서 <kbd>F3</kbd> 발생 시 `onPlayPause` 호출 여부 및 포커스 유지 검증
   - 빈칸에 포커스가 있는 상태에서 <kbd>F4</kbd> 발생 시 `onRewindAndPlay` 호출 여부 및 포커스 유지 검증
   - <kbd>E</kbd> 키 입력 시 더 이상 입력 모드 토글이 발생하지 않는지 검증
   - 브라우저 기본 F3 키 방지(`e.defaultPrevented`) 검증
2. **번들 빌드 및 구문 검사**:
   - `node tools/build-standalone.js`
   - `node tools/check-syntax.js`
   - `npm test` 전체 35개 테스트 통과 확인
