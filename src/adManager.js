import { AppOpenAd, InterstitialAd, BannerAd, AdEventType, TestIds, AdsConsent, MobileAds, NativeAd, NativeAdView, NativeAdEventType, HeadlineView, MediaView, TaglineView, AdvertiserView, CallToActionView, IconView } from 'react-native-google-mobile-ads';
import { IS_PRODUCTION } from './constants';
import React from 'react';
import { View, StyleSheet } from 'react-native';


// Quản lý các ad unit cho từng môi trường
export const ADS_UNIT_VALUES = {
  DEV: {
    BANNER: TestIds.BANNER,
    INTERSTITIAL: TestIds.INTERSTITIAL,
    APP_OPEN: TestIds.APP_OPEN,
    NATIVE: TestIds.NATIVE,
  },
  PROD: {
    BANNER: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
    INTERSTITIAL: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
    APP_OPEN: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
    NATIVE: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
  },
};

export const ADS_UNIT = IS_PRODUCTION ? ADS_UNIT_VALUES.PROD : ADS_UNIT_VALUES.DEV;

class AdManager {
    constructor() {
        this.isInitialized = false;
        this.GoogleMobileAds = null;
        this.BannerAd = null;
        this.InterstitialAd = null;
        this.RewardedAd = null;
        this.AppOpenAd = null;
        this.AdEventType = null;
        this.isAppOpenAdLoading = false; // Add flag to prevent multiple app open ads
        this.lastAppOpenAdTime = 0; // Track last app open ad time
        this.APP_OPEN_AD_COOLDOWN = 30000; // 30 seconds cooldown between app open ads

        // Preloaded ads cache
        this.preloadedAds = {
            interstitial: null,
            rewarded: null,
            appOpen: null,
        };

        // Loading states for ads
        this.adLoadingStates = {
            interstitial: false,
            rewarded: false,
            appOpen: false,
        };

        // Try to load Google Mobile Ads if available
        this.loadGoogleMobileAds();
    }

    // Load Google Mobile Ads if available
    loadGoogleMobileAds() {
        console.log('🔄 Loading Google Mobile Ads module...');
        try {
            const GoogleMobileAdsModule = require('react-native-google-mobile-ads');
            console.log('📦 Module loaded, extracting components...');
            console.log('🔍 Full module structure:', Object.keys(GoogleMobileAdsModule));

            // Extract components first
            this.BannerAd = GoogleMobileAdsModule.BannerAd;
            this.InterstitialAd = GoogleMobileAdsModule.InterstitialAd;
            this.RewardedAd = GoogleMobileAdsModule.RewardedAd;
            this.AppOpenAd = GoogleMobileAdsModule.AppOpenAd;
            this.NativeAd = GoogleMobileAdsModule.NativeAd;
            this.AdEventType = GoogleMobileAdsModule.AdEventType;
            this.RewardedAdEventType = GoogleMobileAdsModule.RewardedAdEventType;

            // Try to get MobileAds from different possible exports
            this.GoogleMobileAds = GoogleMobileAdsModule.MobileAds || 
                                   GoogleMobileAdsModule.default || 
                                   GoogleMobileAdsModule;

            // Since RewardedAd is available, we can use that as the indicator
            const isModuleAvailable = !!(this.RewardedAd && this.AdEventType && this.RewardedAdEventType);
            this.isModuleLoaded = isModuleAvailable;

            console.log('✅ Google Mobile Ads module loaded successfully');
            console.log('🔍 MobileAds object:', this.GoogleMobileAds ? 'Available' : 'Not Available');
            console.log('🔍 MobileAds type:', typeof this.GoogleMobileAds);
            console.log('🔍 MobileAds keys:', this.GoogleMobileAds ? Object.keys(this.GoogleMobileAds) : 'N/A');
            console.log('🔍 RewardedAd available:', !!this.RewardedAd);
            console.log('🔍 RewardedAdEventType available:', !!this.RewardedAdEventType);
            console.log('🔍 AdEventType available:', !!this.AdEventType);
            console.log('🔍 Module actually available:', isModuleAvailable);
            
            // Check if initialize method exists in different places
            const hasInitialize = (this.GoogleMobileAds && typeof this.GoogleMobileAds.initialize === 'function') ||
                                  (GoogleMobileAdsModule.MobileAds && typeof GoogleMobileAdsModule.MobileAds.initialize === 'function') ||
                                  (GoogleMobileAdsModule.default && typeof GoogleMobileAdsModule.default.initialize === 'function') ||
                                  (typeof GoogleMobileAdsModule.initialize === 'function');
            console.log('🔍 Initialize method available:', hasInitialize);
            
        } catch (error) {
            console.log('⚠️ Google Mobile Ads not available, using mock ads:', error.message);
            this.GoogleMobileAds = null;
            this.BannerAd = null;
            this.InterstitialAd = null;
            this.RewardedAd = null;
            this.AppOpenAd = null;
            this.NativeAd = null;
            this.AdEventType = null;
            this.RewardedAdEventType = null;
            this.isModuleLoaded = false;
            // For demonstration, we'll simulate ads being available
            this.isInitialized = true;
        }
    }

