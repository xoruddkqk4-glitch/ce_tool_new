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
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyHandler);
  }

  handleKeyDown(e) {
    const target = e.target;
    const isTyping = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );

    // Typing protection: If user is actively typing in a form field
    if (isTyping) {
      const isFelsBlank = target.classList && target.classList.contains('fels-blank-input');
      // Alt + Arrow allowed inside FELS blanks for sentence jumping
      if (isFelsBlank && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' && this.handlers.onPrevSentence) {
          this.handlers.onPrevSentence();
        } else if (e.key === 'ArrowRight' && this.handlers.onNextSentence) {
          this.handlers.onNextSentence();
        }
      }
      return;
    }

    // Ignore if Ctrl/Cmd is pressed (allow browser shortcuts like Ctrl+R, Ctrl+C)
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    const currentPage = this.handlers.getCurrentPage
      ? this.handlers.getCurrentPage()
      : (this.handlers.isShortcutActive && this.handlers.isShortcutActive() ? 'practice' : null);

    // =========================================================================
    // PAGE 3: Memorization Shortcuts (Number keys 1~9 and Keypad 1~9)
    // =========================================================================
    if (currentPage === 'memorize') {
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
    // PAGE 2: Practice View Shortcuts (Space, [, ], \, R, Arrows, S, T)
    // =========================================================================
    if (currentPage !== 'practice') {
      if (this.handlers.isShortcutActive && !this.handlers.isShortcutActive()) {
        return;
      }
    }

    const key = e.key;

    // 1. Space: togglePlayPause
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

    // 5. R / r : startRegionLoop
    if (key === 'r' || key === 'R' || key === 'ㄱ') {
      e.preventDefault();
      if (this.handlers.onStartLoop) this.handlers.onStartLoop();
      return;
    }

    // 6. ArrowLeft : prevSentence
    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (this.handlers.onPrevSentence) this.handlers.onPrevSentence();
      return;
    }

    // 7. ArrowRight : nextSentence
    if (key === 'ArrowRight') {
      e.preventDefault();
      if (this.handlers.onNextSentence) this.handlers.onNextSentence();
      return;
    }

    // 8. S / s : toggleFelsMode
    if (key === 's' || key === 'S' || key === 'ㄴ') {
      e.preventDefault();
      if (this.handlers.onToggleFels) this.handlers.onToggleFels();
      return;
    }

    // 9. T / t : toggleTranslation
    if (key === 't' || key === 'T' || key === 'ㅅ') {
      e.preventDefault();
      if (this.handlers.onToggleTranslation) this.handlers.onToggleTranslation();
      return;
    }
  }
}
