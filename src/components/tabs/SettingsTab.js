import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { COLORS } from '../../constants';

const SettingsTab = () => {
    const [settings, setSettings] = useState({
        notifications: true,
        autoSave: true,
        highQuality: false,
        vibration: true,
        darkMode: false,
        autoDelete: false,
    });

    const handleSettingToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleOptionPress = (title, options) => {
        Alert.alert(
            title,
            '',
            options.map(option => ({
                text: option,
                onPress: () => console.log(`Selected: ${option}`)
            }))
        );
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

    return (
        <View style={styles.tabContent}>
            <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
                {/* Recording Settings */}
                {renderSectionHeader('Recording')}
                {renderSettingItem(
                    '🎥',
                    'Default Quality',
                    'HD 720p',
                    false,
                    null,
                    () => handleOptionPress('Select Quality', ['HD 720p', 'FHD 1080p', 'UHD 4K'])
                )}
                {renderSettingItem(
                    '📷',
                    'Default Camera',
                    'Front Camera',
                    false,
                    null,
                    () => handleOptionPress('Select Camera', ['Front Camera', 'Back Camera'])
                )}
                {renderSettingItem(
                    '💾',
                    'Auto Save',
                    'Automatically save recordings',
                    true,
                    'autoSave'
                )}
                {renderSettingItem(
                    '🗑️',
                    'Auto Delete',
                    'Delete old recordings after 30 days',
                    true,
                    'autoDelete'
                )}

                {/* App Settings */}
                {renderSectionHeader('App')}
                {renderSettingItem(
                    '🔔',
                    'Notifications',
                    'Recording status updates',
                    true,
                    'notifications'
                )}
                {renderSettingItem(
                    '📳',
                    'Vibration',
                    'Haptic feedback',
                    true,
                    'vibration'
                )}
                {renderSettingItem(
                    '🌙',
                    'Dark Mode',
                    'Dark appearance',
                    true,
                    'darkMode'
                )}
                {renderSettingItem(
                    '🔤',
                    'Language',
                    'English',
                    false,
                    null,
                    () => handleOptionPress('Select Language', ['English', 'Tiếng Việt', '中文', '日本語'])
                )}

                {/* Storage */}
                {renderSectionHeader('Storage')}
                {renderSettingItem(
                    '📁',
                    'Storage Location',
                    'Internal Storage',
                    false,
                    null,
                    () => handleOptionPress('Select Storage', ['Internal Storage', 'SD Card'])
                )}
                {renderSettingItem(
                    '🧹',
                    'Clear Cache',
                    'Free up space',
                    false,
                    null,
                    () => Alert.alert('Clear Cache', 'Are you sure you want to clear cache?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear', style: 'destructive' }
                    ])
                )}

                {/* Privacy & Security */}
                {renderSectionHeader('Privacy & Security')}
                {renderSettingItem(
                    '🔒',
                    'App Lock',
                    'Protect app with password',
                    false,
                    null,
                    () => Alert.alert('App Lock', 'This feature will be available in premium version')
                )}
                {renderSettingItem(
                    '👁️',
                    'Privacy Policy',
                    'Read our privacy policy',
                    false,
                    null,
                    () => console.log('Open privacy policy')
                )}

                {/* Premium */}
                {renderSectionHeader('Premium')}
                <TouchableOpacity style={styles.premiumCard}>
                    <View style={styles.premiumHeader}>
                        <Text style={styles.premiumIcon}>💎</Text>
                        <View style={styles.premiumInfo}>
                            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                            <Text style={styles.premiumSubtitle}>Unlock all features</Text>
                        </View>
                    </View>
                    <View style={styles.premiumFeatures}>
                        <Text style={styles.premiumFeature}>• Unlimited recording time</Text>
                        <Text style={styles.premiumFeature}>• 4K recording quality</Text>
                        <Text style={styles.premiumFeature}>• No ads</Text>
                        <Text style={styles.premiumFeature}>• Priority support</Text>
                    </View>
                    <TouchableOpacity style={styles.premiumButton}>
                        <Text style={styles.premiumButtonText}>Upgrade Now</Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* About */}
                {renderSectionHeader('About')}
                {renderSettingItem(
                    'ℹ️',
                    'App Version',
                    '1.0.0',
                    false,
                    null,
                    () => console.log('Show version info')
                )}
                {renderSettingItem(
                    '⭐',
                    'Rate App',
                    'Rate us on Play Store',
                    false,
                    null,
                    () => console.log('Open Play Store')
                )}
                {renderSettingItem(
                    '📧',
                    'Contact Support',
                    'Get help',
                    false,
                    null,
                    () => console.log('Open support')
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    settingsList: {
        flex: 1,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 24,
        marginBottom: 12,
        marginLeft: 4,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
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
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingIconText: {
        fontSize: 18,
    },
    settingInfo: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    settingRight: {
        marginLeft: 12,
    },
    settingArrow: {
        fontSize: 20,
        color: '#9CA3AF',
    },
    premiumCard: {
        backgroundColor: '#1E3A8A',
        borderRadius: 16,
        padding: 20,
        marginVertical: 12,
    },
    premiumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    premiumIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    premiumInfo: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    premiumSubtitle: {
        fontSize: 14,
        color: '#93C5FD',
    },
    premiumFeatures: {
        marginBottom: 20,
    },
    premiumFeature: {
        fontSize: 14,
        color: '#E5E7EB',
        marginBottom: 4,
    },
    premiumButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    premiumButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E3A8A',
    },
});

export default SettingsTab;