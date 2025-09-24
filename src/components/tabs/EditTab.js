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
import { COLORS } from '../../constants';
import TrimVideoModal from '../TrimVideoModal';
import CompressModal from '../CompressModal';
import Mp3ConvertModal from '../Mp3ConvertModal';
import VideoSelectorModal from '../VideoSelectorModal';
import { NativeModules } from 'react-native';

const { width } = Dimensions.get('window');
const { VideoRecordingModule } = NativeModules;

const EditTab = () => {
    const [showVideoSelector, setShowVideoSelector] = useState(false);
    const [videoSelectorTitle, setVideoSelectorTitle] = useState('');
    const [videoSelectorAction, setVideoSelectorAction] = useState(null);
    
    const [showTrimModal, setShowTrimModal] = useState(false);
    const [trimModalVideo, setTrimModalVideo] = useState(null);
    
    const [showCompressModal, setShowCompressModal] = useState(false);
    const [compressModalVideo, setCompressModalVideo] = useState(null);
    
    const [showMp3ConvertModal, setShowMp3ConvertModal] = useState(false);
    const [mp3ConvertModalVideo, setMp3ConvertModalVideo] = useState(null);

    const openVideoSelector = (title, action) => {
        setVideoSelectorTitle(title);
        setVideoSelectorAction(() => action);
        setShowVideoSelector(true);
    };

    const handleVideoSelect = (video) => {
        if (videoSelectorAction) {
            videoSelectorAction(video);
        }
    };

    const handleTrimVideo = (video) => {
        setTrimModalVideo(video);
        setShowTrimModal(true);
    };

    const handleCompressVideo = (video) => {
        setCompressModalVideo(video);
        setShowCompressModal(true);
    };

    const handleMp3ConvertVideo = (video) => {
        setMp3ConvertModalVideo(video);
        setShowMp3ConvertModal(true);
    };

    const handleTrimExport = (exportData) => {
        Alert.alert('Success', 'Video trimmed successfully!');
    };

    const handleCompressExport = (exportData) => {
        const { compressionRatio, originalSize, compressedSize } = exportData;
        Alert.alert(
            'Video compressed successfully', 
            // `Video compressed successfully!\n\nOriginal size: ${formatFileSize(originalSize)}\nCompressed size: ${formatFileSize(compressedSize)}\nReduction: ${compressionRatio}%`
        );
    };

    const handleMp3ConvertExport = (audioPath) => {
        Alert.alert(
            'Success', 
            `Audio extracted successfully!\n\nFile saved to: ${audioPath}`
        );
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const editOptions = [
        {
            id: 'trim',
            title: 'Trim Video',
            description: 'Cut and trim your videos',
            icon: require('../../../assets/edit/trim.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                openVideoSelector('Select Video to Trim', handleTrimVideo);
            }
        },
        {
            id: 'compress',
            title: 'Compress Video', 
            description: 'Reduce video file size',
            icon: require('../../../assets/edit/compress.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                openVideoSelector('Select Video to Compress', handleCompressVideo);
            }
        },
        {
            id: 'merge',
            title: 'Merge Video',
            description: 'Combine multiple videos',
            icon: require('../../../assets/edit/merge.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                // Navigate to merge video screen
                console.log('Merge Video pressed');
            }
        },
        {
            id: 'v2mp3',
            title: 'Video to MP3',
            description: 'Extract audio from video',
            icon: require('../../../assets/edit/v2mp3.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                openVideoSelector('Select Video to Convert', handleMp3ConvertVideo);
            }
        }
    ];

    const renderEditOption = (option) => (
        <TouchableOpacity 
            key={option.id} 
            style={[styles.editCard, { backgroundColor: COLORS.SECONDARY }]}
            onPress={option.onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.iconContainer]}>
                <Image source={option.icon} style={styles.editIcon} resizeMode="contain" />
            </View>
            <View style={styles.editInfo}>
                <Text style={styles.editTitle}>{option.title}</Text>
                {/* <Text style={styles.editDescription}>{option.description}</Text> */}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.tabContent}>
            <View style={styles.editGrid}>
                {editOptions.map((option, index) => {
                    if (index % 2 === 0) {
                        return (
                            <View key={`row-${index}`} style={styles.editRow}>
                                {renderEditOption(option)}
                                {editOptions[index + 1] && renderEditOption(editOptions[index + 1])}
                            </View>
                        );
                    }
                    return null;
                })}
            </View>

            {/* Video Selector Modal */}
            <VideoSelectorModal
                visible={showVideoSelector}
                title={videoSelectorTitle}
                onClose={() => setShowVideoSelector(false)}
                onVideoSelect={handleVideoSelect}
            />

            {/* Trim Video Modal */}
            <TrimVideoModal
                visible={showTrimModal}
                video={trimModalVideo}
                onClose={() => {
                    setShowTrimModal(false);
                    setTrimModalVideo(null);
                }}
                onExport={handleTrimExport}
            />

            {/* Compress Video Modal */}
            <CompressModal
                visible={showCompressModal}
                video={compressModalVideo}
                onClose={() => {
                    setShowCompressModal(false);
                    setCompressModalVideo(null);
                }}
                onCompress={handleCompressExport}
            />

            {/* Mp3 Convert Modal */}
            <Mp3ConvertModal
                visible={showMp3ConvertModal}
                video={mp3ConvertModalVideo}
                onClose={() => {
                    setShowMp3ConvertModal(false);
                    setMp3ConvertModalVideo(null);
                }}
                onConvert={handleMp3ConvertExport}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND, // Beige background like in the image
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    editGrid: {
        flex: 1,
    },
    editRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    editCard: {
        width: (width - 60) / 2, // Account for padding and gap
        height: 120,
        borderRadius: 8,
        padding: 16,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 50,
        height: 50,
        // borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    editIcon: {
        width: 50,
        height: 50,
        // tintColor: '#FFFFFF',
    },
    editInfo: {
        marginTop: 8,
    },
    editTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    editDescription: {
        fontSize: 12,
        color: '#5D4037',
        opacity: 0.8,
    },
});

export default EditTab;