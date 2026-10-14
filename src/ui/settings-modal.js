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
    this.geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    this.openaiApiKeyInput = document.getElementById('openaiApiKeyInput');
    this.claudeApiKeyInput = document.getElementById('claudeApiKeyInput');
    this.openrouterApiKeyInput = document.getElementById('openrouterApiKeyInput');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.geminiKeyBadge = document.getElementById('geminiKeyBadge');
    this.openaiKeyBadge = document.getElementById('openaiKeyBadge');
    this.claudeKeyBadge = document.getElementById('claudeKeyBadge');
    this.openrouterKeyBadge = document.getElementById('openrouterKeyBadge');
    this.btnTestGemini = document.getElementById('btnTestGemini');
    this.btnTestOpenAI = document.getElementById('btnTestOpenAI');
    this.btnTestClaude = document.getElementById('btnTestClaude');
    this.btnTestOpenRouter = document.getElementById('btnTestOpenRouter');
    this.geminiTestResult = document.getElementById('geminiTestResult');
    this.openaiTestResult = document.getElementById('openaiTestResult');
    this.claudeTestResult = document.getElementById('claudeTestResult');
    this.openrouterTestResult = document.getElementById('openrouterTestResult');
    this.autoFailoverCheckbox = document.getElementById('autoFailoverCheckbox');
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

    // Connection test button listeners
    const testConfigs = [
      { btn: this.btnTestGemini, input: this.geminiApiKeyInput, result: this.geminiTestResult, provider: 'gemini', name: 'Google Gemini' },
      { btn: this.btnTestOpenAI, input: this.openaiApiKeyInput, result: this.openaiTestResult, provider: 'openai', name: 'OpenAI' },
      { btn: this.btnTestClaude, input: this.claudeApiKeyInput, result: this.claudeTestResult, provider: 'claude', name: 'Anthropic Claude' },
      { btn: this.btnTestOpenRouter, input: this.openrouterApiKeyInput, result: this.openrouterTestResult, provider: 'openrouter', name: 'OpenRouter' }
    ];

    testConfigs.forEach(({ btn, input, result, provider, name }) => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.runConnectionTest(provider, input, btn, result, name);
        });
      }
    });

    // Provider radio selection change
    this.providerRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.updateActiveFieldHighlight(radio.value);
          this.syncCompatibilityInput(radio.value);
        }
      });
    });

    // Input listeners to update badges in real-time
    const keyInputs = [
      { input: this.geminiApiKeyInput, provider: 'gemini', result: this.geminiTestResult },
      { input: this.openaiApiKeyInput, provider: 'openai', result: this.openaiTestResult },
      { input: this.claudeApiKeyInput, provider: 'claude', result: this.claudeTestResult },
      { input: this.openrouterApiKeyInput, provider: 'openrouter', result: this.openrouterTestResult }
    ];

    keyInputs.forEach(({ input, provider, result }) => {
      if (input) {
        input.addEventListener('input', () => {
          this.updateBadges();
          const selected = this.getSelectedProvider();
          if (selected === provider) {
            this.syncCompatibilityInput(provider);
          }
          if (result && result.classList.contains('error') && input.value.trim()) {
            result.classList.add('hidden');
            result.textContent = '';
          }
        });
      }
    });

    // Escape closes the modal
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
          this.close();
        }
      });
    }
  }

  getSelectedProvider() {
    let sel = 'gemini';
    this.providerRadios.forEach(r => {
      if (r.checked) sel = r.value;
    });
    return sel;
  }

  syncCompatibilityInput(selectedProvider) {
    if (!this.apiKeyInput) return;
    if (selectedProvider === 'gemini') {
      this.apiKeyInput.value = this.geminiApiKeyInput ? this.geminiApiKeyInput.value.trim() : '';
    } else if (selectedProvider === 'openai') {
      this.apiKeyInput.value = this.openaiApiKeyInput ? this.openaiApiKeyInput.value.trim() : '';
    } else if (selectedProvider === 'claude') {
      this.apiKeyInput.value = this.claudeApiKeyInput ? this.claudeApiKeyInput.value.trim() : '';
    } else if (selectedProvider === 'openrouter') {
      this.apiKeyInput.value = this.openrouterApiKeyInput ? this.openrouterApiKeyInput.value.trim() : '';
    }
  }

  updateBadges() {
    const geminiVal = this.geminiApiKeyInput ? this.geminiApiKeyInput.value.trim() : '';
    const openaiVal = this.openaiApiKeyInput ? this.openaiApiKeyInput.value.trim() : '';
    const claudeVal = this.claudeApiKeyInput ? this.claudeApiKeyInput.value.trim() : '';
    const openrouterVal = this.openrouterApiKeyInput ? this.openrouterApiKeyInput.value.trim() : '';

    if (this.geminiKeyBadge) {
      this.geminiKeyBadge.textContent = geminiVal ? '등록됨' : '미입력';
      this.geminiKeyBadge.className = `api-key-status-badge ${geminiVal ? 'has-key' : 'no-key'}`;
    }
    if (this.openaiKeyBadge) {
      this.openaiKeyBadge.textContent = openaiVal ? '등록됨' : '미입력';
      this.openaiKeyBadge.className = `api-key-status-badge ${openaiVal ? 'has-key' : 'no-key'}`;
    }
    if (this.claudeKeyBadge) {
      this.claudeKeyBadge.textContent = claudeVal ? '등록됨' : '미입력';
      this.claudeKeyBadge.className = `api-key-status-badge ${claudeVal ? 'has-key' : 'no-key'}`;
    }
    if (this.openrouterKeyBadge) {
      this.openrouterKeyBadge.textContent = openrouterVal ? '등록됨' : '미입력';
      this.openrouterKeyBadge.className = `api-key-status-badge ${openrouterVal ? 'has-key' : 'no-key'}`;
    }
  }

  updateActiveFieldHighlight(selectedProvider) {
    if (!this.modal || typeof this.modal.querySelectorAll !== 'function') return;
    const wraps = this.modal.querySelectorAll('.api-key-field-wrap');
    wraps.forEach(wrap => {
      const p = wrap.getAttribute('data-provider');
      wrap.classList.toggle('is-active-provider', p === selectedProvider);
    });
  }

  clearTestResults() {
    [this.geminiTestResult, this.openaiTestResult, this.claudeTestResult, this.openrouterTestResult].forEach(el => {
      if (el) {
        el.textContent = '';
        el.className = 'api-test-result hidden';
      }
    });
  }

  async runConnectionTest(provider, inputEl, btnEl, resultEl, name) {
    const key = inputEl ? inputEl.value.trim() : '';
    if (!key) {
      if (resultEl) {
        resultEl.textContent = '⚠️ API 키를 먼저 입력해주세요.';
        resultEl.className = 'api-test-result error';
        resultEl.classList.remove('hidden');
      }
      toast.show(`⚠️ ${name} API 키를 먼저 입력해주세요.`);
      if (inputEl && typeof inputEl.focus === 'function') inputEl.focus();
      return;
    }

    const originalText = btnEl ? btnEl.textContent : '연결 테스트';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '확인 중...';
    }
    if (resultEl) {
      resultEl.textContent = '🔄 연결 확인 중...';
      resultEl.className = 'api-test-result info';
      resultEl.classList.remove('hidden');
    }

    try {
      const outcome = await aiService.testConnection(provider, key);
      if (outcome.success) {
        if (resultEl) {
          resultEl.textContent = `✓ ${outcome.message}`;
          resultEl.className = 'api-test-result success';
          resultEl.classList.remove('hidden');
        }
        toast.show(`✅ ${name}: ${outcome.message}`);
      } else {
        if (resultEl) {
          resultEl.textContent = `✕ ${outcome.message}`;
          resultEl.className = 'api-test-result error';
          resultEl.classList.remove('hidden');
        }
        toast.show(`❌ ${name}: ${outcome.message}`);
      }
    } catch (err) {
      const msg = err.message || String(err);
      if (resultEl) {
        resultEl.textContent = `✕ 연결 오류: ${msg}`;
        resultEl.className = 'api-test-result error';
        resultEl.classList.remove('hidden');
      }
      toast.show(`❌ ${name} 연결 오류: ${msg}`);
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = originalText;
      }
    }
  }

  open() {
    this.populate();
    this.clearTestResults();
    if (this.modal) this.modal.classList.remove('hidden');
  }

  close() {
    if (this.modal) this.modal.classList.add('hidden');
  }

  populate() {
    const provider = aiService.provider || 'gemini';
    this.providerRadios.forEach(r => {
      r.checked = (r.value === provider);
    });

    if (this.geminiApiKeyInput) this.geminiApiKeyInput.value = aiService.geminiKey || '';
    if (this.openaiApiKeyInput) this.openaiApiKeyInput.value = aiService.openaiKey || '';
    if (this.claudeApiKeyInput) this.claudeApiKeyInput.value = aiService.claudeKey || '';
    if (this.openrouterApiKeyInput) this.openrouterApiKeyInput.value = aiService.openrouterKey || '';
    if (this.apiKeyInput) this.apiKeyInput.value = aiService.getKeyForProvider(provider) || '';
    if (this.customPromptInput) this.customPromptInput.value = aiService.customPrompt || '';
    if (this.autoFailoverCheckbox) this.autoFailoverCheckbox.checked = (aiService.autoFailover !== false);

    this.updateBadges();
    this.updateActiveFieldHighlight(provider);
  }

  save() {
    const selProvider = this.getSelectedProvider();
    const geminiKey = this.geminiApiKeyInput ? this.geminiApiKeyInput.value.trim() : '';
    const openaiKey = this.openaiApiKeyInput ? this.openaiApiKeyInput.value.trim() : '';
    const claudeKey = this.claudeApiKeyInput ? this.claudeApiKeyInput.value.trim() : '';
    const openrouterKey = this.openrouterApiKeyInput ? this.openrouterApiKeyInput.value.trim() : '';
    const prompt = this.customPromptInput ? this.customPromptInput.value.trim() : '';
    const autoFailover = this.autoFailoverCheckbox ? this.autoFailoverCheckbox.checked : true;

    let activeKey = geminiKey;
    if (selProvider === 'openai') activeKey = openaiKey;
    else if (selProvider === 'claude') activeKey = claudeKey;
    else if (selProvider === 'openrouter') activeKey = openrouterKey;

    this.syncCompatibilityInput(selProvider);

    aiService.saveSettings(selProvider, activeKey, prompt, {
      geminiKey,
      openaiKey,
      claudeKey,
      openrouterKey,
      autoFailover
    });

    this.updateEngineBadge();
    this.close();
    toast.show('✅ AI 설정 및 API 키가 저장되었습니다.');
  }

  updateEngineBadge() {
    if (!this.engineBadge) return;
    const provider = aiService.provider;
    const hasKey = aiService.hasKey();
    if (hasKey) {
      let icon = '✨';
      let label = 'Gemini AI';
      if (provider === 'openai') {
        icon = '🟢';
        label = 'OpenAI';
      } else if (provider === 'claude') {
        icon = '🟣';
        label = 'Claude';
      } else if (provider === 'openrouter') {
        icon = '🌐';
        label = 'OpenRouter';
      }
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
