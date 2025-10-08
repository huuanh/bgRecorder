import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import SecurityManager from '../utils/SecurityManager';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useTranslation from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const SetPasswordModal = ({ visible, onClose, onPasswordSet }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert(t('error', 'Error'), 'Please enter both password and confirmation');
            return;
        }

        if (password.length < 4) {
            Alert.alert(t('error', 'Error'), 'Password must be at least 4 characters long');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('error', 'Error'), t('passwords_do_not_match', 'Passwords do not match'));
            return;
        }

        setIsLoading(true);
        
        try {
            const success = await SecurityManager.savePassword(password);
            if (success) {
                Alert.alert(
                    t('success', 'Success'),
                    'Password has been set successfully!',
                    [
                        {
                            text: t('ok', 'OK'),
                            onPress: () => {
                                resetForm();
                                onPasswordSet && onPasswordSet();
                                onClose();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(t('error', 'Error'), 'Failed to set password. Please try again.');
            }
        } catch (error) {
            console.error('Error setting password:', error);
            Alert.alert(t('error', 'Error'), 'An error occurred while setting password');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Set App Password</Text>
                        <TouchableOpacity 
                            onPress={handleClose}
                            style={styles.closeButton}
                        >
                            <Icon name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.description}>
                            Create a password to secure your app. This password will be required when opening the app.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordInput}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter password (min 4 characters)"
                                    placeholderTextColor={COLORS.TERTIARY}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    maxLength={20}
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Icon 
                                        name={showPassword ? "visibility" : "visibility-off"} 
                                        size={20} 
                                        color={COLORS.TERTIARY} 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordInput}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={COLORS.TERTIARY}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    maxLength={20}
                                />
                            </View>
                        </View>

                        {/* Password strength indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthIndicator}>
                                <Text style={[
                                    styles.strengthText,
                                    { color: password.length >= 6 ? COLORS.SUCCESS : COLORS.ACTIVE }
                                ]}>
                                    {password.length < 4 ? 'Too short' : 
                                     password.length < 6 ? 'Weak' : 
                                     'Good'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                styles.setButton,
                                { opacity: isLoading || !password || !confirmPassword ? 0.5 : 1 }
                            ]}
                            onPress={handleSetPassword}
                            disabled={isLoading || !password || !confirmPassword}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.WHITE} size="small" />
                            ) : (
                                <Text style={styles.setButtonText}>Set Password</Text>
                            )}
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
    },
    modalContainer: {
        width: width * 0.9,
        maxWidth: 400,
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.TERTIARY,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TERTIARY,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    description: {
        fontSize: 14,
        color: COLORS.TERTIARY,
        lineHeight: 20,
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.TERTIARY,
        marginBottom: 8,
    },
    passwordInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.TERTIARY,
    },
    input: {
        flex: 1,
        height: 48,
        paddingHorizontal: 12,
        fontSize: 16,
        color: COLORS.TERTIARY,
        backgroundColor: COLORS.BACKGROUND,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.TERTIARY,
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        padding: 4,
    },
    strengthIndicator: {
        marginTop: 4,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 0,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.SECONDARY,
        backgroundColor: COLORS.BACKGROUND,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.TERTIARY,
    },
    setButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: COLORS.TERTIARY,
    },
    setButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
    },
});

export default SetPasswordModal;