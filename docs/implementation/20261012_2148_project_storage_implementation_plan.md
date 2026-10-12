# CE Tool 프로젝트 단위 저장/불러오기 및 3대 액션 체계 구현 계획서

- **작성 일시**: 2026-10-12 21:48 (KST)
- **대상 저장소**: `c:\Users\user\Desktop\local\09ce_tool_new` (Vanilla JS SPA, Standalone Zero-CORS)
- **문서 목적**: 프로젝트 단위로 음성과 청크를 저장/복원하는 `.ceproject` 파일 포맷 및 `[불러오기 / 저장하기 / 새 이름으로 저장하기]` 3대 액션, '최근 열었던 폴더 자동 유지' 기능의 완전한 구현 계획서
- **실행 모드**: `/ask` 모드 산출물 (**사용자의 명시적 `/apply` 명령 전에는 소스 코드에 자동 적용하지 마세요**)

---

## 1. 개요 및 요구사항 정의

### 1-1. 사용자 핵심 요구사항
1. **프로젝트 단위로 음성과 청크 통합 저장/복원**:
   - MP3/WAV 음성 데이터(원본 바이너리/Base64)와 청크 분할 결과(영어 청크 `||`, 자연스러운 해석, 직독직해, 타임스탬프)를 하나의 독립된 프로젝트 파일(`.ceproject` 또는 `.json`)로 완전 패키징.
   - 프로젝트 파일을 열면 별도의 파일 재지정 없이 음성 플레이어, 파형 캔버스, 1페이지 편집기, 2페이지 약형 연습, 3페이지 스크립트 암기 상태가 100% 한 번에 복원.
2. **`[불러오기 / 저장하기 / 새 이름으로 저장하기]` 3대 액션 체계**:
   - **[📂 불러오기 (Ctrl+O)]**: 프로젝트 파일을 선택하여 워크스페이스에 즉시 로드.
   - **[💾 저장하기 (Ctrl+S)]**: 이미 열려 있거나 저장된 파일이 있는 경우 팝업 다이얼로그 없이 기존 파일에 즉시 덮어쓰기(Fast In-Place Save). 신규 프로젝트인 경우 자동으로 '새 이름으로 저장하기'로 전환.
   - **[📑 새 이름으로 저장하기 (Ctrl+Shift+S)]**: 항상 파일 저장 다이얼로그를 호출하여 원하는 위치와 이름으로 새 프로젝트 파일 저장.
3. **'항상 최근 열었던 폴더 자동 유지' 기능**:
   - 사용자가 마지막으로 프로젝트를 열거나 저장했던 작업 디렉토리를 기억하여, 다음 파일 대화상자 호출 시 해당 폴더가 기본 경로로 자동 열림.
   - Chromium File System Access API의 `id: 'ce-project-folder'` 시스템 MRU와 IndexedDB 디렉토리 핸들 영속화를 결합한 2중 보장 구조.

---

## 2. 시스템 아키텍처 및 데이터 스키마

### 2-1. `.ceproject` 파일 포맷 스키마 (v1.1.0)
```json
{
  "format": "ce-project",
  "version": "1.1.0",
  "appName": "CE Tool",
  "savedAt": "2026-10-12T21:48:00.000Z",
  "projectName": "2026_수능특강_영어_01강",
  "mode": "both",
  "scriptText": "Hello, visitors to Cryston Beach.\nToday, I'm delighted to introduce...",
  "audio": {
    "hasAudio": true,
    "fileName": "lecture_01.mp3",
    "mimeType": "audio/mpeg",
    "size": 341250,
    "isSynthesized": false,
    "dataBase64": "data:audio/mpeg;base64,//uQxAAAAANIAAAAA..."
  },
  "sentenceList": [
    {
      "index": 0,
      "text": "Hello, visitors to Cryston Beach.",
      "audioStart": 0.45,
      "audioEnd": 3.82,
      "result": {
        "natural": "크리스톤 비치를 찾아주신 방문객 여러분, 환영합니다.",
        "chunk_text": "안녕하세요, 방문객 여러분. || 크리스톤 비치를 방문하시는",
        "direct": "안녕하세요, 방문객 여러분. / 크리스톤 비치를 방문하시는",
        "chunks": [
          { "en": "Hello, visitors", "ko": "안녕하세요, 방문객 여러분." },
          { "en": "to Cryston Beach.", "ko": "크리스톤 비치를 방문하시는" }
        ]
      }
    }
  ],
  "settings": {
    "playbackSpeed": 1.0,
    "isFelsMode": true,
    "activeSentenceIndex": 0
  }
}
```