    // Initialize ads (called once at app start)
    async initialize() {
        if (!this.isModuleLoaded) {
            console.log('🎭 Using mock ads - Google Mobile Ads module not available');
            this.isInitialized = true;
            return true;
        }

        try {
            // Import the module again to get the latest reference
            const GoogleMobileAdsModule = require('react-native-google-mobile-ads');
            
            // Try different ways to access the initialize method
            let initializeMethod = null;
            
            if (GoogleMobileAdsModule.MobileAds && typeof GoogleMobileAdsModule.MobileAds.initialize === 'function') {
                initializeMethod = GoogleMobileAdsModule.MobileAds.initialize;
                console.log('🔍 Using MobileAds.initialize');
            } else if (GoogleMobileAdsModule.default && typeof GoogleMobileAdsModule.default.initialize === 'function') {
                initializeMethod = GoogleMobileAdsModule.default.initialize;
                console.log('🔍 Using default.initialize');
            } else if (typeof GoogleMobileAdsModule.initialize === 'function') {
                initializeMethod = GoogleMobileAdsModule.initialize;
                console.log('🔍 Using direct initialize');
            }
            
            if (initializeMethod) {
                await initializeMethod();
                console.log('✅ Google Mobile Ads initialized successfully');
            } else {
                console.log('⚠️ MobileAds initialize method not found, but components are available');
                console.log('🔍 Available methods in MobileAds:', this.GoogleMobileAds ? Object.keys(this.GoogleMobileAds) : 'MobileAds not available');
                console.log('🔍 Available methods in module:', Object.keys(GoogleMobileAdsModule));
            }
            
            this.isInitialized = true;
            
            // Start preloading ads after initialization
            this.preloadAllAds();
            
            return true;
        } catch (error) {
            console.log('❌ Failed to initialize Google Mobile Ads:', error);
            // Don't fail completely - we can still use the ad components
            this.isInitialized = true;
            
            // Still try to preload ads
            this.preloadAllAds();
            
            return true;
        }
    }

    
    // Preload all ads
    preloadAllAds() {
        console.log('🔄 Starting to preload all ads...');
        this.preloadInterstitialAd();
        this.preloadRewardedAd();
        this.preloadAppOpenAd();
    }

    
    // Preload interstitial ad
    preloadInterstitialAd() {
        if (!this.isModuleLoaded || this.adLoadingStates.interstitial || this.preloadedAds.interstitial) {
            return;
        }

        const adUnitId = ADS_UNIT.INTERSTITIAL;

        try {
            console.log('🔄 Preloading interstitial ad...');
            this.adLoadingStates.interstitial = true;

            const interstitial = this.InterstitialAd.createForAdRequest(adUnitId);

            const unsubscribeLoaded = interstitial.addAdEventListener(this.AdEventType.LOADED, () => {
                console.log('✅ Interstitial ad preloaded successfully');
                this.preloadedAds.interstitial = interstitial;
                this.adLoadingStates.interstitial = false;
                unsubscribeLoaded();
                unsubscribeError();
            });

            const unsubscribeError = interstitial.addAdEventListener(this.AdEventType.ERROR, (error) => {
                console.log('❌ Failed to preload interstitial ad:', error);
                this.adLoadingStates.interstitial = false;
                unsubscribeLoaded();
                unsubscribeError();
                
                // Retry after 30 seconds
                setTimeout(() => this.preloadInterstitialAd(), 30000);
            });

            interstitial.load();
        } catch (error) {
            console.log('❌ Error preloading interstitial ad:', error);
            this.adLoadingStates.interstitial = false;
        }
    }

