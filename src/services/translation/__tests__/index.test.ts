import { normalizeTranslationSettings, translateText } from '..';

describe('translation service', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('merges partial novel settings with defaults', () => {
    expect(normalizeTranslationSettings({ targetLanguage: 'es' })).toEqual({
      enabled: false,
      provider: 'google',
      sourceLanguage: 'auto',
      targetLanguage: 'es',
    });
  });

  it('translates with Google and joins response segments', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [[['Olá ', 'Hello'], ['mundo', 'world']]],
    });
    await expect(translateText({
      provider: 'google',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      text: 'Hello world',
    })).resolves.toBe('Olá mundo');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('translate.googleapis.com'));
  });

  it('sends Gemini requests with the configured model and API key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Olá' }] } }] }),
    });
    await expect(translateText({
      provider: 'gemini',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      apiKey: 'test-key',
      model: 'gemini-test',
      text: 'Hello',
    })).resolves.toBe('Olá');
    expect(fetchMock.mock.calls[0][0]).toContain('gemini-test:generateContent');
  });

  it('supports custom OpenAI-compatible endpoints', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Olá' } }] }),
    });
    await expect(translateText({
      provider: 'openai-compatible',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      apiKey: 'test-key',
      baseUrl: 'https://api.example.test/v1/',
      model: 'custom-model',
      text: 'Hello',
    })).resolves.toBe('Olá');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.test/v1/chat/completions',
    );
  });

  it('requires an API key for hosted AI providers', async () => {
    await expect(translateText({
      provider: 'gemini',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      text: 'Hello',
    })).rejects.toThrow('An API key is required');
  });
});
