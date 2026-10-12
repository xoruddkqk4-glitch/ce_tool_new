/**
 * AI Settings Modal Controller
 */

import { aiService } from '../services/ai-service.js';
import { toast } from './toast-manager.js';

export class SettingsModal {
  constructor() {
    this.modal = document.getElementById('settingsModal');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnSaveSettings = document.getElementById('btnSaveSettings');
    this.providerRadios = document.querySelectorAll('input[name="aiProvider"]');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.customPromptInput = document.getElementById('customPrompt');
    this.engineBadge = document.getElementById('engineBadge');

    this.initEvents();
    this.populate();
    this.updateEngineBadge();
  }

  initEvents() {
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.open());
    }
    if (this.engineBadge) {
      this.engineBadge.addEventListener('click', () => this.open());
    }
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => this.save());
    }
    // Escape closes the modal
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
          this.close();
        }
      });
    }
  }

  open() {
    this.populate();
    if (this.modal) this.modal.classList.remove('hidden');
  }

  close() {
    if (this.modal) this.modal.classList.add('hidden');
  }

  populate() {
    const provider = aiService.provider;
    this.providerRadios.forEach(r => {
      r.checked = (r.value === provider);
    });
    if (this.apiKeyInput) this.apiKeyInput.value = aiService.apiKey || '';
    if (this.customPromptInput) this.customPromptInput.value = aiService.customPrompt || '';
  }

  save() {
    let selProvider = 'gemini';
    this.providerRadios.forEach(r => {
      if (r.checked) selProvider = r.value;
    });
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
    const prompt = this.customPromptInput ? this.customPromptInput.value.trim() : '';

    aiService.saveSettings(selProvider, key, prompt);
    this.updateEngineBadge();
    this.close();
    toast.show('✅ AI 설정이 저장되었습니다.');
  }

  updateEngineBadge() {
    if (!this.engineBadge) return;
    const provider = aiService.provider;
    const hasKey = aiService.hasKey();
    if (hasKey) {
      // callOpenAI() uses gpt-4o-mini, so the badge must not claim GPT-4o
      const icon = provider === 'gemini' ? '✨' : '🟢';
      const label = provider === 'gemini' ? 'Gemini AI' : 'OpenAI';
      this.engineBadge.innerHTML = `<span class="badge-icon">${icon}</span><span class="badge-label">${label}</span>`;
      this.engineBadge.className = 'engine-badge ai-active';
      this.engineBadge.title = `AI 엔진 활성: ${label} (클릭하여 설정)`;
    } else {
      this.engineBadge.innerHTML = `<span class="badge-icon">⚙️</span><span class="badge-label">규칙 엔진</span>`;
      this.engineBadge.className = 'engine-badge rule-active';
      this.engineBadge.title = '로컬 규칙 엔진 활성 (클릭하여 AI API 설정)';
    }
  }
}
