import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    StatusBar,
    Alert,
    Dimensions,
    Image,
} from 'react-native';
import Video from 'react-native-video';

const { width, height } = Dimensions.get('window');

const VideoPlayer = ({ visible, video, onClose }) => {
    const videoRef = useRef(null);
    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);

    if (!video) return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const onLoad = (data) => {
        setDuration(data.duration);
        setLoading(false);
        console.log('Video loaded:', data);
    };

    const onProgress = (data) => {
        setCurrentTime(data.currentTime);
    };

    const onError = (error) => {
        console.error('Video playback error:', error);
        setLoading(false);
        Alert.alert(
            'Playback Error',
            'Failed to play video. The file might be corrupted or in an unsupported format.',
            [
                { text: 'OK', onPress: onClose }
            ]
        );
    };

    const togglePlayPause = () => {
        setPaused(!paused);
    };

    const seekToTime = (time) => {
        videoRef.current?.seek(time);
    };

    const onSeek = (data) => {
        setCurrentTime(data.currentTime);
    };

    const toggleControls = () => {
        setShowControls(!showControls);
    };

    const onVideoPress = () => {
        setShowControls(true);
        // Hide controls after 3 seconds
        setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const renderControls = () => {
        if (!showControls) return null;

        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        return (
            <View style={styles.controlsContainer}>
                {/* Top Controls */}
                <View style={styles.topControls}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Image 
                            source={require('../../assets/home/ic/ic_setting.png')} 
                            style={styles.closeIcon} 
                        />
                    </TouchableOpacity>
                    <Text style={styles.videoTitle} numberOfLines={1}>
                        {video.title}
                    </Text>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomControls}>
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                            <TouchableOpacity
                                style={[styles.progressThumb, { left: `${progress}%` }]}
                                onPress={() => {
                                    // Simple seek implementation
                                    const newTime = (progress / 100) * duration;
                                    seekToTime(newTime);
                                }}
                            />
                        </View>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    {/* Play Controls */}
                    <View style={styles.playControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => seekToTime(Math.max(0, currentTime - 10))}
                        >
                            <Text style={styles.controlButtonText}>-10s</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.playButton}
                            onPress={togglePlayPause}
                        >
                            <Image 
                                source={paused ? 
                                    require('../../assets/home/ic/ic_record.png') : 
                                    require('../../assets/home/ic/ic_setting.png')
                                } 
                                style={styles.playIcon} 
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => seekToTime(Math.min(duration, currentTime + 10))}
                        >
                            <Text style={styles.controlButtonText}>+10s</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderLoadingOverlay = () => {
        if (!loading) return null;

        return (
            <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Loading video...</Text>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            supportedOrientations={['portrait', 'landscape']}
        >
            <StatusBar hidden />
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.videoContainer}
                    onPress={onVideoPress}
                    activeOpacity={1}
                >
                    <Video
                        ref={videoRef}
                        source={{ uri: video.filePath }}
                        style={styles.video}
                        resizeMode="contain"
                        paused={paused}
                        onLoad={onLoad}
                        onProgress={onProgress}
                        onSeek={onSeek}
                        onError={onError}
                        onEnd={() => setPaused(true)}
                        progressUpdateInterval={250}
                    />
                </TouchableOpacity>

                {renderLoadingOverlay()}
                {renderControls()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: width,
        height: height,
    },
    controlsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    closeIcon: {
        width: 20,
        height: 20,
        tintColor: '#FFFFFF',
    },
    videoTitle: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: 12,
        minWidth: 40,
        textAlign: 'center',
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginHorizontal: 10,
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1E3A8A',
        borderRadius: 2,
    },
    progressThumb: {
        position: 'absolute',
        top: -6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1E3A8A',
        marginLeft: -8,
    },
    playControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        marginHorizontal: 10,
    },
    controlButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    playIcon: {
        width: 24,
        height: 24,
        tintColor: '#FFFFFF',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default VideoPlayer;