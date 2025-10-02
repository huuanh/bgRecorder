import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';

const SECURITY_SETTINGS_KEY = 'security_settings';
const PASSWORD_SERVICE = 'BgRecorderPassword';

class SecurityManager {
    constructor() {
        this.biometrics = new ReactNativeBiometrics();
    }

    // Check if biometrics is available
    static async isBiometricsAvailable() {
        try {
            const rnBiometrics = new ReactNativeBiometrics();
            const { available, biometryType } = await rnBiometrics.isSensorAvailable();
            return { available, biometryType };
        } catch (error) {
            console.error('Error checking biometrics:', error);
            return { available: false, biometryType: null };
        }
    }

    // Save password to keychain
    static async savePassword(password) {
        try {
            await Keychain.setGenericPassword(
                'BgRecorderUser',
                password,
                { service: PASSWORD_SERVICE }
            );
            
            // Save security settings - automatically enable app lock when password is set
            const settings = await this.getSecuritySettings();
            await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify({
                ...settings,
                hasPassword: true,
                passwordSetAt: Date.now(),
                appLockEnabled: true  // Auto enable app lock when password is set
            }));
            
            console.log('✅ Password saved successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to save password:', error);
            return false;
        }
    }

    // Verify password
    static async verifyPassword(inputPassword) {
        try {
            const credentials = await Keychain.getGenericPassword({ service: PASSWORD_SERVICE });
            if (credentials && credentials.password === inputPassword) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Failed to verify password:', error);
            return false;
        }
    }

    // Enable biometric authentication
    static async enableBiometrics() {
        try {
            const { available } = await this.isBiometricsAvailable();
            if (!available) {
                throw new Error('Biometrics not available on this device');
            }

            // Create biometric key pair
            const rnBiometrics = new ReactNativeBiometrics();
            const { keysExist } = await rnBiometrics.biometricKeysExist();
            
            if (!keysExist) {
                const { publicKey } = await rnBiometrics.createKeys();
                console.log('Biometric keys created:', publicKey);
            }

            // Save biometric settings
            const settings = await this.getSecuritySettings();
            await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify({
                ...settings,
                biometricsEnabled: true,
                biometricsSetAt: Date.now()
            }));

            console.log('✅ Biometrics enabled successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to enable biometrics:', error);
            return false;
        }
    }

    // Authenticate with biometrics
    static async authenticateWithBiometrics(promptMessage = 'Authenticate to access BgRecorder') {
        try {
            const rnBiometrics = new ReactNativeBiometrics();
            const { success, signature } = await rnBiometrics.createSignature({
                promptMessage,
                payload: 'BgRecorderAuth_' + Date.now(),
            });

            return success;
        } catch (error) {
            console.error('❌ Biometric authentication failed:', error);
            return false;
        }
    }

    // Get security settings
    static async getSecuritySettings() {
        try {
            const settingsString = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
            if (settingsString) {
                return JSON.parse(settingsString);
            }
            return {
                hasPassword: false,
                biometricsEnabled: false,
                appLockEnabled: false,
                autoLockDelay: 5, // minutes
                passwordSetAt: null,
                biometricsSetAt: null
            };
        } catch (error) {
            console.error('❌ Failed to get security settings:', error);
            return {
                hasPassword: false,
                biometricsEnabled: false,
                appLockEnabled: false,
                autoLockDelay: 5,
                passwordSetAt: null,
                biometricsSetAt: null
            };
        }
    }

    // Save security settings
    static async saveSecuritySettings(settings) {
        try {
            const currentSettings = await this.getSecuritySettings();
            const updatedSettings = { ...currentSettings, ...settings };
            await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updatedSettings));
            console.log('✅ Security settings saved:', settings);
            return true;
        } catch (error) {
            console.error('❌ Failed to save security settings:', error);
            return false;
        }
    }

    // Remove password
    static async removePassword() {
        try {
            console.log('🔄 Starting password removal...');
            
            // Step 1: Remove keychain credentials safely
            try {
                // Check if credentials exist by trying to get them
                const credentials = await Keychain.getGenericPassword({ service: PASSWORD_SERVICE });
                if (credentials && credentials.username) {
                    // Use resetGenericPassword to properly remove
                    await Keychain.resetGenericPassword({ service: PASSWORD_SERVICE });
                    console.log('✅ Keychain credentials removed');
                } else {
                    console.log('ℹ️ No keychain credentials found to remove');
                }
            } catch (keychainError) {
                console.error('⚠️ Error removing keychain credentials:', keychainError);
                // Continue with settings update even if keychain fails
            }
            
            // Step 2: Disable biometrics safely (if enabled)
            try {
                const settings = await this.getSecuritySettings();
                if (settings.biometricsEnabled) {
                    console.log('🔄 Disabling biometrics...');
                    await this.disableBiometrics();
                }
            } catch (biometricsError) {
                console.error('⚠️ Error disabling biometrics:', biometricsError);
                // Continue with settings update even if biometrics cleanup fails
            }
            
            // Step 3: Update settings with complete security reset
            try {
                const settings = await this.getSecuritySettings();
                const updatedSettings = {
                    ...settings,
                    hasPassword: false,
                    passwordSetAt: null,
                    appLockEnabled: false, // Disable app lock when password removed
                    biometricsEnabled: false, // Disable biometrics when password removed
                    biometricsSetAt: null
                };
                
                await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updatedSettings));
                console.log('✅ Security settings updated');
            } catch (storageError) {
                console.error('❌ Error updating security settings:', storageError);
                throw storageError;
            }
            
            console.log('✅ Password removal completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to remove password:', error);
            throw new Error(`Password removal failed: ${error.message}`);
        }
    }

    // Disable biometrics
    static async disableBiometrics() {
        try {
            const rnBiometrics = new ReactNativeBiometrics();
            await rnBiometrics.deleteKeys();
            
            const settings = await this.getSecuritySettings();
            await AsyncStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify({
                ...settings,
                biometricsEnabled: false,
                biometricsSetAt: null
            }));
            
            console.log('✅ Biometrics disabled successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to disable biometrics:', error);
            return false;
        }
    }

    // Check if app is locked
    static async isAppLocked() {
        try {
            const settings = await this.getSecuritySettings();
            return settings.appLockEnabled && (settings.hasPassword || settings.biometricsEnabled);
        } catch (error) {
            console.error('❌ Failed to check app lock status:', error);
            return false;
        }
    }

    // Clear all security data
    static async clearAllSecurityData() {
        try {
            await this.removePassword();
            await this.disableBiometrics();
            await AsyncStorage.removeItem(SECURITY_SETTINGS_KEY);
            console.log('✅ All security data cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear security data:', error);
            return false;
        }
    }
}

export default SecurityManager;