/**
 * AI Engine Service (Gemini & OpenAI API Provider + Audio Multimodal)
 * Resilient multi-model auto-fallback for Gemini (2.5-flash, 2.0-flash, 1.5-flash-latest, etc.)
 */

import { StorageService } from './storage-service.js';
import { CONSTANTS } from '../config/constants.js';

export class AIService {
  constructor() {
    this.provider = StorageService.getProvider();
    this.apiKey = StorageService.getApiKey();
    this.customPrompt = StorageService.getCustomPrompt();
    this.activeGeminiModel = null;
  }

  saveSettings(provider, apiKey, customPrompt) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.customPrompt = customPrompt;
    this.activeGeminiModel = null; // Reset cached model on settings update
    StorageService.saveApiSettings(provider, apiKey, customPrompt);
  }

  hasKey() {
    return !!(this.apiKey && this.apiKey.trim());
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
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        for (const cand of priorityOrder) {
          if (available.includes(cand)) {
            this.activeGeminiModel = cand;
            return cand;
          }
        }

        const flashModel = available.find(m => m.includes('flash'));
        if (flashModel) {
          this.activeGeminiModel = flashModel;
          return flashModel;
        }

        if (available.length > 0) {
          this.activeGeminiModel = available[0];
          return available[0];
        }
      }
    } catch (e) {
      console.warn('Gemini ListModels query failed, falling back to priority candidates:', e);
    }

    this.activeGeminiModel = 'gemini-2.5-flash';
    return this.activeGeminiModel;
  }

  /**
   * Resilient POST to Gemini API with automatic candidate model fallback on 404/retirement
   */
  async postToGemini(payload) {
    const preferred = await this.resolveGeminiModel();
    const candidateList = [
      preferred,
      ...CONSTANTS.GEMINI_CANDIDATE_MODELS
    ];
    const uniqueCandidates = [...new Set(candidateList)];

    let lastError = null;

    for (const model of uniqueCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          this.activeGeminiModel = model; // Cache working model
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!content) throw new Error('Gemini 응답 내용이 비어 있습니다.');
          return JSON.parse(content);
        }

        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `Status ${response.status}`;
        lastError = new Error(errMsg);

        // If model is retired or not found (404), seamlessly try next candidate model
        if (response.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
          console.warn(`Gemini model ${model} not available (${errMsg}). Trying next model candidate...`);
          continue;
        } else {
          // For quota, auth, or bad request errors, throw immediately
          throw lastError;
        }
      } catch (fetchErr) {
        if (fetchErr.message && !fetchErr.message.includes('not found') && !fetchErr.message.includes('not supported') && !fetchErr.message.includes('404')) {
          throw fetchErr;
        }
        lastError = fetchErr;
      }
    }

    throw lastError || new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키 상태를 확인하세요.');
  }

  async translate(text) {
    if (!this.hasKey()) {
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

    if (this.provider === 'gemini') {
      return this.callGemini(text, systemPrompt);
    } else {
      return this.callOpenAI(text, systemPrompt);
    }
  }

  /**
   * Fast, reliable natural Korean translation with AI fallback to free Google Translate endpoint
   */
  async translateNatural(text) {
    if (!text || !text.trim()) return '';
    // If user has AI key configured, attempt full AI translate
    if (this.hasKey()) {
      try {
        const res = await this.translate(text);
        if (res && res.natural) return res.natural;
      } catch (e) {
        console.warn('AI translation failed, trying free translate:', e);
      }
    }

    // Free high-quality Google Translate endpoint
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          return data[0].map(item => item[0]).join('').trim();
        }
      }
    } catch (e) {
      console.warn('Public translation endpoint error:', e);
    }

    return null;
  }

  /**
   * AI-powered Audio & Script Forced Alignment using Gemini Multimodal Audio
   */
  async alignAudioWithScript(base64Audio, mimeType, sentences) {
    if (!this.hasKey() || this.provider !== 'gemini' || !base64Audio) {
      return null;
    }

    const prompt = `Listen to this English audio carefully.
We have the following exact English sentences in order:
${sentences.map((s, idx) => `[S${idx + 1}] "${s}"`).join('\n')}

For each sentence, determine the precise start and end timestamps (in seconds, rounded to 1 decimal place) when the speaker speaks this sentence in the audio.
Ignore introductory chimes, directions, or non-English announcements at the beginning.

Respond ONLY with valid JSON:
{
  "alignments": [
    { "sentence_index": 0, "start": 3.2, "end": 7.5 }
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

      const result = await this.postToGemini(payload);
      if (result && Array.isArray(result.alignments)) {
        return result.alignments;
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
    if (!this.hasKey()) {
      throw new Error('음성 인식을 위해 AI API 키가 필요합니다. 설정에서 Gemini 또는 OpenAI API 키를 입력하세요.');
    }

    const prompt = `Listen to this English audio carefully.
1. Transcribe the spoken English accurately into the "script" field.
2. Translate into natural Korean (SOV order) in "natural".
3. Provide chunk-based sequential interpretation with " || " in "chunk_text".
4. Provide chunk breakdown array in "chunks": [{ "en": "...", "ko": "..." }]
5. If there are multiple sentences, also provide a "sentences" array where each element contains:
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

    if (this.provider === 'gemini') {
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

      return await this.postToGemini(payload);
    } else {
      throw new Error('OpenAI 모드에서는 Gemini API 키를 권장합니다. (Gemini는 오디오 멀티모달 네이티브 지원)');
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
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

    return JSON.parse(content);
  }
}

export const aiService = new AIService();
