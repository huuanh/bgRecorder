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
import { COLORS, FONTS } from '../../constants';
import { NativeAdComponent } from '../NativeAdComponent';
import AdManager, { ADS_UNIT } from '../../AdManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactContextManager from '../../utils/ReactContextManager';
import CameraSettingsManager from '../../utils/CameraSettingsManager';
import CameraModeModal from '../CameraModeModal';
import DurationModal from '../DurationModal';
import ResolutionModal from '../ResolutionModal';
import IAPModal from '../IAPModal';
import RecordingLimitModal from '../RecordingLimitModal';
import useTranslation from '../../hooks/useTranslation';
import remoteConfigManager from '../../RemoteConfigManager';
import { checkVipStatus } from '../../utils/VipUtils';

const { VideoRecordingModule } = NativeModules;
const { width } = Dimensions.get('window');
const RECORDING_LIMIT_SECONDS = 180; // 3 minutes = 180 seconds

const RecordTab = () => {
    const { t } = useTranslation();
    const [recordingSettings, setRecordingSettings] = useState({
        preview: true,
        duration: 3,
        quality: 'HD',
        camera: 'Front'
    });
    
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [availableStorage, setAvailableStorage] = useState({ used: 85, total: 125 });
    const [isServiceRecording, setIsServiceRecording] = useState(false);
    const [showCameraModeModal, setShowCameraModeModal] = useState(false);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [showIAPModal, setShowIAPModal] = useState(false);
    const [showRecordingLimitModal, setShowRecordingLimitModal] = useState(false);
    const [totalRecordingDuration, setTotalRecordingDuration] = useState(0);

    useEffect(() => {
        // Debug log to check module availability
        console.log('🔍 VideoRecordingModule availability:', VideoRecordingModule ? 'Available' : 'Not Available');
        
        // Store timer ref outside of callback
        let initTimer = null;
        
        // Wait for React context to be ready before doing anything
        ReactContextManager.onReady(() => {
            console.log('🔧 RecordTab: React context ready, initializing...');
            
            // Add a small delay to ensure React context is fully initialized
            initTimer = setTimeout(() => {
                // Check if service is already recording when component mounts
                checkServiceStatus();
                
                // Load camera settings
                loadCameraSettings();
                
                // Load total recording duration
                loadTotalRecordingDuration();
            }, 500);
        });
        
        // Listen for recording events from native service
        const recordingStartedListener = DeviceEventEmitter.addListener(
            'onRecordingStarted',
            () => {
                console.log('📹 Recording started event from service');
                setIsRecording(true);
                setIsServiceRecording(true);
                // Don't reset time here, let the timer handle it
            }
        );

        const recordingStoppedListener = DeviceEventEmitter.addListener(
            'onRecordingStopped',
            (data) => {
                console.log('⏹️ Recording stopped from service:', data);
                
                // Immediately update all recording states
                setIsRecording(false);
                setIsServiceRecording(false);
                setRecordingTime(0);
                
                // Hide overlay if it was shown
                hideRecordingOverlay();
                
                // Native đã tự động lưu duration rồi, chỉ cần reload để hiển thị
                console.log('📊 Native already saved duration, reloading UI...');
                setTimeout(() => {
                    loadTotalRecordingDuration();
                }, 500);
                
                // Save video to storage
                if (data.filePath && data.duration) {
                    saveVideoToStorage(data);
                }
                
                // Show completion alert
                Alert.alert(
                    'Recording Complete!',
                    `Video saved successfully!\nDuration: ${formatTime(Math.floor(data.duration / 1000))}`,
                    [
                        { text: 'OK' }
                    ]
                );
            }
        );

        const recordingSplitListener = DeviceEventEmitter.addListener(
            'onRecordingSplit',
            (data) => {
                console.log('📄 Recording split from service:', data);
                
                // Save the split video part to storage
                if (data.filePath && data.duration) {
                    saveVideoToStorage(data);
                }
                
                // Show notification for split part
                Alert.alert(
                    'Auto Split',
                    `Part ${data.partNumber} saved!\nDuration: ${formatTime(Math.floor(data.duration / 1000))}\nContinuing recording...`,
                    [
                        { text: 'OK' }
                    ],
                    { cancelable: true }
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
            recordingSplitListener.remove();
            appStateSubscription?.remove();
            
            // Clear any pending timers
            if (initTimer) {
                clearTimeout(initTimer);
            }
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
                            console.log('⏱️ Timer check - Recording status:', status);
                            if (status && status.isRecording) {
                                setRecordingTime(Math.floor(status.duration / 1000));
                                // Ensure UI state matches service state
                                if (!isRecording) {
                                    console.log('🔄 Timer: Service recording but UI not, fixing...');
                                    setIsRecording(true);
                                    setIsServiceRecording(true);
                                }
                            } else {
                                // Only reset if we get a clear "not recording" status
                                if (status && status.isRecording === false) {
                                    console.log('📱 Timer: Service stopped recording, syncing UI...');
                                    setIsRecording(false);
                                    setIsServiceRecording(false);
                                    setRecordingTime(0);
                                }
                            }
                        })
                        .catch((error) => {
                            console.error('❌ Timer: Failed to get recording status:', error);
                            // Check if it's a React context error
                            if (error.message?.includes('ReactContext') || error.message?.includes('JS module')) {
                                console.log('⚠️ Timer: React context issue, skipping this check');
                            } else {
                                console.log('⚠️ Timer: Other error, continuing...');
                            }
                        });
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
            // Add safety check to prevent calling native methods too early
            if (!VideoRecordingModule) {
                console.log('⚠️ VideoRecordingModule not available for status check');
                return;
            }

            // Add a small delay to ensure React context is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('🔍 Checking service status...');
            const status = await VideoRecordingModule.isServiceRunning();
            console.log('🔍 Service status result:', status);
            
            if (status && status.isRunning && status.isRecording) {
                console.log('📹 Service is recording, syncing UI state');
                if (!isRecording) {
                    setIsRecording(true);
                    setIsServiceRecording(true);
                }
                
                // Get current recording duration
                try {
                    const recordingStatus = await VideoRecordingModule.getRecordingStatus();
                    if (recordingStatus && recordingStatus.duration) {
                        setRecordingTime(Math.floor(recordingStatus.duration / 1000));
                    }
                } catch (statusError) {
                    console.log('⚠️ Could not get recording duration:', statusError);
                }
            } else if (status && status.isRunning === false) {
                // Only reset if service is explicitly not running
                console.log('📱 Service is explicitly not running, ensuring UI is in sync');
                setIsRecording(false);
                setIsServiceRecording(false);
                setRecordingTime(0);
            } else {
                // If status is unclear, don't change current state
                console.log('⚠️ Service status unclear, keeping current UI state');
            }
        } catch (error) {
            console.error('❌ Failed to check service status:', error);
            // Check if it's a React context error
            if (error.message?.includes('ReactContext') || error.message?.includes('JS module')) {
                console.log('⚠️ React context not ready, will retry later');
                // Retry after a delay
                setTimeout(() => {
                    checkServiceStatus();
                }, 1000);
            } else {
                console.log('⚠️ Status check failed, keeping current state');
            }
        }
    };

    const loadCameraSettings = async () => {
        try {
            const settings = await CameraSettingsManager.getSettings();
            setRecordingSettings(prev => ({
                ...prev,
                camera: settings.cameraMode === 'front' ? 'Front' : 'Back',
                duration: settings.duration,
                quality: settings.resolution || 'HD',
                autoSplit: settings.autoSplit || false
            }));
            console.log('✅ Camera settings loaded:', settings.cameraMode, 'duration:', settings.duration, 'quality:', settings.resolution);
        } catch (error) {
            console.error('❌ Failed to load camera settings:', error);
        }
    };

    // Load total recording duration from native storage
    const loadTotalRecordingDuration = async () => {
        try {
            if (VideoRecordingModule && VideoRecordingModule.getTotalRecordingDuration) {
                console.log('🔍 Loading total recording duration from native...');
                const duration = await VideoRecordingModule.getTotalRecordingDuration();
                setTotalRecordingDuration(duration || 0);
                console.log('✅ Loaded total recording duration:', duration, 'seconds');
            } else {
                console.log('⚠️ Native getTotalRecordingDuration not available');
            }
        } catch (error) {
            console.log('❌ Error loading total recording duration:', error);
        }
    };

    // Test functions for debugging
    const testAddDuration = async () => {
        try {
            if (VideoRecordingModule && VideoRecordingModule.addTestRecordingDuration) {
                console.log('🧪 Adding test duration: 30 seconds');
                const newTotal = await VideoRecordingModule.addTestRecordingDuration(30);
                console.log('🧪 New total after test:', newTotal);
                setTotalRecordingDuration(newTotal);
            }
        } catch (error) {
            console.log('❌ Error adding test duration:', error);
        }
    };

    const testResetDuration = async () => {
        try {
            if (VideoRecordingModule && VideoRecordingModule.resetRecordingDuration) {
                console.log('🔄 Resetting duration to 0');
                await VideoRecordingModule.resetRecordingDuration();
                setTotalRecordingDuration(0);
                console.log('🔄 Duration reset complete');
            }
        } catch (error) {
            console.log('❌ Error resetting duration:', error);
        }
    };

    // Check if free user can record based on 3-minute limit
    const checkRecordingLimit = async () => {
        try {
            const isVip = await checkVipStatus();
            if (isVip) {
                console.log('✅ VIP user - no recording limit');
                return { canRecord: true, remainingTime: null };
            }

            
            const remainingTime = RECORDING_LIMIT_SECONDS - totalRecordingDuration;
            
            if (remainingTime <= 0) {
                console.log('❌ Free user reached 3-minute recording limit');
                return { canRecord: false, remainingTime: 0 };
            }

            console.log(`✅ Free user can record ${remainingTime}s more (${Math.floor(remainingTime/60)}:${Math.floor(remainingTime%60).toString().padStart(2, '0')} remaining)`);
            return { canRecord: true, remainingTime: remainingTime };
            
        } catch (error) {
            console.log('❌ Error checking recording limit:', error);
            return { canRecord: true, remainingTime: null };
        }
    };

    const handleCameraModeSelect = async (mode) => {
        try {
            await CameraSettingsManager.saveCameraMode(mode);
            setRecordingSettings(prev => ({
                ...prev,
                camera: mode === 'front' ? 'Front' : 'Back'
            }));
            console.log('✅ Camera mode updated:', mode);
        } catch (error) {
            console.error('❌ Failed to save camera mode:', error);
            Alert.alert(t('error', 'Error'), t('failed_to_save_camera_mode', 'Failed to save camera mode'));
        }
    };

    const handleDurationSelect = async (duration) => {
        try {
            await CameraSettingsManager.saveDuration(duration);
            setRecordingSettings(prev => ({
                ...prev,
                duration: duration
            }));
            console.log('✅ Duration updated:', duration);
        } catch (error) {
            console.error('❌ Failed to save duration:', error);
            Alert.alert(t('error', 'Error'), t('failed_to_save_duration', 'Failed to save duration'));
        }
    };

    const handleResolutionSelect = async (resolution) => {
        try {
            await CameraSettingsManager.saveResolution(resolution);
            setRecordingSettings(prev => ({
                ...prev,
                quality: resolution
            }));
            console.log('✅ Resolution updated:', resolution);
        } catch (error) {
            console.error('❌ Failed to save resolution:', error);
            Alert.alert(t('error', 'Error'), t('failed_to_save_resolution', 'Failed to save resolution'));
        }
    };

    const handleShowIAP = () => {
        console.log('🛒 Opening IAP Modal from RecordTab');
        setShowIAPModal(true);
    };

    const saveVideoToStorage = async (videoData) => {
        try {
            // Create video with app identifier prefix
            const timestamp = Date.now();
            const originalFileName = videoData.filePath?.split('/').pop() || `REC_${timestamp}.mp4`;
            
            // Add app identifier prefix to filename for filtering
            const appIdentifiedName = `BGREC_${timestamp}_${originalFileName}`;
            
            const newVideo = {
                id: timestamp,
                title: appIdentifiedName,
                originalTitle: originalFileName, // Keep original title for display
                duration: formatTime(Math.floor(videoData.duration / 1000)),
                size: '0 MB', // Calculate actual size if needed
                date: new Date().toLocaleString(),
                filePath: videoData.filePath,
                quality: recordingSettings.quality,
                camera: recordingSettings.camera,
                thumbnail: null,
                appSource: 'BgRecorder', // App identifier metadata
                isAppRecording: true // Flag to identify app recordings
            };

            const existingVideos = await AsyncStorage.getItem('recordedVideos');
            const videos = existingVideos ? JSON.parse(existingVideos) : [];
            videos.unshift(newVideo);

            await AsyncStorage.setItem('recordedVideos', JSON.stringify(videos));
            console.log('✅ Video saved to storage:', newVideo);
            
            // Also save to a separate app-specific list for faster filtering
            const appVideos = await AsyncStorage.getItem('appRecordedVideos');
            const appVideosList = appVideos ? JSON.parse(appVideos) : [];
            appVideosList.unshift(newVideo);
            await AsyncStorage.setItem('appRecordedVideos', JSON.stringify(appVideosList));
            
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

    const showRecordingOverlayDuringRecording = async () => {
        try {
            if (VideoRecordingModule && isRecording) {
                // Get preview size from settings for native overlay
                const settings = await CameraSettingsManager.getSettings();
                const previewSize = CameraSettingsManager.getPreviewSize(settings.previewSize);
                
                await VideoRecordingModule.showRecordingOverlayDuringRecording(previewSize);
                console.log('✅ Recording overlay shown during recording with size:', previewSize);
            }
        } catch (error) {
            console.error('❌ Failed to show overlay during recording:', error);
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
                    
                    // Immediately update UI state to show stop button as pressed
                    setIsRecording(false);
                    setIsServiceRecording(false);
                    setRecordingTime(0);
                } else {
                    console.log('⚠️ VideoRecordingModule not available');
                    setIsRecording(false);
                    setIsServiceRecording(false);
                    setRecordingTime(0);
                }

                remoteConfigManager.isShowIntStopRecord() && AdManager.showInterstitialAd(ADS_UNIT.INTERSTITIAL_STOP_RECORD);
            } catch (error) {
                console.error('❌ Failed to stop recording:', error);
                // Even if there's an error, reset the UI state
                setIsRecording(false);
                setIsServiceRecording(false);
                setRecordingTime(0);
                Alert.alert('Error', 'Failed to stop recording');
            }
        } else {
            // Start recording
            try {
                console.log('▶️ Starting recording with settings:', recordingSettings);
                
                // Check recording limit for free users first
                const limitCheck = await checkRecordingLimit();
                if (!limitCheck.canRecord) {
                    console.log('🚫 Recording blocked - limit reached');
                    setShowRecordingLimitModal(true);
                    return;
                }
                
                // Check recording permissions first
                if (VideoRecordingModule) {
                    try {
                        const permissionCheck = await VideoRecordingModule.checkRecordingPermissions();
                        console.log('🔍 Recording permissions check:', permissionCheck);
                        
                        if (!permissionCheck.allGranted) {
                            let missingPermissions = [];
                            if (!permissionCheck.cameraGranted) missingPermissions.push('Camera');
                            if (!permissionCheck.audioGranted) missingPermissions.push('Microphone');
                            
                            Alert.alert(
                                t('permission_required', 'Permissions Required'),
                                `To record video with audio, we need ${missingPermissions.join(' and ')} permission(s). Please grant these permissions in Settings.`,
                                [
                                    { text: t('cancel', 'Cancel'), style: 'cancel' },
                                    { 
                                        text: 'Open Settings', 
                                        onPress: () => {
                                            Alert.alert(t('permissions', 'Permissions'), t('camera_permission', 'Please go to Settings > Apps > BgRecorder > Permissions and enable Camera and Microphone permissions, then try recording again.'));
                                        }
                                    }
                                ]
                            );
                            return;
                        }
                    } catch (permissionError) {
                        console.error('❌ Failed to check recording permissions:', permissionError);
                    }
                }
                
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
                                    { text: t('cancel', 'Cancel'), style: 'cancel' },
                                    { 
                                        text: 'Grant Permission', 
                                        onPress: async () => {
                                            await VideoRecordingModule.requestOverlayPermission();
                                            Alert.alert('Permission', t('overlay_permission', 'Please go to Settings and enable "Display over other apps" permission, then try recording again.'));
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
                    // Immediately set recording state to show UI feedback
                    setIsRecording(true);
                    setIsServiceRecording(true);
                    
                    // Get video size mapping for current quality setting
                    const videoSize = await CameraSettingsManager.getVideoSize(recordingSettings.quality);
                    const recordingConfig = {
                        ...recordingSettings,
                        width: videoSize.width,
                        height: videoSize.height
                    };
                    let timeleft = RECORDING_LIMIT_SECONDS - totalRecordingDuration;
                    recordingConfig.duration = Math.min(recordingConfig.duration * 60, timeleft);

                    console.log('🎬 Starting recording with config:', recordingConfig, 'and video size:', videoSize);
                    
                    const result = await VideoRecordingModule.startRecording(recordingConfig);
                    console.log('✅ Recording start result:', result, 'with video size:', videoSize);
                    
                    // Check if recording actually started successfully
                    if (result && result.success !== false) {
                        // Recording started successfully, keep the state as is
                        console.log('📹 Recording started successfully');
                        
                        // Give service some time to fully start before checking status
                        setTimeout(() => {
                            console.log('🔄 Delayed status check after start...');
                            checkServiceStatus();
                        }, 2000);
                    } else {
                        // Recording failed, reset the state
                        console.log('❌ Recording failed to start, resetting state');
                        setIsRecording(false);
                        setIsServiceRecording(false);
                        Alert.alert(t('recording_failed', 'Recording Failed'), t('unable_to_start_recording', 'Unable to start recording. Please try again.'));
                        return;
                    }
                    
                    // Show overlay if preview is enabled
                    if (recordingSettings.preview) {
                        setTimeout(async () => {
                            try {
                                // Get preview size from settings for native overlay
                                const settings = await CameraSettingsManager.getSettings();
                                const previewSize = CameraSettingsManager.getPreviewSize(settings.previewSize);
                                
                                await VideoRecordingModule.showRecordingOverlay(previewSize);
                                console.log('✅ Recording overlay shown with size:', previewSize);
                            } catch (error) {
                                console.log('❌ Failed to show overlay:', error);
                            }
                        }, 500);
                    }
                } else {
                    console.log('⚠️ VideoRecordingModule not available, using fallback');
                    setIsRecording(true);
                    setIsServiceRecording(true);
                }
            } catch (error) {
                console.error('❌ Failed to start recording:', error);
                
                // Reset recording state on error
                setIsRecording(false);
                setIsServiceRecording(false);
                setRecordingTime(0);
                
                // Handle specific error types
                if (error.message?.includes('ReactContext') || error.message?.includes('JS module')) {
                    Alert.alert(t('initialization_error', 'Initialization Error'), t('app_starting_up', 'App is still starting up. Please wait a moment and try again.'));
                } else if (error.message.includes('PERMISSION_ERROR')) {
                    Alert.alert(t('permission_error', 'Permission Error'), t('grant_permissions', 'Please grant Camera and Microphone permissions to record video with audio.'));
                } else {
                    Alert.alert(t('error', 'Error'), `Failed to start recording: ${error.message}`);
                }
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
            Alert.alert(t('cannot_change_settings', 'Cannot Change Settings'), t('stop_recording_first', 'Stop recording first to change settings.'));
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
                // Use modal instead of Alert for duration selection
                setShowDurationModal(true);
                return;
            case 'quality':
                // Use modal instead of Alert for quality selection
                setShowResolutionModal(true);
                return;
            case 'camera':
                // Use modal instead of Alert for camera selection
                setShowCameraModeModal(true);
                return;
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
                return recordingSettings.preview ? t('on', 'On') : t('off', 'Off');
            case 'duration':
                return recordingSettings.duration === -1 ? t('unlimited', 'Unlimited') : `${recordingSettings.duration} ${t('mins', 'mins')}`;
            default:
                return recordingSettings[setting];
        }
    };

    return (
        <View style={styles.container}>
            {/* Settings Row */}
            <View style={styles.settingsRow}>
                {['duration', 'quality', 'camera'].map((setting) => (
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
                            {t(setting, setting.charAt(0).toUpperCase() + setting.slice(1))}
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
                        <Text style={styles.recordingBadge}>{t('rec', 'REC')}</Text>
                    </View>
                )}
            </View>

            {/* Native Ad */}
            <View style={styles.adContainer}>
                <NativeAdComponent
                    adUnitId={ADS_UNIT.NATIVE_RECORDING_TAB}
                    hasMedia={true}
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
                <View style={styles.recordButtonIcon}>
                    <Text style={isRecording ? styles.recordButtonInnerStop : styles.recordButtonInnerStart}>
                        {isRecording ? '' : ''}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Camera Mode Selection Modal */}
            <CameraModeModal
                visible={showCameraModeModal}
                onClose={() => setShowCameraModeModal(false)}
                currentMode={recordingSettings.camera === 'Front' ? 'front' : 'back'}
                onSelect={handleCameraModeSelect}
            />

            {/* Duration Selection Modal */}
            <DurationModal
                visible={showDurationModal}
                onClose={() => setShowDurationModal(false)}
                currentDuration={recordingSettings.duration}
                onSelect={handleDurationSelect}
                onShowIAP={handleShowIAP}
            />

            {/* Resolution Selection Modal */}
            <ResolutionModal
                visible={showResolutionModal}
                onClose={() => setShowResolutionModal(false)}
                currentResolution={recordingSettings.quality}
                onSelect={handleResolutionSelect}
                onShowIAP={handleShowIAP}
            />

            {/* IAP Modal */}
            <IAPModal
                visible={showIAPModal}
                onClose={() => setShowIAPModal(false)}
            />

            {/* Recording Limit Modal */}
            <RecordingLimitModal
                visible={showRecordingLimitModal}
                onClose={() => setShowRecordingLimitModal(false)}
                onBuyPremium={() => {
                    setShowRecordingLimitModal(false);
                    setShowIAPModal(true);
                }}
                totalRecordingTime={`${Math.floor(totalRecordingDuration / 60).toString().padStart(2, '0')}:${Math.floor(totalRecordingDuration % 60).toString().padStart(2, '0')}`}
            />
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
            return require('../../../assets/home/ic/quality.png');
        case 'camera':
            return require('../../../assets/home/ic/icon_swap.png');
        default:
            return require('../../../assets/home/ic/icon_preview.png');
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // padding: 10,
        backgroundColor: COLORS.BACKGROUND,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // marginBottom: 10,
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
        resizeMode: 'contain',
    },
    settingLabel: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 2,
        textAlign: 'center',
        fontFamily: FONTS.PRIMARY,
    },
    settingValue: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        fontFamily: FONTS.PRIMARY,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    timerText: {
        fontSize: 60,
        fontWeight: 900,
        color: '#1E3A8A',
        fontFamily: FONTS.PRIMARY,
    },
    recordingIndicator: {
        position: 'absolute',
        top: 10,
        right: 20
    },
    recordingBadge: {
        backgroundColor: '#EF4444',
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 2,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: FONTS.PRIMARY,
    },
    adContainer: {
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    recordButton: {
        width: 110,
        height: 110,
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
        color: COLORS.TERTIARY,
        fontFamily: FONTS.PRIMARY,
    },
    recordButtonInnerStop: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.GRAY_100,
        borderRadius: 8,
    },
    recordButtonInnerStart: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.ACTIVE,
        borderRadius: 20,
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
        fontFamily: FONTS.PRIMARY,
    },
});

export default RecordTab;