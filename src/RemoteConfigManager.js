import { Platform } from 'react-native';
import { getRemoteConfig, getValue, remoteConfig } from '@react-native-firebase/remote-config';
import { getApp } from '@react-native-firebase/app';

const rc = getRemoteConfig(getApp());

class RemoteConfigManager {
    constructor() {
        this.remoteConfig = null;
        this.isInitialized = false;
        this.cachedValues = {};
        this.isValuesCached = false;
        this.defaultValues = {
            // Ads configuration
            ads_enabled: true,
            show_int_stop_record: false,
            show_int_close_iap: false,
            distance_time_to_show_interstitial: 60, // in seconds
            is_btn_exp_ontop: true,
        };
    }

    async initialize() {
        try {
            // Import Firebase modules using new modular API
            const remoteConfigModule = await import('@react-native-firebase/remote-config');
            
            // Get Remote Config instance directly
            this.remoteConfig = remoteConfigModule.default();
            
            // Set default values
            await this.remoteConfig.setDefaults(this.defaultValues);
            
            // Set configuration settings using new API
            await this.remoteConfig.setConfigSettings({
                minimumFetchIntervalMillis: __DEV__ ? 0 : 600000, // 10 minutes in production, immediate in debug
                fetchTimeoutMillis: 60000, // 1 minute timeout
            });

            // Fetch and activate
            await this.fetchAndActivate();
            
            // Cache all values after successful initialization
            await this.cacheAllValues();
            
            this.isInitialized = true;
            console.log('✅ Firebase Remote Config initialized successfully');
            
        } catch (error) {
            console.log('⚠️ Firebase Remote Config not available, using default values:', error.message);
            this.isInitialized = false;
            // Cache default values as fallback
            this.cacheDefaultValues();
        }
    }

    async fetchAndActivate() {
        try {
            if (!this.remoteConfig) return false;
            
            // Use fetchAndActivate method (combines fetch + activate)
            const activated = await this.remoteConfig.fetchAndActivate();
            if (activated) {
                console.log('🔄 Remote config fetched and activated');
                return true;
            } else {
                console.log('📱 Remote config values were already up to date');
                return true;
            }
        } catch (error) {
            console.log('❌ Error fetching remote config:', error);
            return false;
        }
    }

    async cacheAllValues() {
        try {
            console.log('🔄 Caching all remote config values...');
            this.cachedValues = {};
            
            for (const key of Object.keys(this.defaultValues)) {
                const defaultValue = this.defaultValues[key];
                
                if (this.remoteConfig) {
                    try {
                        // Get value from remote config based on type
                        if (typeof defaultValue === 'boolean') {
                            this.cachedValues[key] = this.remoteConfig.getBoolean(key);
                        } else if (typeof defaultValue === 'number') {
                            this.cachedValues[key] = this.remoteConfig.getNumber(key);
                        } else {
                            this.cachedValues[key] = this.remoteConfig.getString(key);
                        }
                        console.log(`✅ Cached ${key}:`, this.cachedValues[key], `(remote: ${this.cachedValues[key] !== defaultValue ? 'YES' : 'NO'})`);
                    } catch (error) {
                        console.log(`❌ Error caching value for ${key}:`, error);
                        this.cachedValues[key] = defaultValue;
                    }
                } else {
                    this.cachedValues[key] = defaultValue;
                    console.log(`📱 Using default for ${key}:`, defaultValue);
                }
            }
            
            this.isValuesCached = true;
            console.log('✅ All remote config values cached successfully:', this.cachedValues);
            
        } catch (error) {
            console.log('❌ Error caching remote config values:', error);
            this.cacheDefaultValues();
        }
    }

    cacheDefaultValues() {
        console.log('📱 Caching default values as fallback...');
        this.cachedValues = { ...this.defaultValues };
        this.isValuesCached = true;
        console.log('✅ Default values cached:', this.cachedValues);
    }

    getLocalValue(key) {
        // If values are cached, return from cache
        if (this.isValuesCached && this.cachedValues.hasOwnProperty(key)) {
            console.log(`📦 Getting cached value for ${key}:`, this.cachedValues[key]);
            return this.cachedValues[key];
        }
        
        // Fallback to default value if not cached
        const defaultValue = this.defaultValues[key];
        console.log(`📱 Using default value for ${key}:`, defaultValue);
        return defaultValue;
    }

    // Convenience methods for specific configurations
    
    // Ads configuration
    isAdsEnabled() {
        return this.getLocalValue('ads_enabled');
    }

    isShowIntStopRecord() {
        return this.getLocalValue('show_int_stop_record');
    }

    isShowIntCloseIAP() {
        return this.getLocalValue('show_int_close_iap');
    }
    
    distanceTimeToShowInterstitial() {
        return this.getLocalValue('distance_time_to_show_interstitial');
    }
    isBtnExpOnTop() {
        return this.getLocalValue('is_btn_exp_ontop');
    }

    // Get all current values (for debugging)
    getAllValues() {
        // Return cached values if available
        if (this.isValuesCached) {
            console.log('📦 Returning all cached values:', this.cachedValues);
            return { ...this.cachedValues };
        }
        
        // Fallback to default values
        console.log('📱 Returning default values (not cached yet):', this.defaultValues);
        return { ...this.defaultValues };
    }

    // Get config source info for debugging
    getValueWithSource(key) {
        try {
            if (this.remoteConfig && this.isInitialized) {
                const value = this.remoteConfig.getLocalValue(key);
                return {
                    value: this.getLocalValue(key),
                    source: value.getSource(), // 'remote', 'default', or 'static'
                };
            }
        } catch (error) {
            console.log(`❌ Error getting remote config value source for ${key}:`, error);
        }
        
        return {
            value: this.defaultValues[key],
            source: 'fallback'
        };
    }

    // Manual refresh method
    async refresh() {
        if (this.isInitialized) {
            const success = await this.fetchAndActivate();
            if (success) {
                // Re-cache all values after successful refresh
                await this.cacheAllValues();
            }
            return success;
        }
        return false;
    }

    // Get last fetch status
    getLastFetchStatus() {
        try {
            if (this.remoteConfig && this.isInitialized) {
                return this.remoteConfig.lastFetchStatus;
            }
        } catch (error) {
            console.log('❌ Error getting last fetch status:', error);
        }
        return 'no_fetch_yet';
    }
}

// Create singleton instance
const remoteConfigManager = new RemoteConfigManager();

export default remoteConfigManager;