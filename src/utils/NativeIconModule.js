import { NativeModules, Platform } from 'react-native';

const { IconChangeModule } = NativeModules;

class NativeIconModule {
    constructor() {
        this.isSupported = Platform.OS === 'android' && IconChangeModule;
    }

    async changeIcon(iconId) {
        if (!this.isSupported) {
            throw new Error('Icon change is not supported on this platform');
        }

        try {
            const result = await IconChangeModule.changeIcon(iconId);
            console.log('✅ Native icon change result:', result);
            return result;
        } catch (error) {
            console.error('❌ Native icon change error:', error);
            throw error;
        }
    }

    async getCurrentIcon() {
        if (!this.isSupported) {
            return 'default';
        }

        try {
            const result = await IconChangeModule.getCurrentIcon();
            console.log('📱 Current native icon:', result);
            return result.currentIcon || 'default';
        } catch (error) {
            console.error('❌ Error getting current icon:', error);
            return 'default';
        }
    }

    async isIconChangeSupported() {
        if (!this.isSupported) {
            return { supported: false, platform: Platform.OS };
        }

        try {
            const result = await IconChangeModule.isIconChangeSupported();
            return result;
        } catch (error) {
            console.error('❌ Error checking icon support:', error);
            return { supported: false, platform: Platform.OS };
        }
    }

    getIconMapping() {
        return {
            'default': 'default',
            'br1': 'br1',
            'br2': 'br2', 
            'br3': 'br3',
            'cac1': 'cac1',
            'cac2': 'cac2',
            'cac3': 'cac3',
            'we1': 'we1',
            'we2': 'we2',
            'we3': 'we3'
        };
    }
}

// Export singleton instance
const nativeIconModule = new NativeIconModule();
export default nativeIconModule;