import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Alert,
    Image,
    PermissionsAndroid,
    Platform,
    NativeModules,
    DeviceEventEmitter,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants';
import { NativeAdComponent } from '../NativeAdComponent';
import { ADS_UNIT } from '../../AdManager.js';

const { VideoRecordingModule } = NativeModules;

const { width } = Dimensions.get('window');

const RecordTab = () => {
    // Camera refs and permissions
    const cameraRef = useRef(null);
    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
    
    // Move all recording-related state here
    const [recordingSettings, setRecordingSettings] = useState({
        preview: true,
        duration: 5, // minutes
        quality: 'HD',
        camera: 'front'
    });
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [availableStorage, setAvailableStorage] = useState('85 GB/ 125 GB');
    const [currentVideoPath, setCurrentVideoPath] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    
    // Camera device setup
    const frontCamera = useCameraDevice('front');
    const backCamera = useCameraDevice('back');
    const device = recordingSettings.camera === 'front' ? frontCamera : backCamera;

    // Timer for recording
    useEffect(() => {
        let interval = null;
        if (isRecording) {
            interval = setInterval(async () => {
                // Sync with service if available
                if (VideoRecordingModule) {
                    try {
                        const status = await VideoRecordingModule.getRecordingStatus();
                        if (status.isRecording) {
                            setRecordingTime(status.duration);
                            
                            // Auto-stop recording when duration limit is reached
                            if (status.duration >= recordingSettings.duration * 60) {
                                console.log('⏰ Auto-stopping recording after duration limit');
                                // Service will auto-stop, just update UI
                                setIsRecording(false);
                                
                                // Save the auto-stopped video
                                const autoStopVideoData = {
                                    duration: status.duration,
                                    fileName: createVideoFileName(),
                                    filePath: status.filePath || null,
                                    fileSize: status.fileSize || 'Unknown'
                                };
                                
                                const savedVideo = await saveRecordedVideo(autoStopVideoData);
                                setRecordingTime(0);
                                
                                if (savedVideo) {
                                    Alert.alert(
                                        'Auto-Stop: Recording Completed',
                                        `Recording stopped automatically after ${recordingSettings.duration} minutes.\n\nVideo saved successfully!\nDuration: ${savedVideo.duration}\nQuality: ${savedVideo.quality}`,
                                        [
                                            { text: 'View in Gallery', onPress: () => {
                                                console.log('Navigate to gallery tab');
                                            }},
                                            { text: 'OK' }
                                        ]
                                    );
                                }
                            }
                        } else {
                            // Service stopped, update UI
                            setIsRecording(false);
                            setRecordingTime(0);
                        }
                    } catch (error) {
                        console.log('Failed to sync recording time:', error);
                        // Fallback to local timer
                        setRecordingTime(time => time + 1);
                    }
                } else {
                    // Fallback to local timer
                    setRecordingTime(time => time + 1);
                }
            }, 1000);
        } else if (!isRecording && recordingTime !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRecording, recordingSettings.duration]);

    // Check permissions on component mount
    useEffect(() => {
        checkPermissions();
        
        // Listen for service events
        const recordingStartedListener = DeviceEventEmitter.addListener(
            'onRecordingStarted',
            () => {
                console.log('📱 Received recording started event from service');
            }
        );
        
        const recordingStoppedListener = DeviceEventEmitter.addListener(
            'onRecordingStopped',
            async (data) => {
                console.log('📱 Received recording stopped event from service:', data);
                setIsRecording(false);
                setRecordingTime(0);
                
                // Save the recorded video
                const savedVideo = await saveRecordedVideo(data);
                
                if (savedVideo) {
                    Alert.alert(
                        'Recording Completed',
                        `Video recorded successfully!\nDuration: ${savedVideo.duration}\nQuality: ${savedVideo.quality}\nSaved as: ${savedVideo.title}`,
                        [
                            { text: 'View in Gallery', onPress: () => {
                                // TODO: Navigate to Gallery tab or trigger refresh
                                console.log('Navigate to gallery tab');
                            }},
                            { text: 'OK' }
                        ]
                    );
                } else {
                    Alert.alert(
                        'Recording Completed',
                        `Video recorded for ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}\nNote: Failed to save video metadata.`
                    );
                }
            }
        );
        
        // Check service status on mount
        checkServiceStatus();
        
        return () => {
            recordingStartedListener.remove();
            recordingStoppedListener.remove();
        };
    }, []);
    
    const checkServiceStatus = async () => {
        try {
            if (VideoRecordingModule) {
                const status = await VideoRecordingModule.getRecordingStatus();
                if (status.isRecording) {
                    setIsRecording(true);
                    setRecordingTime(status.duration);
                }
            }
        } catch (error) {
            console.log('Failed to check service status:', error);
        }
    };

    const checkPermissions = async () => {
        if (!hasCameraPermission) {
            const cameraPermission = await requestCameraPermission();
            if (!cameraPermission) {
                Alert.alert('Error', 'Camera permission is required for recording');
                return false;
            }
        }
        
        if (!hasMicrophonePermission) {
            const micPermission = await requestMicrophonePermission();
            if (!micPermission) {
                Alert.alert('Error', 'Microphone permission is required for recording');
                return false;
            }
        }
        
        return true;
    };

    const createVideoFileName = () => {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        return `video_${timestamp}.mp4`;
    };

    const getVideoQualitySettings = () => {
        switch (recordingSettings.quality) {
            case 'HD':
                return { width: 1280, height: 720 };
            case 'FHD':
                return { width: 1920, height: 1080 };
            case '4K':
                return { width: 3840, height: 2160 };
            default:
                return { width: 1280, height: 720 };
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const saveRecordedVideo = async (videoData) => {
        try {
            // Create video metadata
            const videoMetadata = {
                id: Date.now(),
                title: videoData.fileName || createVideoFileName(),
                duration: formatTime(videoData.duration || recordingTime),
                size: videoData.fileSize || 'Unknown',
                date: new Date().toLocaleString(),
                filePath: videoData.filePath,
                quality: recordingSettings.quality === 'HD' ? 'HD 720p' : 
                        recordingSettings.quality === 'FHD' ? 'FHD 1080p' : 
                        recordingSettings.quality === '4K' ? 'UHD 4K' : 'HD 720p',
                camera: recordingSettings.camera === 'front' ? 'Front' : 'Back',
                thumbnail: null
            };

            // Save to AsyncStorage or local storage
            const storedVideos = await getStoredVideos();
            const updatedVideos = [videoMetadata, ...storedVideos];
            await saveVideosToStorage(updatedVideos);

            console.log('✅ Video saved successfully:', videoMetadata);
            return videoMetadata;
        } catch (error) {
            console.error('❌ Failed to save video:', error);
            return null;
        }
    };

    const getStoredVideos = async () => {
        try {
            const stored = await AsyncStorage.getItem('recorded_videos');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to get stored videos:', error);
            return [];
        }
    };

    const saveVideosToStorage = async (videos) => {
        try {
            await AsyncStorage.setItem('recorded_videos', JSON.stringify(videos));
            console.log('Videos saved to storage:', videos.length);
        } catch (error) {
            console.error('Failed to save videos to storage:', error);
        }
    };

    const handleSettingPress = (setting, value) => {
        setRecordingSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleRecordPress = async () => {
        if (!isRecording) {
            // Check permissions before starting
            const hasPermissions = await checkPermissions();
            if (!hasPermissions) return;

            // Camera restriction doesn't prevent background recording
            if (!device && !cameraError) {
                Alert.alert('Error', 'Camera device is not available');
                return;
            }

            try {
                // Start background recording service
                if (VideoRecordingModule) {
                    const settings = {
                        duration: recordingSettings.duration,
                        quality: recordingSettings.quality,
                        camera: recordingSettings.camera,
                        preview: recordingSettings.preview && !cameraError
                    };
                    
                    const result = await VideoRecordingModule.startRecording(settings);
                    
                    if (result.success) {
                        setIsRecording(true);
                        setRecordingTime(0);
                        console.log('🔴 Started background recording service');
                        
                        const warningText = cameraError ? 
                            '\n\n⚠️ Camera preview is disabled due to restrictions, but recording will work in background.' : 
                            '\n\nRecording will continue even if you minimize the app or go to home screen.';
                        
                        Alert.alert(
                            'Background Recording Started', 
                            `Recording ${recordingSettings.quality} video for ${recordingSettings.duration} minutes using ${recordingSettings.camera} camera.${warningText}`,
                            [{ text: 'OK' }]
                        );
                    } else {
                        throw new Error(result.message || 'Failed to start recording');
                    }
                } else {
                    throw new Error('VideoRecordingModule not available');
                }
                
            } catch (error) {
                console.error('❌ Failed to start recording:', error);
                Alert.alert('Error', 'Failed to start recording: ' + error.message);
            }
        } else {
            // Stop background recording service
            try {
                if (VideoRecordingModule) {
                    const result = await VideoRecordingModule.stopRecording();
                    
                    if (result.success) {
                        setIsRecording(false);
                        console.log('⏹️ Stopped background recording service');
                        
                        // Save the manually stopped video
                        const manualStopVideoData = {
                            duration: recordingTime,
                            fileName: createVideoFileName(),
                            filePath: result.filePath || null,
                            fileSize: result.fileSize || 'Unknown'
                        };
                        
                        const savedVideo = await saveRecordedVideo(manualStopVideoData);
                        setRecordingTime(0);
                        
                        if (savedVideo) {
                            Alert.alert(
                                'Recording Stopped',
                                `Video saved successfully!\nDuration: ${savedVideo.duration}\nQuality: ${savedVideo.quality}\nSaved as: ${savedVideo.title}`,
                                [
                                    { text: 'View in Gallery', onPress: () => {
                                        console.log('Navigate to gallery tab');
                                    }},
                                    { text: 'OK' }
                                ]
                            );
                        } else {
                            Alert.alert(
                                'Recording Stopped',
                                'Background recording has been stopped successfully.'
                            );
                        }
                    } else {
                        throw new Error(result.message || 'Failed to stop recording');
                    }
                } else {
                    throw new Error('VideoRecordingModule not available');
                }
            } catch (error) {
                console.error('❌ Failed to stop recording:', error);
                Alert.alert('Error', 'Failed to stop recording: ' + error.message);
                setIsRecording(false);
            }
        }
    };

    const renderSettingButton = (iconSource, label, value, options, setting) => (
        <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => {
                if (options && options.length > 1) {
                    Alert.alert(
                        `Select ${label}`,
                        '',
                        options.map(option => ({
                            text: option.label,
                            onPress: () => handleSettingPress(setting, option.value)
                        }))
                    );
                }
            }}
        >
            <View style={styles.settingIcon}>
                <Image source={iconSource} style={styles.settingIconImage} />
            </View>
            <Text style={styles.settingLabel}>{label}</Text>
            <Text style={styles.settingValue}>{value}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.tabContent}>
            {/* Camera Preview */}
            {recordingSettings.preview && device && hasCameraPermission && !cameraError ? (
                <View style={styles.cameraContainer}>
                    <Camera
                        ref={cameraRef}
                        style={styles.camera}
                        device={device}
                        isActive={true}
                        video={true}
                        audio={hasMicrophonePermission}
                        orientation="portrait"
                        onInitialized={() => {
                            console.log('📷 Camera initialized successfully');
                            setCameraReady(true);
                            setCameraError(null);
                        }}
                        onError={(error) => {
                            console.error('📷 Camera error:', error);
                            setCameraError(error);
                            setCameraReady(false);
                            
                            // Handle specific camera errors
                            if (error.code === 'camera-is-restricted') {
                                Alert.alert(
                                    'Camera Restricted',
                                    'Camera access is restricted by device policy. You can still record videos in background mode without preview.',
                                    [
                                        { text: 'Turn Off Preview', onPress: () => handleSettingPress('preview', false) },
                                        { text: 'OK' }
                                    ]
                                );
                            } else {
                                Alert.alert(
                                    'Camera Error',
                                    `Camera failed to initialize: ${error.message}. You can still record without preview.`,
                                    [
                                        { text: 'Turn Off Preview', onPress: () => handleSettingPress('preview', false) },
                                        { text: 'OK' }
                                    ]
                                );
                            }
                        }}
                    />
                    {isRecording && (
                        <View style={styles.recordingIndicator}>
                            <View style={styles.recordingDot} />
                            <Text style={styles.recordingText}>REC</Text>
                        </View>
                    )}
                </View>
            ) : recordingSettings.preview ? (
                <View style={styles.cameraPlaceholder}>
                    <Text style={styles.cameraPlaceholderText}>
                        {cameraError ? 
                            (cameraError.code === 'camera-is-restricted' ? 
                                '📷 Camera Restricted\nBackground recording still available' :
                                `📷 Camera Error\n${cameraError.message || 'Unknown error'}`
                            ) :
                            (!hasCameraPermission ? 'Camera permission required' : 
                             !device ? 'Camera not available' : 'Camera preview loading...')
                        }
                    </Text>
                    {cameraError && (
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={() => {
                                setCameraError(null);
                                setCameraReady(false);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry Camera</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : null}

            {/* Settings Row */}
            <View style={styles.settingsRow}>
                {renderSettingButton(
                    require('../../../assets/home/ic/icon_preview.png'), 
                    'Preview', 
                    recordingSettings.preview ? 'On' : 'Off',
                    [
                        { label: 'On', value: true },
                        { label: 'Off', value: false }
                    ],
                    'preview'
                )}
                {renderSettingButton(
                    require('../../../assets/home/ic/icon_clock.png'), 
                    `${recordingSettings.duration} mins`, 
                    '',
                    [
                        { label: '3 mins', value: 3 },
                        { label: '5 mins', value: 5 },
                        { label: '10 mins', value: 10 },
                        { label: '15 mins', value: 15 },
                        { label: '30 mins', value: 30 }
                    ],
                    'duration'
                )}
                {renderSettingButton(
                    require('../../../assets/home/ic/ic_record2.png'), 
                    'Quality', 
                    recordingSettings.quality === 'HD' ? 'HD 720p' : 
                    recordingSettings.quality === 'FHD' ? 'FHD 1080p' : 
                    recordingSettings.quality === '4K' ? 'UHD 4K' : 'HD 720p',
                    [
                        { label: 'HD 720p', value: 'HD' },
                        { label: 'FHD 1080p', value: 'FHD' },
                        { label: 'UHD 4K', value: '4K' }
                    ],
                    'quality'
                )}
                {renderSettingButton(
                    require('../../../assets/home/ic/icon_swap.png'), 
                    recordingSettings.camera === 'front' ? 'Front' : 'Back', 
                    '',
                    [
                        { label: 'Front Camera', value: 'front' },
                        { label: 'Back Camera', value: 'back' }
                    ],
                    'camera'
                )}
            </View>

            {/* Recording Timer */}
            <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                    {formatTime(recordingTime)}
                </Text>
            </View>

            {/* Native Ad */}
            <View style={styles.adContainer}>
                <NativeAdComponent
                    adUnitId={ADS_UNIT.NATIVE}
                    hasMedia={false}
                />
            </View>

            {/* Record Button */}
            <View style={styles.recordButtonContainer}>
                <TouchableOpacity 
                    style={[
                        styles.recordButton,
                        { backgroundColor: isRecording ? '#FF4757' : '#2F3542' }
                    ]}
                    onPress={handleRecordPress}
                >
                    <View style={[
                        styles.recordButtonInner,
                        { backgroundColor: isRecording ? '#FF3742' : '#1e272e' }
                    ]}>
                        {isRecording ? (
                            <View style={styles.stopIcon} />
                        ) : (
                            <View style={styles.playIcon} />
                        )}
                    </View>
                </TouchableOpacity>
                {/* <Text style={styles.recordButtonText}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Text> */}
            </View>

            {/* Storage Info */}
            <View style={styles.storageContainer}>
                <Text style={styles.storageText}>{availableStorage}</Text>
                <View style={styles.storageBar}>
                    <View style={[styles.storageUsed, { width: '68%' }]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 0,
    },
    cameraContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 15,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    cameraPlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    cameraPlaceholderText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    recordingIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 4,
    },
    recordingText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    settingButton: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 30,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    settingIconImage: {
        width: 24,
        height: 24,
        tintColor: '#1E3A8A',
    },
    settingIconText: {
        fontSize: 24,
    },
    settingLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    settingValue: {
        fontSize: 11,
        color: '#1F2937',
        fontWeight: '600',
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#1E3A8A',
        fontFamily: 'monospace',
    },
    adContainer: {
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    recordButtonContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    recordButton: {
        width: 60,
        height: 60,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    recordButtonInner: {
        width: 30,
        height: 30,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        width: 0,
        height: 0,
        borderLeftWidth: 25,
        borderRightWidth: 0,
        borderTopWidth: 15,
        borderBottomWidth: 15,
        borderLeftColor: '#FFFFFF',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 5,
    },
    stopIcon: {
        width: 30,
        height: 30,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
    },
    recordButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    storageContainer: {
        alignItems: 'center',
    },
    storageText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    storageBar: {
        width: width * 0.6,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    storageUsed: {
        height: '100%',
        backgroundColor: '#1E3A8A',
        borderRadius: 2,
    },
});

export default RecordTab;