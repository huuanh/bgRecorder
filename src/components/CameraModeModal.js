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
import useTranslation from '../hooks/useTranslation';
const { width } = Dimensions.get('window');


const CameraModeModal = ({ visible, onClose, currentMode, onSelect }) => {
    const { t } = useTranslation();
    const modes = [
        {
            id: 'front',
            title: 'Front Camera',
            description: 'Use front-facing camera',
            icon: require('../../assets/home/ic/icon_swap.png')
        },
        {
            id: 'back',
            title: 'Back Camera', 
            description: 'Use back-facing camera (Default)',
            icon: require('../../assets/home/ic/ic_setting.png')
        }
    ];

    const handleSelect = (mode) => {
        onSelect(mode);
        onClose();
    };

    const renderModeItem = (mode) => {
        const isSelected = currentMode === mode.id;
        
        return (
            <TouchableOpacity
                key={mode.id}
                style={[styles.modeItem, isSelected && styles.selectedItem]}
                onPress={() => handleSelect(mode.id)}
            >
                <View style={styles.modeLeft}>
                    <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.modeInfo}>
                        <Text style={[styles.modeTitle, isSelected && styles.selectedText]}>
                            {mode.title}
                        </Text>
                        <Text style={[styles.modeDescription, isSelected && styles.selectedDescription]}>
                            {mode.description}
                        </Text>
                    </View>
                </View>
                {/* {isSelected && (
                    <View style={styles.proTag}>
                        <Text style={styles.proText}>PRO</Text>
                    </View>
                )} */}
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
                        <Text style={styles.title}>{t('cameraModeSelection', 'Camera Mode Selection')}</Text>
                    </View>
                    
                    <View style={styles.content}>
                        {modes.map(renderModeItem)}
                        <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={true} />
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
    modeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: COLORS.GRAY_50,
    },
    selectedItem: {
        backgroundColor: COLORS.PRIMARY_LIGHT,
        borderWidth: 2,
        borderColor: COLORS.ACTIVE,
    },
    modeLeft: {
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
    modeInfo: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.TEXT_PRIMARY,
        marginBottom: 2,
    },
    selectedText: {
        color: COLORS.ACTIVE,
    },
    modeDescription: {
        fontSize: 13,
        color: COLORS.TEXT_SECONDARY,
    },
    selectedDescription: {
        color: COLORS.PRIMARY_DARK,
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
    footer: {
        flexDirection: 'row',
        // borderTopWidth: 1,
        // borderTopColor: COLORS.GRAY_100,
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

export default CameraModeModal;