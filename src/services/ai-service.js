/**
 * AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
 * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 2.5-pro, etc.)
 */

import { StorageService } from './storage-service.js';
import { CONSTANTS } from '../config/constants.js';
import { DICTIONARY, VERB_MAP, PRONOUNS, ADVERBS } from '../config/fels-dict.js';

const AI_REQUEST_TIMEOUT_MS = 30000;   // text requests
const AI_AUDIO_TIMEOUT_MS = 120000;    // inline-audio requests (STT / alignment)
const FREE_TRANSLATE_TIMEOUT_MS = 10000;
const FREE_TRANSLATE_MAX_CONCURRENCY = 4; // avoid bursting the unofficial endpoint (HTTP 429)

let freeTranslateActive = 0;
const freeTranslateQueue = [];

/**
 * fetch() with an AbortController timeout. Falls back to plain fetch when AbortController is unavailable
 * (e.g. the vm sandbox used by scratch tests).
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  if (typeof AbortController !== 'function' || typeof setTimeout !== 'function') {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`AI 요청 시간이 초과되었습니다 (${Math.round(timeoutMs / 1000)}초). 네트워크 상태를 확인하고 다시 시도하세요.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON.parse that tolerates ```json fences / leading prose around the JSON object. */
function parseJsonLoose(content) {
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(unfenced);
    } catch (e2) {
      const start = unfenced.indexOf('{');
      const end = unfenced.lastIndexOf('}');
      if (start !== -1 && end > start) return JSON.parse(unfenced.slice(start, end + 1));
      throw e;
    }
  }
}

/** Runs `task` when a free-translate slot is available (max FREE_TRANSLATE_MAX_CONCURRENCY in flight). */
function runWithFreeTranslateLimit(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      freeTranslateActive++;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          freeTranslateActive--;
          const next = freeTranslateQueue.shift();
          if (next) next();
        });
    };
    if (freeTranslateActive < FREE_TRANSLATE_MAX_CONCURRENCY) run();
    else freeTranslateQueue.push(run);
  });
}

export class AIService {
  constructor() {
    this.provider = StorageService.getProvider();
    this.geminiKey = StorageService.getGeminiKey();
    this.openaiKey = StorageService.getOpenAIKey();
    this.claudeKey = StorageService.getClaudeKey();
    this.openrouterKey = StorageService.getOpenRouterKey();
    this.apiKey = this.getKeyForProvider(this.provider);
    this.customPrompt = StorageService.getCustomPrompt();
    this.autoFailover = StorageService.getAutoFailover();
    this.activeGeminiModel = null;
    this.quotaExceededUntil = 0;
  }

  saveSettings(provider, apiKey, customPrompt, extraKeys = {}) {
    this.provider = provider;
    if (extraKeys.geminiKey !== undefined) this.geminiKey = extraKeys.geminiKey;
    if (extraKeys.openaiKey !== undefined) this.openaiKey = extraKeys.openaiKey;
    if (extraKeys.claudeKey !== undefined) this.claudeKey = extraKeys.claudeKey;
    if (extraKeys.openrouterKey !== undefined) this.openrouterKey = extraKeys.openrouterKey;
    if (extraKeys.autoFailover !== undefined) this.autoFailover = !!extraKeys.autoFailover;
    this.apiKey = this.getKeyForProvider(provider) || apiKey;
    this.customPrompt = customPrompt;
    this.activeGeminiModel = null; // Reset cached model on settings update
    this.quotaExceededUntil = 0;
    StorageService.saveApiSettings(provider, this.apiKey, customPrompt, {
      geminiKey: this.geminiKey,
      openaiKey: this.openaiKey,
      claudeKey: this.claudeKey,
      openrouterKey: this.openrouterKey,
      autoFailover: this.autoFailover
    });
  }

  getKeyForProvider(provider = this.provider) {
    if (provider === 'gemini') return this.geminiKey || (this.provider === 'gemini' ? this.apiKey : '');
    if (provider === 'openai') return this.openaiKey || (this.provider === 'openai' ? this.apiKey : '');
    if (provider === 'claude') return this.claudeKey || (this.provider === 'claude' ? this.apiKey : '');
    if (provider === 'openrouter') return this.openrouterKey || (this.provider === 'openrouter' ? this.apiKey : '');
    return this.apiKey || '';
  }

  hasKey(provider = this.provider) {
    const k = this.getKeyForProvider(provider);
    return !!(k && k.trim());
  }

