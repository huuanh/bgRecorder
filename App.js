import { StatusBar, StyleSheet, useColorScheme, View, AppState } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import LoadingScreen from './src/components/LoadingScreen';
import OnBoardScreen from './src/components/OnBoardScreen';
import PermissionScreen from './src/components/PermissionScreen';
import HomeScreen from './src/components/HomeScreen';
import { COLORS } from './src/constants';
import ReactContextManager from './src/utils/ReactContextManager';

function App() {
  const [loading, setLoading] = useState(true);
  const [showOnBoard, setShowOnBoard] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const isDarkMode = useColorScheme() === 'light';

  useEffect(() => {
    // Simplified initialization using ReactContextManager
    console.log('🚀 App initialization started...');
    
    ReactContextManager.onReady(() => {
      console.log('✅ App: React context ready, starting UI flow...');
      setAppReady(true);
      
      // Start the normal flow after app is ready
      const timer = setTimeout(() => {
        setLoading(false);
        setShowOnBoard(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    });

    // Cleanup on unmount
    return () => {
      ReactContextManager.cleanup();
    };
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
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={COLORS.BACKGROUND}
      />
      {!appReady ? (
        <View style={styles.container}>
          <LoadingScreen />
        </View>
      ) : loading ? (
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
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
});

export default App;
