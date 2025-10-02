import React, { useState, useEffect } from 'react';
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
    BackHandler,
} from 'react-native';
import { COLORS } from '../constants';
import SecurityManager from '../utils/SecurityManager';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const AuthenticationModal = ({ visible, onAuthenticated, onClose }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [securitySettings, setSecuritySettings] = useState({});
    const [attemptCount, setAttemptCount] = useState(0);

    useEffect(() => {
        if (visible) {
            loadSecuritySettings();
            setPassword('');
            setAttemptCount(0);
        }
    }, [visible]);

    // Prevent back button when authentication modal is visible
    useEffect(() => {
        if (visible) {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
            return () => backHandler.remove();
        }
    }, [visible]);

    const loadSecuritySettings = async () => {
        try {
            const settings = await SecurityManager.getSecuritySettings();
            setSecuritySettings(settings);
            
            const { available } = await SecurityManager.isBiometricsAvailable();
            setBiometricsAvailable(available && settings.biometricsEnabled);
        } catch (error) {
            console.error('Error loading security settings:', error);
        }
    };

    const handlePasswordAuthentication = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setIsLoading(true);
        
        try {
            const isValid = await SecurityManager.verifyPassword(password);
            
            if (isValid) {
                setPassword('');
                onAuthenticated();
            } else {
                const newAttemptCount = attemptCount + 1;
                setAttemptCount(newAttemptCount);
                
                if (newAttemptCount >= 3) {
                    Alert.alert(
                        'Too Many Attempts',
                        'You have entered the wrong password 3 times. Please try again later.',
                        [{ text: 'OK', onPress: () => BackHandler.exitApp() }]
                    );
                } else {
                    Alert.alert(
                        'Incorrect Password',
                        `Wrong password. ${3 - newAttemptCount} attempts remaining.`
                    );
                    setPassword('');
                }
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            Alert.alert('Error', 'An error occurred while verifying password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricAuthentication = async () => {
        setIsLoading(true);
        
        try {
            const success = await SecurityManager.authenticateWithBiometrics(
                'Authenticate to access BgRecorder'
            );
            
            if (success) {
                onAuthenticated();
            } else {
                Alert.alert('Authentication Failed', 'Biometric authentication was not successful');
            }
        } catch (error) {
            console.error('Error with biometric authentication:', error);
            Alert.alert('Error', 'An error occurred during biometric authentication');
        } finally {
            setIsLoading(false);
        }
    };

    const getBiometricIcon = () => {
        return 'fingerprint'; // Default to fingerprint icon
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {}} // Prevent dismissal
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Icon name="lock" size={40} color={COLORS.TERTIARY} />
                        </View>
                        <Text style={styles.title}>App Locked</Text>
                    </View>

                    <View style={styles.content}>
                        {securitySettings.hasPassword && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordInput}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your password"
                                        placeholderTextColor={COLORS.TERTIARY}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        onSubmitEditing={handlePasswordAuthentication}
                                        autoFocus={true}
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
                        )}

                        <View style={styles.buttonContainer}>
                            {securitySettings.hasPassword && (
                                <TouchableOpacity 
                                    style={[
                                        styles.authButton,
                                        { opacity: isLoading || !password ? 0.5 : 1 }
                                    ]}
                                    onPress={handlePasswordAuthentication}
                                    disabled={isLoading || !password}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={COLORS.WHITE} size="small" />
                                    ) : (
                                        <>
                                            <Icon name="key" size={20} color={COLORS.WHITE} />
                                            <Text style={styles.authButtonText}>Unlock with Password</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            {biometricsAvailable && (
                                <TouchableOpacity 
                                    style={[
                                        styles.biometricButton,
                                        { opacity: isLoading ? 0.5 : 1 }
                                    ]}
                                    onPress={handleBiometricAuthentication}
                                    disabled={isLoading}
                                >
                                    <Icon 
                                        name={getBiometricIcon()} 
                                        size={20} 
                                        color={COLORS.TERTIARY} 
                                    />
                                    <Text style={styles.biometricButtonText}>
                                        Use Biometrics
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {attemptCount > 0 && (
                            <View style={styles.warningContainer}>
                                <Icon name="warning" size={16} color={COLORS.ACTIVE} />
                                <Text style={styles.warningText}>
                                    {attemptCount} failed attempt{attemptCount > 1 ? 's' : ''}
                                </Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity 
                        style={styles.exitButton}
                        onPress={() => BackHandler.exitApp()}
                    >
                        <Icon name="exit-to-app" size={20} color={COLORS.TERTIARY} />
                        <Text style={styles.exitButtonText}>Exit App</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.SECONDARY,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.TERTIARY + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.TERTIARY,
        marginBottom: 8,
    },
    content: {
        padding: 20,
    },
    inputContainer: {
        marginBottom: 20,
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
        backgroundColor: COLORS.TERTIARY + '20',
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
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        padding: 4,
    },
    buttonContainer: {
        gap: 12,
    },
    authButton: {
        height: 48,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: COLORS.TERTIARY,
        gap: 8,
    },
    authButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.WHITE,
    },
    biometricButton: {
        height: 48,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.TERTIARY,
        backgroundColor: COLORS.TERTIARY + '20',
        gap: 8,
    },
    biometricButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.WHITE,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 4,
    },
    warningText: {
        fontSize: 12,
        color: COLORS.ACTIVE,
    },
    exitButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.SECONDARY,
    },
    exitButtonText: {
        fontSize: 14,
        color: COLORS.TERTIARY,
    },
});

export default AuthenticationModal;