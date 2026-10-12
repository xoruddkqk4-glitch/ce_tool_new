/**
 * CE Tool Project Service
 * Handles .ceproject package serialization, deserialization, File System Access API,
 * In-place Save, Save As, Load, and persistent recent folder tracking.
 */

import { appState } from '../core/app-state.js';
import { toast } from '../ui/toast-manager.js';
import { decodeAudioFile } from '../audio/audio-context.js';

const PROJECT_IDB_NAME = 'ce_tool_db';
const PROJECT_STORE_NAME = 'project_handles';
const PROJECT_PICKER_ID = 'ce-project-folder';

export class ProjectService {
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
      try {
        const req = indexedDB.open(PROJECT_IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
            db.createObjectStore(PROJECT_STORE_NAME);
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
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
      if (typeof localStorage !== 'undefined') {
        const meta = localStorage.getItem('ce_tool_last_project_meta');
        if (meta) {
          const parsed = JSON.parse(meta);
          if (parsed && parsed.name) {
            this.currentProjectName = parsed.name;
          }
        }
      }
    } catch (e) {}
    this.notifyStateChange();
  }

  saveLastProjectMeta(name) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ce_tool_last_project_meta', JSON.stringify({
          name,
          timestamp: new Date().toISOString()
        }));
      }
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
      if (appState.uploadedAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(appState.uploadedAudioUrl);
      }
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        appState.uploadedAudioUrl = URL.createObjectURL(audioFile);
      }
      appState.isSynthesizedAudio = !!data.audio.isSynthesized;

      try {
        if (typeof decodeAudioFile === 'function') {
          appState.audioBuffer = await decodeAudioFile(audioFile);
        }
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
    if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
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
    if (typeof document === 'undefined') return;
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
      if (typeof this.currentFileHandle.queryPermission === 'function') {
        if ((await this.currentFileHandle.queryPermission(opts)) !== 'granted') {
          if ((await this.currentFileHandle.requestPermission(opts)) !== 'granted') {
            return this.saveProjectAs(inputView);
          }
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

    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
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
