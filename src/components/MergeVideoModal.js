import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    PanResponder,
    Animated
} from 'react-native';
import { NativeModules } from 'react-native';
import { COLORS } from '../constants';
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import useTranslation from '../hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const MergeVideoModal = ({ visible, videos, onClose, onExport }) => {
    const { t } = useTranslation();
    const [videoList, setVideoList] = useState([]);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mergedVideoPath, setMergedVideoPath] = useState('');
    
    const draggedItem = useRef(null);
    const draggedIndex = useRef(null);

    useEffect(() => {
        if (visible && videos) {
            setVideoList([...videos]);
            setMergeProgress(0);
            setLoadingMessage('');
            setShowSuccessModal(false);
        }
    }, [visible, videos]);

    const handleClose = () => {
        if (!isMerging) {
            setVideoList([]);
            onClose();
        }
    };

    const handleMerge = async () => {
        if (videoList.length < 2) {
            Alert.alert(t('error', 'Error'), 'Please select at least 2 videos to merge');
            return;
        }

        try {
            setIsMerging(true);
            setMergeProgress(0);
            setLoadingMessage('Preparing videos for merge...');

            // Prepare video paths and validate
            const videoPaths = videoList.map(video => video.filePath || video.uri);
            console.log('Video paths to merge:', videoPaths);
            
            // Validate that all paths exist
            if (videoPaths.some(path => !path)) {
                throw new Error('Some video paths are invalid');
            }

            // Create output directory first
            const outputDir = '/storage/emulated/0/Movies/BgRecorder';
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
            const outputPath = `${outputDir}/BGREC_${timestamp}_merged.mp4`;

            // Ensure output directory exists
            try {
                await VideoRecordingModule.createDirectory(outputDir);
            } catch (dirError) {
                console.log('Directory creation warning:', dirError);
            }

            setLoadingMessage('Building merge command...');
            
            // Use simpler concat demuxer method for better compatibility
            let command;
            
            if (videoPaths.length === 2) {
                // Simple method for 2 videos
                command = `-i "${videoPaths[0]}" -i "${videoPaths[1]}" -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac -preset medium -crf 23 "${outputPath}"`;
            } else {
                // More complex method for multiple videos
                const inputs = videoPaths.map(path => `-i "${path}"`).join(' ');
                const filterInputs = videoPaths.map((_, index) => `[${index}:v][${index}:a]`).join('');
                const filterComplex = `${filterInputs}concat=n=${videoPaths.length}:v=1:a=1[outv][outa]`;
                command = `${inputs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac -preset medium -crf 23 "${outputPath}"`;
            }
            
            console.log('FFmpeg command:', command);
            
            setLoadingMessage('Processing videos...');
            
            // Configure progress callback with better progress calculation
            FFmpegKitConfig.enableStatisticsCallback((statistics) => {
                if (statistics && statistics.getTime) {
                    // Calculate progress based on total estimated duration
                    const totalDurationMs = getTotalDuration() * 1000;
                    const currentTimeMs = statistics.getTime();
                    const progress = totalDurationMs > 0 ? Math.min((currentTimeMs / totalDurationMs) * 100, 95) : 0;
                    
                    setMergeProgress(progress);
                    setLoadingMessage(`Merging videos... ${Math.round(progress)}%`);
                }
            });
            
            // Execute FFmpeg command with timeout
            const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();
            
            console.log('FFmpeg return code:', returnCode);
            
            if (ReturnCode.isSuccess(returnCode)) {
                console.log('Merge successful, output:', outputPath);
                
                setLoadingMessage('Updating video library...');
                setMergeProgress(95);
                
                // Scan merged video to MediaStore
                try {
                    await VideoRecordingModule.scanVideoFileForMediaStore(outputPath);
                    console.log('MediaStore scan completed');
                } catch (scanError) {
                    console.log('MediaStore scan failed, but merge was successful:', scanError);
                }
                
                setMergeProgress(100);
                setMergedVideoPath(outputPath);
                setShowSuccessModal(true);
                
                if (onExport) {
                    onExport(outputPath);
                }
            } else {
                // Get detailed logs for debugging
                const logs = await session.getLogs();
                const errorLogs = logs.map(log => log.getMessage()).join('\n');
                
                console.error('FFmpeg failed with return code:', returnCode);
                console.error('FFmpeg logs:', errorLogs);
                
                // Show more specific error message
                let errorMessage = 'Failed to merge videos';
                if (errorLogs.includes('No such file')) {
                    errorMessage = 'One or more video files not found';
                } else if (errorLogs.includes('Permission denied')) {
                    errorMessage = 'Permission denied accessing video files';
                } else if (errorLogs.includes('Invalid data')) {
                    errorMessage = 'One or more videos are corrupted or invalid';
                } else if (errorLogs.includes('No space left')) {
                    errorMessage = 'Not enough storage space';
                }
                
                throw new Error(`${errorMessage}\nDetails: ${errorLogs.substring(0, 200)}`);
            }

        } catch (error) {
            console.error('Merge error details:', error);
            
            let userMessage = 'Failed to merge videos';
            if (error.message.includes('Invalid data')) {
                userMessage = 'Some videos are corrupted or in unsupported format';
            } else if (error.message.includes('No such file')) {
                userMessage = 'Video files not found. Please try selecting videos again';
            } else if (error.message.includes('Permission')) {
                userMessage = 'Cannot access video files. Check permissions';
            } else if (error.message.includes('space')) {
                userMessage = 'Not enough storage space for merged video';
            } else if (error.message) {
                userMessage = error.message;
            }
            
            Alert.alert('Merge Failed', userMessage);
        } finally {
            setIsMerging(false);
            // Disable statistics callback
            FFmpegKitConfig.enableStatisticsCallback(null);
        }
    };

    const moveVideo = (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        
        const newVideoList = [...videoList];
        const [movedVideo] = newVideoList.splice(fromIndex, 1);
        newVideoList.splice(toIndex, 0, movedVideo);
        setVideoList(newVideoList);
    };

    const deleteVideo = (index) => {
        if (videoList.length <= 2) {
            Alert.alert('Cannot Delete', 'You need at least 2 videos to merge');
            return;
        }
        
        Alert.alert(
            'Delete Video',
            'Are you sure you want to remove this video from the merge?',
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('delete', 'Delete'),
                    style: 'destructive',
                    onPress: () => {
                        const newVideoList = videoList.filter((_, i) => i !== index);
                        setVideoList(newVideoList);
                    }
                }
            ]
        );
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalDuration = () => {
        return videoList.reduce((total, video) => {
            if (video.duration && video.duration.includes(':')) {
                const [mins, secs] = video.duration.split(':').map(Number);
                return total + (mins * 60) + secs;
            }
            return total;
        }, 0);
    };

    const renderVideoItem = (video, index) => {
        const panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            
            onPanResponderGrant: () => {
                draggedItem.current = video;
                draggedIndex.current = index;
            },
            
            onPanResponderMove: (evt, gestureState) => {
                // Calculate which position the item should move to
                const moveY = gestureState.moveY;
                const itemHeight = 100;
                const newIndex = Math.floor(moveY / itemHeight);
                
                if (newIndex !== draggedIndex.current && newIndex >= 0 && newIndex < videoList.length) {
                    moveVideo(draggedIndex.current, newIndex);
                    draggedIndex.current = newIndex;
                }
            },
            
            onPanResponderRelease: () => {
                draggedItem.current = null;
                draggedIndex.current = null;
            },
        });

        return (
            <View key={`${video.id}_${index}`} style={styles.videoItemContainer}>
                <View style={styles.videoItem}>
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandle}>
                        <View style={styles.dragDots}>
                            <View style={styles.dragDot} />
                            <View style={styles.dragDot} />
                            <View style={styles.dragDot} />
                        </View>
                    </View>
                    
                    {/* Video Thumbnail */}
                    <View style={styles.thumbnailContainer}>
                        {video.thumbnail ? (
                            <Image
                                source={{ uri: video.thumbnail }}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderThumbnail}>
                                <Image
                                    source={require('../../assets/home/ic/ic_record.png')}
                                    style={styles.placeholderIcon}
                                />
                            </View>
                        )}
                        
                        {/* Order Number */}
                        <View style={styles.orderNumber}>
                            <Text style={styles.orderNumberText}>{index + 1}</Text>
                        </View>
                        
                        {/* Duration */}
                        <View style={styles.videoDuration}>
                            <Text style={styles.durationText}>
                                {video.duration || '00:00'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Video Info */}
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle} numberOfLines={1}>
                            {video.title || 'Unknown Video'}
                        </Text>
                        <Text style={styles.videoDetails}>
                            {video.size || 'Unknown'} • {video.ratio || '720x1280'}
                        </Text>
                    </View>
                    
                    {/* Delete Button */}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteVideo(index)}
                    >
                        <Image
                            source={require('../../assets/edit/delete.png')}
                            style={styles.deleteIcon}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

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
                    <Text style={styles.headerTitle}>Merge Videos</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Video Preview */}
                <View style={styles.previewSection}>
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>Video Preview</Text>
                        <Text style={styles.totalDuration}>
                            Total: {formatTime(getTotalDuration())}
                        </Text>
                    </View>
                    
                    {videoList.length > 0 && (
                        <View style={styles.mainPreview}>
                            {videoList[0].thumbnail ? (
                                <Image
                                    source={{ uri: videoList[0].thumbnail }}
                                    style={styles.mainThumbnail}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.placeholderMain}>
                                    <Image
                                        source={require('../../assets/home/ic/ic_record.png')}
                                        style={styles.placeholderMainIcon}
                                    />
                                </View>
                            )}
                            
                            <View style={styles.playButton}>
                                <Image
                                    source={require('../../assets/home/ic/ic_play.png')}
                                    style={styles.playIcon}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Video List */}
                <View style={styles.videoListSection}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>
                            Drag to change video order ({videoList.length} videos)
                        </Text>
                    </View>
                    
                    <ScrollView
                        style={styles.videoScrollContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {videoList.map((video, index) => renderVideoItem(video, index))}
                    </ScrollView>
                </View>

                {/* Ad Banner */}
                <View style={styles.adContainer}>
                    <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                </View>

                {/* Export Button */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={[styles.exportButton, isMerging && styles.exportButtonDisabled]}
                        onPress={handleMerge}
                        disabled={isMerging}
                    >
                        {isMerging ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={styles.exportText}>
                                    Merging... {Math.round(mergeProgress)}%
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.exportText}>Export</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Loading Overlay */}
                {isMerging && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                            <Text style={styles.loadingTitle}>Merging Videos</Text>
                            <Text style={styles.loadingSubtitle}>
                                {loadingMessage || 'Please wait...'}
                            </Text>
                            
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarContainer}>
                                    <View 
                                        style={[
                                            styles.progressBarFill, 
                                            { width: `${mergeProgress}%` }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {Math.round(mergeProgress)}%
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
                        <View style={styles.successIconContainer}>
                            <View style={styles.successIcon}>
                                <Text style={styles.checkIcon}>✓</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.successTitle}>Videos merged successfully!</Text>
                        <Text style={styles.successSubtitle}>
                            {videoList.length} videos have been merged into one
                        </Text>
                        
                        <View style={styles.successAdBanner}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.backHomeButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                handleClose();
                            }}
                        >
                            <Text style={styles.backHomeText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = {
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.WHITE,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER,
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.TEXT_PRIMARY,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    previewSection: {
        backgroundColor: COLORS.WHITE,
        margin: 16,
        borderRadius: 12,
        padding: 16,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
    },
    totalDuration: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        fontWeight: '600',
    },
    mainPreview: {
        position: 'relative',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mainThumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholderMain: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.PLACEHOLDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderMainIcon: {
        width: 60,
        height: 60,
        tintColor: COLORS.TEXT_SECONDARY,
    },
    playButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }],
        width: 50,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.PRIMARY,
    },
    videoListSection: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    listHeader: {
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
    },
    videoScrollContainer: {
        flex: 1,
    },
    videoItemContainer: {
        marginBottom: 12,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 8,
        padding: 8,
    },
    dragHandle: {
        padding: 12,
        marginRight: 8,
    },
    dragDots: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    dragDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.TEXT_SECONDARY,
        marginVertical: 1,
    },
    thumbnailContainer: {
        position: 'relative',
        width: 80,
        height: 60,
        borderRadius: 6,
        overflow: 'hidden',
        marginRight: 12,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholderThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.PLACEHOLDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.TEXT_SECONDARY,
    },
    orderNumber: {
        position: 'absolute',
        top: 4,
        left: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderNumberText: {
        color: COLORS.WHITE,
        fontSize: 12,
        fontWeight: 'bold',
    },
    videoDuration: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
    },
    durationText: {
        color: COLORS.WHITE,
        fontSize: 10,
        fontWeight: '600',
    },
    videoInfo: {
        flex: 1,
        marginRight: 8,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 2,
    },
    videoDetails: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
    },
    deleteButton: {
        padding: 8,
    },
    deleteIcon: {
        width: 20,
        height: 20,
        tintColor: COLORS.ERROR,
    },
    adContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    bottomActions: {
        padding: 16,
        backgroundColor: COLORS.WHITE,
    },
    exportButton: {
        backgroundColor: COLORS.TERTIARY,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    exportButtonDisabled: {
        backgroundColor: COLORS.DISABLED,
    },
    exportText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginHorizontal: 32,
        minWidth: 280,
    },
    loadingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
        marginTop: 16,
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
        marginBottom: 24,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: COLORS.BORDER,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.PRIMARY,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    loadingWarning: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successContent: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginHorizontal: 32,
        minWidth: 280,
    },
    successIconContainer: {
        marginBottom: 24,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.SUCCESS,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkIcon: {
        fontSize: 40,
        color: COLORS.WHITE,
        fontWeight: 'bold',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
        textAlign: 'center',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
        marginBottom: 24,
    },
    successAdBanner: {
        width: '100%',
        marginBottom: 24,
    },
    backHomeButton: {
        backgroundColor: COLORS.PRIMARY,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        minWidth: 200,
        alignItems: 'center',
    },
    backHomeText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
};

export default MergeVideoModal;