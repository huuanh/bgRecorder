import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Image,
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import { useVipStatus } from '../utils/VipUtils';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const ResolutionModal = ({ visible, onClose, currentResolution, onSelect, onShowIAP }) => {
    const { t } = useTranslation();
    const { isVip, loading } = useVipStatus();
    const resolutionOptions = [
        {
            id: 'SD',
            title: t('sd_quality', 'SD Quality'),
            description: '640x360',
            size: '640x360',
            icon: require('../../assets/home/ic/quality.png')
        },
        {
            id: 'HD',
            title: t('hd_quality', 'HD Quality'), 
            description: '720x480',
            size: '720x480',
            icon: require('../../assets/home/ic/quality.png')
        },
        {
            id: 'Full HD',
            title: t('full_hd_quality', 'Full HD Quality'),
            description: '1280x720',
            size: '1280x720',
            icon: require('../../assets/home/ic/quality.png'),
            isPro: true
        }
    ];

    const handleSelect = (resolution) => {
        // Check if trying to select Full HD without VIP
        console.log('Selected resolution:', resolution, 'isVip:', isVip);   
        if (resolution == 'Full HD' && !isVip) {
            // Show upgrade prompt
            if (onShowIAP) {
                onShowIAP();
            }
            return;
        }
        
        onSelect(resolution);
        onClose();
    };

    const renderResolutionItem = (option) => {
        const isSelected = currentResolution === option.id;
        const isLocked = option.isPro && !isVip;
        
        return (
            <TouchableOpacity
                key={option.id}
                style={[
                    styles.resolutionItem, 
                    isSelected && styles.selectedItem,
                    isLocked && styles.lockedItem
                ]}
                onPress={() => handleSelect(option.id)}
            >
                <View style={styles.resolutionLeft}>
                    <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.resolutionInfo}>
                        <Text style={[
                            styles.resolutionTitle, 
                            isSelected && styles.selectedText,
                            isLocked && styles.lockedText
                        ]}>
                            {option.title}
                        </Text>
                        <Text style={[
                            styles.resolutionDescription, 
                            isSelected && styles.selectedDescription,
                            isLocked && styles.lockedDescription
                        ]}>
                            {option.description}
                        </Text>
                    </View>
                </View>
                {option.isPro && (
                    <View style={[styles.proTag]}>
                        <Text style={[styles.proText, isLocked && styles.lockedProText]}>
                            {isLocked ? '🔒 PRO' : 'PRO'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('videoQuality', 'Video Quality')}</Text>
                    </View>
                    
                    <View style={styles.content}>
                        {resolutionOptions.map(renderResolutionItem)}
                        
                        {/* Native Ad */}
                        <View style={styles.adContainer}>
                            <NativeAdComponent adUnitId={ADS_UNIT.NATIVE_QUALITY} />
                        </View>
                    </View>
                    
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>{t('cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.okButton}
                            onPress={onClose}
                        >
                            <Text style={styles.okText}>{t('ok', 'OK')}</Text>
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
        backgroundColor: COLORS.WHITE,
        borderRadius: 8,
        width: width - 40,
        maxWidth: 400,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.GRAY_100,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TEXT_PRIMARY,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 10,
        paddingVertical: 16,
    },
    resolutionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: COLORS.GRAY_50,
        borderColor: COLORS.SECONDARY,
        borderWidth: 2,
    },
    selectedItem: {
        backgroundColor: COLORS.PRIMARY_LIGHT,
        borderWidth: 2,
        borderColor: COLORS.ACTIVE,
    },
    lockedItem: {
        backgroundColor: COLORS.GRAY_100,
        // borderColor: COLORS.TERTIARY,
        // opacity: 0.7,
    },
    resolutionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.GRAY_300,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: COLORS.ACTIVE,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.ACTIVE,
    },
    resolutionInfo: {
        flex: 1,
    },
    resolutionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 2,
    },
    selectedText: {
        color: COLORS.ACTIVE,
    },
    resolutionDescription: {
        fontSize: 13,
        color: COLORS.TEXT_SECONDARY,
    },
    selectedDescription: {
        color: COLORS.PRIMARY_DARK,
    },
    lockedText: {
        color: COLORS.TERTIARY,
    },
    lockedDescription: {
        color: COLORS.TERTIARY,
    },
    upgradeText: {
        fontSize: 12,
        color: COLORS.ACCENT,
        fontWeight: '500',
        marginTop: 2,
    },
    proTag: {
        backgroundColor: COLORS.ACCENT,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    proText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.WHITE,
    },
    lockedProTag: {
        backgroundColor: COLORS.GRAY_300,
    },
    lockedProText: {
        color: COLORS.GRAY_600,
    },
    adContainer: {
        // marginTop: 16,
        // borderRadius: 12,
        overflow: 'hidden',
    },
    footer: {
        flexDirection: 'row',
        // borderTopWidth: 1,
        // borderTopColor: COLORS.PRIMARY,
        paddingBottom: 10,
    },cancelButton: {
        // flex: 1,
        // padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        // borderRightWidth: 1,
        width: '50%',
        // height: 48,
        // backgroundColor: COLORS.SECONDARY,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.WHITE,
        backgroundColor: COLORS.SECONDARY,
        paddingHorizontal: 2,
        paddingVertical: 8,
        borderRadius: 8,
        width: '90%',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    },
    okButton: {
        flex: 1,
        // paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor: COLORS.TERTIARY,
    },
    okText: {
        fontSize: 16,
        color: COLORS.WHITE,
        backgroundColor: COLORS.TERTIARY,
        paddingHorizontal: 2,
        paddingVertical: 8,
        borderRadius: 8,
        width: '90%',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    },
});

export default ResolutionModal;