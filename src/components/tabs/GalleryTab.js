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
import VideoPlayer from '../VideoPlayer';
import VideoThumbnail from '../VideoThumbnail';
import VideoActionModal from '../VideoActionModal';
import RenameModal from '../RenameModal';
import CompressModal from '../CompressModal';
import Mp3ConvertModal from '../Mp3ConvertModal';
import TrimVideoModal from '../TrimVideoModal';
import LazyLoadScrollView from '../LazyLoadScrollView';
import { NativeAdComponent } from '../NativeAdComponent';
import { COLORS } from '../../constants';
import { NativeModules } from 'react-native';
import { ADS_UNIT } from '../../AdManager.js';

const { width } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const GalleryTab = () => {
    const [activeTab, setActiveTab] = useState('video'); // 'video' or 'audio'
    const [videos, setVideos] = useState([]);
    const [audioFiles, setAudioFiles] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [thumbnailsLoaded, setThumbnailsLoaded] = useState(new Set());
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionModalVideo, setActionModalVideo] = useState(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameModalVideo, setRenameModalVideo] = useState(null);
    const [showCompressModal, setShowCompressModal] = useState(false);
    const [compressModalVideo, setCompressModalVideo] = useState(null);
    const [showMp3ConvertModal, setShowMp3ConvertModal] = useState(false);
    const [mp3ConvertModalVideo, setMp3ConvertModalVideo] = useState(null);
    const [showTrimModal, setShowTrimModal] = useState(false);
    const [trimModalVideo, setTrimModalVideo] = useState(null);
    const [videoFilter, setVideoFilter] = useState('all'); // 'all' or 'app'

    useEffect(() => {
        // Load videos and audio files quickly
        loadRecordedVideosQuick();
        loadAudioFiles();
        
        // Set up periodic refresh (reduced frequency)
        const interval = setInterval(() => {
            loadRecordedVideosQuick(); // Quick refresh without thumbnails
            loadAudioFiles(); // Refresh audio files
        }, 30000);
        
        return () => clearInterval(interval);
    }, [videoFilter]); // Reload when filter changes

    // Quick load - get video list without thumbnails for fast initial display
    const loadRecordedVideosQuick = async () => {
        try {
            if (!VideoRecordingModule) {
                console.error('VideoRecordingModule not available');
                setVideos([]);
                return;
            }

            setIsLoading(true);
            
            // Use different methods based on filter
            let result;
            if (videoFilter === 'app') {
                // Get only app-recorded videos
                result = await VideoRecordingModule.getAppRecordedVideosOnly();
            } else {
                // Get all videos from gallery
                result = await VideoRecordingModule.getAllVideosFromGallery();
            }
                
            console.log(`${videoFilter === 'app' ? 'App' : 'All'} videos from gallery:`, result ? result.length : 0);
            
            if (result && result.length > 0) {
                // Format videos without thumbnails for fast display
                const formattedVideos = result.map(video => ({
                    id: video.id,
                    title: video.title,
                    duration: video.duration || '00:00',
                    size: video.size,
                    date: new Date(video.dateModified * 1000).toLocaleString(),
                    filePath: video.filePath,
                    ratio: video.width && video.height ? `${video.width}x${video.height}` : '720x1280',
                    thumbnail: null, // No thumbnail initially - will be loaded by VideoThumbnail component
                    lastModified: video.dateModified,
                    isAppRecording: video.isAppRecording,
                    source: video.source,
                    width: video.width || 720,
                    height: video.height || 1280
                }));
                
                console.log('Setting videos in state (quick):', formattedVideos.length);
                setVideos(formattedVideos);
            } else {
                console.log('No videos found');
                setVideos([]);
            }
        } catch (error) {
            console.error('Failed to load videos quickly:', error);
            setVideos([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Full load with thumbnails - for manual refresh
    const loadRecordedVideos = async (quick = false) => {
        try {
            if (!VideoRecordingModule) {
                console.error('VideoRecordingModule not available');
                setVideos([]);
                return;
            }

            setIsLoading(true);

            // Use full load to get thumbnails if not quick mode
            const result = quick 
                ? await VideoRecordingModule.getRecordedVideosQuick()
                : await VideoRecordingModule.getRecordedVideos();
                
            console.log('Videos directory from native:', result.directory);
            console.log('Videos from native module:', result.videos ? result.videos.length : 0);
            
            if (result.videos && result.videos.length > 0) {
                // Convert native video data to match our UI format
                const formattedVideos = result.videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    duration: video.duration || '00:00',
                    size: video.fileSize,
                    date: video.date,
                    filePath: video.filePath,
                    ratio: video.width && video.height ? `${video.width}x${video.height}` : '720x1280',
                    thumbnail: quick ? null : video.thumbnail, // Only include thumbnail if not quick
                    lastModified: video.lastModified,
                    width: video.width || 720,
                    height: video.height || 1280
                }));
                
                console.log('Setting videos in state:', formattedVideos.length);
                setVideos(formattedVideos);
            } else {
                console.log('No videos found in directory:', result.directory);
                setVideos([]);
            }
        } catch (error) {
            console.error('Failed to load videos from app directory:', error);
            setVideos([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load audio files
    const loadAudioFiles = async () => {
        try {
            if (!VideoRecordingModule) {
                console.error('VideoRecordingModule not available');
                setAudioFiles([]);
                return;
            }

            const result = await VideoRecordingModule.getAudioFiles();
                
            console.log('Audio files from native module:', result.audios ? result.audios.length : 0);
            
            if (result.audios && result.audios.length > 0) {
                // Format audio files for UI
                const formattedAudios = result.audios.map(audio => ({
                    id: audio.id,
                    title: audio.title,
                    duration: audio.duration || '00:00',
                    size: audio.fileSize,
                    date: audio.date,
                    filePath: audio.filePath,
                    format: audio.format,
                    lastModified: audio.lastModified
                }));
                
                console.log('Setting audio files in state:', formattedAudios.length);
                setAudioFiles(formattedAudios);
            } else {
                console.log('No audio files found');
                setAudioFiles([]);
            }
        } catch (error) {
            console.error('Failed to load audio files:', error);
            setAudioFiles([]);
        }
    };

    // Handle thumbnail loaded callback
    const handleThumbnailLoaded = (videoId) => {
        setThumbnailsLoaded(prev => new Set([...prev, videoId]));
    };

    const formatDuration = (timestamp) => {
        // Simple duration format based on file age - this is a placeholder
        // In a real implementation, you would extract actual video duration
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);
        if (diff < 60) return '00:00:30'; // Default short duration
        if (diff < 3600) return `00:${Math.floor(diff/60).toString().padStart(2, '0')}:00`;
        return `${Math.floor(diff/3600).toString().padStart(2, '0')}:00:00`;
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
            case 'rename':
                setShowActionModal(false);
                setTimeout(() => {
                    setRenameModalVideo(video);
                    setShowRenameModal(true);
                }, 300);
                break;
            case 'share':
                setShowActionModal(false);
                setTimeout(() => {
                    handleShare(video.id);
                }, 300);
                break;
            case 'compress':
                setShowActionModal(false);
                setTimeout(() => {
                    setCompressModalVideo(video);
                    setShowCompressModal(true);
                }, 300);
                break;
            case 'video_to_mp3':
                setShowActionModal(false);
                setTimeout(() => {
                    setMp3ConvertModalVideo(video);
                    setShowMp3ConvertModal(true);
                }, 300);
                break;
            case 'trim':
                setShowActionModal(false);
                setTimeout(() => {
                    setTrimModalVideo(video);
                    setShowTrimModal(true);
                }, 300);
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
            const video = videos.find(v => v.id === videoId);
            if (!video || !video.filePath) {
                Alert.alert('Error', 'Video file not found');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            await VideoRecordingModule.deleteVideo(video.filePath);
            
            // Refresh the video list after deletion
            await loadRecordedVideos();
            
            Alert.alert('Success', 'Video deleted successfully');
        } catch (error) {
            console.error('Failed to delete video:', error);
            Alert.alert('Error', 'Failed to delete video: ' + error.message);
        }
    };

    const handleAudioAction = (audioId, action) => {
        const audio = audioFiles.find(a => a.id === audioId);
        if (!audio) return;

        switch (action) {
            case 'play':
                // Play audio with VideoPlayer
                if (audio.filePath) {
                    setSelectedVideo(audio);
                    setShowVideoPlayer(true);
                } else {
                    Alert.alert('Error', 'Audio file path not found. The audio file might have been deleted.');
                }
                break;
            case 'rename':
                setShowActionModal(false);
                setTimeout(() => {
                    setRenameModalVideo(audio);
                    setShowRenameModal(true);
                }, 300);
                break;
            case 'share':
                setShowActionModal(false);
                setTimeout(() => {
                    handleShareAudio(audio.id);
                }, 300);
                break;
            case 'delete':
                Alert.alert(
                    'Delete Audio',
                    `Are you sure you want to delete ${audio.title}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => deleteAudio(audioId)
                        }
                    ]
                );
                break;
            case 'info':
                showAudioInfo(audio);
                break;
        }
    };

    const deleteAudio = async (audioId) => {
        try {
            const audio = audioFiles.find(a => a.id === audioId);
            if (!audio || !audio.filePath) {
                Alert.alert('Error', 'Audio file not found');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            await VideoRecordingModule.deleteAudio(audio.filePath);
            
            // Refresh the audio list after deletion
            await loadAudioFiles();
            
            Alert.alert('Success', 'Audio deleted successfully');
        } catch (error) {
            console.error('Failed to delete audio:', error);
            Alert.alert('Error', 'Failed to delete audio: ' + error.message);
        }
    };

    const handleShareAudio = async (audioId) => {
        try {
            const audio = audioFiles.find(a => a.id === audioId);
            if (!audio || !audio.filePath) {
                Alert.alert('Error', 'Audio file not found');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            // Use native module to share audio file
            await VideoRecordingModule.shareVideo(audio.filePath, 'share_general');
            
        } catch (error) {
            console.error('Failed to share audio:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert('No App Available', 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert('Share Error', 'Failed to share audio: ' + error.message);
            }
        }
    };

    const showAudioInfo = (audio) => {
        Alert.alert(
            'Audio Information',
            `🎵 Title: ${audio.title}\n⏱️ Duration: ${audio.duration}\n💾 File Size: ${audio.size}\n🔊 Format: ${audio.format}\n📅 Date: ${audio.date}\n📂 Path: ${audio.filePath}`
        );
    };

    const refreshVideoList = async () => {
        await loadRecordedVideos(false); // Full reload with thumbnails
        await loadAudioFiles(); // Refresh audio files
    };

    const showVideoInfo = (video) => {
        Alert.alert(
            'Video Information',
            `📹 Title: ${video.title}\n⏱️ Duration: ${video.duration}\n💾 File Size: ${video.size}\n📐 Ratio: ${video.ratio}\n📅 Date: ${video.date}\n📂 Path: ${video.filePath}`
        );
    };

    const handleRename = async (itemId, newName) => {
        try {
            // Check if it's audio or video
            const video = videos.find(v => v.id === itemId);
            const audio = audioFiles.find(a => a.id === itemId);
            
            const item = video || audio;
            const isAudio = !!audio;
            
            if (!item || !item.filePath) {
                Alert.alert('Error', `${isAudio ? 'Audio' : 'Video'} file not found`);
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            // Add file extension to new name
            const fileExtension = item.title.split('.').pop();
            const newFileName = `${newName}.${fileExtension}`;

            if (isAudio) {
                await VideoRecordingModule.renameAudio(item.filePath, newFileName);
                
                // Refresh the audio list after rename
                await loadAudioFiles();
                
                Alert.alert('Success', `Audio renamed to: ${newFileName}`);
            } else {
                await VideoRecordingModule.renameVideo(item.filePath, newFileName);
                
                // Refresh the video list after rename
                await loadRecordedVideosQuick();
                
                Alert.alert('Success', `Video renamed to: ${newFileName}`);
            }
        } catch (error) {
            console.error('Failed to rename file:', error);
            Alert.alert('Error', 'Failed to rename file: ' + error.message);
        }
    };

    const handleShare = async (videoId) => {
        try {
            const video = videos.find(v => v.id === videoId);
            if (!video || !video.filePath) {
                Alert.alert('Error', 'Video file not found');
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert('Error', 'Video recording module not available');
                return;
            }

            // Use native module to share video file
            await VideoRecordingModule.shareVideo(video.filePath, 'share_general');
            
        } catch (error) {
            console.error('Failed to share video:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert('No App Available', 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert('Share Error', 'Failed to share video: ' + error.message);
            }
        }
    };

    const handleCompress = async (compressedVideoPath) => {
        try {
            // Refresh video list to include the new compressed video
            await loadRecordedVideosQuick();
            
            // Alert.alert(
            //     'Success', 
            //     'Video compressed successfully! You can find it in your video gallery.',
            //     [{ text: 'OK' }]
            // );
        } catch (error) {
            console.error('Failed to refresh video list after compression:', error);
        }
    };

    const handleMp3Convert = async (audioFilePath) => {
        try {
            // Refresh audio list to include the new converted audio
            await loadAudioFiles();
            
            // Show success message
            Alert.alert(
                'Success', 
                'Video converted to audio successfully! You can find it in your audio gallery.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Failed to refresh audio list after conversion:', error);
        }
    };

    const handleTrimExport = async (trimData) => {
        try {
            console.log('Trim export completed:', trimData);
            
            // Refresh video list to show the new trimmed video
            await loadRecordedVideosQuick();
            
            console.log('Video list refreshed after trim');
            
        } catch (error) {
            console.error('Failed to refresh video list after trim:', error);
            throw error; // Re-throw to be handled by TrimVideoModal
        }
    };

    const renderTabBar = () => (
        <View style={styles.tabBarContainer}>
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
            
            {/* Video Filter Bar */}
            {activeTab === 'video' && (
                <View style={styles.filterBar}>
                    <TouchableOpacity 
                        style={[styles.filterButton, videoFilter === 'all' && styles.activeFilterButton]}
                        onPress={() => setVideoFilter('all')}
                    >
                        <Text style={[styles.filterText, videoFilter === 'all' && styles.activeFilterText]}>
                            All Videos
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.filterButton, videoFilter === 'app' && styles.activeFilterButton]}
                        onPress={() => setVideoFilter('app')}
                    >
                        <Text style={[styles.filterText, videoFilter === 'app' && styles.activeFilterText]}>
                            App Videos
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
            <VideoThumbnail 
                video={video}
                width={80}
                height={80}
                onThumbnailLoad={handleThumbnailLoaded}
            />
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                    {video.title}
                </Text>
                <Text style={styles.sizeText}>Time: {video.date}</Text>
                <Text style={styles.sizeText}>Ratio: {video.ratio}</Text>
                <Text style={styles.sizeText}>Size: {video.size}</Text>
            </View>
            <TouchableOpacity 
                style={styles.videoActions}
                onPress={() => {
                    setActionModalVideo(video);
                    setShowActionModal(true);
                }}
            >
                <Image 
                    source={require('../../../assets/home/ic/ic_3dot.png')} 
                    style={styles.actionIcon} 
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderAudioItem = (audio) => (
        <TouchableOpacity 
            key={audio.id} 
            style={styles.videoItem}
            onPress={() => {
                // Play audio on tap
                if (audio.filePath) {
                    setSelectedVideo(audio);
                    setShowVideoPlayer(true);
                } else {
                    Alert.alert('Error', 'Audio file not found');
                }
            }}
        >
            <View style={styles.audioThumbnail}>
                <Image 
                    source={require('../../../assets/home/ic/ic-music.png')} 
                    style={styles.audioIcon} 
                />
                <View style={styles.audioBadge}>
                    <Text style={styles.audioBadgeText}>{audio.format}</Text>
                </View>
            </View>
            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                    {audio.title}
                </Text>
                <Text style={styles.sizeText}>Time: {audio.date}</Text>
                <Text style={styles.sizeText}>Duration: {audio.duration}</Text>
                <Text style={styles.sizeText}>Size: {audio.size}</Text>
            </View>
            <TouchableOpacity 
                style={styles.videoActions}
                onPress={() => {
                    setActionModalVideo({...audio, isAudio: true});
                    setShowActionModal(true);
                }}
            >
                <Image 
                    source={require('../../../assets/home/ic/ic_3dot.png')} 
                    style={styles.actionIcon} 
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderVideoTab = () => (
        <View style={styles.contentContainer}>
            {videos.length > 0 ? (
                <LazyLoadScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    data={videos}
                    renderItem={renderVideoItem}
                    itemHeight={96} // Approximate height of video item
                    preloadOffset={300}
                />
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
        </View>
    );

    const renderAudioTab = () => (
        <View style={styles.contentContainer}>
            {audioFiles.length > 0 ? (
                <LazyLoadScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    data={audioFiles}
                    renderItem={renderAudioItem}
                    itemHeight={96} // Approximate height of audio item
                    preloadOffset={300}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Image 
                        source={require('../../../assets/home/ic/ic-music.png')} 
                        style={styles.emptyIcon} 
                    />
                    <Text style={styles.emptyTitle}>No audio files yet</Text>
                    <Text style={styles.emptyDescription}>
                        Convert videos to audio to see them here
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.tabContent}>
            {renderTabBar()}
            
            {activeTab === 'video' ? renderVideoTab() : renderAudioTab()}
            
            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={false}/>
            
            <VideoPlayer
                visible={showVideoPlayer}
                video={selectedVideo}
                onClose={() => {
                    setShowVideoPlayer(false);
                    setSelectedVideo(null);
                }}
            />
            
            <VideoActionModal
                visible={showActionModal}
                video={actionModalVideo}
                onClose={() => {
                    setShowActionModal(false);
                    setActionModalVideo(null);
                }}
                onAction={(actionId) => {
                    if (actionModalVideo) {
                        if (actionModalVideo.isAudio) {
                            handleAudioAction(actionModalVideo.id, actionId);
                        } else {
                            handleVideoAction(actionModalVideo.id, actionId);
                        }
                    }
                }}
            />
            
            <RenameModal
                visible={showRenameModal}
                video={renameModalVideo}
                onClose={() => {
                    setShowRenameModal(false);
                    setRenameModalVideo(null);
                }}
                onRename={handleRename}
            />
            
            <CompressModal
                visible={showCompressModal}
                video={compressModalVideo}
                onClose={() => {
                    setShowCompressModal(false);
                    setCompressModalVideo(null);
                }}
                onCompress={handleCompress}
            />
            
            <Mp3ConvertModal
                visible={showMp3ConvertModal}
                video={mp3ConvertModalVideo}
                onClose={() => {
                    setShowMp3ConvertModal(false);
                    setMp3ConvertModalVideo(null);
                }}
                onConvert={handleMp3Convert}
            />
            
            <TrimVideoModal
                visible={showTrimModal}
                video={trimModalVideo}
                onClose={() => {
                    setShowTrimModal(false);
                    setTrimModalVideo(null);
                }}
                onExport={handleTrimExport}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        paddingHorizontal: 10,
        paddingTop: 0,
    },
    tabBar: {
        flexDirection: 'row',
        // backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 4,
        marginBottom: 10,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        // borderRadius: 8,
        position: 'relative',
    },
    activeTabButton: {
        // color: '#8a371eff',
        // backgroundColor: '#FFFFFF',
        // elevation: 2,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.1,
        // shadowRadius: 2,
        borderBottomWidth: 4,
        borderBottomColor: '#f54c18ff',
    },
    tabIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
        tintColor: '#6B7280',
    },
    activeTabIcon: {
        tintColor: '#f54c18ff',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 8,
    },
    activeTabText: {
        color: '#f54c18ff',
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
    scrollView: {
        flex: 1,
    },
    refreshButton: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    refreshIcon: {
        width: 20,
        height: 20,
        tintColor: '#1E3A8A',
    },
    refreshIconLoading: {
        opacity: 0.5,
    },
    videoList: {
        flex: 1,
    },
    videoItem: {
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',
        // backgroundColor: '#FFFFFF',
        // borderRadius: 12,
        paddingVertical: 3,
        marginBottom: 0,
        // elevation: 2,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.1,
        // shadowRadius: 2,
    },
    videoThumbnail: {
        width: 80,
        height: 80,
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
    thumbnailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: COLORS.SECONDARY,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    durationText: {
        color: COLORS.TERTIARY,
        fontSize: 10,
        fontWeight: '900',
    },
    videoInfo: {
        flex: 1,
        marginLeft: 10,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    videoMeta: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        marginBottom: 2,
    },
    videoMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        // justifyContent: 'space-between',
        marginBottom: 2,
    },
    sizeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5F3FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sizeText: {
        fontSize: 11,
        color: '#1E3A8A',
        fontWeight: '600',
    },
    videoDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    videoActions: {
        padding: 12,
        width: 30,
        height: 40,
        right: 0,
    },
    actionIcon: {
        // width: 16,
        // height: 60,
        // tintColor: '#6B7280',
    },
    audioThumbnail: {
        width: 80,
        height: 80,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    audioIcon: {
        width: 32,
        height: 32,
        tintColor: '#FF6B00',
    },
    audioBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FF6B00',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    audioBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: 'bold',
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
    // Filter Bar Styles
    tabBarContainer: {
        marginBottom: 10,
    },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
        marginTop: 8,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    activeFilterButton: {
        backgroundColor: '#1E3A8A',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeFilterText: {
        color: '#FFFFFF',
    },
});

export default GalleryTab;