  isQuotaExceededCoolingDown() {
    return this.provider === 'gemini' && Date.now() < (this.quotaExceededUntil || 0);
  }

  /**
   * Dynamically resolve the best available Gemini model for generateContent
   */
  async resolveGeminiModel() {
    if (this.activeGeminiModel) {
      return this.activeGeminiModel;
    }

    const priorityOrder = CONSTANTS.GEMINI_CANDIDATE_MODELS;

    try {
      // API key goes in the x-goog-api-key header (not the URL) so it never lands in logs / history
      const geminiKey = this.getKeyForProvider('gemini');
      const listUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
      const res = await fetchWithTimeout(listUrl, { headers: { 'x-goog-api-key': geminiKey } });
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))
          .filter(m => !m.includes('1.0'));

        for (const cand of priorityOrder) {
          if (available.includes(cand)) {
            this.activeGeminiModel = cand;
            return cand;
          }
        }

        const flashModel = available.find(m => m.includes('3.8-flash') || m.includes('3.5-flash') || (m.includes('flash') && !m.includes('1.5') && !m.includes('2.0')));
        if (flashModel) {
          this.activeGeminiModel = flashModel;
          return flashModel;
        }

        const proModel = available.find(m => m.includes('3.1-pro') || (m.includes('pro') && !m.includes('2.5-pro')));
        if (proModel) {
          this.activeGeminiModel = proModel;
          return proModel;
        }

