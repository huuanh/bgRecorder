import RemoteConfigManager from './RemoteConfigManager';

// Try to import Firebase Analytics, fallback if not available
let analytics = null;
try {
    analytics = require('@react-native-firebase/analytics').default;
} catch (error) {
    console.log('📊 Firebase Analytics not available, using fallback logging');
}

class AnalyticsManager {
    constructor() {
        this.isInitialized = false;
        this.hasFirebaseAnalytics = analytics !== null;
    }

    async initialize() {
        try {
            if (this.hasFirebaseAnalytics) {
                // Set analytics collection enabled based on remote config
                const isEnabled = RemoteConfigManager.isAnalyticsEnabled();
                await analytics().setAnalyticsCollectionEnabled(isEnabled);
                console.log('📊 Firebase Analytics initialized, enabled:', isEnabled);
            } else {
                console.log('📊 Analytics initialized with fallback logging (Firebase not available)');
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.log('❌ Analytics initialization failed:', error);
            console.log('📊 Falling back to console logging');
            this.isInitialized = true; // Still mark as initialized for fallback
            this.hasFirebaseAnalytics = false;
            return true; // Return true to not block app initialization
        }
    }

    async logEvent(eventName, parameters = {}) {
        try {
            if (!this.isInitialized) {
                console.log('📊 Analytics not initialized, skipping event:', eventName);
                return;
            }

            const isEnabled = RemoteConfigManager.isAnalyticsEnabled();
            if (!isEnabled) {
                console.log('📊 Analytics disabled, skipping event:', eventName);
                return;
            }

            if (this.hasFirebaseAnalytics) {
                // Use Firebase Analytics if available
                await analytics().logEvent(eventName, parameters);
                console.log('📊 Firebase Analytics event logged:', eventName, parameters);
            } else {
                // Fallback to console logging
                console.log('📊 Analytics event (fallback):', eventName, parameters);
            }
        } catch (error) {
            console.log('❌ Analytics event failed:', eventName, error);
            // Fallback to console logging on error
            console.log('📊 Analytics event (fallback due to error):', eventName, parameters);
        }
    }

    // Ad Events
    async logAppOpenAdsLoad(success = true) {
        await this.logEvent('appopen_ads_load', {
            success: success,
        });
    }

    async logNativeAdsTutorialLoad(success = true) {
        await this.logEvent('native_ads_tutorial_load', {
            success: success,
        });
    }

    async logNativeAdsHomeLoad(success = true) {
        await this.logEvent('native_ads_home_load', {
            success: success,
        });
    }

    async logNativeAdsCrackScreenLoad(success = true) {
        await this.logEvent('native_ads_crackscreen_load', {
            success: success,
        });
    }

    async logNativeAdsHappyBdayLoad(success = true) {
        await this.logEvent('native_ads_happybday_load', {
            success: success,
        });
    }

    async logNativeAdsDestroyLoad(success = true) {
        await this.logEvent('native_ads_destroy_load', {
            success: success,
        });
    }

    async logNativeAdsGunLoad(success = true) {
        await this.logEvent('native_ads_gun_load', {
            success: success,
        });
    }

    async logBannerInGameGunLoad(success = true) {
        await this.logEvent('banner_in_game_gun_load', {
            success: success,
        });
    }

    // User Interaction Events
    async logHomeClick(screenName) {
        await this.logEvent('home_click', {
            screen: screenName
        });
    }

    async logCrackEffectShow(crackName) {
        await this.logEvent('crack_effect_show', {
            crack: crackName
        });
    }

    async logHappyBirthdayVideoShow(id) {
        await this.logEvent('hpbd_video_show', {
            id: id
        });
    }

    async logDestroyItemShow(itemId) {
        await this.logEvent('destroy_item_show', {
            id: itemId
        });
    }

    async logGunItemShow(gunName) {
        await this.logEvent('gun_item_show', {
            name: gunName
        });
    }

    // Screen Events
    async logScreenView(screenName, screenClass = null) {
        await this.logEvent('screen_view', {
            screen_name: screenName,
            screen_class: screenClass || screenName
        });
    }

    // Custom Events for App Features
    async logFeatureUsed(featureName, parameters = {}) {
        await this.logEvent('feature_used', {
            feature_name: featureName,
            ...parameters
        });
    }

    async logAdInteraction(adType, action, success = true) {
        await this.logEvent('ad_interaction', {
            ad_type: adType,
            action: action,
            success: success
        });
    }

    async logUserEngagement(engagementType, duration = null) {
        const params = {
            engagement_type: engagementType
        };
        
        if (duration !== null) {
            params.engagement_time_msec = duration;
        }
        
        await this.logEvent('user_engagement', params);
    }

    // User Property Methods
    async setUserProperty(name, value) {
        try {
            if (!this.isInitialized) {
                console.log('📊 Analytics not initialized, skipping user property:', name);
                return;
            }

            const isEnabled = RemoteConfigManager.isAnalyticsEnabled();
            if (!isEnabled) {
                console.log('📊 Analytics disabled, skipping user property:', name);
                return;
            }

            if (this.hasFirebaseAnalytics) {
                // Use Firebase Analytics if available
                await analytics().setUserProperty(name, value);
                console.log('📊 Firebase user property set:', name, value);
            } else {
                // Fallback to console logging
                console.log('📊 User property (fallback):', name, value);
            }
        } catch (error) {
            console.log('❌ Set user property failed:', name, error);
            // Fallback to console logging on error
            console.log('📊 User property (fallback due to error):', name, value);
        }
    }

    async setUserId(userId) {
        try {
            if (!this.isInitialized) {
                console.log('📊 Analytics not initialized, skipping user ID');
                return;
            }

            const isEnabled = RemoteConfigManager.isAnalyticsEnabled();
            if (!isEnabled) {
                console.log('📊 Analytics disabled, skipping user ID');
                return;
            }

            if (this.hasFirebaseAnalytics) {
                // Use Firebase Analytics if available
                await analytics().setUserId(userId);
                console.log('📊 Firebase user ID set:', userId);
            } else {
                // Fallback to console logging
                console.log('📊 User ID (fallback):', userId);
            }
        } catch (error) {
            console.log('❌ Set user ID failed:', error);
            // Fallback to console logging on error
            console.log('📊 User ID (fallback due to error):', userId);
        }
    }
}

export default new AnalyticsManager();
