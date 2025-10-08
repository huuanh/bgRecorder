import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Image,
    Dimensions,
} from 'react-native';
import { COLORS } from '../../constants';
import { NativeAdComponent } from '../NativeAdComponent';
import AdManager, { ADS_UNIT } from '../../AdManager';
import CameraModeModal from '../CameraModeModal';
import DurationModal from '../DurationModal';
import ResolutionModal from '../ResolutionModal';
import PreviewSizeModal from '../PreviewSizeModal';
import SetPasswordModal from '../SetPasswordModal';
import IAPModal from '../IAPModal';
import ChangeIconModal from '../ChangeIconModal';
import CameraSettingsManager from '../../utils/CameraSettingsManager';
import SecurityManager from '../../utils/SecurityManager';
import useIAP from '../../hooks/useIAP';
import { useVipStatus } from '../../utils/VipUtils';

const { width } = Dimensions.get('window');

const SettingsTab = () => {
    const { isVip, loading } = useVipStatus();
    
    const [settings, setSettings] = useState({
        // Video Settings
        cameraMode: 'back',
        autoSplit: false,
        duration: 3, // Default to 3 minutes
        resolution: 'HD', // Default to HD
        previewSize: 'medium',
    });

    const [securitySettings, setSecuritySettings] = useState({
        hasPassword: false,
        biometricsEnabled: false,
        appLockEnabled: false,
        autoLockDelay: 5,
    });
    
    const [showCameraModeModal, setShowCameraModeModal] = useState(false);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [showPreviewSizeModal, setShowPreviewSizeModal] = useState(false);
    const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
    const [showChangeIconModal, setShowChangeIconModal] = useState(false);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);

    // Use IAP hook
    const { showIAPModal, showIAP, hideIAP } = useIAP();

    // Load settings on component mount
    useEffect(() => {
        loadSettings();
        loadSecuritySettings();
        checkBiometricsAvailability();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await CameraSettingsManager.getSettings();
            setSettings(savedSettings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const loadSecuritySettings = async () => {
        try {
            const savedSecuritySettings = await SecurityManager.getSecuritySettings();
            setSecuritySettings(savedSecuritySettings);
        } catch (error) {
            console.error('Failed to load security settings:', error);
        }
    };

    const checkBiometricsAvailability = async () => {
        try {
            const { available } = await SecurityManager.isBiometricsAvailable();
            setBiometricsAvailable(available);
        } catch (error) {
            console.error('Failed to check biometrics availability:', error);
        }
    };

    const toggleSetting = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleCameraModeChange = () => {
        setShowCameraModeModal(true);
    };

    const handleCameraModeSelect = async (mode) => {
        try {
            await CameraSettingsManager.saveCameraMode(mode);
            setSettings(prev => ({...prev, cameraMode: mode}));
        } catch (error) {
            console.error('Failed to save camera mode:', error);
            Alert.alert('Error', 'Failed to save camera mode');
        }
    };

    const handleDurationChange = () => {
        setShowDurationModal(true);
    };

    const handleDurationSelect = async (duration) => {
        try {
            await CameraSettingsManager.saveDuration(duration);
            setSettings(prev => ({...prev, duration: duration}));
        } catch (error) {
            console.error('Failed to save duration:', error);
            Alert.alert('Error', 'Failed to save duration');
        }
    };

    const handleResolutionChange = () => {
        setShowResolutionModal(true);
    };

    const handleResolutionSelect = async (resolution) => {
        try {
            await CameraSettingsManager.saveResolution(resolution);
            setSettings(prev => ({...prev, resolution: resolution}));
        } catch (error) {
            console.error('Failed to save resolution:', error);
            Alert.alert('Error', 'Failed to save resolution');
        }
    };

    const handlePreviewSizeChange = () => {
        setShowPreviewSizeModal(true);
    };

    const handlePreviewSizeSelect = async (previewSize) => {
        try {
            await CameraSettingsManager.savePreviewSize(previewSize);
            setSettings(prev => ({...prev, previewSize: previewSize}));
        } catch (error) {
            console.error('Failed to save preview size:', error);
            Alert.alert('Error', 'Failed to save preview size');
        }
    };

    // Security handlers
    const handlePasswordSetup = () => {
        if (securitySettings.hasPassword) {
            Alert.alert(
                'Password Already Set',
                'You already have a password set. Do you want to change it?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Change Password', onPress: () => setShowSetPasswordModal(true) }
                ]
            );
        } else {
            setShowSetPasswordModal(true);
        }
    };

    const handlePasswordSet = async () => {
        await loadSecuritySettings();
        // Alert.alert('Success', 'Password has been set successfully!');
    };

    const handleBiometricToggle = async (enabled) => {
        try {
            if (enabled) {
                if (!biometricsAvailable) {
                    Alert.alert('Error', 'Biometric authentication is not available on this device');
                    return;
                }

                const success = await SecurityManager.enableBiometrics();
                if (success) {
                    await loadSecuritySettings();
                    Alert.alert('Success', 'Biometric authentication has been enabled');
                } else {
                    Alert.alert('Error', 'Failed to enable biometric authentication');
                }
            } else {
                const success = await SecurityManager.disableBiometrics();
                if (success) {
                    await loadSecuritySettings();
                    Alert.alert('Success', 'Biometric authentication has been disabled');
                } else {
                    Alert.alert('Error', 'Failed to disable biometric authentication');
                }
            }
        } catch (error) {
            console.error('Error toggling biometrics:', error);
            Alert.alert('Error', 'An error occurred while updating biometric settings');
        }
    };

    const handleRemovePassword = () => {
        Alert.alert(
            'Remove Password',
            'Are you sure you want to remove your password? This will disable all security features.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('🔄 Starting password removal process...');
                            
                            // Show loading state
                            // setLoading(true);
                            
                            // Add small delay to prevent race conditions
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            // Remove password with detailed error catching
                            const result = await SecurityManager.removePassword();
                            console.log('📋 Password removal result:', result);
                            
                            // Reload settings to reflect changes
                            await loadSecuritySettings();
                            
                            // Hide loading
                            // setLoading(false);
                            
                            // Alert.alert(
                            //     'Success', 
                            //     'Password removed successfully. All security features have been disabled.',
                            //     [{ text: 'OK' }]
                            // );
                        } catch (error) {
                            // setLoading(false);
                            console.error('❌ Detailed error removing password:', {
                                message: error.message,
                                stack: error.stack,
                                name: error.name
                            });
                            
                            Alert.alert(
                                'Error', 
                                `Unable to remove password.\n\nDetails: ${error.message || 'Unknown error occurred'}`,
                                [{ text: 'OK' }]
                            );
                        }
                    }
                }
            ]
        );
    };

    const handleOptionPress = (option) => {
        switch (option) {
            case 'changeIcon':
                setShowChangeIconModal(true);
                break;
            case 'setPassword':
                handlePasswordSetup();
                break;
            case 'saveLocation':
                Alert.alert('Save Location', 'Feature coming soon!');
                break;
            case 'language':
                Alert.alert('Language', 'Feature coming soon!');
                break;
            case 'share':
                Alert.alert('Share App', 'Feature coming soon!');
                break;
            case 'privacy':
                Alert.alert('Privacy Policy', 'Feature coming soon!');
                break;
            case 'upgrade':
                showIAP('settings_vip_banner');
                break;
            default:
                break;
        }
    };

    const renderSettingItem = (icon, title, subtitle, hasSwitch = false, switchKey = null, onPress = null) => (
        <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onPress}
            disabled={hasSwitch}
        >
            <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                    <Text style={styles.settingIconText}>{icon}</Text>
                </View>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.settingSubtitle}>{subtitle}</Text>
                    )}
                </View>
            </View>
            <View style={styles.settingRight}>
                {hasSwitch ? (
                    <Switch
                        value={settings[switchKey]}
                        onValueChange={() => handleSettingToggle(switchKey)}
                        trackColor={{ false: '#E5E7EB', true: '#1E3A8A' }}
                        thumbColor={settings[switchKey] ? '#FFFFFF' : '#FFFFFF'}
                    />
                ) : (
                    <Text style={styles.settingArrow}>›</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = (title) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const renderVIPBanner = () => (
        <TouchableOpacity 
            style={styles.vipBanner}
            onPress={() => handleOptionPress('upgrade')}
        >
            <View style={styles.vipContent}>
                <View style={styles.vipLeft}>
                    <Text style={styles.vipTitle}>BECOME A VIP MEMBER</Text>
                    <Text style={styles.vipSubtitle}>Enjoy Premium Package with exclusive features.</Text>
                    <Text style={styles.vipButton}>Upgrade</Text>
                </View>
                <View style={styles.vipRight}>
                    <Image 
                        source={require('../../../assets/setting/diamond.png')} 
                        style={{ width: 100, height: 100, resizeMode: 'contain' }} 
                    />
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderSettingItemWithValue = (iconSource, title, subtitle, hasSwitch = false, switchKey = null, onPress = null, currentValue = null) => {
        const getSwitchValue = () => {
            // Handle security settings
            if (switchKey === 'biometricsEnabled' || switchKey === 'appLockEnabled') {
                return securitySettings[switchKey];
            }
            // Handle regular settings
            return settings[switchKey];
        };

        const handleSwitchChange = async () => {
            // Handle security switches
            if (switchKey === 'biometricsEnabled') {
                handleBiometricToggle(!securitySettings.biometricsEnabled);
            } else if (switchKey === 'autoSplit') {
                // Handle auto split toggle
                const newValue = !settings.autoSplit;
                try {
                    await CameraSettingsManager.saveAutoSplit(newValue);
                    setSettings(prev => ({...prev, autoSplit: newValue}));
                    console.log('✅ Auto Split setting saved:', newValue);
                } catch (error) {
                    console.error('❌ Failed to save auto split:', error);
                    Alert.alert('Error', 'Failed to save auto split setting');
                }
            } else {
                // Handle other regular switches
                setSettings(prev => ({...prev, [switchKey]: !prev[switchKey]}));
            }
        };

        return (
            <TouchableOpacity 
                style={styles.settingItem} 
                onPress={onPress}
                disabled={hasSwitch}
            >
                <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                        <Image 
                            source={iconSource} 
                            style={styles.settingIconImage}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>{title}</Text>
                    </View>
                </View>
                <View style={styles.settingRight}>
                    {currentValue && <Text style={styles.currentValue}>{currentValue}</Text>}
                    {hasSwitch ? (
                        <Switch
                            value={getSwitchValue()}
                            onValueChange={handleSwitchChange}
                            trackColor={{ false: '#E5E7EB', true: COLORS.TERTIARY }}
                            thumbColor={getSwitchValue() ? '#FFFFFF' : '#FFFFFF'}
                        />
                    ) : (
                        <Text style={styles.settingArrow}>›</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderSection = (title, items) => (
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <View style={styles.sectionContent}>
                {items.map((item, index) => (
                    <View key={index}>
                        {item}
                        {index < items.length - 1 && <View style={styles.separator} />}
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* VIP Banner */}
            {!isVip && renderVIPBanner()}

            {/* Video Settings Section */}
            {renderSection('Video Settings', [
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/icon_swap.png'), 
                    'Camera', 
                    'Select camera mode', 
                    false, 
                    null, 
                    handleCameraModeChange,
                    settings.cameraMode
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_autosplit.png'), 
                    'Auto Split', 
                    'Automatically split long recordings', 
                    true, 
                    'autoSplit'
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/icon_clock.png'), 
                    'Duration', 
                    'Maximum recording length', 
                    false, 
                    null, 
                    handleDurationChange,
                    settings.duration === -1 ? 'Unlimited' : `${settings.duration} mins`
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/quality.png'), 
                    'Resolution', 
                    'Video quality setting', 
                    false, 
                    null, 
                    handleResolutionChange,
                    settings.resolution
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/icon_preview.png'), 
                    'Preview Size', 
                    'Recording preview window size', 
                    false, 
                    null, 
                    handlePreviewSizeChange,
                    settings.previewSize
                ),
            ])}

            {/* Native Ad */}
            <View style={styles.adContainer}>
                <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
            </View>

            {/* Security Section */}
            {renderSection('Security & Privacy', [
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_password.png'), 
                    securitySettings.hasPassword ? 'Change Password' : 'Set Password', 
                    securitySettings.hasPassword ? 'App locks automatically with password' : 'Set password to auto-lock app', 
                    false, 
                    null, 
                    handlePasswordSetup,
                    securitySettings.hasPassword ? 'Enabled' : 'Disabled'
                ),
                ...(securitySettings.hasPassword ? [
                    renderSettingItemWithValue(
                        require('../../../assets/home/ic/ic_remove.png'), 
                        'Remove Password', 
                        'Remove password protection', 
                        false, 
                        null, 
                        handleRemovePassword
                    )
                ] : []),
                ...(biometricsAvailable ? [
                    renderSettingItemWithValue(
                        require('../../../assets/home/ic/ic_fingerprint.png'), 
                        'Biometric Lock', 
                        'Use fingerprint/face to unlock app', 
                        true, 
                        'biometricsEnabled'
                    )
                ] : [])
            ])}

            {/* Other Section */}
            {renderSection('Other', [
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_changeicon.png'), 
                    'Change Icon', 
                    'Customize app icon', 
                    false, 
                    null, 
                    () => handleOptionPress('changeIcon')
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_lang.png'), 
                    'Language', 
                    'Change app language', 
                    false, 
                    null, 
                    () => handleOptionPress('language')
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_share.png'), 
                    'Share', 
                    'Share this app with friends', 
                    false, 
                    null, 
                    () => handleOptionPress('share')
                ),
                renderSettingItemWithValue(
                    require('../../../assets/home/ic/ic_privacy.png'), 
                    'Privacy Policy', 
                    'View privacy policy', 
                    false, 
                    null, 
                    () => handleOptionPress('privacy')
                ),
            ])}
            
            {/* Camera Mode Selection Modal */}
            <CameraModeModal
                visible={showCameraModeModal}
                onClose={() => setShowCameraModeModal(false)}
                currentMode={settings.cameraMode}
                onSelect={handleCameraModeSelect}
            />

            {/* Duration Selection Modal */}
            <DurationModal
                visible={showDurationModal}
                onClose={() => setShowDurationModal(false)}
                currentDuration={settings.duration}
                onSelect={handleDurationSelect}
                onShowIAP={() => showIAP('settings_duration')}
            />

            {/* Resolution Selection Modal */}
            <ResolutionModal
                visible={showResolutionModal}
                onClose={() => setShowResolutionModal(false)}
                currentResolution={settings.resolution}
                onSelect={handleResolutionSelect}
                onShowIAP={() => showIAP('settings_resolution')}
            />

            {/* Preview Size Selection Modal */}
            <PreviewSizeModal
                visible={showPreviewSizeModal}
                onClose={() => setShowPreviewSizeModal(false)}
                currentPreviewSize={settings.previewSize}
                onSelect={handlePreviewSizeSelect}
            />

            {/* Set Password Modal */}
            <SetPasswordModal
                visible={showSetPasswordModal}
                onClose={() => setShowSetPasswordModal(false)}
                onPasswordSet={handlePasswordSet}
            />

            {/* Change Icon Modal */}
            <ChangeIconModal
                visible={showChangeIconModal}
                onClose={() => setShowChangeIconModal(false)}
            />

            {/* IAP Modal */}
            <IAPModal
                visible={showIAPModal}
                onClose={hideIAP}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    vipBanner: {
        backgroundColor: COLORS.PRIMARY,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    vipActiveBanner: {
        backgroundColor: '#FFD700', // Gold background for VIP
        borderWidth: 2,
        borderColor: '#FFA500',
    },
    vipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
    },
    vipLeft: {
        flex: 1,
    },
    vipTitle: {
        fontSize: 20,
        fontWeight: 800,
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    vipSubtitle: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    vipRight: {
        marginLeft: 5,
    },
    vipButton: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.ACTIVE,
        borderRadius: 8,
        textAlign: 'center',
    },
    adContainer: {
        marginBottom: 16,
        overflow: 'hidden',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.LIGHT_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingIconImage: {
        width: 20,
        height: 20,
        tintColor: COLORS.TEXT_PRIMARY,
    },
    settingInfo: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 2,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    currentValue: {
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        marginRight: 8,
    },
    settingArrow: {
        fontSize: 20,
        color: COLORS.TEXT_SECONDARY,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.LIGHT_GRAY,
        marginLeft: 68,
    },
});

export default SettingsTab;