# 파형창 패널 고속화 및 재생바 끊김 현상 해결 구현 계획서

## 1. 개요 및 배경

- **사용자 요청 사항**:
  - *"현재 가장 마음에 안드는 부분은 파형창 패널의 반응이 느리다는 점이야. 파형창의 반응을 빠르고 단순하게 수정해 줄 수도 있어? 지금은 재생 중 재생바의 움직임이 끊겨."*
- **문제의 본질**:
  1. **재생바 움직임 끊김 (Choppy Playhead Stutter)**:
     - 1단계 및 2단계 파형창에서 오디오 재생 시 재생바의 위치 이동이 초당 60프레임으로 부드럽게 흘러가지 못하고, 0.2~0.25초마다 뚝! 뚝! 튀면서 끊겨 이동하는 현상.
  2. **패널 반응 둔화 (Sluggish Canvas Responsiveness)**:
     - 파형창을 클릭하거나 드래그할 때, 또는 재생 중일 때 CPU 점유율이 급증하고 조작 반응이 굼뜨게 느껴지는 현상.

---

## 2. 근본 원인 정밀 분석 (Root Cause Analysis)

### 2.1 [1단계 마스터 파형] `src/views/input-view.js` & `src/audio/master-waveform.js`
1. **`timeupdate` 이벤트 전적 의존으로 인한 끊김**:
   - `input-view.js` line 391:
     ```javascript
     this.nativeAudioPlayer.addEventListener('timeupdate', () => {
       const cur = this.nativeAudioPlayer.currentTime;
       if (this.masterWaveform) this.masterWaveform.setPlayheadTime(cur);
     });
     ```
   - 브라우저 표준 `<audio>` 요소의 `timeupdate` 이벤트는 1초에 단 **4~5회(약 200~250ms 주기)**만 발생합니다.
   - `requestAnimationFrame`(60FPS) 기반 보간 루프가 없기 때문에 재생바는 물리적으로 0.25초마다 순간이동을 할 수밖에 없어 심하게 끊겨 보입니다.
2. **매 갱신 시 1,200개 파형 바 + 전체 UI 풀 재렌더링**:
   - 재생 위치가 바뀔 때마다 `draw()`가 호출되어 1,200개의 PCM 바, 시간 눈금 격자, 모든 문장 구간 박스, 텍스트 라벨, 다이아몬드 핸들, `shadowBlur: 8`을 처음부터 다시 그립니다.
   - 배경 캐싱(Offscreen Canvas)이 없어 매 틱마다 막대한 캔버스 드로잉 비용이 소모됩니다.

### 2.2 [2단계 연습 파형] `src/views/practice-view.js` & `src/audio/waveform-renderer.js`
1. **매 프레임 레이아웃 스래싱 (`getBoundingClientRect`)**:
   - `waveform-renderer.js` line 122에서 매 프레임마다 `canvas.getBoundingClientRect()`를 호출하여 브라우저의 렌더 트리 재계산(Reflow/Layout Thrashing)을 강제합니다.
2. **360개 바마다 개별 `shadowBlur` 가우시안 블러 래스터라이징**:
   - `waveform-renderer.js` line 220~241에서 360개의 바를 순회하며 바마다 `beginPath()`, `roundRect()`, `fill()`을 360번 호출하고, 진행된 바마다 고비용 캔버스 필터인 `shadowBlur = 4`를 반복 연산하여 심각한 프레임 드랍을 유발합니다.
3. **중복 `requestAnimationFrame` 루프 경합 및 `timeupdate` 충돌**:
   - 재생, 되감기, 단축키 입력 시 `startWaveformPlaybackLoop()`가 중복 방지 플래그 없이 여러 번 호출되면 2~3개의 rAF 루프가 병렬 실행됩니다.
   - 동시에 `timeupdate` 리스너에서도 매 250ms마다 비동기적으로 `drawWaveform()`을 중복 호출하여 재생바 렌더링 타이밍이 어긋나 떨림이 발생합니다.

---

## 3. 고속화 및 단순화 최적화 설계 방안

```
[ 기존 방식 (Before) ]
Audio timeupdate (4Hz, 250ms 주기) ──► 1,200개/360개 바 전체 + 텍스트 + shadowBlur 매번 풀 렌더링 ──► 심한 끊김 & 렉

[ 최적화 방식 (After) ]
1. 60FPS requestAnimationFrame 루프 ──► 실시간 currentTime 추적으로 실크처럼 부드러운 재생바 보간
2. 오프스크린 캔버스 캐시 (1단계)   ──► 1,200개 정적 파형은 1회만 캐싱, 매 프레임 drawImage 1회로 고속 복사
3. 2회 일괄 패스 배치 렌더링 (2단계) ──► 360번 루프를 '진행 바 1회 fill' + '미진행 바 1회 fill'로 극적 단순화
4. 무거운 shadowBlur & Layout Reflow 제거 ──► CPU/GPU 부하 90% 이상 절감 및 즉각적인 조작 반응
```

