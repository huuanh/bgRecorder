import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
            // Reset all states to initial values
            setPaused(true); // Start with video paused
            setCurrentTime(0);
            setStartTime(0);
            setEndTime(0);
            setTrimStartTime(0);
            setTrimEndTime(duration || 0);
            setIsExporting(false);
            setExportProgress(0);
            setLoadingMessage('');
            setShowSuccessModal(false);
            setTrimmedVideoPath('');
            setThumbnails([]);
            setIsGeneratingThumbnails(false);
            
            // Seek to beginning if video ref is available
            if (videoRef.current) {
                videoRef.current.seek(0);
            }
        }
    }, [visible, duration]);

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
            const fps = 10 / duration;
            const cmd = `-hwaccel auto -threads 4 -i "${videoPath}" -vf "scale=120:-1,fps=${fps}" -c:v mjpeg -q:v 12 "${outputDir}/frame_%04d.jpg"`;
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

    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Memoize timeline calculations for better performance
    const timelineData = useMemo(() => {
        if (!duration || duration <= 0) return { timeLabels: [], trimPositions: {} };
        
        const timeLabels = [
            formatTime(0),
            formatTime(duration / 4),
            formatTime(duration / 2),
            formatTime(3 * duration / 4),
            formatTime(duration)
        ];
        
        const trimPositions = {
            currentPercent: (currentTime / duration) * 100,
            startPercent: (trimStartTime / duration) * 100,
            endPercent: (trimEndTime / duration) * 100,
            selectionWidth: ((trimEndTime - trimStartTime) / duration) * 100
        };
        
        return { timeLabels, trimPositions };
    }, [duration, currentTime, trimStartTime, trimEndTime, formatTime]);

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

    // Create optimized pan responder for trim handles
    const createTrimHandlePanResponder = useCallback((isStart) => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setPaused(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                const timelineWidth = width - 72; // Account for container padding
                const layoutX = Math.max(0, gestureState.moveX - 56); // Account for offset
                const normalizedX = Math.max(0, Math.min(timelineWidth, layoutX));
                const newTime = (normalizedX / timelineWidth) * duration;

                if (isStart) {
                    if (newTime < trimEndTime - 1) {
                        setTrimStartTime(newTime);
                        seekToTime(newTime);
                    }
                } else {
                    if (newTime > trimStartTime + 1) {
                        setTrimEndTime(newTime);
                        seekToTime(newTime);
                    }
                }
            },
            onPanResponderRelease: () => {
                // Optional smooth seek to final position
            },
        });
    }, [duration, trimStartTime, trimEndTime, seekToTime]);

    const startTrimPanResponder = useMemo(() => createTrimHandlePanResponder(true), [createTrimHandlePanResponder]);
    const endTrimPanResponder = useMemo(() => createTrimHandlePanResponder(false), [createTrimHandlePanResponder]);

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
                    {/* Timeline Header Row */}
                    <View style={styles.timelineHeader}>
                        {/* Play/Pause Button */}
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
                        <Text style={styles.timelineTitle}>Timeline</Text>
                    </View>

                    {/* Thumbnail Timeline */}
                    <View style={styles.thumbnailTimeline}>
                        {isGeneratingThumbnails ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#1E3A8A" />
                                <Text style={styles.loadingText}>Generating timeline...</Text>
                            </View>
                        ) : (
                            <View style={styles.timelineWrapper}>
                                {/* Time Labels Row */}
                                <View style={styles.timeLabelsContainer}>
                                    {timelineData.timeLabels.map((label, index) => (
                                        <Text key={index} style={styles.timeLabel}>{label}</Text>
                                    ))}
                                </View>
                                
                                {/* Thumbnail Track Container */}
                                <View style={styles.thumbnailTrackContainer}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.thumbnailScroll}
                                        contentContainerStyle={styles.thumbnailScrollContent}
                                        decelerationRate="fast"
                                        snapToInterval={width / 10}
                                        snapToAlignment="start"
                                    >
                                        {/* Thumbnail Items */}
                                        <View style={styles.thumbnailsRow}>
                                            {thumbnails.map((thumbnail, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.thumbnailItem}
                                                    onPress={() => seekToTime(thumbnail.time)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={styles.thumbnailPlaceholder}>
                                                        {thumbnail.uri ? (
                                                            <Image
                                                                source={{ uri: thumbnail.uri }}
                                                                style={styles.thumbnailImage}
                                                                resizeMode="cover"
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
                                        </View>
                                    </ScrollView>
                                    
                                    {/* Controls Overlay */}
                                    <View style={styles.controlsOverlay} pointerEvents="box-none">
                                        {/* Background Track */}
                                        <View style={styles.trackBackground} />
                                        
                                        {/* Trim Selection Area */}
                                        <View
                                            style={[
                                                styles.trimSelection,
                                                {
                                                    left: `${timelineData.trimPositions.startPercent}%`,
                                                    width: `${timelineData.trimPositions.selectionWidth}%`
                                                }
                                            ]}
                                        />
                                        
                                        {/* Current Time Progress */}
                                        <View
                                            style={[
                                                styles.currentTimeIndicator,
                                                {
                                                    left: `${timelineData.trimPositions.currentPercent}%`
                                                }
                                            ]}
                                        >
                                            <View style={styles.currentTimeHandle} />
                                        </View>

                                        {/* Start Trim Handle */}
                                        <View
                                            style={[
                                                styles.trimHandle,
                                                styles.startHandle,
                                                { 
                                                    left: `${timelineData.trimPositions.startPercent}%`
                                                }
                                            ]}
                                            {...startTrimPanResponder.panHandlers}
                                        >
                                            <View style={styles.handleBackground}>
                                                <View style={styles.handleGrip} />
                                            </View>
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
                                                    left: `${timelineData.trimPositions.endPercent}%`
                                                }
                                            ]}
                                            {...endTrimPanResponder.panHandlers}
                                        >
                                            <View style={styles.handleBackground}>
                                                <View style={styles.handleGrip} />
                                            </View>
                                            {/* End Time Label */}
                                            <View style={styles.handleTimeLabel}>
                                                <Text style={styles.handleTimeText}>
                                                    {formatTime(trimEndTime)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
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
        backgroundColor: COLORS.BACKGROUND,
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E3A8A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    playIcon: {
        width: 16,
        height: 16,
        resizeMode: 'contain',
        tintColor: '#FFFFFF',
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
        // backgroundColor: '#FFFFFF',
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        flex: 1,
    },
    thumbnailTimeline: {
        marginBottom: 20,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 8,
        paddingBottom: 25, // Add extra space for time labels
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timelineWrapper: {
        overflow: 'visible',
        width: '100%',
    },
    timeLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    timeLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
        minWidth: 30,
    },
    thumbnailTrackContainer: {
        height: 60,
        position: 'relative',
        // backgroundColor: '#ff0000ff',
        borderRadius: 8,
        overflow: 'visible',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        width: '100%',
        // marginTop: 25, // Add space for time labels above
    },
    thumbnailScrollContent: {
        alignItems: 'center',
        // paddingHorizontal: 2,
        width: '100%',
    },
    thumbnailsRow: {
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        // backgroundColor: '#ffffff00',
    },
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
        overflow: 'visible',
    },
    trackBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    progressBarOverlay: {
        height: '100%',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
        overflow: 'visible',
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
        flex: 1,
        width: '100%',
    },
    thumbnailItem: {
        // marginRight: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '10%',
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: 44,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
        borderRadius: 4,
        // borderWidth: 0.5,
        // borderColor: '#E5E7EB',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    placeholderFrame: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    placeholderText: {
        fontSize: 7,
        color: '#9CA3AF',
        fontWeight: '500',
        textAlign: 'center',
    },
    currentTimeIndicator: {
        position: 'absolute',
        width: 3,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
        marginLeft: -1.5,
    },
    currentTimeHandle: {
        width: 3,
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 1.5,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 8,
    },
    trimSelection: {
        position: 'absolute',
        height: '100%',
        backgroundColor: '#10B981',
        opacity: 0.25,
        zIndex: 5,
        borderRadius: 4,
    },
    trimHandle: {
        position: 'absolute',
        width: 24,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        overflow: 'visible',
    },
    startHandle: {
        marginLeft: -12,
    },
    endHandle: {
        marginLeft: -12,
    },
    handleBackground: {
        width: 20,
        height: '90%',
        backgroundColor: '#10B981',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    handleGrip: {
        width: 3,
        height: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 1.5,
        opacity: 0.9,
    },
    handleTimeLabel: {
        position: 'absolute',
        bottom: -20,
        left: -16,
        right: -16,
        backgroundColor: '#1F2937',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
        zIndex: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    handleTimeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    // Smooth animation styles
    thumbnailAnimatedContainer: {
        transition: 'all 0.2s ease-in-out',
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