    // Preload rewarded ad
    preloadRewardedAd() {
        if (!this.isModuleLoaded || this.adLoadingStates.rewarded || this.preloadedAds.rewarded) {
            return;
        }

        const adUnitId = ADS_UNIT.REWARDED

        try {
            console.log('🔄 Preloading rewarded ad...');
            this.adLoadingStates.rewarded = true;

            const rewarded = this.RewardedAd.createForAdRequest(adUnitId);

            const unsubscribeLoaded = rewarded.addAdEventListener(this.RewardedAdEventType.LOADED, () => {
                console.log('✅ Rewarded ad preloaded successfully');
                this.preloadedAds.rewarded = rewarded;
                this.adLoadingStates.rewarded = false;
                unsubscribeLoaded();
                unsubscribeError();
            });

            const unsubscribeError = rewarded.addAdEventListener(this.AdEventType.ERROR, (error) => {
                console.log('❌ Failed to preload rewarded ad:', error);
                this.adLoadingStates.rewarded = false;
                unsubscribeLoaded();
                unsubscribeError();
                
                // Retry after 30 seconds
                setTimeout(() => this.preloadRewardedAd(), 30000);
            });

            rewarded.load();
        } catch (error) {
            console.log('❌ Error preloading rewarded ad:', error);
            this.adLoadingStates.rewarded = false;
        }
    }

    // Preload app open ad
    preloadAppOpenAd() {
        if (!this.isModuleLoaded || this.adLoadingStates.appOpen || this.preloadedAds.appOpen) {
            return;
        }

        const adUnitId = ADS_UNIT.APP_OPEN;

        try {
            console.log('🔄 Preloading app open ad...');
            this.adLoadingStates.appOpen = true;

            const appOpen = this.AppOpenAd.createForAdRequest(adUnitId);

            const unsubscribeLoaded = appOpen.addAdEventListener(this.AdEventType.LOADED, () => {
                console.log('✅ App open ad preloaded successfully');
                this.preloadedAds.appOpen = appOpen;
                this.adLoadingStates.appOpen = false;
                unsubscribeLoaded();
                unsubscribeError();
            });

            const unsubscribeError = appOpen.addAdEventListener(this.AdEventType.ERROR, (error) => {
                console.log('❌ Failed to preload app open ad:', error);
                this.adLoadingStates.appOpen = false;
                unsubscribeLoaded();
                unsubscribeError();
                
                // Retry after 60 seconds (longer for app open ads)
                setTimeout(() => this.preloadAppOpenAd(), 60000);
            });

            appOpen.load();
        } catch (error) {
            console.log('❌ Error preloading app open ad:', error);
            this.adLoadingStates.appOpen = false;
        }
    }

    // Check if ads are initialized
    isAdsInitialized() {
        return this.isInitialized;
    }

    // Check if Google Mobile Ads is available
    isGoogleMobileAdsAvailable() {
        return this.isModuleLoaded;
    }
    // Get banner component
    getBannerComponent() {
        return this.BannerAd;
    }

    // Get native component
    getNativeComponent() {
        return this.NativeAd;
    }

