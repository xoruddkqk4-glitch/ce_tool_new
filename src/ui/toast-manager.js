/**
 * Floating Toast Notification Manager
 */

export class ToastManager {
  constructor(toastElement) {
    this.toastEl = toastElement || document.getElementById('toast');
    this.timer = null;
  }

  setElement(el) {
    this.toastEl = el;
  }

  show(message, durationMs = 3000) {
    if (!this.toastEl) {
      this.toastEl = document.getElementById('toast');
    }
    if (!this.toastEl) return;

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.toastEl.classList.remove('show');
      setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 300);
    }, durationMs);
  }
}

export const toast = new ToastManager();
