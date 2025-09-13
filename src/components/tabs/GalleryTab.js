import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoPlayer from '../VideoPlayer';
import { addTestVideo, clearAllVideos } from '../../utils/testUtils';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

const GalleryTab = () => {
    const [activeTab, setActiveTab] = useState('video'); // 'video' or 'audio'
    const [videos, setVideos] = useState([
        
    ]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    const [audioFiles] = useState([
        // Placeholder for audio files - to be implemented later
    ]);

    useEffect(() => {
        // Load actual recorded videos from storage
        loadRecordedVideos();
        
        // Refresh every 5 seconds to catch new videos
        const interval = setInterval(() => {
            loadRecordedVideos();
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    const loadRecordedVideos = async () => {
        try {
            const storedVideos = await AsyncStorage.getItem('recorded_videos');
            if (storedVideos) {
                const parsedVideos = JSON.parse(storedVideos);
                setVideos(parsedVideos);
                console.log('Loaded recorded videos from storage:', parsedVideos.length);
            } else {
                // Create some sample data for testing if no videos found
                const sampleVideos = [
                    {
                        id: Date.now(),
                        title: 'Sample_Recording_001.mp4',
                        duration: '00:02:30',
                        size: '45 MB',
                        date: new Date().toLocaleString(),
                        filePath: null, // Will be populated by actual recordings
                        quality: 'HD 720p',
                        camera: 'Front',
                        thumbnail: null
                    }
                ];
                setVideos(sampleVideos);
                // Save sample data
                await AsyncStorage.setItem('recorded_videos', JSON.stringify(sampleVideos));
                console.log('Created sample video data');
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
            setVideos([]);
        }
    };

    const handleVideoAction = (videoId, action) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        switch (action) {
            case 'play':
                // Implement video playback
                if (video.filePath) {
                    setSelectedVideo(video);
                    setShowVideoPlayer(true);
                } else {
                    Alert.alert('Error', 'Video file path not found. The video file might have been deleted.');
                }
                break;
            case 'share':
                // TODO: Implement share functionality
                Alert.alert('Share Video', `Sharing: ${video.title}`);
                break;
            case 'delete':
                Alert.alert(
                    'Delete Video',
                    `Are you sure you want to delete ${video.title}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => deleteVideo(videoId)
                        }
                    ]
                );
                break;
            case 'info':
                showVideoInfo(video);
                break;
        }
    };

    const deleteVideo = async (videoId) => {
        try {
            const updatedVideos = videos.filter(v => v.id !== videoId);
            setVideos(updatedVideos);
            await AsyncStorage.setItem('recorded_videos', JSON.stringify(updatedVideos));
            Alert.alert('Success', 'Video deleted successfully');
        } catch (error) {
            console.error('Failed to delete video:', error);
            Alert.alert('Error', 'Failed to delete video');
        }
    };

    const refreshVideoList = async () => {
        await loadRecordedVideos();
    };

    const showVideoInfo = (video) => {
        Alert.alert(
            'Video Information',
            `Title: ${video.title}\nDuration: ${video.duration}\nSize: ${video.size}\nQuality: ${video.quality}\nCamera: ${video.camera}\nDate: ${video.date}`
        );
    };

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'video' && styles.activeTabButton]}
                onPress={() => setActiveTab('video')}
            >
                <Image 
                    source={require('../../../assets/home/ic/ic_record.png')} 
                    style={[styles.tabIcon, activeTab === 'video' && styles.activeTabIcon]} 
                />
                <Text style={[styles.tabText, activeTab === 'video' && styles.activeTabText]}>
                    Video
                </Text>
                <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{videos.length}</Text>
                </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'audio' && styles.activeTabButton]}
                onPress={() => setActiveTab('audio')}
            >
                <Image 
                    source={require('../../../assets/home/ic/ic-music.png')} 
                    style={[styles.tabIcon, activeTab === 'audio' && styles.activeTabIcon]} 
                />
                <Text style={[styles.tabText, activeTab === 'audio' && styles.activeTabText]}>
                    Audio
                </Text>
                <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{audioFiles.length}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderVideoItem = (video) => (
        <TouchableOpacity 
            key={video.id} 
            style={styles.videoItem}
            onPress={() => {
                // Quick play on tap
                if (video.filePath) {
                    setSelectedVideo(video);
                    setShowVideoPlayer(true);
                } else {
                    Alert.alert('Error', 'Video file not found');
                }
            }}
        >
            <View style={styles.videoThumbnail}>
                <Image 
                    source={require('../../../assets/home/ic/ic_record.png')} 
                    style={styles.thumbnailIcon} 
                />
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{video.duration}</Text>
                </View>
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                    {video.title}
                </Text>
                <Text style={styles.videoMeta}>
                    {video.size} • {video.quality} • {video.camera} camera
                </Text>
                <Text style={styles.videoDate}>{video.date}</Text>
            </View>
            <TouchableOpacity 
                style={styles.videoActions}
                onPress={() => {
                    Alert.alert(
                        'Video Actions',
                        `Choose an action for ${video.title}`,
                        [
                            { text: 'Play', onPress: () => handleVideoAction(video.id, 'play') },
                            { text: 'Share', onPress: () => handleVideoAction(video.id, 'share') },
                            { text: 'Info', onPress: () => handleVideoAction(video.id, 'info') },
                            { text: 'Delete', onPress: () => handleVideoAction(video.id, 'delete'), style: 'destructive' },
                            { text: 'Cancel', style: 'cancel' }
                        ]
                    );
                }}
            >
                <Image 
                    source={require('../../../assets/home/ic/ic_setting.png')} 
                    style={styles.actionIcon} 
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderVideoTab = () => (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {videos.length > 0 ? (
                <View style={styles.videoList}>
                    {videos.map(renderVideoItem)}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Image 
                        source={require('../../../assets/home/ic/ic_record.png')} 
                        style={styles.emptyIcon} 
                    />
                    <Text style={styles.emptyTitle}>No videos yet</Text>
                    <Text style={styles.emptyDescription}>
                        Start recording to see your videos here
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    const renderAudioTab = () => (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Audio</Text>
                <Text style={styles.videoCount}>{audioFiles.length} files</Text>
            </View>

            <View style={styles.emptyState}>
                <Image 
                    source={require('../../../assets/home/ic/ic-music.png')} 
                    style={styles.emptyIcon} 
                />
                <Text style={styles.emptyTitle}>Audio recording coming soon</Text>
                <Text style={styles.emptyDescription}>
                    Audio recording feature will be available in future updates
                </Text>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.tabContent}>
            {renderTabBar()}
            
            {activeTab === 'video' ? renderVideoTab() : renderAudioTab()}
            
            <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.actionButton} onPress={refreshVideoList}>
                    <Image 
                        source={require('../../../assets/home/ic/icon_swap.png')} 
                        style={styles.actionButtonIcon} 
                    />
                    <Text style={styles.actionButtonText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={async () => {
                    await addTestVideo();
                    await refreshVideoList();
                }}>
                    <Image 
                        source={require('../../../assets/home/ic/ic_record.png')} 
                        style={styles.actionButtonIcon} 
                    />
                    <Text style={styles.actionButtonText}>Add Test</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={async () => {
                    Alert.alert(
                        'Clear All Videos',
                        'Are you sure you want to clear all videos from storage?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Clear', style: 'destructive', onPress: async () => {
                                await clearAllVideos();
                                await refreshVideoList();
                            }}
                        ]
                    );
                }}>
                    <Image 
                        source={require('../../../assets/home/ic/ic_setting.png')} 
                        style={styles.actionButtonIcon} 
                    />
                    <Text style={styles.actionButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>
            
            <VideoPlayer
                visible={showVideoPlayer}
                video={selectedVideo}
                onClose={() => {
                    setShowVideoPlayer(false);
                    setSelectedVideo(null);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 0,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        position: 'relative',
    },
    activeTabButton: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
        tintColor: '#6B7280',
    },
    activeTabIcon: {
        tintColor: '#1E3A8A',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 8,
    },
    activeTabText: {
        color: '#1E3A8A',
    },
    tabBadge: {
        backgroundColor: '#1E3A8A',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    videoCount: {
        fontSize: 14,
        color: '#6B7280',
    },
    videoList: {
        flex: 1,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    videoThumbnail: {
        width: 80,
        height: 60,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    thumbnailIcon: {
        width: 24,
        height: 24,
        tintColor: '#1E3A8A',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    durationText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    videoInfo: {
        flex: 1,
        marginRight: 12,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    videoMeta: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    videoDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    videoActions: {
        padding: 8,
    },
    actionIcon: {
        width: 16,
        height: 16,
        tintColor: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        tintColor: '#D1D5DB',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    actionButtonIcon: {
        width: 20,
        height: 20,
        tintColor: '#6B7280',
        marginBottom: 4,
    },
    actionButtonText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
});

export default GalleryTab;