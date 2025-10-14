import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import useTranslation from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const PreviewSizeModal = ({ visible, onClose, currentPreviewSize, onSelect }) => {
    const { t } = useTranslation();
    const previewSizeOptions = [
        { 
            id: t('small', 'small'), 
            label: t('small', 'small'), 
        },
        { 
            id: t('medium', 'medium'), 
            label: t('medium', 'medium'), 
        },
        { 
            id: t('large', 'large'), 
            label: t('large', 'large'), 
            isPro: true
        }
    ];

    const handleSelect = (previewSize) => {
        onSelect(previewSize.id);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Chọn kích thước preview</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {previewSizeOptions.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionButton,
                                    currentPreviewSize === option.id && styles.selectedOption
                                ]}
                                onPress={() => handleSelect(option)}
                            >
                                <View style={styles.optionContent}>
                                    <View style={styles.radioContainer}>
                                        <View style={[
                                            styles.radioButton,
                                            currentPreviewSize === option.id && styles.radioButtonSelected
                                        ]}>
                                            {currentPreviewSize === option.id && (
                                                <View style={styles.radioButtonInner} />
                                            )}
                                        </View>
                                    </View>
                                    
                                    <View style={styles.optionTextContainer}>
                                        <View style={styles.optionLabelRow}>
                                            <Text style={[
                                                styles.optionLabel,
                                                currentPreviewSize === option.id && styles.selectedOptionText
                                            ]}>
                                                {option.label}
                                            </Text>
                                            {option.isPro && (
                                                <View style={styles.proTag}>
                                                    <Text style={styles.proTagText}>PRO</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Native Ad */}
                        <View style={styles.adContainer}>
                            <NativeAdComponent 
                                adUnitId={ADS_UNIT.NATIVE_PREVIEW_SIZE}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: COLORS.WHITE,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.8,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.LIGHT_GRAY,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.TERTIARY,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.SECONDARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: COLORS.TERTIARY,
        fontWeight: 'bold',
    },
    modalContent: {
        paddingHorizontal: 20,
    },
    optionButton: {
        backgroundColor: COLORS.WHITE,
        borderRadius: 12,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: COLORS.TERTIARY,
        overflow: 'hidden',
    },
    selectedOption: {
        borderColor: COLORS.ACTIVE,
        backgroundColor: `${COLORS.ACTIVE}10`,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    radioContainer: {
        marginRight: 12,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.MEDIUM_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
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
    optionTextContainer: {
        flex: 1,
    },
    optionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.TERTIARY,
    },
    selectedOptionText: {
        color: COLORS.ACTIVE,
    },
    proTag: {
        backgroundColor: COLORS.ACCENT,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    proTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.WHITE,
    },
    adContainer: {
        marginTop: 20,
        marginBottom: 10,
    },
});

export default PreviewSizeModal;