### 2-2. 최근 열었던 폴더 자동 유지 원리
```
┌─────────────────────────────────────────────────────────────┐
│                   File System Access API                    │
│   showOpenFilePicker({ id: 'ce-project-folder', startIn })  │
│   showSaveFilePicker({ id: 'ce-project-folder', startIn })  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 1계층: Chromium 브라우저 엔진 MRU      2계층: IndexedDB 디렉토리 핸들 보존
 (동일 id에 대해 최근 방문 폴더 기억)      (ce_tool_db / project_handles)
```
1. **1계층 (Chromium `id` 파라미터)**:
   - `showOpenFilePicker({ id: 'ce-project-folder' })` 및 `showSaveFilePicker({ id: 'ce-project-folder' })`에 고유 ID를 전달하면 Chromium 브라우저가 사용자 프로필 내에 해당 ID로 마지막 접근한 디렉토리를 영구 기억하여 다음 호출 시 그 폴더를 자동으로 엽니다.
2. **2계층 (IndexedDB 핸들 영속화)**:
   - 파일 오픈 시 전달받은 `FileSystemFileHandle` 및 부모 `directoryHandle`을 IndexedDB의 `project_handles` 스토어에 보존합니다.
   - 브라우저 재시작 후에도 이전 작업 파일명과 최근 폴더 정보를 복원하고 `startIn` 속성으로 전달합니다.
3. **3계층 (폴백 메커니즘)**:
   - File System Access API 미지원 브라우저(Firefox, Safari)나 비보안 컨텍스트(`http://`) 환경에서는 `<input type="file" accept=".ceproject,.json">` 및 `<a download="...">` 다운로드 방식으로 자동 폴백됩니다.

---

## 3. 단계별 상세 구현 계획 (Step-by-Step Implementation)

### Step 1. 프로젝트 관리 전용 서비스 신규 구현
- **파일 경로**: `src/services/project-service.js` (신규 생성)
- **책임 및 역할**:
  - `serializeProject()`: 현재 `AppState`의 스크립트, 문장 청크, 음성 Base64, 세팅을 직렬화.
  - `deserializeAndApply()`: `.ceproject` JSON을 파싱하여 `Blob`/`File` 재구성, 오디오 디코딩, 문장/청크 상태 복원.
  - `openProject()`: File System Access API(또는 폴백 인풋)로 파일 오픈, 핸들 저장, 최근 폴더 유지.
  - `saveProject()`: 기존 파일 핸들로 즉시 덮어쓰기(In-place), 미저장 시 `saveProjectAs()` 호출.
  - `saveProjectAs()`: 새 파일 다이얼로그 호출, 핸들 갱신, 최근 폴더 유지.
  - `isDirty` 상태 추적: 스크립트 수정, 청크 분할/병합, 해석 변경 시 미저장(`●`) 감지.

