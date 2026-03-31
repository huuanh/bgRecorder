import { AppOpenAd, InterstitialAd, BannerAd, AdEventType, TestIds, AdsConsent, MobileAds, NativeAd, NativeAdView, NativeAdEventType, RewardedAd, HeadlineView, MediaView, TaglineView, AdvertiserView, CallToActionView, IconView } from 'react-native-google-mobile-ads';
import { IS_PRODUCTION } from './constants';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { checkVipStatus } from './utils/VipUtils';
// import AnalyticsManager from './AnalyticsManager';
import remoteConfigManager from './RemoteConfigManager';

let AnalyticsManager = null;
try {
    AnalyticsManager = require('./AnalyticsManager').default;
} catch (error) {
    console.log('Managers not available in AdManager');
}

export const ADS_UNIT_VALUES = {
    DEV: {
        // App Open Ads
        APP_OPEN: TestIds.APP_OPEN,

        // Native Ads
        NATIVE_LANGUAGE: TestIds.NATIVE,
        NATIVE_ONBOARDING: TestIds.NATIVE,
        NATIVE_RECORDING_TAB: TestIds.NATIVE,
        NATIVE_DURATION: TestIds.NATIVE,
        NATIVE_QUALITY: TestIds.NATIVE,
        NATIVE_CAMERA: TestIds.NATIVE,
        NATIVE_GALLERY_TAB: TestIds.NATIVE,
        NATIVE_RENAME: TestIds.NATIVE,
        NATIVE_PLAY_SCENE: TestIds.NATIVE,
        NATIVE_EDIT_TAB: TestIds.NATIVE,
        NATIVE_SELECT_VIDEO: TestIds.NATIVE,
        NATIVE_TRIM_VIDEO: TestIds.NATIVE,
        NATIVE_TRIM_VIDEO_SUCCESS: TestIds.NATIVE,
        NATIVE_COMPRESS_VIDEO: TestIds.NATIVE,
        NATIVE_COMPRESS_VIDEO_SUCCESS: TestIds.NATIVE,
        NATIVE_TOMP3_VIDEO: TestIds.NATIVE,
        NATIVE_TOMP3_VIDEO_SUCCESS: TestIds.NATIVE,
        NATIVE_SETTING: TestIds.NATIVE,
        NATIVE_PREVIEW_SIZE: TestIds.NATIVE,
        NATIVE_RECORDING_LIMIT: TestIds.NATIVE,

        // Interstitial Ads
        INTERSTITIAL_IAP: TestIds.INTERSTITIAL,
        INTERSTITIAL_STOP_RECORD: TestIds.INTERSTITIAL,
        INTERSTITIAL_SWITCH_TAB: TestIds.INTERSTITIAL,
        INTERSTITIAL_SELECT_TOOL: TestIds.INTERSTITIAL,
        INTERSTITIAL_SELECT_TOOL_EDIT: TestIds.INTERSTITIAL,
        INTERSTITIAL_EXPORT_TRIM: TestIds.INTERSTITIAL,
        INTERSTITIAL_EXPORT_COMPRESS: TestIds.INTERSTITIAL,
        INTERSTITIAL_EXPORT_TOMP3: TestIds.INTERSTITIAL,
    },
    PROD: {
        // App Open Ads
        APP_OPEN: 'ca-app-pub-1301869270837954/2946336962',
        // Native Ads
        NATIVE_LANGUAGE: 'ca-app-pub-1301869270837954/6541580009',
        NATIVE_ONBOARDING: 'ca-app-pub-1301869270837954/5751242510',
        NATIVE_RECORDING_TAB: 'ca-app-pub-1301869270837954/2544572437',
        NATIVE_DURATION: 'ca-app-pub-1301869270837954/7292883889',
        NATIVE_QUALITY: 'ca-app-pub-1301869270837954/6264325599',
        NATIVE_CAMERA: 'ca-app-pub-1301869270837954/2304055399',
        NATIVE_GALLERY_TAB: 'ca-app-pub-1301869270837954/4589671256',
        NATIVE_RENAME: 'ca-app-pub-1301869270837954/7688980103',
        NATIVE_PLAY_SCENE: 'ca-app-pub-1301869270837954/3588801967',
        NATIVE_EDIT_TAB: 'ca-app-pub-1301869270837954/9882747578',
        NATIVE_SELECT_VIDEO: 'ca-app-pub-1301869270837954/3716600951',
        NATIVE_TRIM_VIDEO: 'ca-app-pub-1301869270837954/2402491617',
        NATIVE_TRIM_VIDEO_SUCCESS: 'ca-app-pub-1301869270837954/9990973725',
        NATIVE_COMPRESS_VIDEO: 'ca-app-pub-1301869270837954/8417235627',
        NATIVE_COMPRESS_VIDEO_SUCCESS: 'ca-app-pub-1301869270837954/3749735092',
        NATIVE_TOMP3_VIDEO: 'ca-app-pub-1301869270837954/3465319516',
        NATIVE_TOMP3_VIDEO_SUCCESS: 'ca-app-pub-1301869270837954/3310751392',
        NATIVE_SETTING: 'ca-app-pub-1301869270837954/2403519287',
        NATIVE_PREVIEW_SIZE: 'ca-app-pub-1301869270837954/8776328277',
        NATIVE_RECORDING_LIMIT: 'ca-app-pub-1301869270837954/6755172385',
        // Interstitial Ads
        INTERSTITIAL_IAP: 'ca-app-pub-1301869270837954/4629732531',
        INTERSTITIAL_STOP_RECORD: 'ca-app-pub-1301869270837954/7324673474',
        INTERSTITIAL_SWITCH_TAB: 'ca-app-pub-1301869270837954/9538745601',
        INTERSTITIAL_SELECT_TOOL: 'ca-app-pub-1301869270837954/2210919926',
        INTERSTITIAL_SELECT_TOOL_EDIT: 'ca-app-pub-1301869270837954/8677892057',
        INTERSTITIAL_EXPORT_TRIM: 'ca-app-pub-1301869270837954/6011591804',
        INTERSTITIAL_EXPORT_COMPRESS: 'ca-app-pub-1301869270837954/6051728717',
        INTERSTITIAL_EXPORT_TOMP3: 'ca-app-pub-1301869270837954/5442090715',
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

        // Interstitial ads timing control
        this.lastInterstitialAdTime = 0; // Track last interstitial ad show time
        this.INTERSTITIAL_AD_COOLDOWN = 60; // Default 60 seconds, will be overridden by Remote Config

        // Preloaded ads cache
        this.preloadedAds = {
            interstitial: {},
            rewarded: null,
            appOpen: null,
        };

        // Loading states for ads
        this.adLoadingStates = {
            interstitial: {},
            rewarded: false,
            appOpen: false,
        };

        this.isShowingTime = false;

        // Try to load Google Mobile Ads if available
        this.loadGoogleMobileAds();
    }

    // Load Google Mobile Ads if available
    loadGoogleMobileAds() {
        console.log('🔄 Loading Google Mobile Ads module...', mobileAds);
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
            // Step 1: UMP Consent flow (must run before initializing ads)
            try {
                const consentInfo = await AdsConsent.requestInfoUpdate();
                console.log('📋 Consent status:', consentInfo.status);

                if (consentInfo.isConsentFormAvailable) {
                    const { status } = await AdsConsent.loadAndShowConsentFormIfRequired();
                    console.log('📋 Consent form result:', status);
                }
            } catch (consentError) {
                console.log('⚠️ Consent flow error (continuing):', consentError);
            }

            // Step 2: Configure and initialize GMA SDK
            await mobileAds().initialize();
            console.log('✅ Google Mobile Ads module is ready');

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
        // Don't preload ads for VIP users
        if (checkVipStatus()) {
            console.log('👑 VIP user detected - skipping ad preloading');
            return;
        }

        console.log('🔄 Starting to preload all ads...');
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_IAP);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_STOP_RECORD);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_SWITCH_TAB);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_SELECT_TOOL);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_SELECT_TOOL_EDIT);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_EXPORT_TRIM);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_EXPORT_COMPRESS);
        this.preloadInterstitialAd(ADS_UNIT.INTERSTITIAL_EXPORT_TOMP3);
        // this.preloadRewardedAd();
        this.preloadAppOpenAd();
    }


    // Preload interstitial ad
    preloadInterstitialAd(adId = ADS_UNIT.INTERSTITIAL_IAP) {
        // Don't preload ads for VIP users
        if (checkVipStatus()) {
            console.log('👑 VIP user - skipping interstitial ad preload');
            return;
        }

        if (!this.isModuleLoaded || this.adLoadingStates.interstitial[adId] || this.preloadedAds.interstitial[adId]) {
            return;
        }

        const adUnitId = adId; // Use the provided ad ID

        try {
            console.log('🔄 Preloading interstitial ad...', adId);
            this.adLoadingStates.interstitial[adId] = true;

            const interstitial = this.InterstitialAd.createForAdRequest(adUnitId);

            const unsubscribeLoaded = interstitial.addAdEventListener(this.AdEventType.LOADED, () => {
                console.log('✅ Interstitial ad preloaded successfully', adId);
                this.preloadedAds.interstitial[adId] = interstitial;
                this.adLoadingStates.interstitial[adId] = false;
                unsubscribeLoaded();
                unsubscribeError();
            });

            const unsubscribeError = interstitial.addAdEventListener(this.AdEventType.ERROR, (error) => {
                console.log('❌ Failed to preload interstitial ad:', error);
                this.adLoadingStates.interstitial[adId] = false;
                unsubscribeLoaded();
                unsubscribeError();

                // Retry after 30 seconds
                setTimeout(() => this.preloadInterstitialAd(adId), 30000);
            });

            interstitial.load();
        } catch (error) {
            console.log('❌ Error preloading interstitial ad:', error);
            this.adLoadingStates.interstitial[adId] = false;
        }
    }

    // Preload rewarded ad
    preloadRewardedAd() {
        // Don't preload ads for VIP users (but rewarded ads might still be shown)
        if (checkVipStatus()) {
            console.log('👑 VIP user - skipping rewarded ad preload');
            return;
        }

        if (!this.isModuleLoaded || this.adLoadingStates.rewarded || this.preloadedAds.rewarded) {
            return;
        }

        const adUnitId = ADS_UNIT.REWARDDED;

        try {
            console.log('🔄 Preloading rewarded ad...');
            this.adLoadingStates.rewarded = true;

            const rewarded = this.RewardedAd.createForAdRequest(adUnitId);

            const unsubscribeLoaded = rewarded.addAdEventListener(this.RewardedAdEventType.LOADED, () => {
                console.log('✅ Rewarded ad preloaded successfully', adUnitId);
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
        // Don't preload ads for VIP users
        if (checkVipStatus()) {
            console.log('👑 VIP user - skipping app open ad preload');
            return;
        }

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

    // Get interstitial ad cooldown from Remote Config
    getInterstitialCooldown() {
        try {
            if (remoteConfigManager && remoteConfigManager.isInitialized) {
                const configValue = remoteConfigManager.distanceTimeToShowInterstitial();
                const cooldown = parseInt(configValue);
                return isNaN(cooldown) ? this.INTERSTITIAL_AD_COOLDOWN : cooldown;
            }
        } catch (error) {
            console.log('⚠️ Error getting interstitial cooldown from Remote Config:', error);
        }
        return this.INTERSTITIAL_AD_COOLDOWN; // Fallback to default
    }

    // Check if interstitial ad can be shown based on cooldown
    canShowInterstitialAd() {
        const currentTime = Date.now();
        const cooldown = this.getInterstitialCooldown();
        const timeSinceLastAd = currentTime - this.lastInterstitialAdTime;

        console.log('🕒 Interstitial ad timing check:');
        console.log('  Current time:', currentTime);
        console.log('  Last ad time:', this.lastInterstitialAdTime);
        console.log('  Time since last ad:', timeSinceLastAd, 'ms');
        console.log('  Required cooldown:', cooldown, 'ms');
        console.log('  Can show:', timeSinceLastAd >= cooldown);

        return timeSinceLastAd >= cooldown * 1000;
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
    async showInterstitialAd(adId, onAdClosed, onAdError, usePreloaded = true) {
        console.log('isShowingTime, canShowInterstitialAd, lastInterstitialAdTime', this.isShowingTime, this.canShowInterstitialAd(), this.lastInterstitialAdTime);
        // Don't show ads for VIP users
        if (checkVipStatus()) {
            console.log('👑 VIP user - skipping interstitial ad');
            if (onAdClosed) onAdClosed();
            return true;
        }

        // Check cooldown period for interstitial ads
        if (!this.canShowInterstitialAd() || this.isShowingTime) {
            const cooldown = this.getInterstitialCooldown();
            const timeSinceLastAd = Date.now() - this.lastInterstitialAdTime;
            const remainingTime = cooldown - timeSinceLastAd;
            console.log('⏰ Interstitial ad on cooldown, skipping (remaining:', Math.ceil(remainingTime / 1000), 'seconds)');
            if (onAdClosed) onAdClosed(); // Still call callback to not break flow
            return false;
        }

        if (!this.isAdsInitialized()) {
            console.log('❌ Cannot show interstitial ad - not initialized');
            if (onAdError) onAdError('Ads not initialized');
            return false;
        }

        this.isShowingTime = true;

        if (!this.isModuleLoaded) {
            // Mock interstitial ad - also record timestamp
            console.log('🎯 Mock Interstitial Ad: Gun Simulator Pro - Unlock more weapons!');
            this.lastInterstitialAdTime = Date.now(); // Record timestamp for mock ad too
            this.isShowingTime = false;
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log('📱 Mock interstitial ad closed');
                    if (onAdClosed) onAdClosed();
                    resolve(true);
                }, 2000);
            });
        }

        // Try to use preloaded ad first
        if (usePreloaded && this.preloadedAds.interstitial && this.preloadedAds.interstitial[adId]) {
            console.log('📺 Showing preloaded interstitial ad');
            const preloadedAd = this.preloadedAds.interstitial[adId];
            this.preloadedAds.interstitial[adId] = null; // Clear preloaded ad

            return new Promise((resolve, reject) => {
                const unsubscribeOpened = preloadedAd.addAdEventListener(this.AdEventType.OPENED, () => {
                    console.log('📺 Preloaded interstitial ad opened - recording timestamp');
                    this.lastInterstitialAdTime = Date.now(); // Record the time when ad is shown
                    this.isShowingTime = false;
                });

                const unsubscribeClosed = preloadedAd.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ Preloaded interstitial ad closed');
                    unsubscribeOpened();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdClosed) onAdClosed();
                    this.isShowingTime = false;
                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(adId), 1000);
                    resolve(true);
                });

                const unsubscribeError = preloadedAd.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ Preloaded interstitial ad error:', error);
                    unsubscribeOpened();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);

                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(adId), 1000);
                    this.isShowingTime = false;
                    reject(error);
                });

                try {
                    preloadedAd.show();
                } catch (error) {
                    console.log('❌ Error showing preloaded interstitial ad:', error);
                    unsubscribeOpened();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);

                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(adId), 1000);
                    this.isShowingTime = false;
                    reject(error);
                }
            });
        }

        // Fallback to load and show if no preloaded ad available
        try {
            console.log('📺 Loading and showing interstitial ad (no preloaded available)');
            const interstitial = this.InterstitialAd.createForAdRequest(adId);

            return new Promise((resolve, reject) => {
                const unsubscribeLoaded = interstitial.addAdEventListener(this.AdEventType.LOADED, () => {
                    console.log('📺 Interstitial ad loaded');
                    interstitial.show();
                });

                const unsubscribeOpened = interstitial.addAdEventListener(this.AdEventType.OPENED, () => {
                    console.log('📺 Fallback interstitial ad opened - recording timestamp');
                    this.lastInterstitialAdTime = Date.now(); // Record the time when ad is shown
                    this.isShowingTime = false;
                });

                const unsubscribeClosed = interstitial.addAdEventListener(this.AdEventType.CLOSED, () => {
                    console.log('✅ Interstitial ad closed');
                    unsubscribeLoaded();
                    unsubscribeOpened();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdClosed) onAdClosed();

                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(adId), 1000);
                    resolve(true);
                });

                const unsubscribeError = interstitial.addAdEventListener(this.AdEventType.ERROR, (error) => {
                    console.log('❌ Interstitial ad error:', error);
                    unsubscribeLoaded();
                    unsubscribeOpened();
                    unsubscribeClosed();
                    unsubscribeError();
                    if (onAdError) onAdError(error);

                    // Preload next ad
                    setTimeout(() => this.preloadInterstitialAd(adId), 1000);
                    this.isShowingTime = false;
                    reject(error);
                });

                // Load the ad
                interstitial.load();
            });
        } catch (error) {
            console.log('❌ Error showing interstitial ad:', error);
            if (onAdError) onAdError(error);

            // Preload next ad
            setTimeout(() => this.preloadInterstitialAd(adId), 1000);
            this.isShowingTime = false;
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
        // Don't show ads for VIP users
        if (checkVipStatus()) {
            console.log('👑 VIP user - skipping app open ad');
            return true;
        }

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
                const appOpenAd = this.AppOpenAd.createForAdRequest(ADS_UNIT.APP_OPEN, {
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

    // Open Mediation Test Suite (for debugging mediation adapters)
    async openMediationTestSuite() {
        if (!this.isModuleLoaded) {
            console.log('❌ Cannot open Mediation Test Suite - Google Mobile Ads not available');
            return false;
        }

        try {
            const GoogleMobileAdsModule = require('react-native-google-mobile-ads');
            const MobileAds = GoogleMobileAdsModule.default || GoogleMobileAdsModule.MobileAds || mobileAds;

            if (MobileAds && typeof MobileAds.openAdInspector === 'function') {
                console.log('🔍 Opening Mediation Test Suite...');
                await MobileAds.openAdInspector();
                console.log('✅ Mediation Test Suite opened');
                return true;
            } else {
                console.log('❌ openAdInspector not available in this SDK version');
                console.log('💡 Try installing Google Mobile Ads SDK v13+ for this feature');
                return false;
            }
        } catch (error) {
            console.log('❌ Error opening Mediation Test Suite:', error);
            return false;
        }
    }

    // Get current adapter initialization status
    async getMediationAdapterStatus() {
        if (!this.isModuleLoaded) {
            console.log('❌ Cannot get adapter status - Google Mobile Ads not available');
            return null;
        }

        try {
            const GoogleMobileAdsModule = require('react-native-google-mobile-ads');
            const MobileAds = GoogleMobileAdsModule.default || GoogleMobileAdsModule.MobileAds || mobileAds;

            if (MobileAds && typeof MobileAds.getInitializationStatus === 'function') {
                const status = await MobileAds.getInitializationStatus();
                console.log('📊 Current Mediation Adapter Status:');
                console.log(JSON.stringify(status, null, 2));
                return status;
            } else {
                console.log('⚠️ getInitializationStatus not available');
                return null;
            }
        } catch (error) {
            console.log('❌ Error getting adapter status:', error);
            return null;
        }
    }
}

export default new AdManager();
