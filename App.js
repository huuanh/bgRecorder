import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import LoadingScreen from './src/components/LoadingScreen';
import OnBoardScreen from './src/components/OnBoardScreen';
import { COLORS } from './src/constants';
import mobileAds from 'react-native-google-mobile-ads';

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

    // Initialize mobile ads
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('Mobile Ads initialized', adapterStatuses);
      });
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
        templateFileName="App.js"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
});

export default App;
