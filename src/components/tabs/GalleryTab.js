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
    PermissionsAndroid,
    Platform,
    Linking,
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
import useTranslation from '../../hooks/useTranslation';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const GalleryTab = () => {
    const { t } = useTranslation();
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

    // Helper function to request MANAGE_EXTERNAL_STORAGE permission
    const requestManageExternalStoragePermission = async () => {
        if (Platform.OS !== 'android') {
            return true;
        }

        if (Platform.Version >= 30) { // Android 11+
            try {
                // Use native method to check MANAGE_EXTERNAL_STORAGE permission correctly
                const hasPermission = await VideoRecordingModule.checkManageExternalStoragePermission();
                console.log('🔐 MANAGE_EXTERNAL_STORAGE permission check result:', hasPermission);
                if (hasPermission) return true;

                // Show explanation dialog before redirecting to settings
                Alert.alert(
                    t('storage_permission_title'),
                    t('manage_storage_permission_explanation'),
                    [
                        {
                            text: t('ask_me_later'),
                            style: 'cancel',
                            onPress: () => false
                        },
                        {
                            text: t('open_settings'),
                            onPress: async () => {
                                try {
                                    // Use native method to open settings
                                    await VideoRecordingModule.openAllFilesAccessSettings();
                                } catch (error) {
                                    console.warn('Failed to open settings via native method:', error);
                                    // Fallback to Linking
                                    try {
                                        await Linking.openSettings();
                                    } catch (linkingError) {
                                        Alert.alert(t('error'), t('cannot_open_settings'));
                                    }
                                }
                            }
                        }
                    ]
                );

                return false;
            } catch (e) {
                console.warn('Permission error:', e);
                return false;
            }
        } else {
            // For Android 10 and below, check WRITE_EXTERNAL_STORAGE
            try {
                // First check if we already have permission
                const hasExistingPermission = await VideoRecordingModule.checkManageExternalStoragePermission();
                console.log('🔐 WRITE_EXTERNAL_STORAGE permission check result:', hasExistingPermission);

                if (hasExistingPermission) {
                    return true;
                }

                // If not, request permission
                const permission = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        title: t('storage_permission_title'),
                        message: t('storage_permission_message'),
                        buttonPositive: t('ok'),
                        buttonNegative: t('cancel'),
                    }
                );
                const granted = permission === PermissionsAndroid.RESULTS.GRANTED;
                console.log('🔐 WRITE_EXTERNAL_STORAGE permission request result:', granted);
                return granted;
            } catch (e) {
                console.warn('Storage permission error:', e);
                return false;
            }
        }
    };

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
                console.log(t('no_videos_found', 'No videos found'));
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
        if (diff < 3600) return `00:${Math.floor(diff / 60).toString().padStart(2, '0')}:00`;
        return `${Math.floor(diff / 3600).toString().padStart(2, '0')}:00:00`;
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
                    Alert.alert(t('error', 'Error'), 'Video file path not found. The video file might have been deleted.');
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
                        { text: t('cancel', 'Cancel'), style: 'cancel' },
                        {
                            text: t('delete', 'Delete'),
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
                console.error('Video not found or no filePath:', { video, videoId });
                Alert.alert(t('error', 'Error'), t('video_file_not_found', 'Video file not found'));
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            const stat = await RNFS.stat(video.filePath);
            console.log('Path:', video.filePath, 'Inode:', stat);


            // Request storage permission before deletion
            console.log('🔐 Requesting storage permission before video deletion...');
            const hasPermission = await requestManageExternalStoragePermission();

            if (!hasPermission) {
                console.log('❌ Storage permission denied, cannot delete video');
                Alert.alert(
                    t('permission_denied', 'Permission Denied'),
                    t('storage_permission_required_for_deletion', 'Storage permission is required to delete videos. Please grant the permission and try again.')
                );
                return;
            }

            console.log('✅ Storage permission granted, proceeding with deletion...');

            console.log('Attempting to delete video:', {
                id: video.id,
                title: video.title,
                filePath: video.filePath
            });

            // Check if file exists using multiple methods
            const existsRNFS = await RNFS.exists(video.filePath);
            console.log('File exists (RNFS):', existsRNFS);

            // Try different path formats if the original doesn't work
            let pathToDelete = video.filePath;

            // If RNFS can't find it, try to construct the path differently
            if (!existsRNFS) {
                console.log('File not found with RNFS, trying alternative paths...');

                // Try with just filename if it's a full path
                if (video.filePath.includes('/')) {
                    const filename = video.filePath.split('/').pop();
                    console.log('Trying with filename only:', filename);
                    pathToDelete = filename;
                }

                // Try with file:// prefix removed if present
                if (video.filePath.startsWith('file://')) {
                    pathToDelete = video.filePath.replace('file://', '');
                    console.log('Trying without file:// prefix:', pathToDelete);
                }
            }

            console.log('Final path for deletion:', pathToDelete);

            // Try native module first
            try {
                await VideoRecordingModule.deleteVideo(pathToDelete);
                console.log('✅ Video deleted successfully via native module');
            } catch (nativeError) {
                console.log('❌ Native module deletion failed:', {
                    message: nativeError.message,
                    code: nativeError.code,
                    name: nativeError.name
                });

                // Try different path formats for native module
                let nativeSuccess = false;
                const pathVariants = [
                    pathToDelete,
                    pathToDelete.replace('/storage/emulated/0/', '/sdcard/'),
                    pathToDelete.replace('file://', ''),
                    video.filePath // Original path from video object
                ];

                for (const variant of pathVariants) {
                    if (variant !== pathToDelete) { // Skip already tried path
                        try {
                            console.log('🔄 Trying native deletion with variant:', variant);
                            await VideoRecordingModule.deleteVideo(variant);
                            console.log('✅ Video deleted successfully via native module (variant)');
                            nativeSuccess = true;
                            break;
                        } catch (variantError) {
                            console.log('❌ Native variant failed:', variant, variantError.message);
                        }
                    }
                }

                // If all native attempts failed, skip to RNFS fallback for now
                if (!nativeSuccess) {
                    console.log('🔄 All native attempts failed, using RNFS fallback...');
                    console.log('💡 To fix native deletion, see NATIVE_DELETION_IMPLEMENTATION.md');

                    // Skip advanced strategies until native methods are implemented
                    // const advancedSuccess = await tryAdvancedDeletion(pathToDelete, false);

                    // Try RNFS deletion with MediaStore cleanup
                    if (await RNFS.exists(pathToDelete)) {
                        try {
                            await RNFS.unlink(pathToDelete);
                            console.log('✅ Video file deleted successfully via RNFS');

                            // Try to notify MediaStore about the deletion
                            try {
                                if (VideoRecordingModule.notifyMediaStoreDelete) {
                                    await VideoRecordingModule.notifyMediaStoreDelete(pathToDelete);
                                    console.log('✅ MediaStore notified of deletion');
                                }
                            } catch (mediaStoreError) {
                                console.log('⚠️ MediaStore notification failed (non-critical):', mediaStoreError.message);
                            }

                        } catch (rnfsError) {
                            console.error('❌ RNFS deletion also failed:', rnfsError.message);

                            // Check if it's a permission issue
                            if (rnfsError.message?.includes('EACCES') || rnfsError.message?.includes('permission')) {
                                throw new Error('Permission denied. File may be protected by Android scoped storage.');
                            } else {
                                throw new Error('Failed to delete file: ' + rnfsError.message);
                            }
                        }
                    } else {
                        throw new Error('File not found for deletion: ' + pathToDelete);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to delete video:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                nativeStackAndroid: error.nativeStackAndroid
            });
            Alert.alert(t('error', 'Error'), 'Failed to delete video: ' + error.message);
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
                    Alert.alert(t('error', 'Error'), 'Audio file path not found. The audio file might have been deleted.');
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
                        { text: t('cancel', 'Cancel'), style: 'cancel' },
                        {
                            text: t('delete', 'Delete'),
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
                console.error('Audio not found or no filePath:', { audio, audioId });
                Alert.alert(t('error', 'Error'), t('audio_file_not_found', 'Audio file not found'));
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Request storage permission before deletion
            console.log('🔐 Requesting storage permission before audio deletion...');
            const hasPermission = await requestManageExternalStoragePermission();

            if (!hasPermission) {
                console.log('❌ Storage permission denied, cannot delete audio');
                Alert.alert(
                    t('permission_denied', 'Permission Denied'),
                    t('storage_permission_required_for_deletion', 'Storage permission is required to delete audio files. Please grant the permission and try again.')
                );
                return;
            }

            console.log('✅ Storage permission granted, proceeding with audio deletion...');

            console.log('Attempting to delete audio:', {
                id: audio.id,
                title: audio.title,
                filePath: audio.filePath
            });

            // Check if file exists using multiple methods
            const existsRNFS = await RNFS.exists(audio.filePath);
            console.log('Audio file exists (RNFS):', existsRNFS);

            // Try different path formats if the original doesn't work
            let pathToDelete = audio.filePath;

            // If RNFS can't find it, try to construct the path differently
            if (!existsRNFS) {
                console.log('Audio file not found with RNFS, trying alternative paths...');

                // Try with just filename if it's a full path
                if (audio.filePath.includes('/')) {
                    const filename = audio.filePath.split('/').pop();
                    console.log('Trying with filename only:', filename);
                    pathToDelete = filename;
                }

                // Try with file:// prefix removed if present
                if (audio.filePath.startsWith('file://')) {
                    pathToDelete = audio.filePath.replace('file://', '');
                    console.log('Trying without file:// prefix:', pathToDelete);
                }
            }

            console.log('Final path for audio deletion:', pathToDelete);

            // Try native module first
            try {
                await VideoRecordingModule.deleteAudio(pathToDelete);
                console.log('✅ Audio deleted successfully via native module');
            } catch (nativeError) {
                console.log('❌ Native module audio deletion failed:', {
                    message: nativeError.message,
                    code: nativeError.code,
                    name: nativeError.name
                });

                // Try different path formats for native module
                let nativeSuccess = false;
                const pathVariants = [
                    pathToDelete,
                    pathToDelete.replace('/storage/emulated/0/', '/sdcard/'),
                    pathToDelete.replace('file://', ''),
                    audio.filePath // Original path from audio object
                ];

                for (const variant of pathVariants) {
                    if (variant !== pathToDelete) { // Skip already tried path
                        try {
                            console.log('🔄 Trying native audio deletion with variant:', variant);
                            await VideoRecordingModule.deleteAudio(variant);
                            console.log('✅ Audio deleted successfully via native module (variant)');
                            nativeSuccess = true;
                            break;
                        } catch (variantError) {
                            console.log('❌ Native audio variant failed:', variant, variantError.message);
                        }
                    }
                }

                // If all native attempts failed, skip to RNFS fallback for now
                if (!nativeSuccess) {
                    console.log('🔄 All native audio attempts failed, using RNFS fallback...');
                    console.log('💡 To fix native deletion, see NATIVE_DELETION_IMPLEMENTATION.md');

                    // Skip advanced strategies until native methods are implemented
                    // const advancedSuccess = await tryAdvancedDeletion(pathToDelete, true);

                    // Try RNFS deletion with MediaStore cleanup
                    if (await RNFS.exists(pathToDelete)) {
                        try {
                            await RNFS.unlink(pathToDelete);
                            console.log('✅ Audio file deleted successfully via RNFS');

                            // Try to notify MediaStore about the deletion
                            try {
                                if (VideoRecordingModule.notifyMediaStoreDelete) {
                                    await VideoRecordingModule.notifyMediaStoreDelete(pathToDelete);
                                    console.log('✅ MediaStore notified of audio deletion');
                                }
                            } catch (mediaStoreError) {
                                console.log('⚠️ MediaStore notification failed (non-critical):', mediaStoreError.message);
                            }

                        } catch (rnfsError) {
                            console.error('❌ RNFS audio deletion also failed:', rnfsError.message);

                            // Check if it's a permission issue
                            if (rnfsError.message?.includes('EACCES') || rnfsError.message?.includes('permission')) {
                                throw new Error('Permission denied. Audio file may be protected by Android scoped storage.');
                            } else {
                                throw new Error('Failed to delete audio file: ' + rnfsError.message);
                            }
                        }
                    } else {
                        throw new Error('Audio file not found for deletion: ' + pathToDelete);
                    }
                }
            }

            // Optimistic update: remove audio from state immediately for instant UI feedback
            setAudioFiles(prevAudios => prevAudios.filter(a => a.id !== audioId));

            // Refresh the audio list after deletion in background
            loadAudioFiles(); // No await - run in background

            Alert.alert(t('success', 'Success'), t('audio_deleted_successfully', 'Audio deleted successfully'));
        } catch (error) {
            console.error('Failed to delete audio:', error);
            console.error('Audio deletion error details:', {
                message: error.message,
                code: error.code,
                nativeStackAndroid: error.nativeStackAndroid
            });
            Alert.alert(t('error', 'Error'), 'Failed to delete audio: ' + error.message);
        }
    };

    const handleShareAudio = async (audioId) => {
        try {
            const audio = audioFiles.find(a => a.id === audioId);
            if (!audio || !audio.filePath) {
                Alert.alert(t('error', 'Error'), t('audio_file_not_found', 'Audio file not found'));
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Use native module to share audio file
            await VideoRecordingModule.shareVideo(audio.filePath, 'share_general');

        } catch (error) {
            console.error('Failed to share audio:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert(t('no_app_available', 'No App Available'), 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert(t('share_error', 'Share Error'), 'Failed to share audio: ' + error.message);
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
                Alert.alert(t('error', 'Error'), `${isAudio ? 'Audio' : 'Video'} file not found`);
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Add file extension to new name
            const fileExtension = item.title.split('.').pop();
            const newFileName = `${newName}.${fileExtension}`;

            if (isAudio) {
                await VideoRecordingModule.renameAudio(item.filePath, newFileName);

                // Optimistic update: update audio title immediately
                setAudioFiles(prevAudios =>
                    prevAudios.map(a =>
                        a.id === itemId ? { ...a, title: newFileName } : a
                    )
                );

                // Refresh the audio list after rename in background
                loadAudioFiles(); // No await

                Alert.alert(t('success', 'Success'), `Audio renamed to: ${newFileName}`);
            } else {
                await VideoRecordingModule.renameVideo(item.filePath, newFileName);

                // Optimistic update: update video title immediately
                setVideos(prevVideos =>
                    prevVideos.map(v =>
                        v.id === itemId ? { ...v, title: newFileName } : v
                    )
                );

                // Refresh the video list after rename in background
                loadRecordedVideosQuick(); // No await

                Alert.alert(t('success', 'Success'), `Video renamed to: ${newFileName}`);
            }
        } catch (error) {
            console.error('Failed to rename file:', error);
            Alert.alert(t('error', 'Error'), 'Failed to rename file: ' + error.message);
        }
    };

    const handleShare = async (videoId) => {
        try {
            const video = videos.find(v => v.id === videoId);
            if (!video || !video.filePath) {
                Alert.alert(t('error', 'Error'), t('video_file_not_found', 'Video file not found'));
                return;
            }

            if (!VideoRecordingModule) {
                Alert.alert(t('error', 'Error'), t('video_recording_module_not_available', 'Video recording module not available'));
                return;
            }

            // Use native module to share video file
            await VideoRecordingModule.shareVideo(video.filePath, 'share_general');

        } catch (error) {
            console.error('Failed to share video:', error);
            if (error.message.includes('NO_APP_AVAILABLE')) {
                Alert.alert(t('no_app_available', 'No App Available'), 'No app found to handle this share type. Please install the required app.');
            } else {
                Alert.alert(t('share_error', 'Share Error'), 'Failed to share video: ' + error.message);
            }
        }
    };

    const handleCompress = async (compressedVideoPath) => {
        try {
            // Refresh video list to include the new compressed video
            await loadRecordedVideosQuick();

            // Alert.alert(
            //     t('success', 'Success'), 
            //     'Video compressed successfully! You can find it in your video gallery.',
            //     [{ text: t('ok', 'OK') }]
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
                t('success', 'Success'),
                'Video converted to audio successfully! You can find it in your audio gallery.',
                [{ text: t('ok', 'OK') }]
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
                        {t('videos', 'Video')}
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
                        {t('audios', 'Audio')}
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
                            {t('allVideos', 'All Videos')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, videoFilter === 'app' && styles.activeFilterButton]}
                        onPress={() => setVideoFilter('app')}
                    >
                        <Text style={[styles.filterText, videoFilter === 'app' && styles.activeFilterText]}>
                            {t('appVideos', 'App Videos')}
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
                    Alert.alert(t('error', 'Error'), t('video_file_not_found', 'Video file not found'));
                }
            }}
        >
            <View style={styles.videoItemThumnail}>
                <VideoThumbnail
                    video={video}
                    width={80}
                    height={80}
                    onThumbnailLoad={handleThumbnailLoaded}
                />
            </View>

            <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                    {video.title}
                </Text>
                <Text style={styles.sizeText}>{t('time', 'Time')}: {video.date}</Text>
                <Text style={styles.sizeText}>{t('ratio', 'Ratio')}: {video.ratio}</Text>
                <Text style={styles.sizeText}>{t('size', 'Size')}: {video.size}</Text>
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
                    Alert.alert(t('error', 'Error'), t('audio_file_not_found', 'Audio file not found'));
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
                <Text style={styles.sizeText}>{t('time', 'Time')}: {audio.date}</Text>
                <Text style={styles.sizeText}>{t('duration', 'Duration')}: {audio.duration}</Text>
                <Text style={styles.sizeText}>{t('size', 'Size')}: {audio.size}</Text>
            </View>
            <TouchableOpacity
                style={styles.videoActions}
                onPress={() => {
                    setActionModalVideo({ ...audio, isAudio: true });
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
                    <Text style={styles.emptyTitle}>{t('no_videos_yet', 'No videos yet')}</Text>
                    <Text style={styles.emptyDescription}>
                        {t('startRecordingPrompt', 'Start recording to see your videos here')}
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
                    <Text style={styles.emptyTitle}>{t('no_audio_files_yet', 'No audio files yet')}</Text>
                    <Text style={styles.emptyDescription}>
                        {t('convertVideosPrompt', 'Convert videos to audio to see them here')}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.tabContent}>
            {renderTabBar()}

            {activeTab === 'video' ? renderVideoTab() : renderAudioTab()}

            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={true} hasToggleMedia={true} />

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
        // height: 80,
        // width: 80,
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
    videoItemThumnail: {
        width: 80,
        height: 80,
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