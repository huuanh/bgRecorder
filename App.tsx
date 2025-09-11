/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import LoadingScreen from './src/components/LoadingScreen';
import OnBoardScreen from './src/components/OnBoardScreen';
import { COLORS } from './src/constants';

function App() {
  const [loading, setLoading] = useState(true);
  const [showOnBoard, setShowOnBoard] = useState(false);
  const isDarkMode = useColorScheme() === 'light';

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setShowOnBoard(true);
    }, 2000); // 2s loading
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {loading ? <LoadingScreen /> : showOnBoard ? <OnBoardScreen /> : <AppContent />}
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}
// LoadingScreen đã được tách ra file riêng

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBox: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 40,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.4,
  },
  progressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TEXT,
    zIndex: 1,
  },
  adsText: {
    color: COLORS.TEXT,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default App;
