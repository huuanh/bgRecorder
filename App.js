import { StatusBar, StyleSheet, useColorScheme, View, AppState } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import LoadingScreen from './src/components/LoadingScreen';
import OnBoardScreen from './src/components/OnBoardScreen';
import PermissionScreen from './src/components/PermissionScreen';
import HomeScreen from './src/components/HomeScreen';
import AuthenticationModal from './src/components/AuthenticationModal';
import { COLORS } from './src/constants';
import ReactContextManager from './src/utils/ReactContextManager';
import SecurityManager from './src/utils/SecurityManager';

function App() {
  const [loading, setLoading] = useState(true);
  const [showOnBoard, setShowOnBoard] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [securitySettings, setSecuritySettings] = useState(null);
  const isDarkMode = useColorScheme() === 'light';

  useEffect(() => {
    // Simplified initialization using ReactContextManager
    console.log('🚀 App initialization started...');
    
    ReactContextManager.onReady(() => {
      console.log('✅ App: React context ready, checking security...');
      setAppReady(true);
      
      // Check if authentication is required
      checkAuthenticationRequired();
    });

    // Cleanup on unmount
    return () => {
      ReactContextManager.cleanup();
    };
  }, []);

  const checkAuthenticationRequired = async () => {
    try {
      // Add delay to ensure UIManager is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const settings = await SecurityManager.getSecuritySettings();
      setSecuritySettings(settings);
      
      if (settings.hasPassword) {
        console.log('🔐 Password exists, showing authentication...');
        setShowAuthModal(true);
      } else {
        console.log('🔓 No password set, proceeding to app...');
        setIsAuthenticated(true);
        startNormalFlow();
      }
    } catch (error) {
      console.error('❌ Error checking security settings:', error);
      // If there's an error, proceed without authentication
      setIsAuthenticated(true);
      startNormalFlow();
    }
  };

  const startNormalFlow = () => {
    const timer = setTimeout(() => {
      setLoading(false);
      setShowOnBoard(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  };

  const handleAuthenticated = () => {
    console.log('✅ Authentication successful, proceeding to app...');
    setIsAuthenticated(true);
    setShowAuthModal(false);
    startNormalFlow();
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      try {
        if (nextAppState === 'active' && securitySettings?.hasPassword && isAuthenticated) {
          // Re-authenticate when app comes to foreground
          console.log('🔐 App became active, re-authentication required...');
          // Add delay to ensure UI is ready
          setTimeout(() => {
            setIsAuthenticated(false);
            setShowAuthModal(true);
          }, 200);
        }
      } catch (error) {
        console.error('❌ Error handling app state change:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [securitySettings, isAuthenticated]);

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
      ) : !isAuthenticated && securitySettings?.hasPassword ? (
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
      
      {/* Authentication Modal */}
      <AuthenticationModal
        visible={showAuthModal}
        onAuthenticated={handleAuthenticated}
        onClose={() => {}} // Prevent manual close
      />
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
