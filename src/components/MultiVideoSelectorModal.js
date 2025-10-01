import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { NativeModules } from 'react-native';
import { COLORS } from '../constants';
import VideoThumbnail from './VideoThumbnail';

const { width: screenWidth } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const MultiVideoSelectorModal = ({ visible, title, onClose, onVideoSelect, minSelection = 2 }) => {
    const [videos, setVideos] = useState([]);
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadVideos();
        }
    }, [visible]);

    const loadVideos = async () => {
        try {
            setLoading(true);
            console.log('Loading videos for multi-selection...');
            
            let allVideos = [];
            
            // Try to get videos from gallery first
            if (VideoRecordingModule?.getAllVideosFromGallery) {
                try {
                    const galleryVideos = await VideoRecordingModule.getAllVideosFromGallery();
                    if (Array.isArray(galleryVideos)) {
                        allVideos = [...galleryVideos];
                        console.log('Gallery videos loaded:', allVideos.length);
                    }
                } catch (error) {
                    console.log('Gallery videos error:', error);
                }
            }
            
            // Fallback to recorded videos if no gallery videos
            if (allVideos.length === 0 && VideoRecordingModule?.getRecordedVideos) {
                try {
                    const recordedResult = await VideoRecordingModule.getRecordedVideos();
                    if (recordedResult?.videos && Array.isArray(recordedResult.videos)) {
                        allVideos = recordedResult.videos;
                        console.log('Recorded videos loaded:', allVideos.length);
                    }
                } catch (error) {
                    console.log('Recorded videos error:', error);
                }
            }

            // Format videos for consistent structure
            const formattedVideos = allVideos.map((video, index) => ({
                id: video.id || video.filePath || `video_${index}`,
                title: video.title || video.fileName || 'Unknown Video',
                filePath: video.filePath || video.uri,
                uri: video.uri || video.filePath,
                duration: video.duration || '00:00',
                size: video.size || 'Unknown size',
                ratio: `${video.width || 720}x${video.height || 1280}`,
                thumbnail: video.thumbnail || null,
                lastModified: video.dateModified || video.lastModified || Date.now(),
                isAppRecording: video.isAppRecording || false,
                source: video.source || 'Gallery',
                width: video.width || 720,
                height: video.height || 1280
            }));
            
            // Filter out videos without valid file paths
            const validVideos = formattedVideos.filter(video => {
                const hasPath = video.filePath && video.filePath.length > 0;
                if (!hasPath) {
                    console.log('Skipping video without valid path:', video.title);
                }
                return hasPath;
            });
            
            console.log(`Formatted ${validVideos.length} valid videos out of ${allVideos.length} total`);
            setVideos(validVideos);
        } catch (error) {
            console.error('Error loading videos:', error);
            Alert.alert('Error', 'Failed to load videos');
        } finally {
            setLoading(false);
        }
    };

    const toggleVideoSelection = (video) => {
        const isSelected = selectedVideos.some(selected => selected.id === video.id);
        
        if (isSelected) {
            setSelectedVideos(prev => prev.filter(selected => selected.id !== video.id));
        } else {
            setSelectedVideos(prev => [...prev, video]);
        }
    };

    const handleNext = () => {
        if (selectedVideos.length < minSelection) {
            Alert.alert('Selection Required', `Please select at least ${minSelection} videos to merge`);
            return;
        }
        
        onVideoSelect(selectedVideos);
        setSelectedVideos([]);
    };

    const renderVideoItem = ({ item, index }) => {
        const isSelected = selectedVideos.some(selected => selected.id === item.id);
        const selectionIndex = selectedVideos.findIndex(selected => selected.id === item.id);
        
        return (
            <TouchableOpacity
                style={[styles.videoItem, isSelected && styles.videoItemSelected]}
                onPress={() => toggleVideoSelection(item)}
                activeOpacity={0.8}
            >
                <View style={styles.thumbnailContainer}>
                    <VideoThumbnail
                        video={item}
                        style={styles.thumbnail}
                    />
                    
                    {isSelected && (
                        <View style={styles.selectionOverlay}>
                            <View style={styles.selectionNumber}>
                                <Text style={styles.selectionNumberText}>
                                    {selectionIndex + 1}
                                </Text>
                            </View>
                        </View>
                    )}
                    
                    {/* <View style={styles.videoDuration}>
                        <Text style={styles.durationText}>
                            {item.duration || '00:00'}
                        </Text>
                    </View> */}
                </View>
                
                <View style={styles.videoDetails}>
                    <Text style={styles.videoTitle} numberOfLines={1}>
                        {item.title || 'Unknown Video'}
                    </Text>
                    <Text style={styles.videoInfo}>
                        {item.size || 'Unknown size'} • {item.ratio || '720x1280'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={onClose}>
                        <Image
                            source={require('../../assets/home/ic/ic_back.png')}
                            style={styles.backIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title || 'Select Videos'}</Text>
                    <View style={styles.headerRight}>
                        <Text style={styles.selectionCount}>
                            {selectedVideos.length} selected
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>Loading videos...</Text>
                    </View>
                ) : videos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No videos found</Text>
                        <Text style={styles.emptySubtext}>
                            Record some videos first to use this feature
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={videos}
                        renderItem={renderVideoItem}
                        keyExtractor={(item, index) => {
                            if (item.id) return item.id.toString();
                            if (item.filePath) return item.filePath;
                            return `video_${index}`;
                        }}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.videoList}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <View style={styles.bottomSection}>
                    <Text style={styles.instructionText}>
                        Select {minSelection} or more videos to merge
                    </Text>
                    
                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            selectedVideos.length < minSelection && styles.nextButtonDisabled
                        ]}
                        onPress={handleNext}
                        disabled={selectedVideos.length < minSelection}
                    >
                        <Text style={styles.nextButtonText}>
                            Next ({selectedVideos.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        // tintColor: COLORS.TEXT_PRIMARY,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        minWidth: 80,
        alignItems: 'flex-end',
    },
    selectionCount: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.TEXT_SECONDARY,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
    },
    videoList: {
        padding: 8,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    videoItem: {
        width: (screenWidth - 40) / 2,
        backgroundColor: COLORS.WHITE,
        borderRadius: 12,
        // marginVertical: 8,
        overflow: 'hidden',
        margin: 5,
        // elevation: 2,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
    },
    videoItemSelected: {
        // borderWidth: 3,
        // borderColor: COLORS.PRIMARY,
    },
    thumbnailContainer: {
        position: 'relative',
        // height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 59, 138, 0.34)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.WHITE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionNumberText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.TERTIARY,
    },
    videoDetails: {
        paddingHorizontal: 12,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 4,
    },
    videoInfo: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
    },
    bottomSection: {
        padding: 16,
        backgroundColor: COLORS.WHITE,
        borderTopWidth: 1,
        borderTopColor: COLORS.BORDER,
    },
    instructionText: {
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
        marginBottom: 16,
    },
    nextButton: {
        backgroundColor: COLORS.TERTIARY,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: COLORS.DISABLED,
    },
    nextButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
};

export default MultiVideoSelectorModal;