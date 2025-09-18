import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Image,
    Dimensions,
} from 'react-native';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

const VideoActionModal = ({ visible, onClose, video, onAction }) => {
    const menuItems = [
        { id: 'rename', icon: '✏️', title: 'Rename', color: COLORS.TERTIARY },
        { id: 'share', icon: '🔗', title: 'Share', color: COLORS.TERTIARY },
        { id: 'compress', icon: '🗜️', title: 'Compress', color: COLORS.TERTIARY },
        { id: 'video_to_mp3', icon: '🎵', title: 'Video to Audio', color: COLORS.TERTIARY },
        { id: 'trim', icon: '✂️', title: 'Trim', color: COLORS.TERTIARY },
        { id: 'delete', icon: '🗑️', title: 'Delete', color: COLORS.ERROR },
    ];

    const handleItemPress = (actionId) => {
        onAction(actionId);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity 
                        activeOpacity={1}
                        style={styles.menuContainer}
                    >
                        <View style={styles.menuHeader}>
                            <Text style={styles.videoTitle} numberOfLines={1}>
                                {video?.title}
                            </Text>
                        </View>
                        
                        <View style={styles.menuItems}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        index === menuItems.length - 1 && styles.lastMenuItem
                                    ]}
                                    onPress={() => handleItemPress(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuItemContent}>
                                        <Text style={styles.menuIcon}>{item.icon}</Text>
                                        <Text style={[styles.menuText, { color: item.color }]}>
                                            {item.title}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.8,
        maxWidth: 300,
    },
    menuContainer: {
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    menuHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    videoTitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    menuItems: {
        paddingVertical: 8,
    },
    menuItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
});

export default VideoActionModal;