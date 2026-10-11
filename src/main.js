/**
 * CE Tool Main Coordinator & Application Entry Point
 * Orchestrates 3-Page SPA Views (Input, Practice, Memorize), Router, Shortcuts, and Theme.
 */

import { appState } from './core/app-state.js';
import { AppRouter } from './ui/router.js';
import { ShortcutManager } from './ui/shortcut-manager.js';
import { SettingsModal } from './ui/settings-modal.js';
import { StorageService } from './services/storage-service.js';
import { InputView } from './views/input-view.js';
import { PracticeView } from './views/practice-view.js';
import { MemorizeView } from './views/memorize-view.js';
import { toast } from './ui/toast-manager.js';

class CEToolApp {
  constructor() {
    this.router = null;
    this.inputView = null;
    this.practiceView = null;
    this.memorizeView = null;
    this.shortcutManager = null;
    this.settingsModal = null;
    this.appState = appState;
  }

  init() {
    // 1. Initialize Theme
    this.initTheme();

    // 2. Initialize Router
    this.router = new AppRouter();

    // 3. Initialize Views
    this.inputView = new InputView(this.router);
    this.practiceView = new PracticeView(this.router);
    this.memorizeView = new MemorizeView(this.router);

    this.router.registerViews({
      input: this.inputView,
      practice: this.practiceView,
      memorize: this.memorizeView
    });

    // 4. Initialize Settings Modal
    this.settingsModal = new SettingsModal();

    // 5. Initialize Global Shortcuts (Page 2 & Page 3)
    this.shortcutManager = new ShortcutManager({
      onPlayPause: () => this.practiceView.togglePlayPause(),
      onSetStart: () => this.practiceView.setRegionStartFromCurrentTime(),
      onSetEnd: () => this.practiceView.setRegionEndFromCurrentTime(),
      onClearRegion: () => this.practiceView.clearSelectedRegion(),
      onStartLoop: () => this.practiceView.startRegionLoop(),
      onPrevSentence: () => this.practiceView.prevSentence(),
      onNextSentence: () => this.practiceView.nextSentence(),
      onToggleFels: () => this.practiceView.toggleFelsMode(),
      onToggleTranslation: () => this.practiceView.toggleRowNaturalVisibility(),
      onFlipPracticeCard: (num) => this.practiceView.flipCardByIndex(num),
      onFlipMemorizeCard: (num) => this.memorizeView.flipCardByIndex(num),
      onPlayAllMemorize: () => this.memorizeView.togglePlayAllScript(),
      getCurrentPage: () => this.router.getCurrentPage(),
      isShortcutActive: () => ['practice', 'memorize'].includes(this.router.getCurrentPage())
    });

    // 6. Navigate to initial page from URL hash or default to 'input'
    const initialHash = window.location.hash.replace(/^#/, '');
    if (['input', 'practice', 'memorize'].includes(initialHash)) {
      this.router.navigateTo(initialHash);
    } else {
      this.router.navigateTo('input');
    }

    console.log('🚀 CE Tool 3-Page Architecture initialized successfully.');
  }

  initTheme() {
    const savedTheme = StorageService.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        StorageService.saveTheme(next);
        this.updateThemeIcon(next);
        toast.show(`테마가 ${next === 'dark' ? '다크 모드' : '라이트 모드'}로 변경되었습니다.`);
      });
    }
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.title = theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
    }
  }
}

// Reliable Bootstrap (Works in both loading and interactive/complete DOM states)
function bootstrapApp() {
  const app = new CEToolApp();
  app.init();
  window.__ceToolApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
