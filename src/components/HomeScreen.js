import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { COLORS } from '../constants';
import RecordTab from './tabs/RecordTab';
import GalleryTab from './tabs/GalleryTab';
import EditTab from './tabs/EditTab';
import SettingsTab from './tabs/SettingsTab';
// import IAPTestButton from './IAPTestButton';

const HomeScreen = () => {
    const [activeTab, setActiveTab] = useState('record');

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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    <Text style={styles.headerTitlePrimary}>Background Video </Text>
                    <Text style={styles.headerTitleSecondary}>Recorder</Text>
                </Text>
                <TouchableOpacity style={styles.premiumIcon}>
                    <Text style={styles.premiumIconText}>💎</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {renderTabContent()}

            {/* IAP Test Button (Development Only) */}
            {/* <IAPTestButton /> */}

            {/* Bottom Tabs */}
            <View style={styles.bottomTabs}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'record' && styles.activeTab]}
                    onPress={() => setActiveTab('record')}
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
                        Record
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
                    onPress={() => setActiveTab('gallery')}
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
                        Gallery
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'edit' && styles.activeTab]}
                    onPress={() => setActiveTab('edit')}
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
                        edit
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
                    onPress={() => setActiveTab('settings')}
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
                        Settings
                    </Text>
                </TouchableOpacity>
            </View>
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
        fontSize: 16,
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
    },
    activeTabText: {
        color: '#1E3A8A',
        fontWeight: '600',
    },
});

export default HomeScreen;