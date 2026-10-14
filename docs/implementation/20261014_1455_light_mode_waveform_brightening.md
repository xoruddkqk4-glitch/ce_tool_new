# [구현 계획서] 라이트 모드 파형창 시각 디자인 전면 개편 및 60FPS 부드러운 애니메이션 최적화

**문서 번호**: PLAN-20261014-WAVEFORM-LIGHT-AND-SMOOTH  
**작성 일시**: 2026-10-14 15:05 (KST)  
**요청 구분**: `/ask` 모드에 따른 사전 기술 분석 및 통합 구현 계획 수립  
**대상 컴포넌트**: 
- 2단계 연습 파형창 (`#waveformCanvas`, `.waveform-container`, `WaveformRenderer`, `practice-view.js`)
- 1단계 마스터 타임라인 파형창 (`#masterWaveformCanvas`, `.master-waveform-panel`, `MasterWaveformTimeline`, `input-view.js`)
- 파형 재생 루프 엔진 (`startWaveformPlaybackLoop`, `nativeAudioPlayer` 이벤트 리스너)

---

## 1. 개요 및 배경

사용자로부터 두 가지 핵심 피드백이 전달되었습니다:
1. **라이트 모드 파형창 색상 개선**: 라이트 모드임에도 파형창이 칠흑 같은 딥 네이비/블랙으로 표시되어 전체 밝은 테마와 이질감이 심함.
2. **파형 재생바 애니메이션 부드러움 개선**: 음성이 재생될 때 재생 바늘(Playhead)의 움직임이 다소 뚝뚝 끊기거나 덜컹거리는 현상(Stuttering/Jitter)이 관찰됨.

본 계획서는 **시각적 완성도(Aesthetic Excellence)**와 **60FPS 서브픽셀 애니메이션 부드러움(High-Refresh Smoothness)**을 동시에 완벽하게 달성하기 위한 구체적인 분석 및 구현 방안을 정의합니다.

---

## 2. 파형창 재생바 끊김 현상(Stutter) 근본 원인 분석

코드베이스 전반을 정밀 분석한 결과, 재생바가 끊기는 원인은 **총 6가지 기술적 요인이 복합적으로 작용한 결과**입니다.

### 2.1 [원인 1] 1단계 마스터 파형: `timeupdate` 이벤트(초당 4회) 전적 의존
- **위치**: `src/views/input-view.js` (line 391~400)
- **현상**:
  ```javascript
  this.nativeAudioPlayer.addEventListener('timeupdate', () => {
    const cur = this.nativeAudioPlayer.currentTime;
    if (this.masterWaveform) {
      this.masterWaveform.setPlayheadTime(cur);
    }
  });
  ```
  브라우저 명세상 `HTMLAudioElement`의 `timeupdate` 이벤트는 **초당 4~5회(200~250ms 간격)**만 발생합니다. 1단계 마스터 파형창에는 `requestAnimationFrame` 루프가 전혀 구현되어 있지 않아, 재생바가 0.25초마다 한 번씩 크게 텔레포트하며 뚝뚝 끊기는 현상이 발생합니다.

### 2.2 [원인 2] 2단계 문장 파형: `currentTime` 오디오 하드웨어 버퍼 양자화(Quantization)
- **위치**: `src/views/practice-view.js` (line 1840~1876)
- **현상**: 2단계에서는 `requestAnimationFrame` 루프를 돌리고 있지만, 매 프레임 전달하는 시간 값이 `this.nativeAudioPlayer.currentTime`입니다.
  - OS 오디오 드라이버와 브라우저 오디오 디코더는 대개 128~1024 오디오 프레임 단위(약 20ms~50ms 간격)로 버퍼를 플러시하며 `currentTime`을 갱신합니다.
  - 디스플레이 주사율(60Hz=16.6ms, 120Hz=8.3ms) 관점에서 보면:
    - 프레임 1 (0ms): `currentTime = 1.000s`
    - 프레임 2 (16ms): `currentTime = 1.000s` (정지!)
    - 프레임 3 (33ms): `currentTime = 1.000s` (정지!)
    - 프레임 4 (50ms): `currentTime = 1.050s` (갑자기 점프!)
  - 이로 인해 2~3프레임 멈췄다가 1프레임 튀는 전형적인 **마이크로 지터(Micro-stuttering)**가 발생합니다.

