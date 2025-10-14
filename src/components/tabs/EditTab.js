import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants';
import VideoSelectorModal from '../VideoSelectorModal';
import MultiVideoSelectorModal from '../MultiVideoSelectorModal';
import TrimVideoModal from '../TrimVideoModal';
import CompressModal from '../CompressModal';
import Mp3ConvertModal from '../Mp3ConvertModal';
import MergeVideoModal from '../MergeVideoModal';
import { NativeAdComponent } from '../NativeAdComponent';
import AdManager, { ADS_UNIT } from '../../AdManager';
import useTranslation from '../../hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');

const EditTab = () => {
    const { t } = useTranslation();
    // Single video modals
    const [showVideoSelector, setShowVideoSelector] = useState(false);
    const [videoSelectorTitle, setVideoSelectorTitle] = useState('');
    const [videoSelectorAction, setVideoSelectorAction] = useState('');
    
    // Multi video modal (for merge)
    const [showMultiVideoSelector, setShowMultiVideoSelector] = useState(false);
    
    // Tool modals
    const [showTrimModal, setShowTrimModal] = useState(false);
    const [trimModalVideo, setTrimModalVideo] = useState(null);
    
    const [showCompressModal, setShowCompressModal] = useState(false);
    const [compressModalVideo, setCompressModalVideo] = useState(null);
    
    const [showMp3ConvertModal, setShowMp3ConvertModal] = useState(false);
    const [mp3ConvertModalVideo, setMp3ConvertModalVideo] = useState(null);
    
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeVideos, setMergeVideos] = useState([]);

    // Single video selection handler
    const handleVideoSelect = (video) => {
        console.log('Selected video:', video);
        
        if (videoSelectorAction === 'trim') {
            setTrimModalVideo(video);
            setShowTrimModal(true);
        } else if (videoSelectorAction === 'compress') {
            setCompressModalVideo(video);
            setShowCompressModal(true);
        } else if (videoSelectorAction === 'mp3convert') {
            setMp3ConvertModalVideo(video);
            setShowMp3ConvertModal(true);
        }
        
        setShowVideoSelector(false);
    };

    // Multi video selection handler (for merge)
    const handleMultiVideoSelect = (videos) => {
        console.log('Selected videos for merge:', videos);
        setMergeVideos(videos);
        setShowMultiVideoSelector(false);
        setShowMergeModal(true);
    };

    // Tool action handlers
    const handleTrimVideo = () => {
        AdManager.showInterstitialAd(ADS_UNIT.INTERSTITIAL_SELECT_TOOL);
        setVideoSelectorTitle('Select Video to Trim');
        setVideoSelectorAction('trim');
        setShowVideoSelector(true);
    };

    const handleCompressVideo = () => {
        AdManager.showInterstitialAd(ADS_UNIT.INTERSTITIAL_SELECT_TOOL);
        setVideoSelectorTitle('Select Video to Compress');
        setVideoSelectorAction('compress');
        setShowVideoSelector(true);
    };

    const handleMergeVideo = () => {
        // setShowMultiVideoSelector(true);
                Alert.alert(
            t('notify', 'Notify'),
            'Coming Soon!',
            [{ text: t('ok', 'OK') }]
        );
    };

    const handleMp3ConvertVideo = () => {
        AdManager.showInterstitialAd(ADS_UNIT.INTERSTITIAL_SELECT_TOOL);
        setVideoSelectorTitle('Select Video to Convert');
        setVideoSelectorAction('mp3convert');
        setShowVideoSelector(true);
    };

    // Export handlers
    const handleTrimExport = (exportedVideoPath) => {
        console.log('Video trimmed successfully:', exportedVideoPath);
        // Alert.alert(
        //     t('success', 'Success'),
        //     'Video has been trimmed successfully!',
        //     [{ text: t('ok', 'OK') }]
        // );
        // setShowTrimModal(false);
        // setTrimModalVideo(null);
    };

    const handleCompressExport = (result) => {
        console.log('Video compressed successfully:', result);
        // const { inputSize, outputSize, compressionRatio } = result;
        // Alert.alert(
        //     'Compression Complete',
        //     `Original: ${inputSize}\nCompressed: ${outputSize}\nReduction: ${compressionRatio}%`,
        //     [{ text: t('ok', 'OK') }]
        // );
        // setShowCompressModal(false);
        // setCompressModalVideo(null);
    };

    const handleMp3ConvertExport = (convertedAudioPath) => {
        console.log('Audio converted successfully:', convertedAudioPath);
        // Alert.alert(
        //     t('success', 'Success'),
        //     `Audio file created: ${convertedAudioPath}`,
        //     [{ text: t('ok', 'OK') }]
        // );
        // setShowMp3ConvertModal(false);
        // setMp3ConvertModalVideo(null);
    };

    const handleMergeExport = (mergedVideoPath) => {
        console.log('Videos merged successfully:', mergedVideoPath);
        setShowMergeModal(false);
        setMergeVideos([]);
    };

    const editOptions = [
        {
            title: 'Trim Video',
            icon: require('../../../assets/edit/trim.png'),
            onPress: handleTrimVideo,
        },
        {
            title: 'Compress Video',
            icon: require('../../../assets/edit/compress.png'),
            onPress: handleCompressVideo,
        },
        {
            title: 'Merge Video',
            icon: require('../../../assets/edit/merge.png'),
            onPress: handleMergeVideo,
        },
        {
            title: 'Video to MP3',
            icon: require('../../../assets/edit/v2mp3.png'),
            onPress: handleMp3ConvertVideo,
        },
    ];

    return (
        <View style={styles.tabContent}>
            {/* Edit Options Grid */}
            <View style={styles.editGrid}>
                {editOptions.map((option, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.editCard}
                        onPress={option.onPress}
                        activeOpacity={0.8}
                    >
                        <View style={styles.iconContainer}>
                            <Image source={option.icon} style={styles.editIcon} />
                        </View>
                        <Text style={styles.editTitle}>{option.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Ad Banner */}
            <View style={styles.adContainer}>
                <NativeAdComponent adUnitId={ADS_UNIT.NATIVE_EDIT_TAB} hasMedia={true} />
            </View>

            {/* Single Video Selector Modal */}
            <VideoSelectorModal
                visible={showVideoSelector}
                title={videoSelectorTitle}
                onClose={() => setShowVideoSelector(false)}
                onVideoSelect={handleVideoSelect}
            />

            {/* Multi Video Selector Modal (for merge) */}
            <MultiVideoSelectorModal
                visible={showMultiVideoSelector}
                title="Select Videos to Merge"
                onClose={() => setShowMultiVideoSelector(false)}
                onVideoSelect={handleMultiVideoSelect}
                minSelection={2}
            />

            {/* Tool Modals */}
            <TrimVideoModal
                visible={showTrimModal}
                video={trimModalVideo}
                onClose={() => {
                    setShowTrimModal(false);
                    setTrimModalVideo(null);
                }}
                onExport={handleTrimExport}
            />

            <CompressModal
                visible={showCompressModal}
                video={compressModalVideo}
                onClose={() => {
                    setShowCompressModal(false);
                    setCompressModalVideo(null);
                }}
                onCompress={handleCompressExport}
            />

            <Mp3ConvertModal
                visible={showMp3ConvertModal}
                video={mp3ConvertModalVideo}
                onClose={() => {
                    setShowMp3ConvertModal(false);
                    setMp3ConvertModalVideo(null);
                }}
                onConvert={handleMp3ConvertExport}
            />

            <MergeVideoModal
                visible={showMergeModal}
                videos={mergeVideos}
                onClose={() => {
                    setShowMergeModal(false);
                    setMergeVideos([]);
                }}
                onExport={handleMergeExport}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    
    editGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    editCard: {
        width: (screenWidth - 48) / 2,
        height: 120,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: COLORS.ITEM,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    iconContainer: {
        marginBottom: 8,
    },
    editIcon: {
        width: 40,
        height: 40,
    },
    editTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.TERTIARY,
        textAlign: 'center',
    },
    adContainer: {
        margin: 16,
        overflow: 'hidden',
    },
});

export default EditTab;