import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import useTranslation from '../hooks/useTranslation';

const ThumbnailGenerator = ({ 
    videoUri, 
    onThumbnailGenerated, 
    onError,
    width = 80,
    height = 80 
}) => {
    const { t } = useTranslation();
    const videoRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        if (videoUri && !isGenerating) {
            generateThumbnail();
        }
    }, [videoUri]);

    const generateThumbnail = async () => {
        if (isGenerating || !videoRef.current) return;
        
        setIsGenerating(true);
        
        try {
            // Seek to 1 second into the video for better thumbnail
            setCurrentTime(1);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            onError && onError(error);
            setIsGenerating(false);
        }
    };

    const onVideoLoad = (data) => {
        try {
            if (videoRef.current && data.duration > 0) {
                // Seek to 1 second or 10% of video duration, whichever is smaller
                const seekTime = Math.min(1, data.duration * 0.1);
                videoRef.current.seek(seekTime);
            }
        } catch (error) {
            console.error('Error in onVideoLoad:', error);
            onError && onError(error);
            setIsGenerating(false);
        }
    };

    const onVideoProgress = (data) => {
        // After seeking, capture the frame
        if (isGenerating && data.currentTime >= 0.5) {
            captureThumbnail();
        }
    };

    const captureThumbnail = () => {
        try {
            if (videoRef.current) {
                // Use the video component as thumbnail source
                // The video component will render the frame at current position
                onThumbnailGenerated && onThumbnailGenerated(videoUri);
                setIsGenerating(false);
            }
        } catch (error) {
            console.error('Error capturing thumbnail:', error);
            onError && onError(error);
            setIsGenerating(false);
        }
    };

    const onVideoError = (error) => {
        console.error('Video error:', error);
        onError && onError(error);
        setIsGenerating(false);
    };

    if (!videoUri) return null;

    return (
        <View style={[styles.container, { width, height }]}>
            <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={[styles.video, { width, height }]}
                paused={true}
                muted={true}
                resizeMode="cover"
                onLoad={onVideoLoad}
                onProgress={onVideoProgress}
                onError={onVideoError}
                currentTime={currentTime}
                poster={undefined} // Don't show poster
                posterResizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        overflow: 'hidden',
    },
    video: {
        backgroundColor: 'transparent',
    },
});

export default ThumbnailGenerator;