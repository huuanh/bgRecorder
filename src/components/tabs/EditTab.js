import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
} from 'react-native';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

const EditTab = () => {
    const editOptions = [
        {
            id: 'trim',
            title: 'Trim Video',
            description: 'Cut and trim your videos',
            icon: require('../../../assets/edit/trim.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                // Navigate to trim video screen
                console.log('Trim Video pressed');
            }
        },
        {
            id: 'compress',
            title: 'Compress Video', 
            description: 'Reduce video file size',
            icon: require('../../../assets/edit/compress.png'),
            backgroundColor: COLORS.ACTIVE,
            onPress: () => {
                // Navigate to compress video screen
                console.log('Compress Video pressed');
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
                // Navigate to video to mp3 screen
                console.log('Video to MP3 pressed');
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