### 3.1 1단계 마스터 파형 최적화
1. **60FPS 전용 rAF 재생 루프 구축 (`InputView`)**:
   - 오디오 `play` 시 `startPlayheadLoop()` 구동 (`requestAnimationFrame`).
   - `pause`/`ended` 시 `stopPlayheadLoop()`로 즉시 정지 (`cancelAnimationFrame`).
   - `timeupdate`는 텍스트 시간 HUD 갱신 전용으로 분리하고, 캔버스 재생바는 rAF에서 60fps로 매끄럽게 갱신.
2. **정적 파형 오프스크린 캔버스 캐시 (`MasterWaveformTimeline`)**:
   - 오디오 버퍼가 로드되거나 줌 배율이 변경될 때만 `this.bgCacheCanvas`에 배경 그리드와 1,200개 PCM 바를 1회 렌더링.
   - 재생바 갱신 시에는 `ctx.drawImage(this.bgCacheCanvas, 0, 0)`로 한 번에 복사한 후 문장 구간과 재생선(1개 라인)만 가볍게 드로잉.
3. **고비용 `shadowBlur: 8` 제거**:
   - 선명하고 깔끔한 네온 솔리드 컬러선(`rgb(0, 255, 204)`)으로 대체하여 래스터라이징 부하 제거.

### 3.2 2단계 연습 파형 최적화
1. **단일 rAF 루프 보장 & 중복 차단 (`PracticeView`)**:
   - `this.isWaveformLoopRunning` 플래그 및 기존 애니메이션 ID 취소(`cancelAnimationFrame`) 로직 추가.
   - 재생 중(rAF 활성 상태)일 때는 `timeupdate` 리스너에서의 무거운 `drawWaveform()` 호출을 가드 처리하여 중복 렌더링 차단.
2. **`getBoundingClientRect()` 캐싱**:
   - 캔버스 크기는 창 크기 변경(`window.resize`) 또는 문장 전환 시에만 계산하여 캐싱, 매 프레임 Reflow 방지.
3. **360개 바 일괄 배치 렌더링 (Batch Path Drawing) & `shadowBlur` 제거 (`WaveformRenderer`)**:
   - 360개 바마다 일일이 `beginPath()`와 `fill()`을 호출하던 방식을 변경:
     - **Path 1**: 재생바 이전의 진행된 바들을 1개의 Path로 묶어 `ctx.fill()` 1회 호출.
     - **Path 2**: 재생바 이후의 미진행 바들을 1개의 Path로 묶어 `ctx.fill()` 1회 호출.
   - `shadowBlur = 4` 제거 (총 드로잉 API 호출 횟수 720회 ➔ 단 2회로 99.7% 감축).

---

## 4. 변경 대상 파일 상세

| 구분 | 파일 경로 | 변경 내용 요약 |
|---|---|---|
| **1단계** | `src/views/input-view.js` | 60FPS rAF 재생바 애니메이션 루프 추가, `play`/`pause`/`ended` 생명주기 관리 |
| **1단계** | `src/audio/master-waveform.js` | 정적 파형 오프스크린 캔버스 캐싱(`bgCacheCanvas`), `shadowBlur` 제거, 고속 분할 드로잉 |
| **2단계** | `src/views/practice-view.js` | `startWaveformPlaybackLoop` 중복 실행 방지 가드, `timeupdate` 렌더링 경합 제거 |
| **2단계** | `src/audio/waveform-renderer.js` | `getBoundingClientRect` 프레임별 호출 제거, 360개 바 일괄 배치 패스(Batch Path) 렌더링, `shadowBlur` 제거 |

---

## 5. 검증 계획

1. **정적 구문 검증**:
   - `node --check src/views/input-view.js`
   - `node --check src/audio/master-waveform.js`
   - `node --check src/views/practice-view.js`
   - `node --check src/audio/waveform-renderer.js`
2. **기능 및 성능 검증 스크립트 작성 (`scratch/test_waveform_performance.js`)**:
   - 1단계 및 2단계 파형 렌더러의 1회 드로잉 수행 시간(ms) 벤치마크 비교.
   - rAF 루프 중복 방지 플래그 및 생명주기 제어 정상 작동 검증.
3. **사용자 체감 확인 항목**:
   - 1단계 및 2단계에서 오디오 재생 시 재생바가 끊김 없이 60fps로 실크처럼 미끄러지듯 이동하는지 확인.
   - 문장 전환, 단축키 연속 입력, 구간 드래그 시 지연(Lag) 없이 즉각 반응하는지 확인.

---

## 6. 결론 및 승인 대기

- 본 개선 작업은 불필요한 고비용 캔버스 필터와 중복 렌더링을 완전히 걷어내고, 구조를 **단순하고 가볍게(Simple & Lightweight)** 만들면서도 **60FPS 부드러운 재생바 움직임**을 완벽하게 구현할 수 있는 최적의 솔루션입니다.
- 현재 질의는 `/ask` 규칙에 따라 소스 코드를 임의로 수정하지 않고 계획서 작성 상태로 대기합니다.
- 본 계획대로 구현을 적용하시려면 **`/apply`** 명령을 내려주시면 즉시 적용을 시작하겠습니다.
