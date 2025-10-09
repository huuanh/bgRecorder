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

const CompressModal = ({ visible, onClose, video, onCompress }) => {
    const { t } = useTranslation(); 
    const [selectedQuality, setSelectedQuality] = useState(t('medium', 'medium'));
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [compressedVideoPath, setCompressedVideoPath] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoInfo, setVideoInfo] = useState(null);
    const videoRef = useRef(null);
    const progressRef = useRef(0);
    const isCompressingRef = useRef(false);

    useEffect(() => {
        if (visible) {
            setSelectedQuality(t('medium', 'medium'));
            setIsCompressing(false);
            setCompressionProgress(0);
            setIsPlaying(false);
            setCurrentTime(0);
            progressRef.current = 0;
            isCompressingRef.current = false;
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

    // Function to calculate estimated file size after compression
    const calculateCompressedSize = (scaleResolution) => {
        if (!videoInfo || !video?.size) return '~ MB';
        
        const originalSize = parseFloat(video.size.replace(/[^\d.]/g, '')) || 10; // MB
        const [newWidth, newHeight] = scaleResolution.split(':').map(Number);
        const originalPixels = videoInfo.width * videoInfo.height;
        const newPixels = newWidth * newHeight;
        
        // Calculate compression ratio based on pixel count
        const pixelRatio = newPixels / originalPixels;
        const estimatedSize = originalSize * pixelRatio;

        return `${video?.size} -> ${estimatedSize.toFixed(1)}MB`;
    };

    // Function to get dynamic quality options with calculated sizes
    const getQualityOptions = () => {
        return [
            {
                id: t('small', 'small'),
                title: 'Small',
                resolution: '116 x 208',
                size: calculateCompressedSize('116:208'),
                description: 'Best for sharing',
                scale: '116:208'
            },
            {
                id: t('medium', 'medium'),
                title: 'Medium',
                resolution: '174 x 312',
                size: calculateCompressedSize('174:312'),
                description: 'Balanced quality',
                scale: '174:312'
            },
            {
                id: t('large', 'large'),
                title: 'Large',
                resolution: '230 x 414',
                size: calculateCompressedSize('230:414'),
                description: 'High quality',
                scale: '230:414'
            }
        ];
    };

    const handleCompress = async () => {
        if (!video || !video.filePath) {
            Alert.alert(t('error', 'Error'), t('video_file_not_found', 'Video file not found'));
            return;
        }

        const selectedOption = getQualityOptions().find(option => option.id === selectedQuality);
        if (!selectedOption) {
            Alert.alert(t('error', 'Error'), 'Please select a compression quality');
            return;
        }

        setIsCompressing(true);
        setCompressionProgress(0);
        setLoadingMessage('Initializing compression...');
        progressRef.current = 0;
        isCompressingRef.current = true;

        try {
            // Generate output file path
            const timestamp = Date.now();
            const inputPath = video.filePath;
            const outputPath = inputPath.replace(/\.[^/.]+$/, `_compressed_${selectedQuality}_${timestamp}.mp4`);

            // FFmpeg command for compression - simplified for compatibility
            const command = `-i "${inputPath}" -vf "scale=${selectedOption.scale}" "${outputPath}"`;

            console.log('FFmpeg command:', command);

            // Execute compression with realistic progress tracking
            let progressInterval;
            let currentStage = 0;
            const progressStages = [
                { progress: 10, message: 'Initializing compression...', duration: 1000 },
                { progress: 25, message: 'Analyzing video properties...', duration: 1500 },
                { progress: 45, message: 'Starting compression process...', duration: 2000 },
                { progress: 65, message: 'Processing video frames...', duration: 3000 },
                { progress: 80, message: 'Optimizing compressed output...', duration: 2000 },
                { progress: 95, message: 'Finalizing video file...', duration: 1000 },
            ];

            // Start progress simulation
            const startProgressSimulation = () => {
                const updateProgress = () => {
                    if (currentStage < progressStages.length && isCompressingRef.current) {
                        const stage = progressStages[currentStage];
                        setLoadingMessage(stage.message);
                        
                        // Animate to target progress
                        const startProgress = progressRef.current;
                        const targetProgress = stage.progress;
                        const duration = stage.duration;
                        const startTime = Date.now();

                        const animate = () => {
                            if (!isCompressingRef.current) return;
                            
                            const elapsed = Date.now() - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const newProgress = startProgress + (targetProgress - startProgress) * progress;
                            
                            progressRef.current = newProgress;
                            setCompressionProgress(newProgress);

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
                
                if (ReturnCode.isSuccess(returnCode)) {
                    // Scan the new video file to MediaStore
                    setCompressionProgress(95);
                    setLoadingMessage('Updating video library...');
                    
                    try {
                        await VideoRecordingModule.scanVideoFileForMediaStore(outputPath);
                    } catch (error) {
                        console.log('MediaStore scan failed, but video was created successfully:', error);
                    }
                }
                
                // Complete progress
                setCompressionProgress(100);
                setLoadingMessage('Compression completed successfully!');
                
                setTimeout(() => {
                    setIsCompressing(false);
                    isCompressingRef.current = false;
                    
                    if (ReturnCode.isSuccess(returnCode)) {
                        setCompressedVideoPath(outputPath);
                        setShowSuccessModal(true);
                    } else {
                        session.getLogs().then(logs => {
                            console.error('FFmpeg failed:', logs);
                            setCompressionProgress(0);
                            setLoadingMessage('');
                            progressRef.current = 0;
                            Alert.alert('Compression Failed', 'Failed to compress video. Please try again.');
                        });
                    }
                }, 1000);
            });

        } catch (error) {
            console.error('Compression error:', error);
            setIsCompressing(false);
            isCompressingRef.current = false;
            setCompressionProgress(0);
            setLoadingMessage('');
            Alert.alert(t('error', 'Error'), 'Failed to compress video: ' + error.message);
        }
    };

    const handleShare = async () => {
        try {
            if (!compressedVideoPath) {
                Alert.alert(t('error', 'Error'), 'No video file to share');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Use native module to share video file
            await VideoRecordingModule.shareVideo(compressedVideoPath, 'share_general');
            
        } catch (error) {
            console.error('Failed to share video:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert(t('no_app_available', 'No App Available'), 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert(t('share_error', 'Share Error'), 'Failed to share video: ' + error.message);
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
                if (!isCompressing) {
                    onClose();
                } else {
                    Alert.alert(
                        'Compression in Progress',
                        'Please wait for the compression to complete before closing.',
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
                    <Text style={styles.headerTitle}>{t('compressVideo', 'Compress Video')}</Text>
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

                {/* Video Info */}
                {/* {videoInfo && (
                    <View style={styles.videoInfoContainer}>
                        <Text style={styles.videoInfoTitle}>Original Video</Text>
                        <Text style={styles.videoInfoText}>
                            Resolution: {videoInfo.width} x {videoInfo.height}
                        </Text>
                        <Text style={styles.videoInfoText}>
                            Size: {video?.size || 'Unknown'}
                        </Text>
                        <Text style={styles.videoInfoText}>
                            Duration: {formatTime(videoInfo.duration)}
                        </Text>
                    </View>
                )} */}

                {/* Quality Options */}
                <View style={styles.qualityContainer}>
                    {getQualityOptions().map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.qualityOption,
                                selectedQuality === option.id && styles.selectedQualityOption
                            ]}
                            onPress={() => setSelectedQuality(option.id)}
                            disabled={isCompressing}
                        >
                            <Text style={[
                                styles.qualityTitle,
                                selectedQuality === option.id && styles.selectedQualityTitle
                            ]}>
                                {option.title}
                            </Text>
                            <Text style={[
                                styles.qualityResolution,
                                selectedQuality === option.id && styles.selectedQualityText
                            ]}>
                                {option.resolution}
                            </Text>
                            <Text style={[
                                styles.qualitySize,
                                selectedQuality === option.id && styles.selectedQualityText
                            ]}>
                                {option.size}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Ad Placeholder */}
                <View style={styles.adContainer}>
                    <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                </View>

                {/* Export Button */}
                <TouchableOpacity
                    style={[styles.exportButton, isCompressing && styles.exportButtonDisabled]}
                    onPress={handleCompress}
                    disabled={isCompressing}
                >
                    {isCompressing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.exportButtonText}>
                                {t('compressing', 'Compressing...')} {Math.round(compressionProgress)}%
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.exportButtonText}>{t('export', 'Export')}</Text>
                    )}
                </TouchableOpacity>

                {/* Loading Overlay */}
                {isCompressing && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                            <Text style={styles.loadingTitle}>{t('compressingVideo', 'Compressing Video')}</Text>
                            <Text style={styles.loadingSubtitle}>
                                {loadingMessage || t('pleaseWait', 'Please wait...')}
                            </Text>
                            
                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarContainer}>
                                    <View 
                                        style={[
                                            styles.progressBarFill, 
                                            { width: `${compressionProgress}%` }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {Math.round(compressionProgress)}%
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
                                <Text style={styles.checkIcon}>✓</Text>
                            </View>
                        </View>
                        
                        {/* Success Title */}
                        <Text style={styles.successTitle}>{t('videoExported', 'Your video has been exported')}</Text>
                        
                        {/* Back to Home Button */}
                        <TouchableOpacity 
                            style={styles.backHomeButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setCompressionProgress(0);
                                setLoadingMessage('');
                                progressRef.current = 0;
                                onCompress && onCompress(compressedVideoPath);
                                onClose();
                            }}
                        >
                            <Text style={styles.backHomeText}>{t('backToHome', 'Back to Home')}</Text>
                        </TouchableOpacity>

                        {/* Ad Banner */}
                        <View style={styles.successAdBanner}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={true} />
                        </View>
                        
                        {/* Share Button */}
                        <TouchableOpacity 
                            style={styles.shareButton}
                            onPress={handleShare}
                        >
                            <Text style={styles.shareButtonText}>{t('shareVideo', 'Share Video')}</Text>
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
        // paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        fontSize: 20,
        // color: '#1F2937',
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
        // borderRadius: 12,
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
        // position: 'absolute',
        bottom: -25,
        left: 10,
        transform: [{ translateX: -25 }, { translateY: -25 }],
    },
    playButtonInner: {
        width: 30,
        height: 30,
        // borderRadius: 25,
        // backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    videoInfoContainer: {
        backgroundColor: '#F8F9FA',
        margin: 16,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.PRIMARY,
    },
    videoInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 6,
    },
    videoInfoText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    qualityContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 10,
        gap: 8,
    },
    qualityOption: {
        flex: 1,
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 8,
        padding: 5,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedQualityOption: {
        borderColor: COLORS.PRIMARY,
        backgroundColor: COLORS.ACTIVE,
    },
    qualityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
        marginBottom: 4,
    },
    selectedQualityTitle: {
        color: COLORS.PRIMARY,
    },
    qualityResolution: {
        fontSize: 12,
        color: COLORS.WHITE,
        marginBottom: 2,
    },
    qualitySize: {
        fontSize: 11,
        color: COLORS.WHITE,
    },
    selectedQualityText: {
        color: COLORS.PRIMARY,
    },
    adContainer: {
        width: width - 32,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    
    exportButton: {
        marginHorizontal: 16,
        // marginBottom: 20,
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 8,
        paddingVertical: 14,
        width: width - 32,
        alignItems: 'center',
        // bottom: 0
    },
    exportButtonDisabled: {
        backgroundColor: COLORS.WHITE,
    },
    exportButtonText: {
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
        // paddingHorizontal: 20,
    },
    successContent: {
        // backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        height: '100%',
        // maxWidth: 320,
    },
    successIconContainer: {
        marginBottom: 16,
    },
    successIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4CAF50',
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
        // backgroundColor: '#FFF3E0',
        borderRadius: 8,
        // padding: 12,
        marginBottom: 16,
        marginTop: 16,
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

export default CompressModal;