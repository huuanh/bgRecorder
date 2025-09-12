import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { initAds, preloadInterstitialAd, preloadAppOpenAd, ADS_UNIT } from '../adManager.js';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const LoadingScreen = () => {
  // Preload ads only once
  const interstitialRef = useRef(null);
  const appOpenRef = useRef(null);

  useEffect(() => {
    let isCompleted = false;
    const initializeServices = async () => {
      try {
        console.log('🔧 Initializing services...');
        setLoadingText('Loading.');
        
        // Initialize RemoteConfig first
        console.log('🔧 Loading RemoteConfig...');
        setLoadingText('Loading..');
        await RemoteConfigManager.initialize();
        console.log('🔧 RemoteConfigManager initialized successfully');
        
        if (!isCompleted) {
          setRemoteConfigLoaded(true);
        }
        
        // Initialize AdManager
        console.log('🔧 Loading AdManager...');
        setLoadingText('Loading...');
        await AdManager.initialize();
        console.log('🔧 AdManager initialized successfully');
        
        if (!isCompleted) {
          setAdManagerLoaded(true);
        }
        
        // Initialize AnalyticsManager
        console.log('🔧 Loading AnalyticsManager...');
        setLoadingText('Loading.');
        await AnalyticsManager.initialize();
        console.log('🔧 AnalyticsManager initialized successfully');
        
        if (!isCompleted) {
          setAnalyticsLoaded(true);
        }
        
        setLoadingText('Ready to start!');
        
      } catch (error) {
        console.log('⚠️ Service initialization error:', error);
        setLoadingText('Loading Failed - Continuing...');
        
        // Set all as loaded even if failed to allow app to continue
        if (!isCompleted) {
          setRemoteConfigLoaded(true);
          setAdManagerLoaded(true);
          setAnalyticsLoaded(true);
        }
      }
    };
    // Initialize MobileAds SDK
    const timeoutId = setTimeout(() => {
      console.log('⏰ Services loading timeout reached (10s)');
      setLoadingText('Loading Timeout - Continuing...');
      
      if (!isCompleted) {
        setTimeoutReached(true);
        setRemoteConfigLoaded(true);
        setAdManagerLoaded(true);
        setAnalyticsLoaded(true);
      }
    }, 10000);
    initializeServices();
     // Cleanup function
    return () => {
      isCompleted = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.iconBox}>
        <Image source={require('../../assets/loading/icon.png')} style={styles.icon} />
      </View>
      <Text style={styles.title}>Background Video Recoder</Text>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar} />
        <View style={styles.progressBarBg} />
      </View>
      <Text style={styles.adsText}>This action may contain ads</Text>
      {/* Banner Ad at bottom */}
      <View style={{ marginTop: 24 }}>
        {/* <BannerAd
          unitId={ADS_UNIT.BANNER}
          size={BannerAdSize.FULL_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        /> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default LoadingScreen;
