import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';
import AdManager, { ADS_UNIT } from '../AdManager.js';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { SmallNativeAd } from './NativeAdComponent';
import IAPManager from '../utils/IAPManager';

const LoadingScreen = () => {
  // State for loading text and progress
  const [loadingText, setLoadingText] = useState('Loading...');
  const [remoteConfigLoaded, setRemoteConfigLoaded] = useState(false);
  const [adManagerLoaded, setAdManagerLoaded] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [iapManagerLoaded, setIapManagerLoaded] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Animated value for smooth progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Preload ads only once
  const interstitialRef = useRef(null);
  const appOpenRef = useRef(null);

  useEffect(() => {
    let isCompleted = false;
    const initializeServices = async () => {
      try {
        console.log('🔧 Initializing services...');
        setLoadingText('Initializing services...');
        setProgress(10);
        
        // Initialize AdManager
        console.log('🔧 Loading AdManager...');
        setLoadingText('Loading....');
        setProgress(30);
        await AdManager.initialize();
        console.log('✅ AdManager initialized successfully');
        
        if (!isCompleted) {
          setAdManagerLoaded(true);
          setProgress(50);
        }
        
        // Initialize IAP Manager
        console.log('🔧 Loading IAP Manager...');
        setLoadingText('Loading...');
        setProgress(70);
        await IAPManager.getInstance().initialize();
        console.log('✅ IAP Manager initialized successfully');
        
        if (!isCompleted) {
          setIapManagerLoaded(true);
          setProgress(90);
        }
        
        setLoadingText('Ready to start!');
        setProgress(100);
        
      } catch (error) {
        console.log('⚠️ Service initialization error:', error);
        setLoadingText('Loading Failed - Continuing...');
        setProgress(100);
        
        // Set all as loaded even if failed to allow app to continue
        if (!isCompleted) {
          setAdManagerLoaded(true);
          setIapManagerLoaded(true);
        }
      }
    };
    // Initialize services with timeout
    const timeoutId = setTimeout(() => {
      console.log('⏰ Services loading timeout reached (10s)');
      setLoadingText('Loading Timeout - Continuing...');
      setProgress(100);
      
      if (!isCompleted) {
        setTimeoutReached(true);
        setAdManagerLoaded(true);
        setIapManagerLoaded(true);
      }
    }, 10000);
    
    initializeServices();
     // Cleanup function
    return () => {
      isCompleted = true;
      clearTimeout(timeoutId);
    };
  }, []);

  // Add smooth progress animation
  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Add smooth progress animation
  useEffect(() => {
    // Start with initial progress
    const initialProgress = setInterval(() => {
      setProgress(prev => {
        if (prev < 15) {
          return prev + 1;
        }
        clearInterval(initialProgress);
        return prev;
      });
    }, 100);

    return () => clearInterval(initialProgress);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.iconBox}>
        <Image source={require('../../assets/loading/icon.png')} style={styles.icon} />
      </View>
      <Text style={styles.title}>Background Video Recorder</Text>
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar, 
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              })
            }
          ]} 
        />
        <View style={styles.progressBarBg} />
      </View>
      <Text style={styles.loadingText}>{loadingText}</Text>
      <Text style={styles.adsText}>This action may contain ads</Text>
      
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
    backgroundColor: COLORS.TERTIARY,
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
    color: COLORS.TERTIARY,
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
    backgroundColor: COLORS.TERTIARY,
    opacity: 0.4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TERTIARY,
    zIndex: 1,
  },
  adsText: {
    color: COLORS.TERTIARY,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingText: {
    color: COLORS.TERTIARY,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingScreen;
