import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Image,
    ScrollView,
    PanResponder,
    Alert,
    ActivityIndicator
} from 'react-native';
import Video from 'react-native-video';
import { NativeAdComponent } from './NativeAdComponent';
import { COLORS } from '../constants';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { ADS_UNIT } from '../AdManager';
import { NativeModules } from 'react-native';

const { width, height } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const TrimVideoModal = ({ visible, video, onClose, onExport }) => {
    const videoRef = useRef(null);
    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [trimStartTime, setTrimStartTime] = useState(0);
    const [trimEndTime, setTrimEndTime] = useState(0);
    const [thumbnails, setThumbnails] = useState([]);
    const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [tempFrameDir, setTempFrameDir] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [trimmedVideoPath, setTrimmedVideoPath] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [exportProgress, setExportProgress] = useState(0);

    useEffect(() => {
        if (visible && video && duration > 0) {
            setTrimEndTime(duration);
            generateThumbnails();
        }
    }, [visible, video, duration]);

    // Reset state when modal becomes visible
    useEffect(() => {
        if (visible) {
            setIsExporting(false);
            setExportProgress(0);
            setLoadingMessage('');
            setShowSuccessModal(false);
            setTrimmedVideoPath('');
        }
    }, [visible]);

    // Cleanup temporary frames when modal closes
    useEffect(() => {
        if (!visible && tempFrameDir) {
            cleanupTempFrames();
        }
    }, [visible, tempFrameDir]);

    const cleanupTempFrames = async () => {
        if (tempFrameDir) {
            try {
                const exists = await RNFS.exists(tempFrameDir);
                if (exists) {
                    await RNFS.unlink(tempFrameDir);
                    console.log('Cleaned up temporary frames directory:', tempFrameDir);
                }
            } catch (error) {
                console.error('Error cleaning up temporary frames:', error);
            }
            setTempFrameDir(null);
        }
    };

    const extractFrames = async (videoPath, outputDir) => {
        try {
            // Ensure output directory exists
            await RNFS.mkdir(outputDir);

            // Optimized FFmpeg command for faster extraction with lower quality
            // - scale=120:-1: Scale width to 120px, height auto (very small for timeline)
            // - q:v 8: Lower quality (higher number = lower quality, range 1-31)
            // - fps=20/${duration}: Extract exactly 20 frames evenly distributed
            // - -an: Remove audio (not needed for thumbnails)
            // - -preset ultrafast: Fastest encoding preset
            const fps = 19 / duration;
            const cmd = `-i "${videoPath}" -vf "scale=120:-1,fps=${fps}" -q:v 12 "${outputDir}/frame_%04d.jpg"`;
            console.log('Optimized FFmpeg command:', cmd);

            const session = await FFmpegKit.execute(cmd);
            const returnCode = await session.getReturnCode();

            if (returnCode.isValueSuccess()) {
                console.log('Fast frame extraction completed successfully');
                return true;
            } else {
                console.error('Frame extraction failed with return code:', returnCode);
                return false;
            }
        } catch (error) {
            console.error('Error extracting frames:', error);
            return false;
        }
    };

    const generateThumbnails = async () => {
        if (!video || duration <= 0) return;

        setIsGeneratingThumbnails(true);
        const thumbnailCount = 20;

        try {
            // Create temporary directory for frames
            const tempDir = `${RNFS.CachesDirectoryPath}/video_frames_${Date.now()}`;
            setTempFrameDir(tempDir);

            // Extract frames using FFmpeg
            const success = await extractFrames(video.filePath, tempDir);

            if (success) {
                // Check which frames were actually created
                const frameFiles = await RNFS.readDir(tempDir);
                const sortedFrames = frameFiles
                    .filter(file => file.name.endsWith('.jpg'))
                    .sort((a, b) => a.name.localeCompare(b.name));

                const newThumbnails = [];
                const interval = duration / Math.min(thumbnailCount, sortedFrames.length);

                for (let i = 0; i < sortedFrames.length; i++) {
                    const timeStamp = i * interval;
                    newThumbnails.push({
                        time: timeStamp,
                        uri: `file://${sortedFrames[i].path}`
                    });
                }

                setThumbnails(newThumbnails);
                console.log(`Generated ${newThumbnails.length} thumbnails`);
            } else {
                // Fallback to placeholder thumbnails if FFmpeg fails
                console.log('Using fallback placeholder thumbnails');
                const newThumbnails = [];
                const interval = duration / thumbnailCount;

                for (let i = 0; i < thumbnailCount; i++) {
                    const timeStamp = i * interval;
                    newThumbnails.push({
                        time: timeStamp,
                        uri: null // Placeholder
                    });
                }

                setThumbnails(newThumbnails);
            }
        } catch (error) {
            console.error('Error generating thumbnails:', error);

            // Fallback to placeholder thumbnails
            const newThumbnails = [];
            const interval = duration / thumbnailCount;

            for (let i = 0; i < thumbnailCount; i++) {
                const timeStamp = i * interval;
                newThumbnails.push({
                    time: timeStamp,
                    uri: null // Placeholder
                });
            }

            setThumbnails(newThumbnails);
        } finally {
            setIsGeneratingThumbnails(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const onLoad = (data) => {
        setDuration(data.duration);
        setTrimEndTime(data.duration);
    };

    const onProgress = (data) => {
        setCurrentTime(data.currentTime);
        
        // Auto-pause when reaching trim end time during playback
        if (!paused && data.currentTime >= trimEndTime) {
            setPaused(true);
            seekToTime(trimEndTime); // Ensure we stop exactly at trim end
        }
    };

    const seekToTime = (time) => {
        videoRef.current?.seek(time);
    };

    const handlePlayPause = () => {
        if (paused) {
            // When starting to play, seek to trim start if current time is outside trim range
            if (currentTime < trimStartTime || currentTime >= trimEndTime) {
                seekToTime(trimStartTime);
            }
        }
        setPaused(!paused);
    };

    // Create pan responder for trim handles
    const createTrimHandlePanResponder = (isStart) => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Pause video when starting to drag
                setPaused(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Get the scroll view width from the timeline wrapper
                const timelineWidth = width - 40; // Account for margins (20px each side)
                const scrollViewWidth = timelineWidth;
                
                // Calculate position relative to the scroll view
                const layoutX = evt.nativeEvent.pageX - 20; // Account for left margin
                const normalizedX = Math.max(0, Math.min(scrollViewWidth, layoutX));
                const newTime = (normalizedX / scrollViewWidth) * duration;

                if (isStart) {
                    if (newTime < trimEndTime - 1) { // Minimum 1 second difference
                        setTrimStartTime(newTime);
                        seekToTime(newTime);
                    }
                } else {
                    if (newTime > trimStartTime + 1) { // Minimum 1 second difference
                        setTrimEndTime(newTime);
                        seekToTime(newTime);
                    }
                }
            },
            onPanResponderRelease: () => {
                // Optional: resume video after dragging
                // setPaused(false);
            },
        });
    };

    const startTrimPanResponder = createTrimHandlePanResponder(true);
    const endTrimPanResponder = createTrimHandlePanResponder(false);

    const handleExport = async () => {
        console.log('Exporting video with trim range:', trimStartTime, trimEndTime);    
        if (trimEndTime - trimStartTime < 1) {
            Alert.alert('Invalid Selection', 'Please select at least 1 second of video to trim.');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);
        setLoadingMessage('Initializing trim export...');

        try {
            // Perform the actual video trimming
            await trimVideoWithFFmpeg();
            
            // Show success modal instead of alert
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', 'Failed to trim video. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // FFmpeg trim video function
    const trimVideo = async (videoPath, outputPath, start, duration) => {
        const cmd = `-i "${videoPath}" -ss ${start} -t ${duration} -c copy "${outputPath}"`;
        console.log('FFmpeg trim command:', cmd);
        
        const session = await FFmpegKit.execute(cmd);
        const returnCode = await session.getReturnCode();
        
        if (!returnCode.isValueSuccess()) {
            throw new Error(`FFmpeg failed with return code: ${returnCode}`);
        }
        
        console.log('Video trimming completed successfully');
        return true;
    };

    const generateTrimmedVideoPath = (originalVideo, startTime, endTime) => {
        try {
            // Get original file info
            const originalName = originalVideo.title;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
            const extension = originalName.substring(originalName.lastIndexOf('.'));
            
            // Create trimmed filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const trimmedName = `${nameWithoutExt}_trimmed_${timestamp}${extension}`;
            
            // Use the same directory as the original video
            const originalDir = originalVideo.filePath.substring(0, originalVideo.filePath.lastIndexOf('/'));
            const outputPath = `${originalDir}/${trimmedName}`;
            
            console.log('Generated trim output path:', outputPath);
            return outputPath;
        } catch (error) {
            console.error('Error generating trimmed video path:', error);
            // Fallback path
            const timestamp = Date.now();
            return `${RNFS.DocumentDirectoryPath}/trimmed_video_${timestamp}.mp4`;
        }
    };

    const trimVideoWithFFmpeg = async () => {
        try {
            console.log('Starting video trim export');
            
            const startTime = trimStartTime;
            const endTime = trimEndTime;
            const trimDuration = endTime - startTime;
            
            // Validate input
            if (!video || !video.filePath) {
                throw new Error('Invalid video file');
            }
            
            if (trimDuration < 1) {
                throw new Error('Trim duration must be at least 1 second');
            }
            
            // Check if input file exists
            const inputExists = await RNFS.exists(video.filePath);
            if (!inputExists) {
                throw new Error('Original video file not found');
            }
            
            // Generate output path
            const outputPath = generateTrimmedVideoPath(video, startTime, endTime);
            
            // Ensure output directory exists
            const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
            const dirExists = await RNFS.exists(outputDir);
            if (!dirExists) {
                await RNFS.mkdir(outputDir);
            }
            
            console.log(`Trimming video: ${video.filePath} -> ${outputPath}`);
            console.log(`Start: ${startTime}s, Duration: ${trimDuration}s`);
            
            // Start progress simulation
            setLoadingMessage('Analyzing video file...');
            setExportProgress(15);
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            setLoadingMessage('Preparing trim operation...');
            setExportProgress(30);
            
            await new Promise(resolve => setTimeout(resolve, 600));
            
            setLoadingMessage('Processing video frames...');
            setExportProgress(50);
            
            // Perform the trim using FFmpeg
            await trimVideo(video.filePath, outputPath, startTime, trimDuration);
            
            setLoadingMessage('Finalizing trimmed video...');
            setExportProgress(85);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify output file was created
            const outputExists = await RNFS.exists(outputPath);
            if (!outputExists) {
                throw new Error('Trimmed video file was not created');
            }
            
            // Get file stats for validation
            const stats = await RNFS.stat(outputPath);
            console.log(`Trimmed video created: ${outputPath}, Size: ${stats.size} bytes`);
            
            setLoadingMessage('Trim completed successfully!');
            setExportProgress(100);
            setTrimmedVideoPath(outputPath);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Call the parent callback to refresh video list
            if (onExport) {
                await onExport({
                    video,
                    startTime: trimStartTime,
                    endTime: trimEndTime,
                    duration: trimDuration,
                    outputPath
                });
            }
            
            console.log('Video trim export completed successfully');
            
        } catch (error) {
            console.error('Failed to trim video:', error);
            throw error;
        }
    };

    const resetTrim = () => {
        setTrimStartTime(0);
        setTrimEndTime(duration);
        seekToTime(0);
    };

    const handleClose = async () => {
        await cleanupTempFrames();
        onClose();
    };

    const handleShare = async () => {
        try {
            if (!trimmedVideoPath) {
                Alert.alert('Error', 'No video file to share');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            // Use native module to share video file
            await VideoRecordingModule.shareVideo(trimmedVideoPath, 'share_general');
            
        } catch (error) {
            console.error('Failed to share video:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert('No App Available', 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert('Share Error', 'Failed to share video: ' + error.message);
            }
        }
    };

    if (!video) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                        <Image
                            source={require('../../assets/home/ic/ic_back.png')}
                            style={styles.backIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Trim Video</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Video Player */}
                <View style={styles.videoContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: video.filePath }}
                        style={styles.video}
                        resizeMode="contain"
                        paused={paused}
                        onLoad={onLoad}
                        onProgress={onProgress}
                        progressUpdateInterval={100}
                    />

                    {/* Play/Pause Overlay */}
                    <TouchableOpacity
                        style={styles.playOverlay}
                        onPress={handlePlayPause}
                        activeOpacity={0.7}
                    >
                        <View style={styles.playButton}>
                            <Image
                                source={
                                    paused
                                        ? require('../../assets/home/ic/ic_play.png')
                                        : require('../../assets/home/ic/ic_pause.png')
                                }
                                style={styles.playIcon}
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Video Info */}
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle}>{video.title}</Text>
                        <Text style={styles.videoDuration}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </Text>
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>Timeline</Text>

                    {/* Thumbnail Timeline */}
                    <View style={styles.thumbnailTimeline}>
                        {isGeneratingThumbnails ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#1E3A8A" />
                                <Text style={styles.loadingText}>Generating timeline...</Text>
                            </View>
                        ) : (
                            <View style={styles.timelineWrapper}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.thumbnailScroll}
                                >
                                    {thumbnails.map((thumbnail, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.thumbnailItem}
                                            onPress={() => seekToTime(thumbnail.time)}
                                        >
                                            <View style={styles.thumbnailPlaceholder}>
                                                {thumbnail.uri ? (
                                                    <Image
                                                        source={{ uri: thumbnail.uri }}
                                                        style={styles.thumbnailImage}
                                                        onError={() => {
                                                            console.log('Failed to load thumbnail:', thumbnail.uri);
                                                        }}
                                                    />
                                                ) : (
                                                    <View style={styles.placeholderFrame}>
                                                        <Text style={styles.placeholderText}>
                                                            {formatTime(thumbnail.time)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                    {/* Progress Bar Overlay */}
                                    <View style={styles.progressBarOverlay} pointerEvents="box-none">
                                        {/* Progress Line */}
                                        <View style={styles.progressLine} />

                                        {/* Current Time Indicator */}
                                        <View
                                            style={[
                                                styles.currentTimeIndicator,
                                                {
                                                    left: `${(currentTime / duration) * 100}%`
                                                }
                                            ]}
                                        />

                                        {/* Trim Selection Overlay */}
                                        <View
                                            style={[
                                                styles.trimSelection,
                                                {
                                                    left: `${(trimStartTime / duration) * 100}%`,
                                                    width: `${((trimEndTime - trimStartTime) / duration) * 100}%`
                                                }
                                            ]}
                                        />

                                        {/* Start Trim Handle */}
                                        <View
                                            style={[
                                                styles.trimHandle,
                                                styles.startHandle,
                                                { 
                                                    left: `${(trimStartTime / duration) * 100}%`
                                                }
                                            ]}
                                            {...startTrimPanResponder.panHandlers}
                                        >
                                            <Image
                                                source={require('../../assets/home/ic/trim_start.png')}
                                                style={styles.handleIcon}
                                            />
                                            {/* Start Time Label */}
                                            <View style={styles.handleTimeLabel}>
                                                <Text style={styles.handleTimeText}>
                                                    {formatTime(trimStartTime)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* End Trim Handle */}
                                        <View
                                            style={[
                                                styles.trimHandle,
                                                styles.endHandle,
                                                { 
                                                    left: `${(trimEndTime / duration) * 100}%`
                                                }
                                            ]}
                                            {...endTrimPanResponder.panHandlers}
                                        >
                                            <Image
                                                source={require('../../assets/home/ic/trim_end.png')}
                                                style={styles.handleIcon}
                                            />
                                            {/* End Time Label */}
                                            <View style={styles.handleTimeLabel}>
                                                <Text style={styles.handleTimeText}>
                                                    {formatTime(trimEndTime)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* Native Ad */}
                <View style={styles.adContainer}>
                    <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
                        onPress={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={styles.exportText}>
                                    Exporting... {Math.round(exportProgress)}%
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.exportText}>Export</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Loading Overlay */}
                {isExporting && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                            <Text style={styles.loadingTitle}>Trimming Video</Text>
                            <Text style={styles.loadingSubtitle}>
                                {loadingMessage || 'Please wait...'}
                            </Text>
                            
                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarContainer}>
                                    <View 
                                        style={[
                                            styles.progressBarFill, 
                                            { width: `${exportProgress}%` }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {Math.round(exportProgress)}%
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
                        <Text style={styles.successTitle}>Your video has been trimmed</Text>
                        
                        {/* Ad Banner */}
                        <View style={styles.successAdBanner}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                        </View>
                        
                        {/* Back to Home Button */}
                        <TouchableOpacity 
                            style={styles.backHomeButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setExportProgress(0);
                                setLoadingMessage('');
                                handleClose();
                            }}
                        >
                            <Text style={styles.backHomeText}>Back to Home</Text>
                        </TouchableOpacity>
                        
                        {/* Share Button */}
                        <TouchableOpacity 
                            style={styles.shareButton}
                            onPress={handleShare}
                        >
                            <Text style={styles.shareButtonText}>Share Video</Text>
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
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 5,
        paddingTop: 10, // Account for status bar
        backgroundColor: COLORS.BACKGROUND,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        // backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: 20,
        height: 20,
        // tintColor: '#1F2937',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
    },
    placeholder: {
        width: 40,
    },
    videoContainer: {
        backgroundColor: '#000000',
        position: 'relative',
    },
    video: {
        width,
        height: width * 0.6, // 16:9 aspect ratio
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 60,
        height: 60,
        // borderRadius: 30,
        // backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        width: 20,
        height: 25,
        resizeMode: 'contain',
        // tintColor: '#FFFFFF',
    },
    videoInfo: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
    },
    videoTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    videoDuration: {
        color: '#FFFFFF',
        fontSize: 14,
        opacity: 0.8,
    },
    timelineContainer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 15,
    },
    thumbnailTimeline: {
        marginBottom: 20,
        overflow: 'visible', // Allow time labels to show outside bounds
    },
    timelineWrapper: {
        height: 65,
        position: 'relative',
        overflow: 'visible', // Allow time labels to show above
        paddingTop: 30, // Add space for time labels
        marginTop: -30, // Compensate for padding
    },
    progressBarOverlay: {
        height: '100%',
        position: 'absolute',
        // top: 30, // Offset for time label space
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none', // Allow touches to pass through to children
        overflow: 'visible', // Allow time labels to show
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 10,
        color: '#6B7280',
    },
    thumbnailScroll: {
        height: 80,
    },
    thumbnailItem: {
        marginRight: -2,
        alignItems: 'center',
    },
    thumbnailPlaceholder: {
        width: 20,
        height: 35,
        // borderRadius: 8,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
        marginBottom: 4,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    placeholderFrame: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 8,
        color: '#9CA3AF',
        fontWeight: '500',
        textAlign: 'center',
    },
    thumbnailTime: {
        fontSize: 10,
        color: '#6B7280',
    },
    progressLine: {
        position: 'absolute',
        top: 0, // Position over thumbnails
        left: 0,
        right: 0,
        height: "100%",
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 2,
        opacity: 0.3,
    },
    currentTimeIndicator: {
        position: 'absolute',
        // top: 20,
        width: 2,
        height: "100%",
        backgroundColor: '#EF4444',
        borderRadius: 1,
        zIndex: 5,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.3,
        // shadowRadius: 2,
        // elevation: 3,
    },
    trimSelection: {
        position: 'absolute',
        height: '100%',
        backgroundColor: COLORS.ACTIVE, // Green color for selected area
        borderRadius: 2,
        zIndex: 3,
        opacity: 0.3,
    },
    trimHandle: {
        position: 'absolute',
        // top: -30, // Move up to account for label space
        width: 20,
        height: "100%",
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Higher z-index to show above other elements
        opacity: 0.8,
        overflow: 'visible', // Allow time labels to show
    },
    startHandle: {
        marginLeft: -1, // Center the handle on the position
    },
    endHandle: {
        marginLeft: -19, // Center the handle on the position
    },
    handleIcon: {
        width: 20,
        height: "100%",
        resizeMode: 'contain',
    },
    handleTimeLabel: {
        position: 'absolute',
        top: -5, // Position right above the handle
        left: -10,
        right: -10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
        zIndex: 15, // Very high z-index to ensure visibility
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5, // For Android shadow
    },
    handleTimeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    adContainer: {
        marginVertical: 10,
        paddingHorizontal: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 30,
        gap: 10,
    },
    exportButton: {
        flex: 1,
        height: 50,
        backgroundColor: '#1E3A8A',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exportButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    exportText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
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
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center',
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
        backgroundColor: '#1E3A8A',
        borderRadius: 4,
        minWidth: 2,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E3A8A',
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
        backgroundColor: '#F8F9FA',
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
        marginTop: 60,
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
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 16,
    },
    successAdBanner: {
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
    },
    backHomeButton: {
        marginBottom: 16,
    },
    backHomeText: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    shareButton: {
        backgroundColor: '#1E3A8A',
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

export default TrimVideoModal;