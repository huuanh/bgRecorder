import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAd } from 'react-native-google-mobile-ads';
import { NativeAdComponent } from './NativeAdComponent';
import AdManager, { ADS_UNIT } from '../AdManager.js';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const RenameModal = ({ visible, onClose, video, onRename }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (visible && video) {
            // Remove file extension from title for editing
            const nameWithoutExtension = video.title.replace(/\.[^/.]+$/, '');
            setNewName(nameWithoutExtension);
        }
    }, [visible, video]);

    const handleRename = () => {
        if (!newName.trim()) {
            Alert.alert(t('error', 'Error'), t('enter_valid_name', 'Please enter a valid name'));
            return;
        }

        if (newName.trim() === video.title.replace(/\.[^/.]+$/, '')) {
            // Name hasn't changed
            onClose();
            return;
        }

        onRename(video.id, newName.trim());
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
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
                        style={styles.renameContainer}
                    >
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('rename', 'Rename')}</Text>
                            {/* <Text style={styles.subtitle}>
                                {video?.title}
                            </Text> */}
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter new video name"
                                placeholderTextColor="#9CA3AF"
                                autoFocus={true}
                                selectTextOnFocus={true}
                                maxLength={100}
                            />
                        </View>

                        <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={false} />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelButtonText}>{t('cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.button, styles.renameButton]}
                                onPress={handleRename}
                            >
                                <Text style={styles.renameButtonText}>{t('rename', 'Rename')}</Text>
                            </TouchableOpacity>
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
        width: width * 0.85,
        maxWidth: 400,
    },
    renameContainer: {
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
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        width: "100%",
        textAlign: "center",
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    inputContainer: {
        padding: 20,
    },
    textInput: {
        borderBottomWidth: 1.5,
        borderColor: COLORS.TERTIARY,
        // borderRadius: 8,
        // paddingHorizontal: 12,
        paddingVertical: 2,
        fontSize: 14,
        color: COLORS.TERTIARY,
        // backgroundColor: '#FFFFFF',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 10,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    renameButton: {
        backgroundColor: COLORS.TERTIARY,
    },
    renameButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default RenameModal;