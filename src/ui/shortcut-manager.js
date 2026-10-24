/**
 * Unified Global Keyboard Shortcut Manager
 * Handles 9 shortcuts: Space, [, ], \, R, ←, →, S, T with IME protection and typing safety guards.
 */

export class ShortcutManager {
  constructor(handlers = {}) {
    this.handlers = handlers; // { onPlayPause, onSetStart, onSetEnd, onClearRegion, onStartLoop, onPrevSentence, onNextSentence, onToggleFels, onToggleTranslation, isShortcutActive }
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.init();
  }

  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyHandler);
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyHandler);
    }
  }

  /** True while a modal dialog is visible — global shortcuts must not drive the player behind it. */
  isModalOpen() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return false;
    return ['settingsModal', 'handoutModal', 'classroomModal'].some(id => {
      const el = document.getElementById(id);
      return !!(el && el.classList && typeof el.classList.contains === 'function' && !el.classList.contains('hidden'));
    });
  }

  handleKeyDown(e) {
    if (this.isModalOpen()) return;

    // =========================================================================
    // GLOBAL: Project File Shortcuts (Ctrl+O, Ctrl+S, Ctrl+Shift+S)
    // =========================================================================
    if (e.ctrlKey || e.metaKey) {
      const key = (e.key || '').toLowerCase();
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
      return; // Ignore other Ctrl/Cmd shortcuts
    }

    const target = e.target;
    const isTyping = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
    const isButtonFocus = target && (
      target.tagName === 'BUTTON' ||
      (typeof target.getAttribute === 'function' && target.getAttribute('role') === 'button')
    );
    if (e.repeat) return;

    // Typing protection: If user is actively typing in a form field
    if (isTyping) {
      const isFelsBlank = target.classList && target.classList.contains('fels-blank-input');
      if (isFelsBlank) {
        // 1. Space: togglePlayPause even while typing inside blank (keeps focus)
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          if (this.handlers.onPlayPause) this.handlers.onPlayPause();
          return;
        }
        // 2. F6: prevSentence (앞문장 이동)
        if (e.key === 'F6') {
          e.preventDefault();
          if (this.handlers.onPrevSentence) this.handlers.onPrevSentence();
          return;
        }
        // 3. F7: nextSentence (뒷문장 이동)
        if (e.key === 'F7') {
          e.preventDefault();
          if (this.handlers.onNextSentence) this.handlers.onNextSentence();
          return;
        }
        // 4. Toggle OFF via F5 or Escape: immediately exit text input mode and blur
        if (e.key === 'F5' || e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          return;
        }
        // 5. F11: togglePlayAllSentences (전체 문장 재생)
        if (e.key === 'F11') {
          e.preventDefault();
          if (this.handlers.onTogglePlayAllSentences) this.handlers.onTogglePlayAllSentences();
          return;
        }
        // Alt + Arrow allowed inside FELS blanks for sentence jumping
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          if (e.key === 'ArrowLeft' && this.handlers.onPrevSentence) {
            this.handlers.onPrevSentence();
          } else if (e.key === 'ArrowRight' && this.handlers.onNextSentence) {
            this.handlers.onNextSentence();
          }
          return;
        }
      }
      return;
    }

    // Let focused buttons keep native Enter / Space activation
    if (isButtonFocus && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
      return;
    }

    const currentPage = this.handlers.getCurrentPage
      ? this.handlers.getCurrentPage()
      : (this.handlers.isShortcutActive && this.handlers.isShortcutActive() ? 'practice' : null);

    // =========================================================================
    // PAGE 3: Memorization Shortcuts (Number keys 1~9 and Keypad 1~9)
    // =========================================================================
    if (currentPage === 'memorize') {
      const classroomModal = document.getElementById('classroomModal');
      if (classroomModal && !classroomModal.classList.contains('hidden')) {
        return;
      }

      let num = null;
      if (e.code && /^Digit([1-9])$/.test(e.code)) {
        num = parseInt(e.code.replace('Digit', ''), 10);
      } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
        num = parseInt(e.code.replace('Numpad', ''), 10);
      } else if (e.key >= '1' && e.key <= '9') {
        num = parseInt(e.key, 10);
      }

      if (num !== null) {
        e.preventDefault();
        if (this.handlers.onFlipMemorizeCard) {
          this.handlers.onFlipMemorizeCard(num);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (this.handlers.onPlayAllMemorize) {
          this.handlers.onPlayAllMemorize();
        }
        return;
      }
      return;
    }

    // =========================================================================
    // PAGE 1: Input View Waveform Shortcuts (Space: Play/Pause Waveform)
    // =========================================================================
    if (currentPage === 'input') {
      const key = e.key;
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        if (this.handlers.onPlayPauseInput) {
          this.handlers.onPlayPauseInput();
        }
        return;
      }
      return;
    }

    // =========================================================================
    // PAGE 2: Practice View Shortcuts (Space, [, ], \, R, Arrows, S, T)
    // =========================================================================
    if (currentPage !== 'practice') {
      if (this.handlers.isShortcutActive && !this.handlers.isShortcutActive()) {
        return;
      }
    }

    // Number keys 1~9: flip practice chunk cards (Page 2)
    let practiceNum = null;
    if (e.code && /^Digit([1-9])$/.test(e.code)) {
      practiceNum = parseInt(e.code.replace('Digit', ''), 10);
    } else if (e.code && /^Numpad([1-9])$/.test(e.code)) {
      practiceNum = parseInt(e.code.replace('Numpad', ''), 10);
    } else if (e.key >= '1' && e.key <= '9') {
      practiceNum = parseInt(e.key, 10);
    }

    if (practiceNum !== null) {
      e.preventDefault();
      if (this.handlers.onFlipPracticeCard) {
        this.handlers.onFlipPracticeCard(practiceNum);
      }
      return;
    }

    const key = e.key;

    // 1. Space : togglePlayPause (스페이스바로 재생/정지)
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      if (this.handlers.onPlayPause) this.handlers.onPlayPause();
      return;
    }

    // 2. [ : setRegionStartFromCurrentTime
    if (key === '[') {
      e.preventDefault();
      if (this.handlers.onSetStart) this.handlers.onSetStart();
      return;
    }

    // 3. ] : setRegionEndFromCurrentTime
    if (key === ']') {
      e.preventDefault();
      if (this.handlers.onSetEnd) this.handlers.onSetEnd();
      return;
    }

    // 4. \ (￦) : clearSelectedRegion
    if (key === '\\' || key === '¥' || key === '₩') {
      e.preventDefault();
      if (this.handlers.onClearRegion) this.handlers.onClearRegion();
      return;
    }

    // 5. F6 / ArrowLeft : prevSentence (앞문장으로 이동)
    if (key === 'F6' || key === 'ArrowLeft') {
      e.preventDefault();
      if (this.handlers.onPrevSentence) this.handlers.onPrevSentence();
      return;
    }

    // 6. F7 / ArrowRight : nextSentence (뒷문장으로 이동)
    if (key === 'F7' || key === 'ArrowRight') {
      e.preventDefault();
      if (this.handlers.onNextSentence) this.handlers.onNextSentence();
      return;
    }

    // 7. S / s : toggleFelsMode
    if (key === 's' || key === 'S' || key === 'ㄴ') {
      e.preventDefault();
      if (this.handlers.onToggleFels) this.handlers.onToggleFels();
      return;
    }

    // 8. T / t : toggleTranslation
    if (key === 't' || key === 'T' || key === 'ㅅ') {
      e.preventDefault();
      if (this.handlers.onToggleTranslation) this.handlers.onToggleTranslation();
      return;
    }

    // 9. F5 : toggleTextInput (약형 빈칸 텍스트 입력 모드 진입/해제, F5 브라우저 새로고침 방지)
    if (key === 'F5') {
      e.preventDefault();
      if (this.handlers.onToggleTextInput) this.handlers.onToggleTextInput();
      return;
    }

    // 10. F11 : togglePlayAllSentences (전체 문장 연속 재생, F11 브라우저 전체화면 방지)
    if (key === 'F11') {
      e.preventDefault();
      if (this.handlers.onTogglePlayAllSentences) this.handlers.onTogglePlayAllSentences();
      return;
    }

    // 11. Enter : In FELS mode on Page 2, check answers or advance to next sentence if all correct
    if (key === 'Enter') {
      if (this.handlers.onEnterPractice) {
        e.preventDefault();
        this.handlers.onEnterPractice();
        return;
      }
    }
  }
}