### 2.3 [원인 3] `timeupdate`와 rAF의 경합(Race Condition) 및 중복 렌더링
- **위치**: `src/views/practice-view.js` (line 175~179)
- **현상**:
  ```javascript
  this.nativeAudioPlayer.addEventListener('timeupdate', () => {
    this.updateAudioProgress();
    if (this.isLooperActive()) this.looperEngine.checkBoundary();
    this.drawWaveform(); // <-- rAF 루프 외 비동기 중복 렌더링!
  });
  ```
  rAF 루프가 60FPS로 돌고 있는 와중에, 비동기 `timeupdate`가 브라우저 V-Sync 주기와 무관하게 끼어들어 `drawWaveform()`을 중복 호출함으로써 프레임 드랍과 티어링을 유발합니다.

### 2.4 [원인 4] 중복 rAF 루프 누적 가드 부재
- **위치**: `src/views/practice-view.js` (`startWaveformPlaybackLoop`)
- **현상**: `startWaveformPlaybackLoop()`가 `play` 이벤트, 구간 반복, 전체 재생 등 5개 지점에서 호출되나, 이미 루프가 돌고 있는지 체크하는 가드 플래그나 `cancelAnimationFrame`이 없습니다. 재생 버튼을 빠르게 누르거나 구간 반복 시 2~3개의 rAF 루프가 동시에 실행되어 CPU를 낭비하고 애니메이션 타이밍이 뒤엉키게 됩니다.

### 2.5 [원인 5] 매 프레임 `canvas.getBoundingClientRect()` 호출로 인한 강제 동기 리플로우(Layout Thrashing)
- **위치**: `src/audio/waveform-renderer.js` (line 122~124)
- **현상**:
  ```javascript
  const rect = (typeof canvas.getBoundingClientRect === 'function')
    ? canvas.getBoundingClientRect()
    : { width: canvas.width || 800, height: canvas.height || 110 };
  ```
  매 초 60번씩 캔버스 레이아웃 좌표를 브라우저에 질의하여 동기적 레이아웃 재계산(Reflow)이 강제 발생합니다.

### 2.6 [원인 6] 360회 반복 루프 내 개별 `shadowBlur` 가우시안 래스터 부하
- **위치**: `src/audio/waveform-renderer.js` (line 220~241)
- **현상**: 매 프레임 360개의 바를 그리면서 재생된 바마다 `ctx.shadowBlur = 4` 소프트웨어 가우시안 블러 필터를 매번 적용하여 2D 캔버스 래스터 병목을 일으킵니다.

---

## 3. 부드러운 60FPS 애니메이션 개선 솔루션

### 3.1 [핵심 기술 1] 고정밀 타임스탬프(`performance.now`) 기반 시간 보간기(High-Precision Time Interpolation)
오디오 버퍼 갱신 주기(20~50ms) 사이를 화면 주사율(60Hz/120Hz/144Hz)에 맞춰 `performance.now()` 고해상도 시계로 연속 보간합니다:
```javascript
// 재생 중 부드러운 시간 보간 로직
let lastAudioTime = this.nativeAudioPlayer.currentTime;
let lastWallTime = performance.now();

function getSmoothCurrentTime(audioPlayer) {
  const now = performance.now();
  const currentAudio = audioPlayer.currentTime;
  
  // 오디오 플레이어의 내부 시간이 갱신되었을 때 기준점 앵커 재동기화
  if (currentAudio !== lastAudioTime) {
    lastAudioTime = currentAudio;
    lastWallTime = now;
  }
  
  // 경과된 밀리초를 재생 배속(playbackRate)에 비례하여 부드럽게 더함
  const playbackRate = audioPlayer.playbackRate || 1.0;
  const elapsedSec = ((now - lastWallTime) / 1000) * playbackRate;
  let smoothTime = lastAudioTime + elapsedSec;
  
  // 탐색(seek) 또는 오차 누적 방지: 실제 시간과 0.1초 이상 벗어나면 즉시 동기화
  if (Math.abs(smoothTime - currentAudio) > 0.1) {
    smoothTime = currentAudio;
    lastAudioTime = currentAudio;
    lastWallTime = now;
  }
  return smoothTime;
}
```
이 보간기를 적용하면 하드웨어 버퍼 간격에 상관없이 재생 바늘이 **1픽셀 미만의 서브픽셀 단위로 물 흐르듯 매끄럽게** 전진합니다.

