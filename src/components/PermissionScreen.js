import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    Animated,
    Alert,
    Platform
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import AdManager, { ADS_UNIT } from '../AdManager.js'; // Fix import path

const { width, height } = Dimensions.get('window');

const PermissionScreen = ({ onNext, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [permissions, setPermissions] = useState({
        camera: false,
        microphone: false,
        storage: false,
        overlay: false
    });
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    const scrollRef = useRef(null);

    const permissionSteps = [
        {
            id: 'camera',
            title: 'Camera Access',
            description: 'To record video, please allow the app\nto access your device\'s camera',
            icon: require('../../assets/permission/1.png'),
            color: '#FF6B6B',
            action: 'Allow Camera',
        },
        {
            id: 'microphone',
            title: 'Microphone Access', 
            description: 'To record video, please allow the app\nto access your device\'s microphone',
            icon: require('../../assets/permission/2.png'),
            color: '#FFD93D',
            action: 'Allow Microphone',
        },
        {
            id: 'storage',
            title: 'Storage Access',
            description: 'To record video, please allow the app\nto access your device\'s storage',
            icon: require('../../assets/permission/3.png'),
            color: '#6BCF7F',
            action: 'Allow Storage',
        },
        {
            id: 'overlay',
            title: 'Display Over Apps',
            description: 'To display the preview, please allow the\napp to appear on top of other apps',
            icon: require('../../assets/permission/4.png'),
            color: '#4DABF7',
            action: 'Allow Overlay',
        }
    ];

    const requestPermission = async (permissionType) => {
        try {
            setIsRequestingPermission(true);
            console.log(`🔐 Requesting ${permissionType} permission...`);

            // TODO: Replace with real permission APIs
            // For Android: PermissionsAndroid
            // For iOS: react-native-permissions
            
            // Simulate permission request dialog
            const granted = await new Promise((resolve) => {
                Alert.alert(
                    `${permissionSteps[currentStep].title}`,
                    `Allow ${permissionSteps[currentStep].title}?`,
                    [
                        {
                            text: 'Deny',
                            onPress: () => resolve(false),
                            style: 'cancel'
                        },
                        {
                            text: 'Allow',
                            onPress: () => resolve(true)
                        }
                    ]
                );
            });

            if (granted) {
                setPermissions(prev => ({
                    ...prev,
                    [permissionType]: true
                }));
                console.log(`✅ ${permissionType} permission granted`);
                return true;
            } else {
                console.log(`❌ ${permissionType} permission denied`);
                return false;
            }
        } catch (error) {
            console.error(`❌ ${permissionType} permission error:`, error);
            return false;
        } finally {
            setIsRequestingPermission(false);
        }
    };

    const handleNext = async () => {
        const currentPermission = permissionSteps[currentStep];
        const isPermissionGranted = permissions[currentPermission.id];

        console.log(`🔍 Step ${currentStep}: ${currentPermission.id} permission status:`, isPermissionGranted);

        // Check if current permission is granted
        if (!isPermissionGranted) {
            console.log(`⚠️ Permission ${currentPermission.id} not granted, requesting...`);
            
            const granted = await requestPermission(currentPermission.id);
            
            if (!granted) {
                // Permission denied, show message and don't proceed
                Alert.alert(
                    'Permission Required',
                    `${currentPermission.title} is required to continue. Please grant permission to proceed.`,
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        // Permission granted, proceed to next step
        if (currentStep < permissionSteps.length - 1) {
            console.log(`➡️ Moving to step ${currentStep + 1}`);
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            scrollRef.current?.scrollTo({
                x: nextStep * width,
                animated: true
            });
        } else {
            // All permissions completed
            console.log('🎉 All permissions granted, proceeding to main app');
            if (onNext) onNext();
        }
    };

    const renderPermissionStep = (step, index) => {
        const isGranted = permissions[step.id];
        const isCurrent = index === currentStep;

        return (
            <View key={step.id} style={styles.stepContainer}>
                {/* Main Content */}
                <View style={styles.mainContent}>
                    {/* Icon Container */}
                    <View style={styles.iconWrapper}>
                        <Image source={step.icon} style={styles.permissionIcon} />
                        {isGranted && (
                            <View style={styles.checkmarkOverlay}>
                                <Text style={styles.checkmark}>✓</Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    <Text style={styles.stepDescription}>{step.description}</Text>
                    
                    {/* Permission Status */}
                    <View style={styles.statusContainer}>
                        <Text style={[
                            styles.statusText,
                            { color: isGranted ? '#4CAF50' : '#FF6B6B' }
                        ]}>
                            {isGranted ? '✅ Permission Granted' : '⏳ Permission Required'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                style={styles.scrollView}
            >
                {permissionSteps.map((step, index) => renderPermissionStep(step, index))}
            </ScrollView>

            <View style={styles.botContainer}>
                {/* Native Ad */}
                <View style={styles.adContainer}>
                    <NativeAdComponent
                        adUnitId={ADS_UNIT.NATIVE}
                        hasMedia={false}
                    />
                </View>
                
                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    {/* Progress Dots */}
                    <View style={styles.progressDots}>
                        {permissionSteps.map((_, dotIndex) => (
                            <View
                                key={dotIndex}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: dotIndex === currentStep ? '#4169E1' : '#E5E7EB',
                                        width: dotIndex === currentStep ? 32 : 8,
                                    }
                                ]}
                            />
                        ))}
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity 
                        style={[
                            styles.nextButton,
                            { 
                                backgroundColor: permissions[permissionSteps[currentStep].id] ? '#4CAF50' : '#1E3A8A',
                                opacity: isRequestingPermission ? 0.7 : 1
                            }
                        ]} 
                        onPress={handleNext}
                        disabled={isRequestingPermission}
                    >
                        <Text style={styles.nextButtonText}>
                            {isRequestingPermission ? 'Requesting...' : 
                             permissions[permissionSteps[currentStep].id] ? 'Next' : 'Grant Permission'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        justifyContent: 'space-between',
    },
    scrollView: {
        flex: 1,
    },
    stepContainer: {
        width: width,
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    mainContent: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    iconWrapper: {
        marginBottom: 40,
        marginTop: 80,
        position: 'relative',
    },
    permissionIcon: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    checkmarkOverlay: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#4CAF50',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    checkmark: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    stepDescription: {
        fontSize: 16,
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        fontWeight: '500',
        marginBottom: 20,
    },
    statusContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    adContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    botContainer: {
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginLeft: 20,
        minWidth: 120,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default PermissionScreen;