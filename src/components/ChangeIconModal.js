import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Image,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { COLORS, FONTS } from '../constants';
import IconManager from '../utils/IconManager';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');



const ChangeIconModal = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [selectedIcon, setSelectedIcon] = useState('default');

    // Icon categories with 3 rows: Browser, Computer, Weather
    const iconCategories = [
        {
            title: 'Browser Icons',
            icons: [
                { id: 'br1', name: 'Chrome Style', source: require('../../assets/setting/icon/br1.png') },
                { id: 'br2', name: 'Firefox Style', source: require('../../assets/setting/icon/br2.png') },
                { id: 'br3', name: 'Safari Style', source: require('../../assets/setting/icon/br3.png') },
            ]
        },
        {
            title: 'Computer Icons',
            icons: [
                { id: 'cac1', name: 'Classic PC', source: require('../../assets/setting/icon/cac1.png') },
                { id: 'cac2', name: 'Modern PC', source: require('../../assets/setting/icon/cac2.png') },
                { id: 'cac3', name: 'Gaming PC', source: require('../../assets/setting/icon/cac3.png') },
            ]
        },
        {
            title: 'Weather Icons',
            icons: [
                { id: 'we1', name: 'Sunny', source: require('../../assets/setting/icon/we1.png') },
                { id: 'we2', name: 'Cloudy', source: require('../../assets/setting/icon/we2.png') },
                { id: 'we3', name: 'Rainy', source: require('../../assets/setting/icon/we3.png') },
            ]
        }
    ];

    // Default icon
    const defaultIcon = {
        id: 'default',
        name: 'Default',
        source: require('../../assets/setting/icon/default.png')
    };

    useEffect(() => {
        if (visible) {
            loadSelectedIcon();
        }
    }, [visible]);

    const loadSelectedIcon = async () => {
        try {
            const savedIcon = await IconManager.getSelectedIconAsync();
            setSelectedIcon(savedIcon);
        } catch (error) {
            console.log('❌ Error loading selected icon:', error);
        }
    };

    const handleIconSelect = async (iconId) => {
        setSelectedIcon(iconId);
    };

    const handleDoneClick = async () => {
        try {
            const success = await IconManager.changeIcon(selectedIcon);

            if (success) {
                console.log('✅ App icon changed to:', selectedIcon);
            }
        } catch (error) {
            console.log('❌ Error changing app icon:', error);
            // Alert.alert(t('error', 'Error'), 'Failed to change app icon');
        }
    }

    const getIconName = (iconId) => {
        if (iconId === 'default') return defaultIcon.name;
        
        for (const category of iconCategories) {
            const icon = category.icons.find(icon => icon.id === iconId);
            if (icon) return icon.name;
        }
        return 'Unknown';
    };

    const renderIconItem = (icon, isDefault = false) => {
        const isSelected = selectedIcon === icon.id;
        
        return (
            <TouchableOpacity
                key={icon.id}
                style={[styles.iconItem, isSelected && styles.selectedIconItem]}
                onPress={() => handleIconSelect(icon.id)}
            >
                <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                    <Image source={icon.source} style={styles.iconImage} />
                    {isSelected && (
                        <View style={styles.selectedOverlay}>
                            <Text style={styles.checkmark}>✓</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.iconName, isSelected && styles.selectedIconName]}>
                    {icon.name}
                </Text>
                {isDefault && (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderCategory = (category) => (
        <View key={category.title} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.iconsRow}>
                {category.icons.map(icon => renderIconItem(icon))}
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Image style={styles.closeButtonText} source={require('../../assets/home/ic/ic_back.png')} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Change App Icon</Text>
                    </View>
                    
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Default Icon */}
                        <View style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>Current Icon</Text>
                            <View style={styles.iconsRow}>
                                {renderIconItem(defaultIcon, true)}
                            </View>
                        </View>
                        
                        {/* Icon Categories */}
                        {iconCategories.map(renderCategory)}
                        
                    </ScrollView>
                    
                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.doneButton}
                            onPress={handleDoneClick}
                        >
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: COLORS.BACKGROUND,
        // borderRadius: 16,
        width: width,
        // width: 400,
        height: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.GRAY_100,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        fontFamily: FONTS.PRIMARY,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        paddingRight: 10,
        // backgroundColor: COLORS.GRAY_100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        // color: COLORS.TEXT_SECONDARY,
        fontWeight: 'bold',
        width: 25,
        height: 25,
        resizeMode: 'contain',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    categoryContainer: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 12,
    },
    iconsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    iconItem: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
    },
    selectedIconItem: {
        // Additional styling for selected item
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: COLORS.GRAY_50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    selectedIconContainer: {
        borderColor: COLORS.ACTIVE,
        backgroundColor: COLORS.PRIMARY_LIGHT,
    },
    iconImage: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    selectedOverlay: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.ACTIVE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: COLORS.WHITE,
        fontSize: 12,
        fontWeight: 'bold',
    },
    iconName: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
        textAlign: 'center',
        marginBottom: 4,
    },
    selectedIconName: {
        color: COLORS.ACTIVE,
        fontWeight: '600',
    },
    defaultBadge: {
        backgroundColor: COLORS.ACCENT,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    defaultBadgeText: {
        fontSize: 10,
        color: COLORS.WHITE,
        fontWeight: '600',
    },
    instructionsContainer: {
        backgroundColor: COLORS.GRAY_50,
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 12,
        color: COLORS.TEXT_SECONDARY,
        lineHeight: 18,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: COLORS.GRAY_100,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    doneButton: {
        backgroundColor: COLORS.ACTIVE,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
    },
});

export default ChangeIconModal;