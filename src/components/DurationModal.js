import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Image,
    Alert,
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import { useVipStatus } from '../utils/VipUtils';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const DurationModal = ({ visible, onClose, currentDuration, onSelect, onShowIAP }) => {
    const { t } = useTranslation(); 
    const { isVip, loading } = useVipStatus();
    const durationOptions = [
        {
            id: 3,
            title: '3 Minutes',
            description: 'Record for 3 minutes maximum',
            icon: require('../../assets/home/ic/icon_clock.png')
        },
        {
            id: -1, // -1 represents unlimited
            title: 'Unlimited',
            description: 'Record without time limit (PRO)',
            icon: require('../../assets/home/ic/ic_setting.png'),
            isPro: true
        }
    ];

    const handleSelect = (duration) => {
        // Check if trying to select unlimited duration
        if (duration === -1 && !isVip) {
            // Show upgrade prompt for non-VIP users
            Alert.alert(
                'Premium Feature',
                'Unlimited recording is available for Premium members only. Upgrade now to unlock this feature!',
                [
                    {
                        text: t('cancel', 'Cancel'),
                        style: 'cancel',
                    },
                    {
                        text: 'Upgrade',
                        onPress: () => {
                            onClose();
                            if (onShowIAP) {
                                onShowIAP();
                            }
                        },
                    },
                ]
            );
            return;
        }
        
        onSelect(duration);
        onClose();
    };

    const renderDurationItem = (option) => {
        const isSelected = currentDuration === option.id;
        const isUnlimited = option.id === -1;
        const isDisabled = isUnlimited && !isVip;
        
        return (
            <TouchableOpacity
                key={option.id}
                style={[
                    styles.durationItem, 
                    isSelected && styles.selectedItem,
                    isDisabled && styles.disabledItem
                ]}
                onPress={() => handleSelect(option.id)}
                disabled={loading} // Disable during loading
            >
                <View style={styles.durationLeft}>
                    <View style={[
                        styles.radioButton, 
                        isSelected && styles.radioButtonSelected,
                        isDisabled && styles.radioButtonDisabled
                    ]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.durationInfo}>
                        <Text style={[
                            styles.durationTitle, 
                            isSelected && styles.selectedText,
                            isDisabled && styles.disabledText
                        ]}>
                            {option.title}
                        </Text>
                        <Text style={[
                            styles.durationDescription, 
                            isSelected && styles.selectedDescription,
                            isDisabled && styles.disabledDescription
                        ]}>
                            {isDisabled ? 'Upgrade to Premium to unlock' : option.description}
                        </Text>
                    </View>
                </View>
                {option.isPro && (
                    <View style={[styles.proTag, isVip && styles.proTagActive]}>
                        <Text style={styles.proText}>{isVip ? '✓ PRO' : 'PRO'}</Text>
                    </View>
                )}
                {isDisabled && (
                    <View style={styles.lockIcon}>
                        <Text style={styles.lockText}>🔒</Text>
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
                        <Text style={styles.title}>{t('recordingDuration', 'Recording Duration')}</Text>
                        {!loading && (
                            <Text style={[styles.vipStatus, isVip ? styles.vipActive : styles.vipInactive]}>
                                {isVip ? t('premiumMember', '👑 Premium Member') : t('freeUser', '👤 Free User')}
                            </Text>
                        )}
                    </View>
                    
                    <View style={styles.content}>
                        {durationOptions.map(renderDurationItem)}
                        
                        {!isVip && !loading && (
                            <View style={styles.upgradeNote}>
                                <Text style={styles.upgradeNoteText}>
                                    {t('upgradeToPremiumNote', '💡 Upgrade to Premium to unlock unlimited recording and remove ads!')}
                                </Text>
                            </View>
                        )}
                        
                        {/* Native Ad - Only show for non-VIP users */}
                        {!isVip && !loading && (
                            <View style={styles.adContainer}>
                                <NativeAdComponent adUnitId={ADS_UNIT.NATIVE_AD} />
                            </View>
                        )}
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
        borderRadius: 16,
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
    vipStatus: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
    vipActive: {
        color: COLORS.SUCCESS,
        fontWeight: '600',
    },
    vipInactive: {
        color: COLORS.TEXT_SECONDARY,
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    durationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: COLORS.GRAY_50,
        borderWidth: 2,
        borderColor: COLORS.SECONDARY,
    },
    selectedItem: {
        backgroundColor: COLORS.PRIMARY_LIGHT,
        borderWidth: 2,
        borderColor: COLORS.ACTIVE,
    },
    disabledItem: {
        backgroundColor: COLORS.GRAY_50,
        borderColor: COLORS.GRAY_100,
        opacity: 0.6,
    },
    durationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.SECONDARY,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonSelected: {
        borderColor: COLORS.ACTIVE,
    },
    radioButtonDisabled: {
        borderColor: COLORS.GRAY_200,
        backgroundColor: COLORS.GRAY_100,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.ACTIVE,
    },
    durationInfo: {
        flex: 1,
    },
    durationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 2,
    },
    selectedText: {
        color: COLORS.ACTIVE,
    },
    disabledText: {
        color: COLORS.TERTIARY,
    },
    durationDescription: {
        fontSize: 13,
        color: COLORS.TEXT_SECONDARY,
    },
    selectedDescription: {
        color: COLORS.PRIMARY_DARK,
    },
    disabledDescription: {
        color: COLORS.TERTIARY,
        fontStyle: 'italic',
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
    proTagActive: {
        backgroundColor: COLORS.SUCCESS,
    },
    lockIcon: {
        marginLeft: 8,
    },
    lockText: {
        fontSize: 16,
    },
    upgradeNote: {
        backgroundColor: COLORS.PRIMARY_LIGHT,
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
        marginBottom: 8,
    },
    upgradeNoteText: {
        fontSize: 12,
        color: COLORS.PRIMARY_DARK,
        textAlign: 'center',
        lineHeight: 16,
    },
    adContainer: {
        overflow: 'hidden',
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.GRAY_100,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        backgroundColor: COLORS.SECONDARY,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.TEXT_SECONDARY,
    },
    okButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.TERTIARY,
    },
    okText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
    },
});

export default DurationModal;