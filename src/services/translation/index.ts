import type { TranslationRequest, TranslationSettings } from './types';
import { DEFAULT_TRANSLATION_SETTINGS } from './types';

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

type JsonRecord = Record<string, unknown>;
const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' ? (value as JsonRecord) : {};

const readError = async (response: Response) => {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || body;
  } catch {
    return body;
  }
};

const requestJson = async (url: string, init?: RequestInit): Promise<JsonRecord> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`Translation request failed (${response.status}): ${detail || response.statusText}`);
  }
  return (await response.json()) as JsonRecord;
};

const assertRequest = (request: TranslationRequest) => {
  if (!request.text.trim()) throw new Error('There is no text to translate.');
  if (!request.sourceLanguage || !request.targetLanguage) {
    throw new Error('Choose both source and target languages.');
  }
  if (request.provider !== 'google' && !request.apiKey?.trim()) {
    throw new Error('An API key is required for this translation provider.');
  }
};

const translateWithGoogle = async (request: TranslationRequest) => {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: request.sourceLanguage,
    tl: request.targetLanguage,
    dt: 't',
    q: request.text,
  });
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
  );
  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`Google Translate request failed (${response.status}): ${detail}`);
  }
  const payload = (await response.json()) as unknown[];
  const chunks = Array.isArray(payload[0]) ? payload[0] : [];
  const translated = chunks
    .map(chunk => Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : '')
    .join('');
  if (!translated) throw new Error('Google Translate returned an empty result.');
  return translated;
};

const buildInstruction = (request: TranslationRequest) => {
  const customPrompt = request.prompt?.trim();
  return [
    `Translate the following text from ${request.sourceLanguage} to ${request.targetLanguage}.`,
    'Preserve the original meaning, paragraph breaks, dialogue, names, punctuation, and formatting.',
    'Return only the translated text. Do not add explanations or summaries.',
    customPrompt ? `Additional instructions: ${customPrompt}` : '',
    '',
    request.text,
  ].filter(Boolean).join('\n\n');
};

const translateWithGemini = async (request: TranslationRequest) => {
  const model = request.model?.trim() || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(request.apiKey || '')}`;
  const result = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildInstruction(request) }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const candidates = result.candidates;
  const first = Array.isArray(candidates) ? asRecord(candidates[0]) : {};
  const parts = asRecord(first.content).parts;
  const translated = Array.isArray(parts)
    ? parts.map(part => String(asRecord(part).text || '')).join('')
    : '';
  if (!translated.trim()) throw new Error('Gemini returned an empty result.');
  return translated.trim();
};

const translateWithOpenAICompatible = async (request: TranslationRequest) => {
  const baseUrl = (request.baseUrl || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/, '');
  const model = request.model?.trim() || DEFAULT_OPENAI_MODEL;
  const result = await requestJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [{ role: 'user', content: buildInstruction(request) }],
    }),
  });
  const choices = result.choices;
  const first = Array.isArray(choices) ? asRecord(choices[0]) : {};
  const content = asRecord(first.message).content;
  const translated = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map(part => String(asRecord(part).text || '')).join('')
      : '';
  if (!translated.trim()) throw new Error('The OpenAI-compatible endpoint returned an empty result.');
  return translated.trim();
};

/** Translate text with Google Translate, Gemini, or an OpenAI-compatible API. */
export const translateText = async (request: TranslationRequest): Promise<string> => {
  assertRequest(request);
  switch (request.provider) {
    case 'google':
      return translateWithGoogle(request);
    case 'gemini':
      return translateWithGemini(request);
    case 'openai-compatible':
      return translateWithOpenAICompatible(request);
    default: {
      const exhaustive: never = request.provider;
      throw new Error(`Unsupported translation provider: ${exhaustive}`);
    }
  }
};

/** Merge stored per-novel settings without losing defaults added in future versions. */
export const normalizeTranslationSettings = (
  settings?: Partial<TranslationSettings> | null,
): TranslationSettings => ({
  ...DEFAULT_TRANSLATION_SETTINGS,
  ...settings,
  enabled: settings?.enabled === true,
});

export { DEFAULT_TRANSLATION_SETTINGS } from './types';
export type { TranslationProvider, TranslationRequest, TranslationSettings } from './types';
