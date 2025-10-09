import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import NativeIconModule from './NativeIconModule';
class IconManager {
    constructor() {
        this.selectedIcon = 'default';
    }

    async initialize() {
        try {
            // Try to get current icon from native module first
            if (Platform.OS === 'android') {
                const currentIcon = await NativeIconModule.getCurrentIcon();
                this.selectedIcon = currentIcon;
                await AsyncStorage.setItem('@selected_app_icon', currentIcon);
            } else {
                const savedIcon = await AsyncStorage.getItem('@selected_app_icon');
                if (savedIcon) {
                    this.selectedIcon = savedIcon;
                }
            }
            console.log('🎨 IconManager initialized with icon:', this.selectedIcon);
        } catch (error) {
            console.log('❌ Error initializing IconManager:', error);
        }
    }

    async changeIcon(iconId) {
        try {
            if (Platform.OS === 'android') {
                // Show warning about app restart
                try {
                    // Save preference first
                    await AsyncStorage.setItem('@selected_app_icon', iconId);
                    this.selectedIcon = iconId;
                    
                    // Use native Android module
                    const result = await NativeIconModule.changeIcon(iconId);
                    console.log('✅ Android icon changed:', result);
                    // resolve(true);
                } catch (error) {
                    console.error('❌ Error in icon change:', error);
                    Alert.alert('Error', 'Failed to change icon: ' + error.message);
                    // resolve(false);
                }
                
            } else if (Platform.OS === 'ios') {
                // For iOS - would use react-native-alternate-icons or show message
                await AsyncStorage.setItem('@selected_app_icon', iconId);
                this.selectedIcon = iconId;
                
                Alert.alert(
                    'Icon Selection Saved',
                    `Icon preference saved for "${this.getIconName(iconId)}".\n\nNote: Dynamic icon changing on iOS requires additional setup.`,
                    [{ text: 'OK' }]
                );
                
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Error changing icon:', error);
            Alert.alert('Error', 'Failed to change app icon: ' + error.message);
            return false;
        }
    }

    getSelectedIcon() {
        return this.selectedIcon;
    }

    async getSelectedIconAsync() {
        try {
            const savedIcon = await AsyncStorage.getItem('@selected_app_icon');
            return savedIcon || 'default';
        } catch (error) {
            console.log('❌ Error getting selected icon:', error);
            return 'default';
        }
    }

    async isIconChangeSupported() {
        if (Platform.OS === 'android') {
            const result = await NativeIconModule.isIconChangeSupported();
            return result.supported;
        } else if (Platform.OS === 'ios') {
            // For iOS, would check if react-native-alternate-icons is available
            return false; // Currently not implemented for iOS
        }
        
        return false;
    }

    getIconName(iconId) {
        if (iconId === 'default') return 'Default';
        
        const config = this.getIconConfig();
        for (const category of config.categories) {
            const icon = category.icons.find(icon => icon.id === iconId);
            if (icon) return icon.name;
        }
        return 'Unknown';
    }

    getIconConfig() {
        return {
            categories: [
                {
                    title: 'Browser Icons',
                    icons: [
                        { id: 'br1', name: 'Chrome Style', description: 'Chrome-inspired design' },
                        { id: 'br2', name: 'Firefox Style', description: 'Firefox-inspired design' },
                        { id: 'br3', name: 'Safari Style', description: 'Safari-inspired design' },
                    ]
                },
                {
                    title: 'Computer Icons',
                    icons: [
                        { id: 'cac1', name: 'Classic PC', description: 'Retro computer style' },
                        { id: 'cac2', name: 'Modern PC', description: 'Modern computer design' },
                        { id: 'cac3', name: 'Gaming PC', description: 'Gaming-focused design' },
                    ]
                },
                {
                    title: 'Weather Icons',
                    icons: [
                        { id: 'we1', name: 'Sunny', description: 'Bright sunny weather' },
                        { id: 'we2', name: 'Cloudy', description: 'Cloudy weather theme' },
                        { id: 'we3', name: 'Rainy', description: 'Rainy weather theme' },
                    ]
                }
            ],
            defaultIcon: {
                id: 'default',
                name: 'Default',
                description: 'Original app icon'
            }
        };
    }
}

// Export singleton instance
const iconManager = new IconManager();
export default iconManager;