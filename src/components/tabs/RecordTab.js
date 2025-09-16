import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    Dimensions,
    Image,
    DeviceEventEmitter,
    NativeModules,
    AppState
} from 'react-native';
import { COLORS } from '../../constants';
import { NativeAdComponent } from '../NativeAdComponent';
import { ADS_UNIT } from '../../AdManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { VideoRecordingModule } = NativeModules;
const { width } = Dimensions.get('window');

const RecordTab = () => {
    const [recordingSettings, setRecordingSettings] = useState({
        preview: true,
        duration: 5,
        quality: 'HD 720p',
        camera: 'Back'
    });
    
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [availableStorage, setAvailableStorage] = useState({ used: 85, total: 125 });
    const [isServiceRecording, setIsServiceRecording] = useState(false);

    useEffect(() => {
        // Check if service is already recording when component mounts
        checkServiceStatus();
        
        // Listen for recording events from native service
        const recordingStartedListener = DeviceEventEmitter.addListener(
            'onRecordingStarted',
            () => {
                console.log('📹 Recording started from service');
                setIsRecording(true);
                setIsServiceRecording(true);
            }
        );

        const recordingStoppedListener = DeviceEventEmitter.addListener(
            'onRecordingStopped',
            (data) => {
                console.log('⏹️ Recording stopped from service:', data);
                setIsRecording(false);
                setIsServiceRecording(false);
                setRecordingTime(0);
                
                // Hide overlay if it was shown
                hideRecordingOverlay();
                
                // Save video to storage
                if (data.filePath && data.duration) {
                    saveVideoToStorage(data);
                }
                
                // Show completion alert
                Alert.alert(
                    'Recording Complete!',
                    `Video saved successfully!\nDuration: ${formatTime(Math.floor(data.duration / 1000))}`,
                    [
                        { text: 'OK' },
                        { 
                            text: 'View in Gallery', 
                            onPress: () => {
                                // Navigate to gallery tab - you can implement this
                                console.log('Navigate to gallery tab');
                            }
                        }
                    ]
                );
            }
        );

        // Handle app state changes
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active' && isServiceRecording) {
                // App came to foreground, sync with service
                checkServiceStatus();
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            recordingStartedListener.remove();
            recordingStoppedListener.remove();
            appStateSubscription?.remove();
        };
    }, [isServiceRecording]);

    // Timer effect for UI sync
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                if (VideoRecordingModule) {
                    VideoRecordingModule.getRecordingStatus()
                        .then((status) => {
                            if (status.isRecording) {
                                setRecordingTime(Math.floor(status.duration / 1000));
                            }
                        })
                        .catch(console.error);
                } else {
                    setRecordingTime(prev => prev + 1);
                }
            }, 1000);
        } else {
            setRecordingTime(0);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isRecording]);

    const checkServiceStatus = async () => {
        try {
            if (VideoRecordingModule) {
                const status = await VideoRecordingModule.isServiceRunning();
                console.log('🔍 Service status:', status);
                
                if (status.isRunning && status.isRecording) {
                    setIsRecording(true);
                    setIsServiceRecording(true);
                    
                    // Get current recording duration
                    const recordingStatus = await VideoRecordingModule.getRecordingStatus();
                    setRecordingTime(Math.floor(recordingStatus.duration / 1000));
                }
            }
        } catch (error) {
            console.error('❌ Failed to check service status:', error);
        }
    };

    const saveVideoToStorage = async (videoData) => {
        try {
            const newVideo = {
                id: Date.now(),
                title: videoData.filePath?.split('/').pop() || `REC_${Date.now()}.mp4`,
                duration: formatTime(Math.floor(videoData.duration / 1000)),
                size: '0 MB', // Calculate actual size if needed
                date: new Date().toLocaleString(),
                filePath: videoData.filePath,
                quality: recordingSettings.quality,
                camera: recordingSettings.camera,
                thumbnail: null
            };

            const existingVideos = await AsyncStorage.getItem('recordedVideos');
            const videos = existingVideos ? JSON.parse(existingVideos) : [];
            videos.unshift(newVideo);

            await AsyncStorage.setItem('recordedVideos', JSON.stringify(videos));
            console.log('✅ Video saved to storage:', newVideo);
        } catch (error) {
            console.error('❌ Failed to save video to storage:', error);
        }
    };

    const hideRecordingOverlay = async () => {
        try {
            if (VideoRecordingModule) {
                await VideoRecordingModule.hideRecordingOverlay();
                console.log('✅ Recording overlay hidden');
            }
        } catch (error) {
            console.error('❌ Failed to hide overlay:', error);
        }
    };

    const handleRecordPress = async () => {
        if (isRecording) {
            // Stop recording
            try {
                console.log('🛑 Stopping recording...');
                
                // Hide overlay first
                await hideRecordingOverlay();
                
                if (VideoRecordingModule) {
                    await VideoRecordingModule.stopRecording();
                    console.log('✅ Recording stop request sent');
                } else {
                    console.log('⚠️ VideoRecordingModule not available');
                    setIsRecording(false);
                }
            } catch (error) {
                console.error('❌ Failed to stop recording:', error);
                Alert.alert('Error', 'Failed to stop recording');
            }
        } else {
            // Start recording
            try {
                console.log('▶️ Starting recording with settings:', recordingSettings);
                
                // Check overlay permission if preview is enabled
                if (recordingSettings.preview) {
                    try {
                        const permissionCheck = await VideoRecordingModule.checkOverlayPermission();
                        console.log('🔍 Overlay permission check:', permissionCheck);
                        
                        if (!permissionCheck.hasPermission) {
                            Alert.alert(
                                'Overlay Permission Required',
                                'To show video preview overlay, we need permission to draw over other apps. Please grant this permission.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                        text: 'Grant Permission', 
                                        onPress: async () => {
                                            await VideoRecordingModule.requestOverlayPermission();
                                            Alert.alert('Permission', 'Please go to Settings and enable "Display over other apps" permission, then try recording again.');
                                        }
                                    }
                                ]
                            );
                            return;
                        }
                    } catch (permissionError) {
                        console.error('❌ Failed to check overlay permission:', permissionError);
                    }
                }
                
                if (VideoRecordingModule) {
                    const result = await VideoRecordingModule.startRecording(recordingSettings);
                    console.log('✅ Recording start result:', result);
                    
                    // Show background recording info
                    Alert.alert(
                        'Recording Started!',
                        recordingSettings.preview 
                            ? 'Video is now recording with preview overlay. You can minimize the app or use other apps while recording continues.'
                            : 'Video is now recording in the background. You can minimize the app or use other apps while recording continues.',
                        [{ text: 'OK' }]
                    );
                    
                    // Show overlay if preview is enabled
                    if (recordingSettings.preview) {
                        setTimeout(async () => {
                            try {
                                await VideoRecordingModule.showRecordingOverlay();
                                console.log('✅ Recording overlay shown');
                            } catch (error) {
                                console.error('❌ Failed to show overlay:', error);
                            }
                        }, 500);
                    }
                } else {
                    console.log('⚠️ VideoRecordingModule not available, using fallback');
                    setIsRecording(true);
                }
            } catch (error) {
                console.error('❌ Failed to start recording:', error);
                Alert.alert('Error', `Failed to start recording: ${error.message}`);
            }
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSettingPress = (setting, currentValue) => {
        if (isRecording) {
            Alert.alert('Cannot Change Settings', 'Stop recording first to change settings.');
            return;
        }

        let options = [];
        let title = '';

        switch (setting) {
            case 'preview':
                options = ['On', 'Off'];
                title = 'Preview Mode';
                break;
            case 'duration':
                options = ['3 mins', '5 mins', '10 mins', '15 mins', '30 mins'];
                title = 'Recording Duration';
                break;
            case 'quality':
                options = ['HD 720p', 'FHD 1080p', 'UHD 4K'];
                title = 'Video Quality';
                break;
            case 'camera':
                options = ['Front', 'Back'];
                title = 'Camera Selection';
                break;
        }

        Alert.alert(
            title,
            'Choose an option:',
            [
                ...options.map(option => ({
                    text: option,
                    onPress: () => {
                        if (setting === 'preview') {
                            setRecordingSettings(prev => ({
                                ...prev,
                                [setting]: option === 'On'
                            }));
                        } else if (setting === 'duration') {
                            const duration = parseInt(option.split(' ')[0]);
                            setRecordingSettings(prev => ({
                                ...prev,
                                [setting]: duration
                            }));
                        } else {
                            setRecordingSettings(prev => ({
                                ...prev,
                                [setting]: option
                            }));
                        }
                    }
                })),
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const getSettingDisplayValue = (setting) => {
        switch (setting) {
            case 'preview':
                return recordingSettings.preview ? 'On' : 'Off';
            case 'duration':
                return `${recordingSettings.duration} mins`;
            default:
                return recordingSettings[setting];
        }
    };

    return (
        <View style={styles.container}>
            {/* Settings Row */}
            <View style={styles.settingsRow}>
                {['preview', 'duration', 'quality', 'camera'].map((setting) => (
                    <TouchableOpacity
                        key={setting}
                        style={styles.settingButton}
                        onPress={() => handleSettingPress(setting, recordingSettings[setting])}
                        disabled={isRecording}
                    >
                        <Image
                            source={getSettingIcon(setting)}
                            style={[
                                styles.settingIconImage,
                                { tintColor: isRecording ? '#9CA3AF' : '#1E3A8A' }
                            ]}
                        />
                        <Text style={[
                            styles.settingLabel,
                            { color: isRecording ? '#9CA3AF' : '#1F2937' }
                        ]}>
                            {setting.charAt(0).toUpperCase() + setting.slice(1)}
                        </Text>
                        <Text style={[
                            styles.settingValue,
                            { color: isRecording ? '#9CA3AF' : '#4B5563' }
                        ]}>
                            {getSettingDisplayValue(setting)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Recording Timer */}
            <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                    {formatTime(recordingTime)}
                </Text>
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <Text style={styles.recordingBadge}>REC</Text>
                    </View>
                )}
            </View>

            {/* Native Ad */}
            <View style={styles.adContainer}>
                <NativeAdComponent
                    adUnitId={ADS_UNIT.NATIVE}
                    hasMedia={false}
                />
            </View>

            {/* Record Button */}
            <TouchableOpacity
                style={[
                    styles.recordButton,
                    { backgroundColor: isRecording ? '#EF4444' : '#1E3A8A' }
                ]}
                onPress={handleRecordPress}
            >
                <Text style={styles.recordButtonIcon}>
                    {isRecording ? '⏹️' : '▶️'}
                </Text>
            </TouchableOpacity>

            {/* Storage Info */}
            <View style={styles.storageContainer}>
                <View style={styles.storageBar}>
                    <View
                        style={[
                            styles.storageUsed,
                            { width: `${(availableStorage.used / availableStorage.total) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.storageText}>
                    {availableStorage.used} GB/ {availableStorage.total} GB
                </Text>
            </View>

            {/* Background Recording Status */}
            {isServiceRecording && (
                <View style={styles.backgroundStatus}>
                    <Text style={styles.backgroundStatusText}>
                        🔴 Recording in background - You can minimize this app
                    </Text>
                </View>
            )}
        </View>
    );
};

const getSettingIcon = (setting) => {
    switch (setting) {
        case 'preview':
            return require('../../../assets/home/ic/icon_preview.png');
        case 'duration':
            return require('../../../assets/home/ic/icon_clock.png');
        case 'quality':
            return require('../../../assets/home/ic/ic_record2.png');
        case 'camera':
            return require('../../../assets/home/ic/icon_swap.png');
        default:
            return require('../../../assets/home/ic/icon_preview.png');
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F8F9FA',
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    settingButton: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    settingIconImage: {
        width: 24,
        height: 24,
        marginBottom: 5,
    },
    settingLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
        textAlign: 'center',
    },
    settingValue: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    timerText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#1E3A8A',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    recordingIndicator: {
        position: 'absolute',
        top: -10,
        right: width * 0.25,
    },
    recordingBadge: {
        backgroundColor: '#EF4444',
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    adContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    recordButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    recordButtonIcon: {
        fontSize: 40,
        color: '#FFFFFF',
    },
    storageContainer: {
        alignItems: 'center',
    },
    storageBar: {
        width: width * 0.6,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    storageUsed: {
        height: '100%',
        backgroundColor: '#1E3A8A',
        borderRadius: 3,
    },
    storageText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    backgroundStatus: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    backgroundStatusText: {
        fontSize: 14,
        color: '#92400E',
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default RecordTab;