        if (available.length > 0) {
          this.activeGeminiModel = available[0];
          return available[0];
        }
      }
    } catch (e) {
      console.warn('Gemini ListModels query failed, falling back to priority candidates:', e);
    }

    this.activeGeminiModel = CONSTANTS.GEMINI_CANDIDATE_MODELS[0] || 'gemini-3.8-flash';
    return this.activeGeminiModel;
  }

  /**
   * Resilient POST to Gemini API with automatic candidate model fallback on 404/retirement and 429/quota limits
   */
  async postToGemini(payload, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
    if (this.isQuotaExceededCoolingDown()) {
      const waitSec = Math.max(1, Math.ceil((this.quotaExceededUntil - Date.now()) / 1000));
      const quotaErr = new Error(`Gemini API 사용량 한도(Quota / 분당 요청수)가 초과되었습니다. (약 ${waitSec}초 후 재시도 가능)`);
      quotaErr.isQuotaExceeded = true;
      quotaErr.status = 429;
      throw quotaErr;
    }

    const preferred = await this.resolveGeminiModel();
    const candidateList = [
      preferred,
      ...CONSTANTS.GEMINI_CANDIDATE_MODELS
    ];
    const uniqueCandidates = [...new Set(candidateList)];

    let lastError = null;
    let anyQuotaExceeded = false;
    const geminiKey = this.getKeyForProvider('gemini');

    for (const model of uniqueCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify(payload)
        }, timeoutMs);

        if (response.ok) {
          this.activeGeminiModel = model; // Cache working model
          this.quotaExceededUntil = 0; // Successfully reset cooldown
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!content) throw new Error('Gemini 응답 내용이 비어 있습니다.');
          return parseJsonLoose(content);
        }

        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `Status ${response.status}`;
        lastError = new Error(errMsg);

        const isQuota = response.status === 429 ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('rate-limit') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('Rate limit') ||
          errMsg.includes('Too Many Requests');

        const isServerOverloaded = 
          response.status === 503 ||
          response.status === 500 ||
          errMsg.includes('high demand') ||
          errMsg.includes('experiencing high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('temporarily unavailable') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('Service Unavailable');

        const isUnavailableOrRetired = 
          response.status === 404 ||
          errMsg.includes('not found') ||
          errMsg.includes('not supported') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('not available') ||
          errMsg.includes('deprecated') ||
          errMsg.includes('retired');

        if (isQuota) {
          anyQuotaExceeded = true;
          console.warn(`Gemini model ${model} hit quota/rate limit (${errMsg}). Trying next candidate model...`);
          continue;
        }

        if (isServerOverloaded) {
          if (this.activeGeminiModel === model) {
            this.activeGeminiModel = null;
          }
          console.warn(`Gemini model ${model} experiencing high demand / overload (${errMsg}). Trying next candidate model...`);
          continue;
        }

        // If model is retired, not available to new users, or not found (404), seamlessly try next candidate model
        if (isUnavailableOrRetired) {
          if (this.activeGeminiModel === model) {
            this.activeGeminiModel = null;
          }
          console.warn(`Gemini model ${model} not available or retired (${errMsg}). Trying next model candidate...`);
          continue;
        } else {
          // For auth or invalid request errors, throw immediately
          throw lastError;
        }
      } catch (fetchErr) {
        const msg = fetchErr.message || '';
        const isQuota = fetchErr.status === 429 || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
        const isServerOverloaded = 
          fetchErr.status === 503 ||
          fetchErr.status === 500 ||
          msg.includes('high demand') ||
          msg.includes('experiencing high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('temporarily unavailable') ||
          msg.includes('overloaded') ||
          msg.includes('Service Unavailable');
        const isUnavailableOrRetired = 
          fetchErr.status === 404 ||
          msg.includes('not found') ||
          msg.includes('not supported') ||
          msg.includes('no longer available') ||
          msg.includes('not available') ||
          msg.includes('deprecated') ||
          msg.includes('retired');

        if (isQuota) anyQuotaExceeded = true;
        if (isServerOverloaded) {
          if (this.activeGeminiModel === model) {
            this.activeGeminiModel = null;
          }
          console.warn(`Gemini model ${model} fetch failed with high demand (${msg}). Trying next candidate...`);
          continue;
        }
        if (isUnavailableOrRetired) {
          if (this.activeGeminiModel === model) {
            this.activeGeminiModel = null;
          }
          console.warn(`Gemini model ${model} not available or retired (${msg}). Trying next candidate...`);
          continue;
        }
        if (!isQuota) {
          throw fetchErr;
        }
        lastError = fetchErr;
      }
    }

    if (anyQuotaExceeded) {
      // Cooldown for 60 seconds so parallel tasks do not freeze the UI hammering rate-limited endpoints
      this.quotaExceededUntil = Date.now() + 60000;
      const quotaErr = new Error('Gemini API 사용량 한도(Quota / 분당 요청수)가 초과되었습니다. 잠시 후(약 1분 뒤) 다시 시도해 주세요.');
      quotaErr.isQuotaExceeded = true;
      quotaErr.status = 429;
      quotaErr.originalError = lastError;
      throw quotaErr;
    }

    throw lastError || new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키 상태를 확인하세요.');
  }

  getCandidateProviders() {
    const all = ['gemini', 'openai', 'claude', 'openrouter'];
    const withKeys = all.filter(p => this.hasKey(p));
    if (!this.autoFailover) {
      return this.hasKey(this.provider) ? [this.provider] : (withKeys.length ? [withKeys[0]] : []);
    }
    const list = [this.provider, ...withKeys.filter(p => p !== this.provider)];
    return [...new Set(list)].filter(p => this.hasKey(p));
  }

  async callTextProvider(provider, text, systemPrompt) {
    if (provider === 'gemini') return this.callGemini(text, systemPrompt);
    if (provider === 'openai') return this.callOpenAI(text, systemPrompt);
    if (provider === 'claude') return this.callClaude(text, systemPrompt);
    if (provider === 'openrouter') return this.callOpenRouter(text, systemPrompt);
    return this.callGemini(text, systemPrompt);
  }

  async translate(text) {
    const candidates = this.getCandidateProviders();
    if (!candidates.length) {
      throw new Error('AI API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘에서 API 키를 입력하세요.');
    }

    const systemPrompt = `You are an expert English-Korean linguist specialized in syntax chunking and natural translation.
Translate the user's English sentence into Korean in TWO distinct formats:
1. "natural": A fluent, idiomatic Korean sentence adhering strictly to Korean SOV word order and proper grammar/particles (우리말 해석).
2. "chunk_text": Meaning-based sequential chunks (직독직해) following the English thought sequence, separated strictly by " || ". (Example: "I went to school." -> "나는 || 갔다 || 학교에").
3. "chunks": An array of objects for each chunk: [{ "en": "English chunk", "ko": "Korean chunk" }]

Respond ONLY with valid, raw JSON in this structure (no markdown fences, no extra text):
{
  "natural": "...",
  "chunk_text": "...",
  "chunks": [
    { "en": "...", "ko": "..." }
  ]
}
${this.customPrompt ? `Additional User Instructions: ${this.customPrompt}` : ''}`;

    let lastError = null;
    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i];
      if (p === 'gemini' && this.isQuotaExceededCoolingDown()) {
        continue;
      }
      try {
        const result = await this.callTextProvider(p, text, systemPrompt);
        if (p !== this.provider && this.autoFailover) {
          console.warn(`[Auto-Failover] 주 AI(${this.provider}) 장애로 ${p} 모델로 자동 우회 처리 완료`);
        }
        return result;
      } catch (err) {
        console.warn(`[AIService] ${p} 요청 실패:`, err.message || err);
        lastError = err;
        if (!this.autoFailover) break;
      }
    }

    throw lastError || new Error('사용 가능한 AI 모델이 없습니다. API 키 상태를 확인하세요.');
  }

  /**
   * Fast, reliable natural Korean translation with AI fallback to free Google Translate endpoint
   */
  async translateNatural(text) {
    if (!text || !text.trim()) return '';
    // If user has AI key configured, attempt full AI translate only if not in quota cooldown
    if (this.hasKey() && !this.isQuotaExceededCoolingDown()) {
      try {
        const res = await this.translate(text);
        if (res && res.natural) return res.natural;
      } catch (e) {
        console.warn('AI translation failed, trying free translate:', e.message || e);
      }
    }

    // Free high-quality Google Translate endpoint (concurrency-limited, 10s timeout)
    try {
      const translated = await this.fetchFreeTranslation(text.trim());
      if (translated) return translated;
    } catch (e) {
      console.warn('Public translation endpoint error:', e.message || e);
    }

    return null;
  }

  /**
   * Unofficial translate.googleapis.com call shared by translateNatural() and generateDirectChunks().
   * @returns {Promise<string>} '' when the endpoint returns nothing usable
   */
  fetchFreeTranslation(text) {
    return runWithFreeTranslateLimit(async () => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetchWithTimeout(url, {}, FREE_TRANSLATE_TIMEOUT_MS);
      if (!res.ok) return '';
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map(item => item[0]).join('').trim();
      }
      return '';
    });
  }

  /**
   * Generate natural chunk-by-chunk sequential Korean interpretation (직독직해)
   * based on the fluent natural Korean translation.
   */
  async generateDirectChunks(chunks, naturalText, englishSentence) {
    if (!chunks || !chunks.length) return [];
    if (!naturalText || !naturalText.trim()) {
      return chunks.map(c => (typeof c === 'string' ? c : c.ko || c.en || ''));
    }

    const cleanChunks = chunks.map(c => (typeof c === 'string' ? c : c.en || '').trim());
    if (cleanChunks.length === 1) {
      return [naturalText.trim()];
    }

    // 1. If AI API key is configured (Gemini / OpenAI), use prompt to partition natural Korean
    if (this.hasKey() && !this.isQuotaExceededCoolingDown()) {
      try {
        const prompt = `You are an expert English-Korean linguist specialized in sequential interpretation (직독직해).
We have an English sentence: "${englishSentence || cleanChunks.join(' ')}"
And its natural Korean translation (우리말 자연스러운 해석): "${naturalText}"

The English sentence is divided into ${cleanChunks.length} sequential chunks (청크 구분 || 영어 문장):
${cleanChunks.map((c, i) => `[Chunk ${i + 1}] "${c}"`).join('\n')}

Task: Create the 직독직해 (chunk-by-chunk sequential interpretation) corresponding 1-to-1 with each English chunk above, based strictly on the natural Korean translation.

CRITICAL RULES:
1. Each Korean chunk MUST convey the specific meaning of that English chunk, NOT a naive left-to-right word split.
   - Example: English chunks: [Chunk 1] "Hello, visitors" || [Chunk 2] "to Cryston Beach."
     Natural Korean: "안녕하세요, 크리스톤 비치를 방문하시는 방문객 여러분."
     * Chunk 1 ("Hello, visitors") MUST be: "안녕하세요, 방문객 여러분" (or "방문객 여러분 안녕하세요")
     * Chunk 2 ("to Cryston Beach.") MUST be: "크리스톤 비치를 방문하시는" (or "크리스톤 비치로 오신")
     * NEVER put "크리스톤" into Chunk 1!
2. Draw words, vocabulary, and style directly from the natural Korean translation ("우리말 자연스러운 해석").
3. Pure Korean only. Never include English words or attach Korean particles to English.
4. Return exactly ${cleanChunks.length} strings in the "chunks" array:
{
  "chunks": [ "한국어 직독직해 1", "한국어 직독직해 2", ... ]
}`;
        const candidates = this.getCandidateProviders();
        for (const p of candidates) {
          if (p === 'gemini' && this.isQuotaExceededCoolingDown()) continue;
          try {
            const res = await this.callTextProvider(p, englishSentence || cleanChunks.join(' '), prompt);
            if (res && Array.isArray(res.chunks) && res.chunks.length === cleanChunks.length) {
              return res.chunks.map(s => String(s).trim());
            }
          } catch (aiErr) {
            console.warn(`AI direct chunk generation fallback on ${p}:`, aiErr.message || aiErr);
            if (!this.autoFailover) break;
          }
        }
      } catch (outerErr) {
        console.warn('AI direct chunk generation outer error:', outerErr);
      }
    }

    // 2. High-speed, high-quality parallel chunk translation with natural alignment
    try {
      const translatedChunks = await Promise.all(
        cleanChunks.map(async (cText) => {
          if (!cText) return '';
          const cleanText = cText.replace(/^[,.!?–—;:]+|[,.!?–—;:]+$/g, '').trim();
          if (!cleanText) return '';
          return this.fetchFreeTranslation(cleanText);
        })
      );

      const allValid = translatedChunks.every(t => t && t.length > 0 && !/[a-zA-Z]{3,}/.test(t));
      if (allValid && translatedChunks.length === cleanChunks.length) {
        const aligned = this.alignChunksWithNatural(cleanChunks, naturalText, translatedChunks);
        if (aligned && aligned.length === cleanChunks.length && aligned.every(Boolean)) {
          return aligned;
        }
        return translatedChunks.map(t => t.replace(/^[,\s]+|[,\s]+$/g, ''));
      }
    } catch (fetchErr) {
      console.warn('Public chunk translation error:', fetchErr);
    }

    // 3. Smart offline semantic slice of naturalText
    return this.sliceNaturalTextIntoChunks(cleanChunks, naturalText);
  }

  sliceNaturalTextIntoChunks(chunks, naturalText) {
    if (!chunks || !chunks.length) return [];
    if (chunks.length === 1) return [naturalText.trim()];
    return this.alignChunksWithNatural(chunks, naturalText, []);
  }

  alignChunksWithNatural(chunks, naturalText, translatedChunks = []) {
    if (!chunks || !chunks.length) return [];
    if (chunks.length === 1) return [naturalText.trim()];

    const natWords = naturalText.trim().split(/\s+/).filter(Boolean);
    if (!natWords.length) {
      return translatedChunks.length === chunks.length ? translatedChunks : chunks.map(c => typeof c === 'string' ? c : c.ko || '');
    }

    const cleanStr = (s) => (typeof s === 'string' ? s : '').replace(/[.,!?;:"'~()\[\]{}–—]/g, '').trim().toLowerCase();

    const matchScore = (enText, koWord, transText = '') => {
      const cleanKo = cleanStr(koWord);
      if (!cleanKo) return 0;

      // 1. Direct match with translated text if provided
      if (transText) {
        const cleanTrans = cleanStr(transText);
        const transTokens = cleanTrans.split(/\s+/);
        if (transTokens.some(tw => tw === cleanKo)) return 15;
        if (cleanTrans.includes(cleanKo)) return 10;
        for (let len = Math.min(cleanKo.length, 4); len >= 2; len--) {
          for (let i = 0; i <= cleanKo.length - len; i++) {
            const sub = cleanKo.substring(i, i + len);
            if (cleanTrans.includes(sub)) return 5 + len;
          }
        }
      }

      // 2. Transliteration / Dictionary / English tokens
      const enTokens = cleanStr(enText).split(/\s+/).filter(Boolean);
      for (const token of enTokens) {
        if (DICTIONARY && DICTIONARY[token]) {
          const koVal = cleanStr(DICTIONARY[token]);
          if (cleanKo.includes(koVal) || koVal.includes(cleanKo)) return 12;
        }
        if (VERB_MAP && VERB_MAP[token]) {
          const vKo = cleanStr(VERB_MAP[token]);
          if (cleanKo.includes(vKo) || vKo.includes(cleanKo)) return 11;
        }
        if (PRONOUNS && PRONOUNS[token]) {
          const pObj = PRONOUNS[token];
          const pList = typeof pObj === 'string' ? [pObj] : Object.values(pObj);
          for (const pVal of pList) {
            const pKo = cleanStr(pVal);
            if (pKo && (cleanKo.includes(pKo) || pKo.includes(cleanKo))) return 11;
          }
        }
        if (ADVERBS && ADVERBS[token]) {
          const aKo = cleanStr(ADVERBS[token]);
          if (aKo && (cleanKo.includes(aKo) || aKo.includes(cleanKo))) return 11;
        }
        if (cleanKo.includes(token)) return 8;
      }

      return 0;
    };

    // Calculate score of each natural word against each chunk
    const wordScores = natWords.map((word, wIdx) => {
      const scores = chunks.map((c, cIdx) => {
        const enText = typeof c === 'string' ? c : c.en || '';
        const transText = translatedChunks[cIdx] || (typeof c === 'object' ? c.ko : '') || '';
        return matchScore(enText, word, transText);
      });
      return { word, wIdx, scores };
    });

    const assignments = new Array(natWords.length).fill(-1);
    wordScores.forEach((ws, idx) => {
      let maxScore = 0;
      let bestChunk = -1;
      ws.scores.forEach((sc, cIdx) => {
        if (sc > maxScore) {
          maxScore = sc;
          bestChunk = cIdx;
        }
      });
      if (maxScore > 0) {
        assignments[idx] = bestChunk;
      }
    });

    // Grammar refinement: If a word is an adnominal modifier (-는/-하시는/-은/-던)
    // and preceding word is an object/adverbial (ends with 을/를/에/로/서/과/와), group together
    for (let i = 1; i < natWords.length; i++) {
      const prev = natWords[i - 1];
      const curr = natWords[i];
      const prevHasParticle = /[을를에로과와서]$/.test(cleanStr(prev));
      const currIsModifier = /(는|은|던|인|한|시는|하시는|하는)$/.test(cleanStr(curr));
      if (prevHasParticle && currIsModifier && assignments[i - 1] !== -1) {
        assignments[i] = assignments[i - 1];
      }
    }

    // Fill unassigned words (-1)
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i] === -1) {
        let prevAssigned = -1;
        for (let p = i - 1; p >= 0; p--) {
          if (assignments[p] !== -1) {
            prevAssigned = assignments[p];
            break;
          }
        }
        let nextAssigned = -1;
        for (let n = i + 1; n < assignments.length; n++) {
          if (assignments[n] !== -1) {
            nextAssigned = assignments[n];
            break;
          }
        }

        if (prevAssigned !== -1) {
          assignments[i] = prevAssigned;
        } else if (nextAssigned !== -1) {
          assignments[i] = nextAssigned;
        } else {
          assignments[i] = 0;
        }
      }
    }

    const chunkWords = chunks.map(() => []);
    assignments.forEach((cIdx, wIdx) => {
      chunkWords[cIdx].push(natWords[wIdx]);
    });

    return chunkWords.map((words, cIdx) => {
      if (words.length > 0) {
        return words.join(' ').trim();
      }
      if (translatedChunks[cIdx]) {
        return translatedChunks[cIdx];
      }
      const c = chunks[cIdx];
      return typeof c === 'string' ? c : c.ko || c.en || '';
    });
  }

  /**
   * AI-powered Audio & Script Forced Alignment using Gemini Multimodal Audio
   */
  async alignAudioWithScript(base64Audio, mimeType, sentences) {
    const geminiKey = this.getKeyForProvider('gemini');
    if (!geminiKey || !base64Audio || this.isQuotaExceededCoolingDown()) {
      return null;
    }

    const prompt = `You are a precision audio-script alignment engine for Korean-English listening comprehension tests (CSAT 수능 / EBS / school exam audio).

CRITICAL DOMAIN BACKGROUND & RULES:
1. The audio begins with a spoken Korean question announcement / direction (우리말 안내 방송 / 문제 설명, e.g. "1번 문제입니다. 대화를 듣고, 남자가 할 일로 가장 적절한 것을 고르시오.") followed by a chime sound ("딩동댕" 안내 종소리).
2. ALL KOREAN SPEECH, KOREAN ANNOUNCEMENTS, AND INTRO CHIMES MUST BE COMPLETELY IGNORED AND OMITTED.
3. The English dialogue begins strictly AFTER the Korean announcement and chime sound finish.
4. DO NOT align any English sentence to the Korean speech. [S1] MUST NOT start at or during the Korean voice.
5. The 'start' timestamp of [S1] MUST be the exact second when the speaker speaks the first ENGLISH word of [S1] (e.g. "Hello", "Good morning", "Excuse me").
6. Any Korean question outro (우리말 마무리 질문) at the end of the audio must also be completely excluded.

We have the following exact English sentences in order:
${sentences.map((s, idx) => `[S${idx + 1}] "${s}"`).join('\n')}

For each sentence, determine the precise start and end timestamps (in seconds, rounded to 1 decimal place) when the speaker speaks this English sentence in the audio.

CRITICAL FOR TIMESTAMPS:
- 'start': The exact moment the speaker begins the first English word of this sentence (MUST NOT include any preceding Korean speech or chimes).
- 'end': Include the complete release of the final English word plus 0.6s trailing padding (or up until right before the next English sentence starts).

Respond ONLY with valid JSON:
{
  "alignments": [
    { "sentence_index": 0, "start": 6.8, "end": 10.2 }
  ]
}`;

    try {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/mp3',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      const result = await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
      if (result && Array.isArray(result.alignments)) {
        // Raw timestamps only — end padding is applied ONCE in audio/boundary-utils.js
        // (previously padded here AND again in InputView, i.e. +1.5s on every sentence end)
        return result.alignments.map((a, i) => ({
          sentence_index: a.sentence_index ?? i,
          start: Number(a.start) || 0,
          end: Number(a.end) || 0
        }));
      }
    } catch (err) {
      console.warn('Gemini audio-script alignment failed:', err);
    }
    return null;
  }

  /**
   * Transcribe Audio and generate 3x1 translation simultaneously using Gemini Multimodal Audio
   */
  async transcribeAndTranslateAudio(base64Audio, mimeType) {
    const geminiKey = this.getKeyForProvider('gemini');
    if (!this.hasKey()) {
      throw new Error('음성 인식을 위해 AI API 키가 필요합니다. 설정에서 Gemini 또는 OpenAI, Claude API 키를 입력하세요.');
    }

    const prompt = `Listen to this English audio carefully.
This audio is from an English listening test (such as CSAT 수능 / EBS / school exam) which often contains spoken Korean question directions/announcements at the beginning (e.g. "1번 문제입니다. 대화를 듣고...") and/or Korean outro questions at the end.

CRITICAL INSTRUCTIONS:
1. OMIT ALL KOREAN SPOKEN ANNOUNCEMENTS, DIRECTIONS, QUESTION NUMBERS, AND CHIMES.
2. Transcribe ONLY the authentic English dialogue / passage spoken in the audio into the "script" field.
3. Translate into natural Korean (SOV order) in "natural".
4. Provide chunk-based sequential interpretation with " || " in "chunk_text".
5. Provide chunk breakdown array in "chunks": [{ "en": "...", "ko": "..." }]
6. If there are multiple sentences, also provide a "sentences" array where each element contains:
   { "text": "English sentence", "natural": "Korean natural translation", "chunks": [{ "en": "...", "ko": "..." }] }

Respond ONLY with valid JSON:
{
  "script": "transcribed English text",
  "natural": "...",
  "chunk_text": "...",
  "chunks": [{ "en": "...", "ko": "..." }],
  "sentences": [
    {
      "text": "...",
      "natural": "...",
      "chunks": [{ "en": "...", "ko": "..." }]
    }
  ]
}`;

    if (this.provider === 'gemini' || geminiKey) {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/mp3',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      return await this.postToGemini(payload, AI_AUDIO_TIMEOUT_MS);
    } else {
      throw new Error('오디오 STT 및 타임스탬프 분석은 Google Gemini API 키가 필요합니다. 설정창에서 Gemini API 키를 입력해 주세요.');
    }
  }

  async callGemini(text, systemPrompt) {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nEnglish Sentence: "${text}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    return await this.postToGemini(payload);
  }

  async callOpenAI(text, systemPrompt) {
    const openaiKey = this.getKeyForProvider('openai') || this.apiKey;
    if (!openaiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `English Sentence: "${text}"` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API 요청 실패 (Status ${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI 응답 내용이 비어 있습니다.');

    return parseJsonLoose(content);
  }

  async callClaude(text, systemPrompt) {
    const claudeKey = this.getKeyForProvider('claude') || this.apiKey;
    if (!claudeKey) throw new Error('Claude API 키가 설정되지 않았습니다.');

    const candidateModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              { role: 'user', content: `English Sentence: "${text}"` }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0]?.text;
          if (!content) throw new Error('Claude 응답 내용이 비어 있습니다.');
          return parseJsonLoose(content);
        }

        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `Status ${response.status}`;
        lastError = new Error(errMsg);

        if (response.status === 404 || errMsg.includes('not_found') || errMsg.includes('model')) {
          continue;
        }
        throw lastError;
      } catch (fetchErr) {
        if (fetchErr.message && (fetchErr.message.includes('not_found') || fetchErr.message.includes('model'))) {
          lastError = fetchErr;
          continue;
        }
        throw fetchErr;
      }
    }
    throw lastError || new Error('Claude API 요청에 실패했습니다.');
  }

  async callOpenRouter(text, systemPrompt) {
    const openrouterKey = this.getKeyForProvider('openrouter') || this.apiKey;
    if (!openrouterKey) throw new Error('OpenRouter API 키가 설정되지 않았습니다.');

    const candidateModels = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-001',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.3-70b-instruct'
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://github.com/xoruddkqk4-glitch/ce_tool_new'),
            'X-Title': 'CE Tool'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `English Sentence: "${text}"` }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (!content) throw new Error('OpenRouter 응답 내용이 비어 있습니다.');
          return parseJsonLoose(content);
        }

        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `Status ${response.status}`;
        lastError = new Error(errMsg);

        if (response.status === 404 || errMsg.includes('not_found') || errMsg.includes('model')) {
          continue;
        }
        throw lastError;
      } catch (fetchErr) {
        if (fetchErr.message && (fetchErr.message.includes('not_found') || fetchErr.message.includes('model'))) {
          lastError = fetchErr;
          continue;
        }
        throw fetchErr;
      }
    }
    throw lastError || new Error('OpenRouter API 요청에 실패했습니다.');
  }

  /**
   * Test connection to a specific AI provider with the given API key.
   * Returns { success: boolean, message: string }
   */
  async testConnection(provider, apiKey) {
    const key = (apiKey || this.getKeyForProvider(provider) || '').trim();
    if (!key) {
      return { success: false, message: 'API 키가 입력되지 않았습니다.' };
    }

    try {
      if (provider === 'gemini') {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models';
        const res = await fetchWithTimeout(url, {
          method: 'GET',
          headers: { 'x-goog-api-key': key }
        }, 12000);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const count = Array.isArray(data.models) ? data.models.length : 0;
          return { success: true, message: `연결 성공 (사용 가능 모델: ${count}개)` };
        }
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `연결 실패: ${msg}` };
      }

      if (provider === 'openai') {
        const url = 'https://api.openai.com/v1/models';
        const res = await fetchWithTimeout(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${key}` }
        }, 12000);
        if (res.ok) {
          return { success: true, message: '연결 성공 (OpenAI API 정상 인증)' };
        }
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `연결 실패: ${msg}` };
      }

      if (provider === 'claude') {
        try {
          const res = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            }
          }, 10000);
          if (res.ok) {
            return { success: true, message: '연결 성공 (Anthropic Claude 정상 인증)' };
          }
          if (res.status === 401 || res.status === 403) {
            const err = await res.json().catch(() => ({}));
            const msg = err.error?.message || `인증 실패 (HTTP ${res.status})`;
            return { success: false, message: `연결 실패: ${msg}` };
          }
        } catch (mErr) {
          // Fallback to minimal messages ping
        }

        const msgRes = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }]
          })
        }, 15000);

        if (msgRes.ok) {
          return { success: true, message: '연결 성공 (Anthropic Claude 정상 인증)' };
        }
        const err = await msgRes.json().catch(() => ({}));
        const msg = err.error?.message || `HTTP ${msgRes.status}`;
        return { success: false, message: `연결 실패: ${msg}` };
      }

      if (provider === 'openrouter') {
        const origin = (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://github.com/xoruddkqk4-glitch/ce_tool_new');
        const res = await fetchWithTimeout('https://openrouter.ai/api/v1/auth/key', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': origin,
            'X-Title': 'CE Tool'
          }
        }, 12000);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const label = data.data?.label ? ` (${data.data.label})` : '';
          return { success: true, message: `연결 성공 (OpenRouter 정상 인증${label})` };
        }

        if (res.status === 404) {
          const mRes = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${key}` }
          }, 12000);
          if (mRes.ok) {
            return { success: true, message: '연결 성공 (OpenRouter 정상 인증)' };
          }
        }

        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `연결 실패: ${msg}` };
      }

      return { success: false, message: `지원되지 않는 제공자: ${provider}` };
    } catch (e) {
      return { success: false, message: `연결 오류: ${e.message || e}` };
    }
  }
}

export const aiService = new AIService();
