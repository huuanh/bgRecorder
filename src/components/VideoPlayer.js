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
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { NativeAdComponent } from './NativeAdComponent';
import useTranslation from '../hooks/useTranslation';
import { ADS_UNIT } from '../AdManager';

const { width, height } = Dimensions.get('window');

const VideoPlayer = ({ video, fullscreen = true, visible = true, onClose }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const videoRef = useRef(null);
    const [paused, setPaused] = useState(true); // Start paused to show ad
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [seeking, setSeeking] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);

    const speedOptions = [0.25, 0.5, 1.0, 1.5, 2.0];

    if (!video) return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    const onLoad = (data) => {
        setDuration(data.duration);
        setLoading(false);
        setHasEnded(false); // Reset hasEnded when video loads
    };

    const onProgress = (data) => {
        setCurrentTime(data.currentTime);
        // Reset hasEnded if video is playing (in case of manual seek)
        if (hasEnded && data.currentTime < duration - 1) {
            setHasEnded(false);
        }
    };

    const onError = (error) => {
        console.error('Video playback error:', error);
        setLoading(false);
        Alert.alert(
            'Playback Error',
            'Failed to play video. The file might be corrupted or in an unsupported format.',
            [{ text: t('ok', 'OK'), onPress: onClose }]
        );
    };

    const togglePlayPause = () => {
        if (hasEnded) {
            // If video has ended, seek to start and play
            seekToTime(0);
            setHasEnded(false);
            setPaused(false);
        } else {
            setPaused(!paused);
        }
    };

    const seekToTime = (time) => videoRef.current?.seek(time);

    const toggleControls = () => setShowControls(!showControls);

    const onVideoPress = () => {
        setShowControls(true);
        setShowSpeedMenu(false); // Hide speed menu when video is pressed
        setTimeout(() => setShowControls(false), 3000);
    };

    const selectSpeed = (speed) => {
        setPlaybackRate(speed);
        setShowSpeedMenu(false);
    };

    // Create PanResponder for progress bar dragging
    const progressPanResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            setSeeking(true);
            setShowControls(true); // Keep controls visible during seek
        },
        onPanResponderMove: (evt, gestureState) => {
            // Calculate new time based on touch position
            const progressBarWidth = width - 100; // Approximate width minus margins
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / progressBarWidth));
            const newTime = progress * duration;
            
            setCurrentTime(newTime);
        },
        onPanResponderRelease: (evt, gestureState) => {
            // Seek to the final position
            const progressBarWidth = width - 100;
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / progressBarWidth));
            const newTime = progress * duration;
            
            seekToTime(newTime);
            setSeeking(false);
        },
    });

    const renderControls = () => {
        if (!showControls) return null;

        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        return (
            <View style={styles.controlsContainer}>
                {/* Top Controls */}
                <View style={styles.topControls}>
                    {onClose && (
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Image
                                source={require('../../assets/home/ic/ic_back.png')}
                                style={styles.closeIcon}
                            />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.videoTitle} numberOfLines={1}>
                        {video.title}
                    </Text>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomControls}>
                    {/* Native Ad - Show when paused */}
                    {/* {paused && (
                        <View style={styles.nativeAdContainer}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE_PLAY_SCENE} />
                        </View>
                    )} */}
                    
                    {/* Progress Bar */}
                    <View style={styles.speedMenu}>
                        <View style={styles.speedOptions}>
                            <Text style={styles.speedMenuTitle}>Play speed</Text>
                            {speedOptions.map((speed) => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedOption,
                                        playbackRate === speed && styles.speedOptionActive
                                    ]}
                                    onPress={() => selectSpeed(speed)}
                                >
                                    <Text
                                        style={[
                                            styles.speedOptionText,
                                            playbackRate === speed && styles.speedOptionTextActive
                                        ]}
                                    >
                                        {speed}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={styles.progressContainer}>
                        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                            <Image
                                source={
                                    paused
                                        ? require('../../assets/home/ic/ic_play.png')
                                        : require('../../assets/home/ic/ic_pause.png')
                                }
                                style={styles.playIcon}
                            />
                        </TouchableOpacity>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <View 
                            style={styles.progressBar}
                            {...progressPanResponder.panHandlers}
                        >
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                            <View
                                style={[styles.progressThumb, { left: `${progress}%` }]}
                            />
                        </View>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderLoadingOverlay = () =>
        loading ? (
            <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Loading video...</Text>
            </View>
        ) : null;

    const videoElement = (
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
                    rate={playbackRate}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onError={onError}
                    onEnd={() => {
                        setPaused(true);
                        setHasEnded(true);
                    }}
                    progressUpdateInterval={250}
                />
            </TouchableOpacity>
            {/* Thêm nativeAd */}
            {renderLoadingOverlay()}
            {renderControls()}
        </View>
    );

    if (fullscreen) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                onRequestClose={onClose}
                supportedOrientations={['portrait', 'landscape']}
            >
                {/* <StatusBar hidden={true} /> */}
                {videoElement}
            </Modal>
        );
    }

    // Inline mode (SafeArea vẫn hoạt động)
    return <View style={{ flex: 1 }}>{videoElement}</View>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        width,
        height: '100%',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
    },
    video: {
        width,
        height,
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
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        // backgroundColor: 'rgba(0,0,0,0.5)',
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
    speedMenu: {
        // position: 'absolute',
        // top: 80,
        left: 10,
        // backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 12,
        // paddingHorizontal: 20,
        // minWidth: 120,
        paddingVertical: 10,
    },
    speedMenuTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        // marginBottom: 12,
        textAlign: 'center',
    },
    speedOptions: {
        flexDirection: 'row',
        // justifyContent: 'space-between',
    },
    speedOption: {
        paddingHorizontal: 10,
        // paddingVertical: 6,
        borderRadius: 6,
        minWidth: 35,
        alignItems: 'center',
    },
    speedOptionActive: {
        backgroundColor: '#1E3A8A',
    },
    speedOptionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    speedOptionTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
    },
    nativeAdContainer: {
        marginBottom: 50,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // marginBottom: 20,
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: 12,
        minWidth: 40,
        textAlign: 'center',
    },
    progressBar: {
        flex: 1,
        height: 20, // Increased height for better touch area
        // backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 10,
        marginHorizontal: 10,
        position: 'relative',
        justifyContent: 'center',
    },
    progressFill: {
        height: 4,
        backgroundColor: '#1E3A8A',
        borderRadius: 2,
        position: 'absolute',
        top: 8,
    },
    progressThumb: {
        position: 'absolute',
        top: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1E3A8A',
        marginLeft: -8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    playButton: {
        width: 30,
        height: 30,
        // borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        // marginHorizontal: 20,
    },
    playIcon: {
        width: 20,
        height: 25,
        // tintColor: '#FFFFFF',
        resizeMode: 'contain',
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