    // Load and show interstitial ad
    async showInterstitialAd(onAdClosed, onAdError, usePreloaded = true) {
        if (!this.isAdsInitialized()) {
            console.log('❌ Cannot show interstitial ad - not initialized');
            if (onAdError) onAdError('Ads not initialized');
            return false;
        }

        if (!this.isModuleLoaded) {
            // Mock interstitial ad
            console.log('🎯 Mock Interstitial Ad: Gun Simulator Pro - Unlock more weapons!');
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log('📱 Mock interstitial ad closed');
                    if (onAdClosed) onAdClosed();
                    resolve(true);
                }, 2000);
            });
        }

        // Try to use preloaded ad first
        if (usePreloaded && this.preloadedAds.interstitial) {
            console.log('📺 Showing preloaded interstitial ad');
            const preloadedAd = this.preloadedAds.interstitial;
            this.preloadedAds.interstitial = null; // Clear preloaded ad

            return new Promise((resolve, reject) => {
                const unsubscribeClosed = preloadedAd.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ Preloaded interstitial ad closed');
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdClosed) onAdClosed();
                    
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(), 1000);
                    resolve(true);
                });

                const unsubscribeError = preloadedAd.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ Preloaded interstitial ad error:', error);
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);
                    
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(), 1000);
                    reject(error);
                });

                try {
                    preloadedAd.show();
                } catch (error) {
                    console.log('❌ Error showing preloaded interstitial ad:', error);
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);
                    
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(), 1000);
                    reject(error);
                }
            });
        }

        // Fallback to load and show if no preloaded ad available
        try {
            console.log('📺 Loading and showing interstitial ad (no preloaded available)');
            const interstitial = this.InterstitialAd.createForAdRequest(this.getInterstitialAdUnitId());

            return new Promise((resolve, reject) => {
                const unsubscribeLoaded = interstitial.addAdEventListener(this.AdEventType.LOADED, () => {
                    console.log('📺 Interstitial ad loaded');
                    interstitial.show();
                });

                const unsubscribeClosed = interstitial.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ Interstitial ad closed');
                    unsubscribeLoaded();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdClosed) onAdClosed();
                    
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(), 1000);
                    resolve(true);
                });

                const unsubscribeError = interstitial.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ Interstitial ad error:', error);
                    unsubscribeLoaded();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);
                    
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(), 1000);
                    reject(error);
                });

                // Load the ad
                interstitial.load();
            });
        } catch (error) {
            console.log('❌ Error showing interstitial ad:', error);
            if (onAdError) onAdError(error);
            
            // Preload next ad
            setTimeout(() => this.preloadInterstitialAd(), 1000);
            return false;
        }
    }

    // Load and show rewarded ad
    async showRewardedAd(usePreloaded = true) {
        console.log('🔍 Debug - AdManager.isAdsInitialized():', this.isAdsInitialized());
        console.log('🔍 Debug - AdManager.isGoogleMobileAdsAvailable():', this.isGoogleMobileAdsAvailable());
        console.log('🔍 Debug - Module loaded:', this.isModuleLoaded);
        console.log('🔍 Debug - RewardedAd available:', !!this.RewardedAd);
        console.log('🔍 Debug - RewardedAdEventType available:', !!this.RewardedAdEventType);

        if (!this.isAdsInitialized()) {
            console.log('❌ Cannot show rewarded ad - not initialized');
            return false;
        }

        // Try to use preloaded ad first
        if (usePreloaded && this.preloadedAds.rewarded && this.isModuleLoaded) {
            console.log('🎁 Showing preloaded rewarded ad');
            const preloadedAd = this.preloadedAds.rewarded;
            this.preloadedAds.rewarded = null; // Clear preloaded ad

            return new Promise((resolve, reject) => {
                const unsubscribeEarned = preloadedAd.addAdEventListener(
                    this.RewardedAdEventType.EARNED_REWARD,
                    (reward) => {
                        console.log('💰 User earned reward:', reward);
                        resolve(reward);
                    }
                );

                const unsubscribeClosed = preloadedAd.addAdEventListener(
                    this.AdEventType.CLOSED,
                    () => {
                        console.log('✅ Preloaded rewarded ad closed');
                        unsubscribe();
                        
                        // Preload next ad
                        setTimeout(() => this.preloadRewardedAd(), 1000);
                    }
                );

                const unsubscribeError = preloadedAd.addAdEventListener(
                    this.AdEventType.ERROR,
                    (error) => {
                        console.log('❌ Preloaded rewarded ad error:', error);
                        unsubscribe();
                        
                        // Preload next ad
                        setTimeout(() => this.preloadRewardedAd(), 1000);
                        reject(error);
                    }
                );

                const unsubscribe = () => {
                    unsubscribeEarned();
                    unsubscribeClosed();
                    unsubscribeError();
                };

                try {
                    preloadedAd.show();
                } catch (error) {
                    console.log('❌ Error showing preloaded rewarded ad:', error);
                    unsubscribe();
                    
                    // Preload next ad
                    setTimeout(() => this.preloadRewardedAd(), 1000);
                    reject(error);
                }
            });
        }

        // Use RewardedAd directly since it's available
        if (this.RewardedAd && (this.RewardedAdEventType || this.AdEventType)) {
            console.log('🎁 Loading and showing rewarded ad (no preloaded available)');

            // Use RewardedAdEventType if available, otherwise fall back to AdEventType
            const EventType = this.RewardedAdEventType || this.AdEventType;
            console.log('🔍 Using event type:', EventType === this.RewardedAdEventType ? 'RewardedAdEventType' : 'AdEventType');
            console.log('🔍 Event type values:', Object.keys(EventType));

            try {
                const rewarded = this.RewardedAd.createForAdRequest(this.getRewardedAdUnitId());

                return new Promise((resolve, reject) => {
                    const unsubscribeLoaded = rewarded.addAdEventListener(
                        this.RewardedAdEventType.LOADED,
                        () => {
                            console.log('🎁 Rewarded ad loaded');
                            rewarded.show();
                        }
                    );

                    const unsubscribeEarned = rewarded.addAdEventListener(
                        this.RewardedAdEventType.EARNED_REWARD,
                        (reward) => {
                            console.log('💰 User earned reward:', reward);
                            resolve(reward);
                        }
                    );

                    const unsubscribeClosed = rewarded.addAdEventListener(
                        this.AdEventType.CLOSED,
                        () => {
                            console.log('✅ Rewarded ad closed');
                            unsubscribe();
                            
                            // Preload next ad
                            setTimeout(() => this.preloadRewardedAd(), 1000);
                        }
                    );

                    const unsubscribeError = rewarded.addAdEventListener(
                        this.AdEventType.ERROR,
                        (error) => {
                            console.log('❌ Rewarded ad error:', error);
                            unsubscribe();
                            
                            // Preload next ad
                            setTimeout(() => this.preloadRewardedAd(), 1000);
                            reject(error);
                        }
                    );

                    const unsubscribe = () => {
                        unsubscribeLoaded();
                        unsubscribeEarned();
                        unsubscribeClosed();
                        unsubscribeError();
                    };

                    rewarded.load();
                });

            } catch (error) {
                console.log('❌ Error showing real rewarded ad:', error);
                // Preload next ad
                setTimeout(() => this.preloadRewardedAd(), 1000);
                // Fall back to mock
            }
        }

        // Fallback to mock ad
        console.log('🎁 Mock Rewarded Ad: Watch to earn extra bullets!');
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('✅ Mock rewarded ad completed - user earned reward');
                resolve({ amount: 50, type: 'bullets' });
            }, 3000);
        });
    }

    async showAppOpenAd(usePreloaded = true) {
        // Check cooldown period
        const currentTime = Date.now();
        if (currentTime - this.lastAppOpenAdTime < this.APP_OPEN_AD_COOLDOWN) {
            console.log('📂 App open ad on cooldown, skipping (last shown', (currentTime - this.lastAppOpenAdTime) / 1000, 'seconds ago)');
            return false;
        }

        if (!this.isGoogleMobileAdsAvailable() || !this.isInitialized) {
            console.log('📱 Google Mobile Ads not available for app open ad');
            return false;
        }

        // Prevent multiple simultaneous app open ad requests
        if (this.isAppOpenAdLoading) {
            console.log('📂 App open ad already loading, skipping request');
            return false;
        }

        // Try to use preloaded ad first
        if (usePreloaded && this.preloadedAds.appOpen) {
            console.log('📂 Showing preloaded app open ad');
            const preloadedAd = this.preloadedAds.appOpen;
            this.preloadedAds.appOpen = null; // Clear preloaded ad
            this.lastAppOpenAdTime = currentTime; // Set last shown time

            return new Promise((resolve, reject) => {
                const unsubscribeClosed = preloadedAd.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ Preloaded app open ad closed');
                    unsubscribeClosed();
                    unsubscribeError();
                    if (AnalyticsManager) {
                        AnalyticsManager.logAppOpenAdsLoad(true);
                    }
                    
                    // Preload next ad
                    setTimeout(() => this.preloadAppOpenAd(), 5000);
                    resolve(true);
                });

                const unsubscribeError = preloadedAd.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ Preloaded app open ad error:', error);
                    unsubscribeClosed();
                    unsubscribeError();
                    if (AnalyticsManager) {
                        AnalyticsManager.logAppOpenAdsLoad(false);
                    }
                    
                    // Preload next ad
                    setTimeout(() => this.preloadAppOpenAd(), 5000);
                    reject(error);
                });

                try {
                    preloadedAd.show();
                } catch (error) {
                    console.log('❌ Error showing preloaded app open ad:', error);
                    unsubscribeClosed();
                    unsubscribeError();
                    if (AnalyticsManager) {
                        AnalyticsManager.logAppOpenAdsLoad(false);
                    }
                    
                    // Preload next ad
                    setTimeout(() => this.preloadAppOpenAd(), 5000);
                    reject(error);
                }
            });
        }

        // Fallback to load and show if no preloaded ad available
        try {
            console.log('📂 Loading and showing app open ad (no preloaded available)');
            this.isAppOpenAdLoading = true; // Set loading flag
            this.lastAppOpenAdTime = currentTime; // Set last shown time

            return new Promise((resolve, reject) => {
                const appOpenAd = this.AppOpenAd.createForAdRequest(this.getAppOpenAdUnitId(), {
                    requestNonPersonalizedAdsOnly: true,
                });

                const unsubscribeLoaded = appOpenAd.addAdEventListener(this.AdEventType.LOADED, () => {
                    console.log('📂 App open ad loaded successfully');
                    if (AnalyticsManager) {
                        AnalyticsManager.logAppOpenAdsLoad(true);
                    }
                    appOpenAd.show();
                });

                const unsubscribeClosed = appOpenAd.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ App open ad closed');
                    this.isAppOpenAdLoading = false; // Reset loading flag
                    unsubscribeLoaded();
                    unsubscribeClosed();
                    unsubscribeError();
                    
                    // Preload next ad
                    setTimeout(() => this.preloadAppOpenAd(), 5000);
                    resolve(true);
                });

                const unsubscribeError = appOpenAd.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ App open ad error:', error);
                    this.isAppOpenAdLoading = false; // Reset loading flag
                    if (AnalyticsManager) {
                        AnalyticsManager.logAppOpenAdsLoad(false);
                    }
                    unsubscribeLoaded();
                    unsubscribeClosed();
                    unsubscribeError();
                    
                    // Preload next ad
                    setTimeout(() => this.preloadAppOpenAd(), 5000);
                    reject(error);
                });

                // Load the ad
                appOpenAd.load();
            });
        } catch (error) {
            console.log('❌ Error showing app open ad:', error);
            this.isAppOpenAdLoading = false; // Reset loading flag on error
            return false;
        }
    }
    // Check if a specific ad type is preloaded
    isAdPreloaded(adType) {
        return !!this.preloadedAds[adType];
    }

    // Check if a specific ad type is currently loading
    isAdLoading(adType) {
        return !!this.adLoadingStates[adType];
    }

    // Get preload status for all ad types
    getPreloadStatus() {
        return {
            interstitial: {
                preloaded: this.isAdPreloaded('interstitial'),
                loading: this.isAdLoading('interstitial')
            },
            rewarded: {
                preloaded: this.isAdPreloaded('rewarded'),
                loading: this.isAdLoading('rewarded')
            },
            appOpen: {
                preloaded: this.isAdPreloaded('appOpen'),
                loading: this.isAdLoading('appOpen')
            }
        };
    }

    // Force reload a specific ad type
    forceReloadAd(adType) {
        // Clear existing preloaded ad
        if (this.preloadedAds[adType]) {
            this.preloadedAds[adType] = null;
        }
        
        // Reset loading state
        this.adLoadingStates[adType] = false;
        
        // Start preloading based on ad type
        switch (adType) {
            case 'interstitial':
                this.preloadInterstitialAd();
                break;
            case 'rewarded':
                this.preloadRewardedAd();
                break;
            case 'appOpen':
                this.preloadAppOpenAd();
                break;
            default:
                console.log('❌ Unknown ad type for force reload:', adType);
        }
    }

    // Force reload all ads
    forceReloadAllAds() {
        console.log('🔄 Force reloading all ads...');
        this.forceReloadAd('interstitial');
        this.forceReloadAd('rewarded');
        this.forceReloadAd('appOpen');
    }

    // Clear all preloaded ads (useful for memory management)
    clearAllPreloadedAds() {
        console.log('🗑️ Clearing all preloaded ads...');
        this.preloadedAds = {
            interstitial: null,
            rewarded: null,
            appOpen: null,
        };
    }

    // Get debug info about ad manager state
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            isModuleLoaded: this.isModuleLoaded,
            isTestMode: this.isTestMode(),
            cooldownRemaining: Math.max(0, this.APP_OPEN_AD_COOLDOWN - (Date.now() - this.lastAppOpenAdTime)),
            preloadStatus: this.getPreloadStatus(),
            adUnitIds: {
                banner: this.getBannerAdUnitId(),
                interstitial: this.getInterstitialAdUnitId(),
                interstitialCrack: this.getInterstitialCrackAdUnitId(),
                rewarded: this.getRewardedAdUnitId(),
                appOpen: this.getAppOpenAdUnitId()
            }
        };
    }

    // Development/Debug methods

    // Log current preload status to console
    logPreloadStatus() {
        const status = this.getPreloadStatus();
        console.log('📊 Ad Preload Status:');
        console.log('  📺 Interstitial:', status.interstitial.preloaded ? '✅ Ready' : (status.interstitial.loading ? '🔄 Loading' : '❌ Not loaded'));
        console.log('  🎁 Rewarded:', status.rewarded.preloaded ? '✅ Ready' : (status.rewarded.loading ? '🔄 Loading' : '❌ Not loaded'));
        console.log('  📂 App Open:', status.appOpen.preloaded ? '✅ Ready' : (status.appOpen.loading ? '🔄 Loading' : '❌ Not loaded'));
    }

    // Test method to verify preload functionality
    async testPreloadFunctionality() {
        console.log('🧪 Testing preload functionality...');
        
        // Log initial status
        this.logPreloadStatus();
        
        // Test each ad type
        const tests = [
            { type: 'interstitial', method: () => this.showInterstitialAd(null, null, true) },
            { type: 'rewarded', method: () => this.showRewardedAd(true) },
            { type: 'appOpen', method: () => this.showAppOpenAd(true) }
        ];
        
        for (const test of tests) {
            console.log(`🔬 Testing ${test.type} ad...`);
            const wasPreloaded = this.isAdPreloaded(test.type);
            
            if (wasPreloaded) {
                console.log(`✅ ${test.type} was preloaded, testing show...`);
                try {
                    await test.method();
                    console.log(`✅ ${test.type} showed successfully`);
                } catch (error) {
                    console.log(`❌ ${test.type} failed to show:`, error);
                }
            } else {
                console.log(`⚠️ ${test.type} was not preloaded`);
            }
            
            // Wait a bit between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Log final status
        console.log('🏁 Final preload status:');
        this.logPreloadStatus();
    }
}

export default new AdManager();
