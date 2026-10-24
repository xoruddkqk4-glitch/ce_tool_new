# DESIGN.md - CE Tool 디자인 시스템 규격서

## 1. 비주얼 철학 및 분위기 (Atmosphere & Aesthetic)
CE Tool은 고도의 집중을 요하는 어학 훈련용 전문가 도구입니다. 산만한 시각 노이즈(과도한 네온 번짐, 인위적 그라데이션, 통통 튀는 바운스 애니메이션)를 배제하고, 차분한 다크 서페이스와 정교한 타이포그래피, 절제된 인터랙션을 통해 신뢰감 있는 학습 환경을 구축합니다.

---

## 2. 컬러 팔레트 (Color Palette Tokens)

### Primary Brand Color
- **Dark Theme Primary**: `#5850ec` (Indigo Deep, 흰색 텍스트 명도 대비 5.5:1로 WCAG AA 4.5:1 완전 충족)
- **Primary Light**: `#7c75f5`
- **Primary Dark**: `#4338ca`
- **Light Theme Primary**: `#4f46e5`

### Neutral Surfaces
- **Background Primary**: `#0a0f1d` (Dark Navy Base) / `#f8fafc` (Light Slate Base)
- **Background Secondary**: `#111827` / `#f1f5f9`
- **Surface / Card**: `#1a2236` / `#ffffff`
- **Header Glass**: `rgba(15, 23, 42, 0.94)` / `rgba(255, 255, 255, 0.92)`

### Text Hierarchy
- **Text Main**: `#f3f4f6` (Dark) / `#0f172a` (Light) - 기본 본문 및 강조
- **Text Muted**: `#9ca3af` (Dark) / `#475569` (Light) - 보조 설명 및 메타 정보
- **Text Faint**: `#6b7280` (Dark) / `#64748b` (Light) - 단축키 키캡 및 가이드

### Semantic Accents
- **Cyan (약형/구간)**: `#06b6d4` (다크 테마 악센트), `#0284c7` (라이트 테마)
- **Emerald (완료/성공)**: `#10b981` / `#059669`
- **Amber (경고/진행)**: `#f59e0b` / `#d97706`
- **Rose (에러/중단)**: `#f43f5e` / `#e11d48`

---

## 3. 타이포그래피 체계 (Typography Ramp)

- **Primary Font**: `'Pretendard Variable'`, `'Pretendard'`, sans-serif (한글 최적화 자간 -0.015em)
- **Secondary / Metric Font**: `'Plus Jakarta Sans'`, sans-serif (영문 및 숫자 디스플레이)
- **Code / Shortcut Font**: `monospace` (키보드 단축키 `<kbd>`)

| 토큰 | 폰트 크기 | 행간 (Line-height) | 굵기 (Weight) | 주 용도 |
| :--- | :---: | :---: | :---: | :--- |
| `display-1` | 28px (1.75rem) | 1.25 | 800 | 메인 대형 헤딩 |
| `title-h2` | 22px (1.35rem) | 1.3 | 700 | 뷰 섹션 타이틀 |
| `title-h3` | 18px (1.15rem) | 1.4 | 600 | 카드 및 모달 헤더 |
| `body-base` | 16px (1.00rem) | 1.6 | 400, 500 | 본문, 스크립트 텍스트 |
| `body-sm` | 14px (0.875rem) | 1.5 | 500, 600 | 보조 텍스트, 버튼 레이블 |
| `caption` | 12px (0.75rem) | 1.4 | 600, 700 | 단축키 바, 배지, 칩 (**최저 11px 준수**) |

---

## 4. 8pt 기반 간격 및 공간 리듬 (Spacing & Layout Grid)
- `space-1`: 4px (아이콘-텍스트 간격)
- `space-2`: 8px (인라인 요소 간격)
- `space-3`: 12px (입력 필드 내부 패딩)
- `space-4`: 16px (컴포넌트 기본 패딩)
- `space-6`: 24px (섹션 간 여백)
- `space-8`: 32px (모달 및 대형 컨테이너 패딩)

---

## 5. 곡률 및 테두리 체계 (Radii & Borders)
- **Small (`--radius-sm`, 6px)**: `<kbd>` 키캡, 상태 태그, 마이크로 배지
- **Medium (`--radius-md`, 12px)**: 버튼, 입력 폼, 청크 카드, 오디오 파형 박스
- **Large (`--radius-lg`, 18px)**: 메인 글래스 카드, 팝업 모달
- **Pill (`--radius-pill`, 9999px)**: 상단 3단계 내비게이션 탭바, 필 버튼
- **Hairline Border**: `1px solid rgba(255, 255, 255, 0.08)` (다크), `1px solid rgba(203, 213, 225, 0.7)` (라이트)

---

## 6. 그림자 및 뎁스 체계 (Elevation & Shadows)
인위적인 0-offset 컬러 발광(Glow Slop)을 전면 금지하며, 사실적인 엠비언트 라이팅을 적용합니다.
- `shadow-sm`: `0 2px 4px rgba(0, 0, 0, 0.2)`
- `shadow-md`: `0 4px 14px rgba(0, 0, 0, 0.35)`
- `shadow-lg`: `0 10px 30px rgba(0, 0, 0, 0.45)`
- `shadow-glow` (Ambient): `0 8px 20px -2px rgba(88, 80, 236, 0.25)`

---

## 7. 모션 및 가속도 곡선 (Motion Tokens)
- **Primary Deceleration**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **Micro Interactions**: `150ms` (호버, 포커스, 탭 전환)
- **Standard Transition**: `250ms` (모달 페이드, 드롭다운 펼침)
- **Card Flip Transition**: `350ms` (3D 플립 카드 앞/뒷면 전환)
- **금지 패턴**: `cubic-bezier(0.34, 1.4, ...)` 등 탄성 바운스 이징 사용 금지.
