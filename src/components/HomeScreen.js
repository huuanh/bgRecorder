import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { COLORS, FONTS } from '../constants';
import RecordTab from './tabs/RecordTab';
import GalleryTab from './tabs/GalleryTab';
import EditTab from './tabs/EditTab';
import SettingsTab from './tabs/SettingsTab';
import useTranslation from '../hooks/useTranslation';
import IAPModal from './IAPModal';
import AdManager, { ADS_UNIT } from '../AdManager';
import messaging from '@react-native-firebase/messaging';

const HomeScreen = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('record');
    const [showIAPModal, setShowIAPModal] = useState(false);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'record':
                return <RecordTab />;
            case 'gallery':
                return <GalleryTab />;
            case 'edit':
                return <EditTab />;
            case 'settings':
                return <SettingsTab />;
            default:
                return <RecordTab />;
        }
    };

    const handleShowIAP = () => {
        console.log('🛒 Opening IAP Modal from RecordTab');
        setShowIAPModal(true);
    };

    handleTabPress = (tab) => {
        AdManager.showInterstitialAd(ADS_UNIT.INTERSTITIAL_SWITCH_TAB);
        setActiveTab(tab);
    }

    async function requestPermission() {
        try {
            // Android 13+ cần POST_NOTIFICATIONS
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Notification permission denied (Android 13+)');
                    return false;
                }
            }

            // Firebase (iOS + Android)
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                const token = await messaging().getToken();
                console.log("FCM token:", token);
                console.log('Notification permission granted');
                return true;
            } else {
                console.log('Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            requestPermission();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    <Text style={styles.headerTitlePrimary}>Background Video </Text>
                    <Text style={styles.headerTitleSecondary}>Recorder</Text>
                </Text>
                <TouchableOpacity style={styles.premiumIcon} onPress={handleShowIAP}>
                    <Image style={styles.premiumIconText} source={require('../../assets/setting/diamond.png')} />
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {renderTabContent()}

            {/* Bottom Tabs */}
            <View style={styles.bottomTabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'record' && styles.activeTab]}
                    onPress={() => handleTabPress('record')}
                >
                    <View style={styles.tabIcon}>
                        <Image
                            source={require('../../assets/home/ic/ic_record.png')}
                            style={[
                                styles.tabIconImage,
                                { tintColor: activeTab === 'record' ? '#1E3A8A' : '#9CA3AF' }
                            ]}
                        />
                    </View>
                    <Text style={[styles.tabText, activeTab === 'record' && styles.activeTabText]}>
                        {t('record', 'Record')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
                    onPress={() => handleTabPress('gallery')}
                >
                    <View style={styles.tabIcon}>
                        <Image
                            source={require('../../assets/home/ic/ic-gallery.png')}
                            style={[
                                styles.tabIconImage,
                                { tintColor: activeTab === 'gallery' ? '#1E3A8A' : '#9CA3AF' }
                            ]}
                        />
                    </View>
                    <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>
                        {t('gallery', 'Gallery')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'edit' && styles.activeTab]}
                    onPress={() => handleTabPress('edit')}
                >
                    <View style={styles.tabIcon}>
                        <Image
                            source={require('../../assets/home/ic/ic-music.png')}
                            style={[
                                styles.tabIconImage,
                                { tintColor: activeTab === 'edit' ? '#1E3A8A' : '#9CA3AF' }
                            ]}
                        />
                    </View>
                    <Text style={[styles.tabText, activeTab === 'edit' && styles.activeTabText]}>
                        {t('edit', 'Edit')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
                    onPress={() => handleTabPress('settings')}
                >
                    <View style={styles.tabIcon}>
                        <Image
                            source={require('../../assets/home/ic/ic_setting.png')}
                            style={[
                                styles.tabIconImage,
                                { tintColor: activeTab === 'settings' ? '#1E3A8A' : '#9CA3AF' }
                            ]}
                        />
                    </View>
                    <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
                        {t('settings', 'Settings')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* IAP Modal */}
            <IAPModal
                visible={showIAPModal}
                onClose={() => setShowIAPModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 5,
        paddingBottom: 20,
        backgroundColor: COLORS.BACKGROUND,
        // borderBottomWidth: 1,
        // borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: FONTS.PRIMARY,
    },
    headerTitlePrimary: {
        color: COLORS.TERTIARY,
    },
    headerTitleSecondary: {
        color: COLORS.SECONDARY,
    },
    premiumIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        // backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumIconText: {
        // fontSize: 16,
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    bottomTabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.BACKGROUND,
        // borderTopWidth: 1,
        // borderTopColor: '#E5E7EB',
        // paddingTop: 10,
        // paddingBottom: 20,
        paddingHorizontal: 10,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 5,
    },
    activeTab: {
        backgroundColor: 'transparent',
    },
    tabIcon: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    tabIconText: {
        fontSize: 20,
        fontFamily: FONTS.PRIMARY,
    },
    tabIconImage: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    tabText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
        fontFamily: FONTS.PRIMARY,
    },
    activeTabText: {
        color: '#1E3A8A',
        fontWeight: '600',
    },
});

export default HomeScreen;