import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useChapterGeneralSettings, useTheme } from '@hooks/persisted';

import ReaderAppbar from './components/ReaderAppbar';
import ReaderFooter from './components/ReaderFooter';

import WebViewReader from './components/WebViewReader';
import ReaderBottomSheetV2 from './components/ReaderBottomSheet/ReaderBottomSheet';
import ChapterDrawer from './components/ChapterDrawer';
import ChapterLoadingScreen from './ChapterLoadingScreen/ChapterLoadingScreen';
import { ErrorScreenV2 } from '@components';
import { ChapterScreenProps } from '@navigators/types';
import { getString } from '@i18n/translations';
import KeepScreenAwake from './components/KeepScreenAwake';
import {
  ChapterContextProvider,
  useChapterContext,
  useReaderChromeHidden,
} from './ChapterContext';
import { NovelContextProvider } from '@screens/novel/NovelContext';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useBackHandler } from '@hooks/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  InteractionManager,
  Keyboard,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { EMPTY_READER_SEARCH_RESULT, ReaderSearchResult } from './types';
import * as Linking from 'expo-linking';
import { resolveUrl } from '@services/plugin/fetch';

const Chapter = ({ route, navigation }: ChapterScreenProps) => (
  <NovelContextProvider route={route}>
    <ChapterContextProvider
      novel={route.params.novel}
      initialChapter={route.params.chapter}
    >
      <ReaderDrawerLayout route={route} navigation={navigation} />
    </ChapterContextProvider>
  </NovelContextProvider>
);