### 3.2 [핵심 기술 2] 단일 rAF 생명주기 관리 및 `timeupdate` 역할 분리
- `this.waveformRafId` 및 `this.isWaveformLoopRunning` 상태를 신설.
- `play` 이벤트 시 이미 실행 중이면 추가 루프 생성 차단.
- `pause`, `ended`, 컴포넌트 해제 시 `cancelAnimationFrame(this.waveformRafId)`로 즉각 정리.
- 재생 중(`isWaveformLoopRunning === true`)일 때 `timeupdate` 이벤트는 **텍스트 HUD 갱신만 수행하고 `drawWaveform()` 호출을 생략**하여 V-Sync와 일치하는 프레임만 렌더링.

### 3.3 [핵심 기술 3] 1단계 마스터 파형 60FPS 애니메이션 루프 도입
- `src/views/input-view.js`에 `startMasterPlaybackLoop()` 및 `stopMasterPlaybackLoop()` 신설.
- 1단계 오디오 재생 시에도 60FPS rAF 루프가 돌며 `masterWaveform.setPlayheadTime(smoothTime)`을 연속 갱신.

### 3.4 [핵심 기술 4] 캔버스 치수 캐싱 및 렌더링 패스 최적화
- `waveform-renderer.js`에서 매 프레임 `getBoundingClientRect()` 호출을 제거하고, 캔버스 너비 변경 시에만 업데이트하도록 캐싱 (`this.cachedWidth`).
- 360개 바 렌더링 시 매 루프마다 무거운 `shadowBlur`를 걸던 연산을 제거하고, 깔끔하고 선명한 플랫 라운드 렉트 또는 단일 배치 패스로 경량화하여 프레임 렌더 시간을 0.3ms 이내로 단축.

---

## 4. 라이트 모드(Day Theme) 파형창 디자인 개편 팔레트

라이트 모드 파형창은 **"모던 프로페셔널 스튜디오 DAW"** 룩앤필로 전면 개편합니다.

| UI 요소 | 다크 모드 (현재) | 라이트 모드 (개선 목표) | 시각적 특징 |
| :--- | :--- | :--- | :--- |
| **파형 컨테이너 배경** | `#090e17` (칠흑 같은 밤하늘) | `#f8fafc` ~ `#f1f5f9` (소프트 스노우 화이트) | 카드 배경과 완벽한 일체감, 눈부심 방지 |
| **테두리 및 내부 입체감** | `rgba(0, 255, 204, 0.25)` | `1px solid #cbd5e1`, `inset 0 1px 3px rgba(15,23,42,0.05)` | 세련된 서브틀 인셋 섀도우 |
| **캔버스 배경** | `#090e17` | `#f8fafc` (투명감 있는 밝은 베이스) | 깔끔하고 정돈된 트랙 뷰 |
| **중심 기준선 (Baseline)** | `rgba(255, 255, 255, 0.08)` | `rgba(148, 163, 184, 0.35)` | 은은한 기준 가이드선 |
| **재생 완료 바 (Active)** | `rgb(0, 255, 204)` (네온 민트) | `#4f46e5` (로열 인디고) 또는 `#0284c7` (오션 블루) | 밝은 배경 위에서 최고 수준의 가독성과 선명도 |
| **미재생 바 (Inactive)** | `rgba(0, 255, 204, 0.32)` | `rgba(99, 102, 241, 0.28)` (소프트 인디고 라벤더) | 음파 형태가 차분하고 우아하게 드러남 |
| **재생 바늘 (Playhead)** | `#ffffff` (화이트) | `#312e81` (딥 인디고 바늘) + `#4338ca` 도트 | 흰 배경에서도 한눈에 추적되는 명확한 재생 위치 |
| **A-B 루프 선택 구간** | `rgba(6, 182, 212, 0.22)` | `rgba(99, 102, 241, 0.12)` + `#6366f1` 외곽선 | 맑고 투명한 선택 하이라이트 |
| **문장 정보 칩 (Badge)** | `rgba(9, 14, 23, 0.78)` | `rgba(255, 255, 255, 0.94)` + `#cbd5e1` + `#334155` | 애플 스타일의 반투명 프로스트 뱃지 |
| **1단계 마스터 타임라인** | `rgba(13, 19, 36, 0.98)` | `rgba(255, 255, 255, 0.95)` + `#cbd5e1` | 깔끔한 글래스모피즘 라이트 패널 |

