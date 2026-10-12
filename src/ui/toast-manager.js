/**
 * Floating Toast Notification Manager
 */

export class ToastManager {
  constructor(toastElement) {
    this.toastEl = toastElement || document.getElementById('toast');
    this.timer = null;
    this.hideTimer = null; // inner 300ms fade-out timer (must also be cleared, or a new toast gets hidden)
  }

  setElement(el) {
    this.toastEl = el;
  }

  show(message, durationMs = 3000) {
    if (!this.toastEl) {
      this.toastEl = document.getElementById('toast');
    }
    if (!this.toastEl) return;

    clearTimeout(this.timer);
    clearTimeout(this.hideTimer);

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    this.timer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.hideTimer = setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 300);
    }, durationMs);
  }
}

export const toast = new ToastManager();
