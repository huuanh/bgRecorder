import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Modal,
} from 'react-native';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import useTranslation from '../hooks/useTranslation';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

const BackConfirmModal = ({ 
    visible, 
    onConfirm, 
    onCancel,
    title,
    message,
    showAd = true,
    adUnitId = ADS_UNIT.NATIVE_GALLERY_TAB
}) => {
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.backConfirmOverlay}>
                <View style={styles.backConfirmModal}>
                    <Text style={styles.backConfirmTitle}>
                        {title || t('unsaved_changes_title', 'You did not saved your changes.')}
                    </Text>
                    <Text style={styles.backConfirmMessage}>
                        {message || t('unsaved_changes_message', 'Are you sure want to exit?')}
                    </Text>
                    
                    {/* Native Ad in modal */}
                    {showAd && (
                        <View style={styles.backConfirmAdContainer}>
                            <NativeAdComponent 
                                adUnitId={adUnitId} 
                                hasMedia={false}
                            />
                        </View>
                    )}
                    
                    <View style={styles.backConfirmButtons}>
                        <TouchableOpacity
                            style={styles.backConfirmCancelButton}
                            onPress={onCancel}
                        >
                            <Text style={styles.backConfirmCancelText}>
                                {t('cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.backConfirmOKButton}
                            onPress={onConfirm}
                        >
                            <Text style={styles.backConfirmOKText}>
                                {t('ok', 'OK')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backConfirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backConfirmModal: {
        backgroundColor: COLORS.BACKGROUND, // Beige color like in the image
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 30,
        maxWidth: 350,
        width: '85%',
        alignItems: 'center',
    },
    backConfirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    backConfirmMessage: {
        fontSize: 16,
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 22,
    },
    backConfirmAdContainer: {
        width: '100%',
        marginBottom: 15,
        borderRadius: 10,
        overflow: 'hidden',
    },
    backConfirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 15,
    },
    backConfirmCancelButton: {
        flex: 1,
        backgroundColor: COLORS.TERTIARY,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
    },
    backConfirmCancelText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    backConfirmOKButton: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.TERTIARY,
    },
    backConfirmOKText: {
        color: COLORS.TERTIARY,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default BackConfirmModal;