import React, { useEffect, useState, useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useNovelActions, useNovelValue } from '@screens/novel/NovelContext';
import { useChapterContext } from '../../ChapterContext';
import { normalizeTranslationSettings, translateText } from '@services/translation';
import type { TranslationSettings } from '@services/translation';

const TranslationTab: React.FC = () => {
  const novelSettings = useNovelValue('novelSettings');
  const { setNovelSettings } = useNovelActions();
  const { webViewRef } = useChapterContext();
  const [settings, setSettings] = useState<TranslationSettings>(() =>
    normalizeTranslationSettings(novelSettings.translationSettings),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSettings(normalizeTranslationSettings(novelSettings.translationSettings));
  }, [novelSettings.translationSettings]);

  const update = useCallback((patch: Partial<TranslationSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
  }, []);

  const save = useCallback(() => {
    setNovelSettings({ ...novelSettings, translationSettings: settings });
    Alert.alert('Translation settings', 'Settings saved for this novel.');
  }, [novelSettings, setNovelSettings, settings]);

  const translateChapter = useCallback(() => {
    if (!settings.enabled) {
      Alert.alert('Translation is disabled', 'Enable translation and save settings first.');
      return;
    }
    webViewRef.current?.injectJavaScript(`
      (function () {
        const root = document.getElementById('LNReader-chapter');
        const paragraphs = root ? Array.from(root.querySelectorAll('p'))
          .map(node => node.innerText || node.textContent || '')
          .filter(text => text.trim().length > 0) : [];
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'translate-request',
          data: { paragraphs }
        }));
      })();
      true;
    `);
  }, [settings.enabled, webViewRef]);

  return (
    <View style={styles.container}>
      <TextInput
        label="Provider (google, gemini, openai-compatible)"
        value={settings.provider}
        onChangeText={value => update({ provider: value as TranslationSettings['provider'] })}
        mode="outlined"
      />
      <TextInput
        label="Target language (e.g. pt)"
        value={settings.targetLanguage}
        onChangeText={targetLanguage => update({ targetLanguage })}
        mode="outlined"
        autoCapitalize="none"
      />
      <TextInput
        label="Source language (auto or e.g. en)"
        value={settings.sourceLanguage}
        onChangeText={sourceLanguage => update({ sourceLanguage })}
        mode="outlined"
        autoCapitalize="none"
      />
      <TextInput
        label="API key (not needed for Google)"
        value={settings.apiKey || ''}
        onChangeText={apiKey => update({ apiKey })}
        mode="outlined"
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        label="Model (Gemini / OpenAI-compatible)"
        value={settings.model || ''}
        onChangeText={model => update({ model })}
        mode="outlined"
        autoCapitalize="none"
      />
      <TextInput
        label="OpenAI-compatible base URL (optional)"
        value={settings.baseUrl || ''}
        onChangeText={baseUrl => update({ baseUrl })}
        mode="outlined"
        autoCapitalize="none"
      />
      <TextInput
        label="Extra translation instructions (optional)"
        value={settings.prompt || ''}
        onChangeText={prompt => update({ prompt })}
        mode="outlined"
        multiline
      />
      <Button mode={settings.enabled ? 'contained' : 'outlined'} onPress={() => update({ enabled: !settings.enabled })}>
        {settings.enabled ? 'Translation enabled' : 'Enable translation'}
      </Button>
      <Button mode="contained" onPress={save}>Save for this novel</Button>
      <Button mode="outlined" loading={busy} disabled={busy} onPress={async () => {
        setBusy(true);
        try {
          await translateText({ ...settings, text: 'Translation test' });
          Alert.alert('Connection successful', 'The translation provider responded correctly.');
        } catch (error) {
          Alert.alert('Translation test failed', error instanceof Error ? error.message : String(error));
        } finally {
          setBusy(false);
        }
      }}>Test provider</Button>
      <Button mode="contained-tonal" onPress={translateChapter}>Translate current chapter</Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10, padding: 12 },
});

export default TranslationTab;
