import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    ActivityIndicator,
    Dimensions,
    DeviceEventEmitter,
    TouchableOpacity,
} from 'react-native';
import NetworkManager from '../utils/NetworkManager';

const { width, height } = Dimensions.get('window');

const NetworkLoadingModal = ({ visible, onConnectionRestored }) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            startAnimations();
            
            // Listen for network state changes
            const networkListener = DeviceEventEmitter.addListener('networkStateChanged', (event) => {
                if (event.isConnected && !event.wasConnected) {
                    console.log('🎉 Network connection restored!');
                    handleConnectionRestored();
                }
            });

            return () => {
                networkListener.remove();
                stopAnimations();
            };
        }
    }, [visible]);

    const startAnimations = () => {
        // Pulse animation for the main container
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        // Rotation animation for the loading indicator
        const rotateAnimation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        );

        pulseAnimation.start();
        rotateAnimation.start();
    };

    const stopAnimations = () => {
        pulseAnim.stopAnimation();
        rotateAnim.stopAnimation();
    };

    const handleConnectionRestored = () => {
        if (onConnectionRestored) {
            onConnectionRestored();
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);

        try {
            const isConnected = await NetworkManager.retryConnection();
            if (isConnected) {
                handleConnectionRestored();
            }
        } catch (error) {
            console.log('❌ Retry failed:', error);
        } finally {
            setIsRetrying(false);
        }
    };

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            hardwareAccelerated={true}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.container,
                        {
                            transform: [{ scale: pulseAnim }]
                        }
                    ]}
                >
                    {/* Network Icon */}
                    <Animated.View 
                        style={[
                            styles.iconContainer,
                            {
                                transform: [{ rotate: rotateInterpolate }]
                            }
                        ]}
                    >
                        <View style={styles.networkIcon}>
                            <View style={[styles.wifiBar, styles.wifiBar1]} />
                            <View style={[styles.wifiBar, styles.wifiBar2]} />
                            <View style={[styles.wifiBar, styles.wifiBar3]} />
                            <View style={[styles.wifiBar, styles.wifiBar4]} />
                        </View>
                    </Animated.View>

                    {/* Title */}
                    <Text style={styles.title}>No Internet Connection</Text>
                    
                    {/* Subtitle */}
                    <Text style={styles.subtitle}>
                        Please check your internet connection and try again
                    </Text>

                    {/* Loading Indicator */}
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator 
                            size="large" 
                            color="#FFD700" 
                            style={styles.spinner}
                        />
                        <Text style={styles.loadingText}>
                            {isRetrying ? `Retrying... (${retryCount})` : 'Waiting for connection...'}
                        </Text>
                    </View>

                    {/* Retry Button */}
                    <TouchableOpacity
                        style={[
                            styles.retryButton,
                            isRetrying && styles.retryButtonDisabled
                        ]}
                        onPress={handleRetry}
                        disabled={isRetrying}
                    >
                        <Text style={styles.retryButtonText}>
                            {isRetrying ? 'Retrying...' : 'Retry Connection'}
                        </Text>
                    </TouchableOpacity>

                    {/* Connection Tips */}
                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>Connection Tips:</Text>
                        <Text style={styles.tipText}>• Check your WiFi or mobile data</Text>
                        <Text style={styles.tipText}>• Move to a better signal area</Text>
                        <Text style={styles.tipText}>• Restart your WiFi router</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 20,
        padding: 30,
        width: width * 0.85,
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    iconContainer: {
        marginBottom: 20,
    },
    networkIcon: {
        width: 60,
        height: 60,
        justifyContent: 'flex-end',
        alignItems: 'center',
        position: 'relative',
    },
    wifiBar: {
        position: 'absolute',
        backgroundColor: '#FF6B6B',
        borderRadius: 2,
    },
    wifiBar1: {
        width: 8,
        height: 8,
        bottom: 0,
    },
    wifiBar2: {
        width: 16,
        height: 16,
        bottom: 0,
        opacity: 0.7,
    },
    wifiBar3: {
        width: 24,
        height: 24,
        bottom: 0,
        opacity: 0.5,
    },
    wifiBar4: {
        width: 32,
        height: 32,
        bottom: 0,
        opacity: 0.3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#CCCCCC',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    loadingContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    spinner: {
        marginBottom: 15,
    },
    loadingText: {
        fontSize: 14,
        color: '#FFD700',
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginBottom: 20,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retryButtonDisabled: {
        backgroundColor: '#666',
        shadowOpacity: 0,
        elevation: 0,
    },
    retryButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    tipsContainer: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: 10,
        padding: 15,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 8,
    },
    tipText: {
        fontSize: 12,
        color: '#CCCCCC',
        marginBottom: 4,
        paddingLeft: 5,
    },
});

export default NetworkLoadingModal;
