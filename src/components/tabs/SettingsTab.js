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
import CameraSettingsManager from '../../utils/CameraSettingsManager';

const { width } = Dimensions.get('window');

const SettingsTab = () => {
    const [settings, setSettings] = useState({
        // Video Settings
        cameraMode: 'back',
        autoSplit: false,
        duration: 3, // Default to 3 minutes
        resolution: 'HD', // Default to HD
        previewSize: 'medium',
    });
    
    const [showCameraModeModal, setShowCameraModeModal] = useState(false);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [showPreviewSizeModal, setShowPreviewSizeModal] = useState(false);

    // Load settings on component mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await CameraSettingsManager.getSettings();
            setSettings(savedSettings);
        } catch (error) {
            console.error('Failed to load settings:', error);
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

    const handleOptionPress = (option) => {
        switch (option) {
            case 'changeIcon':
                Alert.alert('Change Icon', 'Feature coming soon!');
                break;
            case 'setPassword':
                Alert.alert('Set Password', 'Feature coming soon!');
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
                Alert.alert('Upgrade to VIP', 'Get premium features with VIP membership!');
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

    const renderSettingItemWithValue = (iconSource, title, subtitle, hasSwitch = false, switchKey = null, onPress = null, currentValue = null) => (
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
                        value={settings[switchKey]}
                        onValueChange={() => setSettings(prev => ({...prev, [switchKey]: !prev[switchKey]}))}
                        trackColor={{ false: '#E5E7EB', true: COLORS.PRIMARY }}
                        thumbColor={settings[switchKey] ? '#FFFFFF' : '#FFFFFF'}
                    />
                ) : (
                    <Text style={styles.settingArrow}>›</Text>
                )}
            </View>
        </TouchableOpacity>
    );

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
            {renderVIPBanner()}

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
                    require('../../../assets/home/ic/ic_password.png'), 
                    'Set Password', 
                    'Protect app with password', 
                    false, 
                    null, 
                    () => handleOptionPress('setPassword')
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
            />

            {/* Resolution Selection Modal */}
            <ResolutionModal
                visible={showResolutionModal}
                onClose={() => setShowResolutionModal(false)}
                currentResolution={settings.resolution}
                onSelect={handleResolutionSelect}
            />

            {/* Preview Size Selection Modal */}
            <PreviewSizeModal
                visible={showPreviewSizeModal}
                onClose={() => setShowPreviewSizeModal(false)}
                currentPreviewSize={settings.previewSize}
                onSelect={handlePreviewSizeSelect}
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