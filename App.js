import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import LoadingScreen from './src/components/LoadingScreen';
import OnBoardScreen from './src/components/OnBoardScreen';
import PermissionScreen from './src/components/PermissionScreen';
import HomeScreen from './src/components/HomeScreen';
import { COLORS } from './src/constants';

function App() {
  const [loading, setLoading] = useState(true);
  const [showOnBoard, setShowOnBoard] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const isDarkMode = useColorScheme() === 'light';

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setShowOnBoard(true);
    }, 2000); // 2s loading
    return () => clearTimeout(timer);
  }, []);

  const handleOnBoardNext = () => {
    console.log('🔄 OnBoard completed, navigating to Permissions...');
    setShowOnBoard(false);
    setShowPermissions(true);
  };

  const handlePermissionsNext = () => {
    console.log('🔄 Permissions completed, navigating to Main App...');
    setShowPermissions(false);
  };

  const handlePermissionsSkip = () => {
    console.log('⏭️ Permissions skipped, navigating to Main App...');
    setShowPermissions(false);
  };

  // Note: Mobile Ads initialization is handled by AdManager
  useEffect(() => {
    // const initializeMobileAds = async () => {
    //   try {
    //     // Try different ways to initialize
    //     if (GoogleMobileAds && typeof GoogleMobileAds.initialize === 'function') {
    //       await GoogleMobileAds.initialize();
    //       console.log('✅ Mobile Ads initialized via GoogleMobileAds.initialize');
    //     } else if (GoogleMobileAds && typeof GoogleMobileAds === 'function') {
    //       const adsInstance = GoogleMobileAds();
    //       if (adsInstance && typeof adsInstance.initialize === 'function') {
    //         await adsInstance.initialize();
    //         console.log('✅ Mobile Ads initialized via GoogleMobileAds().initialize');
    //       } else {
    //         console.log('⚠️ Mobile Ads initialize method not available, but components should work');
    //       }
    //     } else {
    //       console.log('⚠️ GoogleMobileAds not available as expected');
    //     }
    //   } catch (error) {
    //     console.log('⚠️ Mobile Ads initialization error (non-critical):', error);
    //   }
    // };
    
    // initializeMobileAds();
  }, []);


  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {loading ? (
        <LoadingScreen />
      ) : showOnBoard ? (
        <OnBoardScreen onNext={handleOnBoardNext} />
      ) : showPermissions ? (
        <PermissionScreen 
          onNext={handlePermissionsNext}
          onSkip={handlePermissionsSkip}
        />
      ) : (
        <HomeScreen />
      )}
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