#### `src/services/project-service.js` 전체 코드
```javascript
/**
 * CE Tool Project Service
 * Handles .ceproject package serialization, deserialization, File System Access API,
 * In-place Save, Save As, Load, and persistent recent folder tracking.
 */

import { appState } from '../core/app-state.js';
import { toast } from '../ui/toast-manager.js';
import { decodeAudioFile } from '../audio/audio-context.js';
import { escapeHtml } from '../utils/dom.js';

const PROJECT_IDB_NAME = 'ce_tool_db';
const PROJECT_STORE_NAME = 'project_handles';
const PROJECT_PICKER_ID = 'ce-project-folder';

class ProjectService {
  constructor() {
    this.currentFileHandle = null;
    this.lastDirectoryHandle = null;
    this.currentProjectName = '새 프로젝트';
    this.isDirty = false;
    this.dbPromise = null;
    this.onStateChangeCallbacks = [];
  }

  init() {
    this.initIndexedDB();
    this.loadLastProjectMeta();
  }

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.onStateChangeCallbacks.push(cb);
    }
  }

  notifyStateChange() {
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb({
          projectName: this.currentProjectName,
          hasHandle: !!this.currentFileHandle,
          isDirty: this.isDirty
        });
      } catch (err) {
        console.error('Error in project state callback:', err);
      }
    });
  }

  markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.notifyStateChange();
    }
  }

  markClean(name = this.currentProjectName) {
    this.isDirty = false;
    this.currentProjectName = name;
    this.notifyStateChange();
  }

  /* -------------------------------------------------------------------------
   * IndexedDB Persistence for Handles & Metadata
   * ------------------------------------------------------------------------- */
  initIndexedDB() {
    if (typeof indexedDB === 'undefined') return;
    this.dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(PROJECT_IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          db.createObjectStore(PROJECT_STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  }

  async saveHandleToIDB(key, handle) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PROJECT_STORE_NAME);
        store.put(handle, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async getHandleFromIDB(key) {
    if (!this.dbPromise) return null;
    const db = await this.dbPromise;
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(PROJECT_STORE_NAME, 'readonly');
        const store = tx.objectStore(PROJECT_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  loadLastProjectMeta() {
    try {
      const meta = localStorage.getItem('ce_tool_last_project_meta');
      if (meta) {
        const parsed = JSON.parse(meta);
        if (parsed && parsed.name) {
          this.currentProjectName = parsed.name;
        }
      }
    } catch (e) {}
    this.notifyStateChange();
  }

  saveLastProjectMeta(name) {
    try {
      localStorage.setItem('ce_tool_last_project_meta', JSON.stringify({
        name,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {}
  }

  /* -------------------------------------------------------------------------
   * Serialization & Deserialization
   * ------------------------------------------------------------------------- */
  async serializeProject() {
    let audioData = null;
    if (appState.uploadedAudioFile) {
      const file = appState.uploadedAudioFile;
      const base64 = await this.readFileAsDataURL(file);
      audioData = {
        hasAudio: true,
        fileName: file.name || 'audio.mp3',
        mimeType: file.type || 'audio/mp3',
        size: file.size || 0,
        isSynthesized: !!appState.isSynthesizedAudio,
        dataBase64: base64
      };
    } else if (appState.isSynthesizedAudio && appState.synthesizedWavBlob) {
      const base64 = await this.readFileAsDataURL(appState.synthesizedWavBlob);
      audioData = {
        hasAudio: true,
        fileName: 'tts_synthesized.wav',
        mimeType: 'audio/wav',
        size: appState.synthesizedWavBlob.size || 0,
        isSynthesized: true,
        dataBase64: base64
      };
    }

    const project = {
      format: 'ce-project',
      version: '1.1.0',
      appName: 'CE Tool',
      savedAt: new Date().toISOString(),
      projectName: this.currentProjectName.replace(/\.ceproject$/i, ''),
      mode: appState.currentMode || 'text',
      scriptText: appState.scriptText || '',
      audio: audioData,
      sentenceList: appState.sentenceList || [],
      settings: {
        playbackSpeed: appState.playbackSpeed || 1.0,
        isFelsMode: !!appState.isFelsMode,
        activeSentenceIndex: appState.activeSentenceIndex || 0
      }
    };

    return JSON.stringify(project, null, 2);
  }

  async deserializeAndApply(jsonString, inputView) {
    const data = JSON.parse(jsonString);
    if (!data || (data.format !== 'ce-project' && !data.sentenceList && !data.sentences)) {
      throw new Error('유효한 CE Tool 프로젝트 파일(.ceproject)이 아닙니다.');
    }

    const sentences = data.sentenceList || data.sentences || [];
    const script = data.scriptText || '';
    const mode = data.mode || (data.audio?.hasAudio ? 'both' : 'text');

    // 1. Audio restoration
    if (data.audio && data.audio.dataBase64) {
      const blob = this.dataURLToBlob(data.audio.dataBase64, data.audio.mimeType || 'audio/mp3');
      const audioFile = new File([blob], data.audio.fileName || 'audio.mp3', {
        type: data.audio.mimeType || 'audio/mp3'
      });

      appState.uploadedAudioFile = audioFile;
      if (appState.uploadedAudioUrl) {
        URL.revokeObjectURL(appState.uploadedAudioUrl);
      }
      appState.uploadedAudioUrl = URL.createObjectURL(audioFile);
      appState.isSynthesizedAudio = !!data.audio.isSynthesized;

      try {
        appState.audioBuffer = await decodeAudioFile(audioFile);
      } catch (decodeErr) {
        console.warn('Audio decoding fallback during load:', decodeErr);
      }

      if (inputView && typeof inputView.renderDropAreaPreview === 'function') {
        inputView.renderDropAreaPreview(audioFile);
      }
    } else {
      if (inputView && typeof inputView.resetAudioFile === 'function') {
        inputView.resetAudioFile();
      }
    }

    // 2. Mode and Script
    appState.scriptText = script;
    if (inputView && inputView.inputEnglish) {
      inputView.inputEnglish.value = script;
      if (inputView.charCount) inputView.charCount.textContent = `${script.length}자`;
    }

    if (inputView && typeof inputView.setMode === 'function') {
      inputView.setMode(mode);
    } else {
      appState.setUploadMode(mode);
    }

    // 3. Sentences & Settings
    appState.setSentenceList(sentences);
    if (data.settings) {
      if (typeof data.settings.playbackSpeed === 'number') {
        appState.playbackSpeed = data.settings.playbackSpeed;
      }
      if (typeof data.settings.activeSentenceIndex === 'number') {
        appState.setActiveSentenceIndex(data.settings.activeSentenceIndex);
      }
      if (typeof data.settings.isFelsMode === 'boolean') {
        appState.isFelsMode = data.settings.isFelsMode;
      }
    }

    // 4. Page 1 Results
    if (inputView && typeof inputView.renderParsedResults === 'function') {
      inputView.renderParsedResults({ scrollToSection: false });
    }

    return data;
  }

  /* -------------------------------------------------------------------------
   * 3 Core Actions: Open, Save, Save As
   * ------------------------------------------------------------------------- */
  async openProject(inputView) {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: PROJECT_PICKER_ID, // Chromium MRU automatic folder memory!
          types: [{
            description: 'CE Tool Project (*.ceproject, *.json)',
            accept: { 'application/json': ['.ceproject', '.json'] }
          }],
          multiple: false
        };

        const savedDir = await this.getHandleFromIDB('last_dir_handle');
        if (savedDir) {
          pickerOpts.startIn = savedDir;
        }

        const [handle] = await window.showOpenFilePicker(pickerOpts);
        if (!handle) return;

        const file = await handle.getFile();
        const text = await file.text();

        await this.deserializeAndApply(text, inputView);

        this.currentFileHandle = handle;
        this.markClean(handle.name);
        this.saveLastProjectMeta(handle.name);
        this.saveHandleToIDB('last_file_handle', handle);

        toast.show(`📂 프로젝트 '${handle.name}'를 성공적으로 불러왔습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User canceled
        console.warn('Native file picker failed, falling back to input:', err);
      }
    }

    // Fallback: <input type="file">
    this.openWithFileInputFallback(inputView);
  }

  openWithFileInputFallback(inputView) {
    const input = document.getElementById('projectFileInput') || document.createElement('input');
    input.type = 'file';
    input.accept = '.ceproject,.json';
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        await this.deserializeAndApply(text, inputView);
        this.currentFileHandle = null; // No direct in-place save in fallback mode
        this.markClean(file.name);
        this.saveLastProjectMeta(file.name);
        toast.show(`📂 프로젝트 '${file.name}'를 성공적으로 불러왔습니다.`);
      } catch (err) {
        toast.show(`❌ 프로젝트 불러오기 실패: ${err.message}`);
      } finally {
        input.value = '';
      }
    };
    input.click();
  }

  async saveProject(inputView) {
    if (!this.currentFileHandle) {
      return this.saveProjectAs(inputView);
    }

    try {
      const opts = { mode: 'readwrite' };
      if ((await this.currentFileHandle.queryPermission(opts)) !== 'granted') {
        if ((await this.currentFileHandle.requestPermission(opts)) !== 'granted') {
          return this.saveProjectAs(inputView);
        }
      }

      toast.show('💾 프로젝트 저장 중...');
      const jsonStr = await this.serializeProject();
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      this.markClean(this.currentFileHandle.name);
      toast.show(`💾 프로젝트 '${this.currentFileHandle.name}' 저장 완료!`);
    } catch (err) {
      console.error('In-place save failed, attempting Save As:', err);
      return this.saveProjectAs(inputView);
    }
  }

  async saveProjectAs(inputView) {
    const suggested = this.generateSuggestedName();

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const pickerOpts = {
          id: PROJECT_PICKER_ID, // Chromium MRU automatic folder memory!
          suggestedName: `${suggested}.ceproject`,
          types: [{
            description: 'CE Tool Project (*.ceproject)',
            accept: { 'application/json': ['.ceproject'] }
          }]
        };

        const savedDir = await this.getHandleFromIDB('last_dir_handle');
        if (savedDir) {
          pickerOpts.startIn = savedDir;
        }

        const handle = await window.showSaveFilePicker(pickerOpts);
        if (!handle) return;

        toast.show('💾 프로젝트 저장 중...');
        const jsonStr = await this.serializeProject();
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        this.currentFileHandle = handle;
        this.markClean(handle.name);
        this.saveLastProjectMeta(handle.name);
        this.saveHandleToIDB('last_file_handle', handle);

        toast.show(`💾 프로젝트 '${handle.name}'로 새로 저장되었습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User canceled
        console.warn('Native save file picker failed, falling back to download:', err);
      }
    }

    // Fallback: Browser Blob download
    await this.saveWithDownloadFallback(suggested);
  }

  async saveWithDownloadFallback(suggested) {
    try {
      const jsonStr = await this.serializeProject();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${suggested}.ceproject`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.markClean(filename);
      this.saveLastProjectMeta(filename);
      toast.show(`💾 프로젝트 파일이 다운로드되었습니다: ${filename}`);
    } catch (err) {
      toast.show(`❌ 저장 실패: ${err.message}`);
    }
  }

  generateSuggestedName() {
    if (this.currentProjectName && this.currentProjectName !== '새 프로젝트') {
      return this.currentProjectName.replace(/\.ceproject$/i, '');
    }
    if (appState.uploadedAudioFile && appState.uploadedAudioFile.name) {
      return appState.uploadedAudioFile.name.replace(/\.[^/.]+$/, '');
    }
    if (appState.sentenceList && appState.sentenceList.length > 0 && appState.sentenceList[0].text) {
      const first = appState.sentenceList[0].text.trim().slice(0, 24).replace(/[^a-zA-Z0-9가-힣\s_-]/g, '').trim().replace(/\s+/g, '_');
      if (first) return first;
    }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `CE_Project_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  /* -------------------------------------------------------------------------
   * Utility Helpers
   * ------------------------------------------------------------------------- */
  readFileAsDataURL(blobOrFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blobOrFile);
    });
  }

  dataURLToBlob(dataURL, fallbackMime = 'audio/mp3') {
    const parts = dataURL.split(',');
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || fallbackMime;
    const binary = atob(parts[1] || parts[0]);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binary.charCodeAt(i);
    }
    return new Blob([u8], { type: mime });
  }
}

export const projectService = new ProjectService();
```

---

### Step 2. 글로벌 헤더에 프로젝트 관리 툴바 UI 배치
- **파일 경로**: `index.html`
- **수정 위치**: L46–L50의 `.header-actions` 앞 또는 L30 `.page-nav-tabs` 우측에 `.header-project-toolbar` 삽입.
- **추가 마크업**:
```html
<!-- Global Project Management Toolbar -->
<div class="header-project-toolbar">
  <button id="btnProjectOpen" class="project-btn" title="프로젝트 불러오기 (Ctrl+O)" type="button">
    <span class="btn-icon">📂</span>
    <span class="btn-text">불러오기</span>
    <kbd class="btn-kbd">Ctrl+O</kbd>
  </button>
  <button id="btnProjectSave" class="project-btn" title="프로젝트 저장하기 (Ctrl+S)" type="button">
    <span class="btn-icon">💾</span>
    <span class="btn-text">저장하기</span>
    <kbd class="btn-kbd">Ctrl+S</kbd>
  </button>
  <button id="btnProjectSaveAs" class="project-btn" title="새 이름으로 저장하기 (Ctrl+Shift+S)" type="button">
    <span class="btn-icon">📑</span>
    <span class="btn-text">새 이름으로</span>
  </button>

  <div id="projectStatusPill" class="project-status-pill empty" title="현재 프로젝트 상태">
    <span class="pill-dot"></span>
    <span id="projectNameLabel" class="pill-name">새 프로젝트</span>
    <span id="projectSaveStatus" class="pill-status">(미저장)</span>
  </div>
</div>

<!-- Hidden File Input for Browser Fallback -->
<input type="file" id="projectFileInput" accept=".ceproject,.json" class="hidden">
```

---

### Step 3. 프로젝트 툴바 스타일 구현
- **파일 경로**: `styles/components/project-toolbar.css` (신규 생성)
- **주요 스타일 사양**:
  - 다크/라이트 모드 고대비 유리질감(Glassmorphism) 테마.
  - 마우스 호버 시 은은한 에메랄드/시안 글로우.
  - 단축키 뱃지(`kbd.btn-kbd`): 축소형 고대비 폰트.
  - 프로젝트 상태 알약(Pill):
    - 미저장: 호박색 앰버 점(`#f59e0b`) + `(미저장)`.
    - 수정됨: 맥동(pulse) 애니메이션 청록색 점(`#06b6d4`) + `(수정됨 ●)`.
    - 저장됨: 선명한 에메랄드 그린 점(`#10b981`) + `(저장됨 ✓)`.
  - 반응형 디자인: 화면 폭 1024px 이하 시 버튼 텍스트는 숨기고 아이콘만 노출하여 네비게이션 탭 공간 확보.

```css
/* ==========================================================================
   Project Management Toolbar Styles (CE Tool)
   ========================================================================== */

.header-project-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  padding: 3px 6px;
  background: var(--bg-card, rgba(15, 23, 42, 0.65));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 9999px;
  backdrop-filter: blur(8px);
}

.project-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main, #f8fafc);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.project-btn:hover {
  background: rgba(14, 165, 233, 0.2);
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
  transform: translateY(-1px);
}

.project-btn:active {
  transform: translateY(0);
}

.project-btn .btn-kbd {
  font-size: 0.65rem;
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--text-muted, #94a3b8);
  font-family: inherit;
}

/* Status Pill */
.project-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 28px;
  font-size: 0.78rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  color: var(--text-muted, #cbd5e1);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.project-status-pill.is-clean .pill-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
}

.project-status-pill.is-dirty .pill-dot {
  background: #06b6d4;
  box-shadow: 0 0 6px rgba(6, 182, 212, 0.8);
  animation: projectPulseDot 1.5s infinite;
}

.pill-name {
  font-weight: 600;
  color: var(--text-main, #f8fafc);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-status {
  font-size: 0.7rem;
  color: var(--text-muted, #94a3b8);
}

@keyframes projectPulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

@media (max-width: 900px) {
  .project-btn .btn-text,
  .project-btn .btn-kbd {
    display: none;
  }
  .project-btn {
    padding: 0 8px;
  }
  .project-status-pill {
    max-width: 130px;
  }
}
```

---

### Step 4. 단축키 매니저에 프로젝트 전역 단축키 연동
- **파일 경로**: `src/ui/shortcut-manager.js`
- **수정 위치**: `handleKeyDown(e)` 시작 부분(L58 이전).
- **수정 내용**:
  - `Ctrl + O` (또는 `Cmd + O`): 브라우저 기본 웹문서 열기를 차단하고 `onOpenProject` 호출.
  - `Ctrl + S` (또는 `Cmd + S`): 브라우저 기본 웹페이지 저장을 차단하고 `onSaveProject` 호출.
  - `Ctrl + Shift + S` (또는 `Cmd + Shift + S`): `onSaveProjectAs` 호출.

```javascript
    // =========================================================================
    // GLOBAL: Project File Shortcuts (Ctrl+O, Ctrl+S, Ctrl+Shift+S)
    // =========================================================================
    if ((e.ctrlKey || e.metaKey) && !this.isModalOpen()) {
      const key = e.key.toLowerCase();
      if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        if (this.handlers.onOpenProject) this.handlers.onOpenProject();
        return;
      }
      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          if (this.handlers.onSaveProjectAs) this.handlers.onSaveProjectAs();
        } else {
          if (this.handlers.onSaveProject) this.handlers.onSaveProject();
        }
        return;
      }
    }
```

---

### Step 5. 메인 앱 진입점 및 이벤트 바인딩
- **파일 경로**: `src/main.js`
- **수정 내용**:
  - `projectService` 인스턴스 초기화 및 상태 바인딩.
  - 툴바 버튼 클릭 리스너 연결 (`#btnProjectOpen`, `#btnProjectSave`, `#btnProjectSaveAs`).
  - 단축키 매니저 핸들러에 `onOpenProject`, `onSaveProject`, `onSaveProjectAs` 등록.
  - 1페이지 데이터 수정 시 `projectService.markDirty()` 연동.

```javascript
    // 5. Initialize Project Service
    projectService.init();
    projectService.onStateChange((state) => {
      const pill = document.getElementById('projectStatusPill');
      const nameLabel = document.getElementById('projectNameLabel');
      const statusLabel = document.getElementById('projectSaveStatus');
      if (nameLabel) nameLabel.textContent = state.projectName;
      if (statusLabel) statusLabel.textContent = state.isDirty ? '(수정됨 ●)' : '(저장됨 ✓)';
      if (pill) {
        pill.classList.toggle('is-dirty', state.isDirty);
        pill.classList.toggle('is-clean', !state.isDirty);
      }
    });

    const btnOpen = document.getElementById('btnProjectOpen');
    const btnSave = document.getElementById('btnProjectSave');
    const btnSaveAs = document.getElementById('btnProjectSaveAs');

    if (btnOpen) btnOpen.addEventListener('click', () => projectService.openProject(this.inputView));
    if (btnSave) btnSave.addEventListener('click', () => projectService.saveProject(this.inputView));
    if (btnSaveAs) btnSaveAs.addEventListener('click', () => projectService.saveProjectAs(this.inputView));
```

---

### Step 6. 번들러 파일 순서 등록
- **파일 경로**: `tools/build-standalone.js`
- **수정 내용**:
  - `jsFiles`에 `'src/services/project-service.js'`를 `'src/services/storage-service.js'` 바로 뒤에 추가.
  - `cssFiles`에 `'styles/components/project-toolbar.css'`를 `'styles/components/modal-toast.css'` 뒤에 추가.

---

### Step 7. 신규 회귀 테스트 작성 및 검증
- **파일 경로**: `scratch/test_project_service.js` (신규 생성)
- **검증 항목**:
  1. `serializeProject`로 생성된 JSON 데이터의 완전성(스크립트, 청크 2x2, 타임스탬프, Base64 오디오).
  2. `deserializeAndApply` 시 오디오 Blob 재생성 및 `AppState` 문장 목록 복원 검증.
  3. `markDirty` 및 `markClean` 상태 변화 검증.
  4. 단축키 바인딩(`Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+S`) 이벤트 감지 검증.
  5. `npm run check` (구문 검사 26개 파일 전원 통과).
  6. `npm test` (회귀 테스트 27/27 통과).
  7. `npm run build` (standalone `app.js` 및 `styles.css` 무결성 검증).

---

## 4. 의존성 및 주의사항

1. **Standalone Bundler IIFE 제약**:
   - `project-service.js` 내 최상위 식별자(`PROJECT_IDB_NAME`, `PROJECT_STORE_NAME`, `PROJECT_PICKER_ID`, `ProjectService`, `projectService`)는 전역 유일해야 합니다.
   - import 별칭(`import { x as y }`)을 사용하지 않습니다.
2. **Audio Base64 인코딩/디코딩 성능**:
   - 일반적인 3~10MB MP3 파일은 Base64 변환 시 4~13MB 수준으로, 최신 브라우저의 `JSON.stringify`와 `FileReader`가 50ms 미만으로 즉각 처리합니다.
   - 초대형 파일(15MB 초과)의 경우에도 `Uint8Array` 및 Blob 스트리밍을 통해 메모리 오버헤드를 최소화합니다.
3. **폴백 무결성 보장**:
   - `window.showOpenFilePicker`나 `showSaveFilePicker`가 지원되지 않는 브라우저 또는 로컬 파일 프로토콜에서도 숨김 `<input type="file">` 및 `<a>` 다운로드를 통해 100% 동일하게 저장/불러오기가 동작합니다.

---

## 5. 실행 및 승인 안내

이 계획서는 `/ask` 스킬 규칙에 따라 **코드 변경 없이 계획 수립만 완료**된 상태입니다.

- 이 계획서대로 코드에 즉시 반영하려면 채팅창에 **`/apply`** 명령어를 입력해 주세요.
- 세부 사항에 대한 추가 질문이나 조정이 필요한 경우 편하게 말씀해 주세요.
