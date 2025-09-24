import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import VideoThumbnail from './VideoThumbnail';
import { NativeModules } from 'react-native';

const { width } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const VideoSelectorModal = ({ 
    visible, 
    onClose, 
    onVideoSelect, 
    title = "Select Video",
    showAllVideos = true 
}) => {
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadVideos();
        }
    }, [visible]);

    const loadVideos = async () => {
        try {
            setIsLoading(true);
            const result = await VideoRecordingModule.getAllVideosFromGallery();
            
            if (result && result.length > 0) {
                const formattedVideos = result.map(video => ({
                    id: video.id,
                    title: video.title,
                    duration: video.duration || '00:00',
                    size: video.size,
                    date: new Date(video.dateModified * 1000).toLocaleString(),
                    filePath: video.filePath,
                    ratio: video.width && video.height ? `${video.width}x${video.height}` : '720x1280',
                    thumbnail: null,
                    lastModified: video.dateModified,
                    isAppRecording: video.isAppRecording,
                    source: video.source,
                    width: video.width || 720,
                    height: video.height || 1280
                }));
                setVideos(formattedVideos);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            Alert.alert('Error', 'Failed to load videos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVideoSelect = (video) => {
        onVideoSelect(video);
        onClose();
    };

    const renderVideoItem = ({ item }) => (
        <TouchableOpacity
            style={styles.videoItem}
            onPress={() => handleVideoSelect(item)}
            activeOpacity={0.8}
        >
            <View style={styles.videoThumbnailContainer}>
                <VideoThumbnail 
                    video={item}
                    style={styles.videoThumbnail}
                />
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.videoDuration}>{item.duration}</Text>
                <Text style={styles.videoRatio}>{item.ratio}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
                
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>Loading videos...</Text>
                    </View>
                ) : videos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No videos found</Text>
                        <Text style={styles.emptySubText}>Record some videos to get started</Text>
                    </View>
                ) : (
                    <FlatList
                        data={videos}
                        renderItem={renderVideoItem}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        contentContainerStyle={styles.videosList}
                        columnWrapperStyle={styles.videoRow}
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.SECONDARY,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.SECONDARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: COLORS.TERTIARY,
        fontWeight: '600',
    },
    videosList: {
        padding: 10,
    },
    videoRow: {
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    videoItem: {
        width: (width - 40) / 2,
        backgroundColor: COLORS.SECONDARY,
        borderRadius: 8,
        margin: 5,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    videoThumbnailContainer: {
        width: '100%',
        height: 120,
        backgroundColor: '#000',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    videoInfo: {
        padding: 10,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    videoDuration: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        opacity: 0.7,
    },
    videoRatio: {
        fontSize: 10,
        color: COLORS.TERTIARY,
        opacity: 0.5,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubText: {
        fontSize: 14,
        color: COLORS.TERTIARY,
        opacity: 0.7,
        textAlign: 'center',
    },
});

export default VideoSelectorModal;