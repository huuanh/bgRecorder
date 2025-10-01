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
                duration: 30,
                resolution: '720p',
                previewSize: 'medium',
            };
        } catch (error) {
            console.error('❌ Failed to get settings:', error);
            return {
                cameraMode: 'back',
                autoSplit: false, 
                duration: 30,
                resolution: '720p',
                previewSize: 'medium',
            };
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