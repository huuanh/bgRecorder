import React, { useState, useEffect, memo } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
// import Video from 'react-native-video'; // Temporarily disabled
import { COLORS } from '../constants';
import { NativeModules } from 'react-native';
import useTranslation from '../hooks/useTranslation';

const { VideoRecordingModule } = NativeModules;

const VideoThumbnail = memo(({ 
    video, 
    width = 80, 
    height = 80, 
    onThumbnailLoad 
}) => {
    const { t } = useTranslation();
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [loadedThumbnail, setLoadedThumbnail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Check if video already has cached thumbnail
        if (video.thumbnail && video.thumbnail.startsWith('data:image')) {
            setLoadedThumbnail(video.thumbnail);
            setThumbnailLoaded(true);
            onThumbnailLoad && onThumbnailLoad(video.id);
            return;
        }

        // Lazy load thumbnail with delay
        const delay = Math.random() * 2000 + 1000; // Random delay between 1-3 seconds
        const timer = setTimeout(() => {
            loadThumbnailFromNative();
        }, delay);

        return () => clearTimeout(timer);
    }, [video.id, video.filePath]);

    const loadThumbnailFromNative = async () => {
        if (isLoading || !video.filePath || !VideoRecordingModule) return;
        
        setIsLoading(true);
        setShowVideo(true);
        
        try {
            // Try to get thumbnail from native module
            const thumbnail = await VideoRecordingModule.getVideoThumbnail(video.filePath);
            
            if (thumbnail && thumbnail.length > 0) {
                setLoadedThumbnail(thumbnail);
                setThumbnailLoaded(true);
                onThumbnailLoad && onThumbnailLoad(video.id);
            } else {
                // No thumbnail available, keep placeholder
                setHasError(true);
            }
        } catch (error) {
            console.log('Could not load thumbnail for', video.title, '- using placeholder');
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Show loaded thumbnail
    if (loadedThumbnail && loadedThumbnail.startsWith('data:image')) {
        return (
            <View style={[styles.container, { width, height }]}>
                <Image 
                    source={{ uri: loadedThumbnail }} 
                    style={[styles.thumbnailImage, { width, height }]}
                    resizeMode="cover"
                />
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{video.duration}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height }]}>
            {/* Show placeholder icon */}
            <Image 
                source={require('../../assets/home/ic/ic_record.png')} 
                style={styles.placeholderIcon} 
            />
            <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{video.duration}</Text>
            </View>
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>●</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    video: {
        backgroundColor: 'transparent',
    },
    thumbnailImage: {
        borderRadius: 8,
    },
    placeholderIcon: {
        width: 24,
        height: 24,
        tintColor: '#1E3A8A',
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
    loadingOverlay: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 8,
        textAlign: 'center',
    },
});

export default VideoThumbnail;