---

## 5. 수정 대상 파일 및 작업 상세

```
[CSS 스타일]
├── styles/components/audio-player.css   <- [data-theme="light"] .waveform-container, .waveform-loading 추가
└── styles/views/input-view.css          <- [data-theme="light"] .master-waveform-panel, 타이틀, 뱃지 스타일 추가

[오디오 파형 렌더러]
├── src/audio/waveform-renderer.js       <- 테마 감지 동적 palette 분기, getBoundingClientRect 캐싱, shadowBlur 경량화
└── src/audio/master-waveform.js         <- 라이트 모드 그리드/배경/재생헤드 색상 분기, 고주사율 렌더 최적화

[뷰 컨트롤러 & 애니메이션 엔진]
├── src/views/practice-view.js           <- 고정밀 시간 보간기(getSmoothCurrentTime), 단일 rAF 가드, timeupdate 경합 제거
└── src/views/input-view.js              <- 1단계 마스터 파형 전용 60FPS rAF 재생 루프(startMasterPlaybackLoop) 신설
```

---

## 6. 검증 계획

1. **정적 문법 및 빌드 무결성 검증**:
   - `node tools/build-standalone.js`: 단일 배포 번들 빌드 성공 여부.
   - `npm run check`: 28개 전체 자바스크립트 파일 정적 문법 0 에러 확인.
2. **단위 및 회귀 테스트 스위트 검증**:
   - `npm test`: 기존 44/44개 테스트 스위트 100% 통과 유지.
   - 시간 보간기 로직 및 재생 상태별 rAF 생명주기 검증 스크립트 작성/실행 (`scratch/test_waveform_smoothness.js`).
3. **사용자 경험 검증 체크리스트**:
   - 상단 테마 토글(달/해 아이콘) 클릭 시 파형창 배경 및 바 색상이 즉시 밝은 스튜디오 화이트/인디고로 매끄럽게 전환되는가?
   - 1단계(마스터 파형) 및 2단계(문장 파형) 모두 음성 재생 시 재생 바늘이 뚝뚝 끊기지 않고 60 FPS로 매끄럽게 흐르는가?
   - A-B 구간 반복, 배속 조절(0.8x, 1.2x 등), 정지/재생 반복 시에도 프레임 지연이나 애니메이션 뒤엉킴이 전혀 발생하지 않는가?

---

## 7. 실행 안내 (`/ask` 모드 정책 준수)
- 본 계획서는 **`/ask` 질의응답 및 사전 계획 수립 모드**에 따라 작성되었습니다.
- Rule 5에 따라 실제 소스 코드는 아직 수정되지 않았습니다.
- 계획서 내용에 동의하시면 채팅창에 **`/apply`** 명령어를 입력해 주세요. 즉시 위 6개 파일에 최적화 코드를 적용하고 빌드 및 전체 테스트 검증을 완료하겠습니다.
