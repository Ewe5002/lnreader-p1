export type TranslationProvider = 'google' | 'gemini' | 'openai-compatible';

export type TranslationSettings = {
  enabled: boolean;
  provider: TranslationProvider;
  sourceLanguage: string;
  targetLanguage: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  prompt?: string;
};

export type TranslationRequest = Pick<
  TranslationSettings,
  'provider' | 'sourceLanguage' | 'targetLanguage' | 'apiKey' | 'baseUrl' | 'model' | 'prompt'
> & { text: string };

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  enabled: false,
  provider: 'google',
  sourceLanguage: 'auto',
  targetLanguage: 'pt',
};
