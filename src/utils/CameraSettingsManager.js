import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMERA_SETTINGS_KEY = 'camera_settings';

class CameraSettingsManager {
    static async saveCameraMode(mode) {
        try {
            const settings = await this.getSettings();
            settings.cameraMode = mode;
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
            console.log('✅ Camera mode saved:', mode);
        } catch (error) {
            console.error('❌ Failed to save camera mode:', error);
        }
    }

    static async saveDuration(duration) {
        try {
            const settings = await this.getSettings();
            settings.duration = duration;
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
            console.log('✅ Duration saved:', duration);
        } catch (error) {
            console.error('❌ Failed to save duration:', error);
        }
    }

    static async saveResolution(resolution) {
        try {
            const settings = await this.getSettings();
            settings.resolution = resolution;
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
            console.log('✅ Resolution saved:', resolution);
        } catch (error) {
            console.error('❌ Failed to save resolution:', error);
        }
    }

    static async saveAutoSplit(autoSplit) {
        try {
            const settings = await this.getSettings();
            settings.autoSplit = autoSplit;
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
            console.log('✅ Auto Split saved:', autoSplit);
        } catch (error) {
            console.error('❌ Failed to save auto split:', error);
        }
    }

    static async getCameraMode() {
        try {
            const settings = await this.getSettings();
            return settings.cameraMode || 'back'; // Default to back camera
        } catch (error) {
            console.error('❌ Failed to get camera mode:', error);
            return 'back';
        }
    }

    static async saveRecordingSettings(settings) {
        try {
            const currentSettings = await this.getSettings();
            const updatedSettings = { ...currentSettings, ...settings };
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(updatedSettings));
            console.log('✅ Recording settings saved:', settings);
        } catch (error) {
            console.error('❌ Failed to save recording settings:', error);
        }
    }

    static async getSettings() {
        try {
            const settingsString = await AsyncStorage.getItem(CAMERA_SETTINGS_KEY);
            if (settingsString) {
                return JSON.parse(settingsString);
            }
            return {
                cameraMode: 'back',
                autoSplit: false,
                duration: 3, // Default to 3 minutes
                resolution: 'HD', // Default to HD
                previewSize: 'large',
            };
        } catch (error) {
            console.error('❌ Failed to get settings:', error);
            return {
                cameraMode: 'back',
                autoSplit: false, 
                duration: 3, // Default to 3 minutes
                resolution: 'HD', // Default to HD
                previewSize: 'large',
            };
        }
    }

    static getVideoSize(resolution) {
        switch (resolution) {
            case 'SD':
                return { width: 640, height: 360 };
            case 'HD':
                return { width: 720, height: 480 };
            case 'Full HD':
                return { width: 1280, height: 720 };
            default:
                return { width: 720, height: 480 }; // Default to HD
        }
    }

    static async savePreviewSize(previewSize) {
        try {
            const currentSettings = await this.getSettings();
            const updatedSettings = {
                ...currentSettings,
                previewSize: previewSize
            };
            await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(updatedSettings));
            console.log('✅ Preview size saved:', previewSize);
        } catch (error) {
            console.error('❌ Failed to save preview size:', error);
            throw error;
        }
    }

    static getPreviewSize(previewSizeId) {
        switch (previewSizeId) {
            case 'small':
                return { width: 135, height: 180 }; // 3:4 ratio - portrait orientation
            case 'medium':
                return { width: 180, height: 240 }; // 3:4 ratio - portrait orientation  
            case 'large':
                return { width: 225, height: 300 }; // 3:4 ratio - portrait orientation
            default:
                return { width: 180, height: 240 }; // Default to medium
        }
    }

    static async clearSettings() {
        try {
            await AsyncStorage.removeItem(CAMERA_SETTINGS_KEY);
            console.log('✅ Camera settings cleared');
        } catch (error) {
            console.error('❌ Failed to clear settings:', error);
        }
    }
}

export default CameraSettingsManager;