import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import Video from 'react-native-video';
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import { NativeModules } from 'react-native';
import useTranslation from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const Mp3ConvertModal = ({ visible, onClose, video, onConvert }) => {
    const { t } = useTranslation();
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [convertedAudioPath, setConvertedAudioPath] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoInfo, setVideoInfo] = useState(null);
    const videoRef = useRef(null);
    const progressRef = useRef(0);
    const isConvertingRef = useRef(false);

    useEffect(() => {
        if (visible) {
            setIsConverting(false);
            setConversionProgress(0);
            setIsPlaying(false);
            setCurrentTime(0);
            progressRef.current = 0;
            isConvertingRef.current = false;
        }
    }, [visible]);

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleVideoLoad = (data) => {
        setDuration(data.duration);
        setVideoInfo({
            width: data.naturalSize?.width || 1920,
            height: data.naturalSize?.height || 1080,
            duration: data.duration
        });
    };

    const handleProgress = (data) => {
        setCurrentTime(data.currentTime);
    };

    const handleConvert = async () => {
        if (!video || !video.filePath) {
            Alert.alert(t('error', 'Error'), t('video_file_not_found', 'Video file not found'));
            return;
        }

        setIsConverting(true);
        setConversionProgress(0);
        setLoadingMessage('Initializing conversion...');
        progressRef.current = 0;
        isConvertingRef.current = true;

        try {
            // Generate output file path for audio in independent directory
            const timestamp = Date.now();
            const inputPath = video.filePath;
            
            // Get audio directory from native module (now uses Music/BgRecorder)
            let audioDir;
            try {
                const audioResult = await VideoRecordingModule.getAudioFiles();
                audioDir = audioResult.directory;
            } catch (error) {
                console.log('Error getting audio directory, using fallback:', error);
                // Fallback to previous logic if needed
                const videoDir = inputPath.substring(0, inputPath.lastIndexOf('/'));
                audioDir = `${videoDir}/Audio`;
            }
            
            const videoFileName = inputPath.substring(inputPath.lastIndexOf('/') + 1);
            const audioFileName = videoFileName.replace(/\.[^/.]+$/, `_BGREC_${timestamp}.m4a`);
            const outputPath = `${audioDir}/${audioFileName}`;

            // Ensure audio directory exists
            if (VideoRecordingModule && VideoRecordingModule.createDirectory) {
                try {
                    await VideoRecordingModule.createDirectory(audioDir);
                } catch (error) {
                    console.log('Directory creation error (may already exist):', error);
                }
            }

            // Check if video has audio track before conversion
            if (VideoRecordingModule && VideoRecordingModule.checkVideoHasAudio) {
                try {
                    const audioCheck = await VideoRecordingModule.checkVideoHasAudio(inputPath);
                    console.log('Audio check result:', audioCheck);
                    
                    if (!audioCheck.hasAudio) {
                        Alert.alert(
                            'No Audio Track', 
                            'This video does not contain any audio to extract. Please record a new video with microphone enabled.',
                            [{ text: t('ok', 'OK') }]
                        );
                        setIsConverting(false);
                        isConvertingRef.current = false;
                        setConversionProgress(0);
                        setLoadingMessage('');
                        progressRef.current = 0;
                        return;
                    }
                } catch (error) {
                    console.log('Could not check audio track, proceeding anyway:', error);
                }
            }

            // FFmpeg command for audio extraction (simpler approach)
            const command = `-i "${inputPath}" -vn -acodec aac -ab 192k -ar 44100 "${outputPath}"`;

            console.log('FFmpeg command:', command);

            // Execute conversion with realistic progress tracking
            let currentStage = 0;
            const progressStages = [
                { progress: 10, message: 'Initializing conversion...', duration: 1000 },
                { progress: 25, message: 'Extracting audio track...', duration: 1500 },
                { progress: 45, message: 'Converting to audio format...', duration: 2000 },
                { progress: 70, message: 'Applying audio encoding...', duration: 2500 },
                { progress: 90, message: 'Finalizing audio file...', duration: 1000 },
                { progress: 95, message: 'Almost done...', duration: 500 },
            ];

            // Start progress simulation
            const startProgressSimulation = () => {
                const updateProgress = () => {
                    if (currentStage < progressStages.length && isConvertingRef.current) {
                        const stage = progressStages[currentStage];
                        setLoadingMessage(stage.message);
                        
                        // Animate to target progress
                        const startProgress = progressRef.current;
                        const targetProgress = stage.progress;
                        const duration = stage.duration;
                        const startTime = Date.now();

                        const animate = () => {
                            if (!isConvertingRef.current) return;
                            
                            const elapsed = Date.now() - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const newProgress = startProgress + (targetProgress - startProgress) * progress;
                            
                            progressRef.current = newProgress;
                            setConversionProgress(newProgress);

                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            } else {
                                currentStage++;
                                setTimeout(updateProgress, 300); // Small delay between stages
                            }
                        };

                        requestAnimationFrame(animate);
                    }
                };
                updateProgress();
            };

            startProgressSimulation();

            const session = await FFmpegKit.executeAsync(command, async (session) => {
                const returnCode = await session.getReturnCode();
                
                // Complete progress immediately
                setConversionProgress(100);
                setLoadingMessage('Conversion completed successfully!');
                
                setTimeout(async () => {
                    setIsConverting(false);
                    isConvertingRef.current = false;
                    
                    if (ReturnCode.isSuccess(returnCode)) {
                        setConvertedAudioPath(outputPath);
                        
                        // Scan audio file for MediaStore to make it visible in Music apps
                        try {
                            await VideoRecordingModule.scanAudioFileForMediaStore(outputPath);
                            console.log('Audio file scanned for MediaStore:', outputPath);
                        } catch (scanError) {
                            console.log('Warning: Failed to scan audio file for MediaStore:', scanError);
                            // Don't show error to user as the conversion was successful
                        }
                        
                        setShowSuccessModal(true);
                    } else {
                        try {
                            const logs = await session.getAllLogs();
                            const errorMessages = logs
                                .map(log => log.getMessage())
                                .filter(msg => msg.includes(t('error', 'Error')) || msg.includes('does not contain'))
                                .join('\n');
                            
                            console.error('FFmpeg failed with logs:', errorMessages);
                            
                            if (errorMessages.includes('does not contain any stream')) {
                                Alert.alert(
                                    'No Audio Track', 
                                    'This video does not contain any audio to extract. Please record a new video with audio enabled.',
                                    [{ text: t('ok', 'OK') }]
                                );
                            } else {
                                Alert.alert(
                                    'Conversion Failed', 
                                    'Failed to convert video to audio. The video might not have an audio track.',
                                    [{ text: t('ok', 'OK') }]
                                );
                            }
                        } catch (logError) {
                            console.error('Error getting FFmpeg logs:', logError);
                            Alert.alert('Conversion Failed', 'Failed to convert video to audio. Please try again.');
                        }
                        
                        setConversionProgress(0);
                        setLoadingMessage('');
                        progressRef.current = 0;
                    }
                }, 1000);
            });

        } catch (error) {
            console.error('Conversion error:', error);
            setIsConverting(false);
            isConvertingRef.current = false;
            setConversionProgress(0);
            setLoadingMessage('');
            Alert.alert(t('error', 'Error'), 'Failed to convert video: ' + error.message);
        }
    };

    const handleShare = async () => {
        try {
            if (!convertedAudioPath) {
                Alert.alert(t('error', 'Error'), 'No audio file to share');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Use native module to share audio file
            await VideoRecordingModule.shareVideo(convertedAudioPath, 'share_general');
            
        } catch (error) {
            console.error('Failed to share audio:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert(t('no_app_available', 'No App Available'), 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert(t('share_error', 'Share Error'), 'Failed to share audio: ' + error.message);
            }
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => {
                if (!isConverting) {
                    onClose();
                } else {
                    Alert.alert(
                        'Conversion in Progress',
                        'Please wait for the conversion to complete before closing.',
                        [{ text: t('ok', 'OK') }]
                    );
                }
            }}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Image source={require('../../assets/home/ic/ic_back.png')} style={styles.backIcon} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Video to Audio</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Video Preview */}
                <View style={styles.videoContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: video?.filePath }}
                        style={styles.video}
                        paused={!isPlaying}
                        onLoad={handleVideoLoad}
                        onProgress={handleProgress}
                        resizeMode="cover"
                        repeat={true}
                    />

                    {/* Video Controls */}
                    <View style={styles.videoControls}>
                        {/* Play/Pause Overlay */}
                        <TouchableOpacity
                            style={styles.playButton}
                            onPress={handlePlayPause}
                            activeOpacity={0.8}
                        >
                            <View style={styles.playButtonInner}>
                                <Text style={styles.playIcon}>
                                    {isPlaying ? '⏸️' : '▶️'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>

                {/* Ad Placeholder */}
                <View style={styles.adContainer}>
                    <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                </View>

                {/* Convert Button */}
                <TouchableOpacity
                    style={[styles.convertButton, isConverting && styles.convertButtonDisabled]}
                    onPress={handleConvert}
                    disabled={isConverting}
                >
                    {isConverting ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.convertButtonText}>
                                Converting... {Math.round(conversionProgress)}%
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.convertButtonText}>Convert to Audio</Text>
                    )}
                </TouchableOpacity>

                {/* Loading Overlay */}
                {isConverting && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                            <Text style={styles.loadingTitle}>Converting to Audio</Text>
                            <Text style={styles.loadingSubtitle}>
                                {loadingMessage || 'Please wait...'}
                            </Text>
                            
                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarContainer}>
                                    <View 
                                        style={[
                                            styles.progressBarFill, 
                                            { width: `${conversionProgress}%` }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {Math.round(conversionProgress)}%
                                </Text>
                            </View>
                            
                            <Text style={styles.loadingWarning}>
                                Do not close the app or navigate away
                            </Text>
                        </View>
                    </View>
                )}
            </View>
            
            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.successOverlay}>
                    <View style={styles.successContent}>
                        {/* Success Icon */}
                        <View style={styles.successIconContainer}>
                            <View style={styles.successIcon}>
                                <Text style={styles.checkIcon}>♪</Text>
                            </View>
                        </View>
                        
                        {/* Success Title */}
                        <Text style={styles.successTitle}>Your audio has been exported</Text>
                        
                        {/* Ad Banner */}
                        <View style={styles.successAdBanner}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                        </View>
                        
                        {/* Back to Home Button */}
                        <TouchableOpacity 
                            style={styles.backHomeButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setConversionProgress(0);
                                setLoadingMessage('');
                                progressRef.current = 0;
                                onConvert && onConvert(convertedAudioPath);
                                onClose();
                            }}
                        >
                            <Text style={styles.backHomeText}>Back to Home</Text>
                        </TouchableOpacity>
                        
                        {/* Share Button */}
                        <TouchableOpacity 
                            style={styles.shareButton}
                            onPress={handleShare}
                        >
                            <Text style={styles.shareButtonText}>Share Audio</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
    },
    placeholder: {
        width: 36,
    },
    videoContainer: {
        margin: 10,
        overflow: 'hidden',
        backgroundColor: '#000000',
        position: 'relative',
        aspectRatio: 9 / 16,
        height: height * 0.4,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playIcon: {
        fontSize: 20,
        color: '#FFFFFF',
    },
    videoControls: {
        position: 'absolute',
        bottom: 0,
        left: 15,
        right: 15,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        bottom: -25,
        left: 10,
        transform: [{ translateX: -25 }, { translateY: -25 }],
    },
    playButtonInner: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    progressBar: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1.5,
        marginHorizontal: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 1.5,
    },
    adContainer: {
        width: width - 32,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    convertButton: {
        marginHorizontal: 16,
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 8,
        paddingVertical: 14,
        width: width - 32,
        alignItems: 'center',
    },
    convertButtonDisabled: {
        backgroundColor: COLORS.WHITE,
    },
    convertButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        minWidth: 280,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginTop: 16,
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    progressContainer: {
        width: '100%',
        marginBottom: 16,
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.PRIMARY,
        borderRadius: 4,
        minWidth: 2,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.PRIMARY,
        textAlign: 'center',
    },
    loadingWarning: {
        fontSize: 12,
        color: '#EF4444',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Success Modal Styles
    successOverlay: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successContent: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    successIconContainer: {
        marginBottom: 16,
    },
    successIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkIcon: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginBottom: 16,
    },
    successAdBanner: {
        flexDirection: 'row',
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
    },
    backHomeButton: {
        marginBottom: 16,
    },
    backHomeText: {
        color: COLORS.TERTIARY,
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    shareButton: {
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        width: '100%',
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default Mp3ConvertModal;