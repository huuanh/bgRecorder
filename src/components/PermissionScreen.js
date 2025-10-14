import React, { useState, useRef, useEffect } from 'react';
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
    Platform,
    PermissionsAndroid,
    Linking,
    AppState
} from 'react-native';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import AdManager, { ADS_UNIT } from '../AdManager.js';
import OverlayPermissionModule from '../OverlayPermissionModule';
import useTranslation from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const PermissionScreen = ({ onNext, onSkip }) => {
    const { t } = useTranslation();
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
            androidPermission: PermissionsAndroid.PERMISSIONS.CAMERA,
        },
        {
            id: 'microphone',
            title: 'Microphone Access', 
            description: 'To record video, please allow the app\nto access your device\'s microphone',
            icon: require('../../assets/permission/2.png'),
            color: '#FFD93D',
            action: 'Allow Microphone',
            androidPermission: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        },
        {
            id: 'storage',
            title: 'Storage Access',
            description: 'To record video, please allow the app\nto access your device\'s storage',
            icon: require('../../assets/permission/3.png'),
            color: '#6BCF7F',
            action: 'Allow Storage',
            androidPermission: Platform.Version >= 33 ? 
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO : 
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        },
        {
            id: 'overlay',
            title: 'Display Over Apps',
            description: 'To display the preview, please allow the\napp to appear on top of other apps',
            icon: require('../../assets/permission/4.png'),
            color: '#4DABF7',
            action: 'Allow Overlay',
            androidPermission: 'SYSTEM_ALERT_WINDOW', // Special case - handled differently
        }
    ];

    // Check all permissions on component mount
    useEffect(() => {
        checkAllPermissions();
    }, []);

    const checkAllPermissions = async () => {
        console.log('🔍 Checking all permissions...');
        const newPermissions = { ...permissions };

        for (const step of permissionSteps) {
            const granted = await checkPermissionStatus(step);
            newPermissions[step.id] = granted;
            console.log(`� ${step.id}: ${granted ? 'GRANTED' : 'NOT GRANTED'}`);
        }

        setPermissions(newPermissions);
    };

    const checkPermissionStatus = async (step) => {
        try {
            if (Platform.OS === 'android') {
                if (step.id === 'overlay') {
                    // Check SYSTEM_ALERT_WINDOW permission using native module
                    try {
                        const hasPermission = await OverlayPermissionModule.canDrawOverlays();
                        console.log(`🔍 Overlay permission status: ${hasPermission}`);
                        return hasPermission;
                    } catch (error) {
                        console.log('⚠️ Cannot check overlay permission:', error);
                        return false;
                    }
                }
                
                const result = await PermissionsAndroid.check(step.androidPermission);
                return result;
            } else {
                // iOS - overlay permission not needed
                return step.id === 'overlay' ? true : false;
            }
        } catch (error) {
            console.error(`❌ Error checking ${step.id} permission:`, error);
            return false;
        }
    };

    const requestPermission = async (permissionType) => {
        try {
            setIsRequestingPermission(true);
            console.log(`🔐 Requesting ${permissionType} permission...`);

            const step = permissionSteps.find(s => s.id === permissionType);
            if (!step) {
                console.error(`❌ Permission step not found: ${permissionType}`);
                return false;
            }

            if (Platform.OS === 'android') {
                return await requestAndroidPermission(step);
            } else {
                return await requestIOSPermission(step);
            }
        } catch (error) {
            console.error(`❌ ${permissionType} permission error:`, error);
            return false;
        } finally {
            setIsRequestingPermission(false);
        }
    };

    const requestAndroidPermission = async (step) => {
        try {
            if (step.id === 'overlay') {
                // Special handling for SYSTEM_ALERT_WINDOW using native module
                console.log('🔐 Requesting overlay permission...');
                
                try {
                    const result = await OverlayPermissionModule.requestOverlayPermission();
                    console.log('📱 Native overlay permission result:', result);
                    
                    if (result) {
                        setPermissions(prev => ({
                            ...prev,
                            [step.id]: true
                        }));
                        console.log('✅ Overlay permission granted');
                        return true;
                    } else {
                        console.log('❌ Overlay permission denied');
                        Alert.alert(
                            t('permission_required', 'Permission Required'),
                            'Display over other apps permission is required for video recording overlay. Please enable it in Settings.',
                            [{ text: t('ok', 'OK') }]
                        );
                        return false;
                    }
                } catch (error) {
                    console.error('❌ Native overlay permission request failed:', error);
                    Alert.alert(
                        t('error', 'Error'),
                        'Failed to request overlay permission. Please enable it manually in Settings.',
                        [{ text: t('ok', 'OK') }]
                    );
                    return false;
                }
            }

            const result = await PermissionsAndroid.request(
                step.androidPermission,
                {
                    title: step.title,
                    message: step.description.replace('\n', ' '),
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: t('cancel', 'Cancel'),
                    buttonPositive: t('ok', 'OK'),
                }
            );

            const granted = result === PermissionsAndroid.RESULTS.GRANTED;
            
            if (granted) {
                setPermissions(prev => ({
                    ...prev,
                    [step.id]: true
                }));
                console.log(`✅ ${step.id} permission granted`);
            } else {
                console.log(`❌ ${step.id} permission denied: ${result}`);
                
                // Show settings dialog if permission permanently denied
                if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                    Alert.alert(
                        'Permission Denied',
                        `${step.title} was permanently denied. Please enable it in Settings.`,
                        [
                            { text: t('cancel', 'Cancel'), style: 'cancel' },
                            { 
                                text: 'Open Settings', 
                                onPress: async () => {
                                    try {
                                        await Linking.openSettings();
                                    } catch (error) {
                                        console.error('Failed to open settings:', error);
                                    }
                                }
                            }
                        ]
                    );
                }
            }

            return granted;
        } catch (error) {
            console.error(`❌ Android permission request failed:`, error);
            return false;
        }
    };

    const requestIOSPermission = async (step) => {
        try {
            if (step.id === 'overlay') {
                // Skip overlay permission on iOS
                setPermissions(prev => ({
                    ...prev,
                    [step.id]: true
                }));
                return true;
            }

            // For iOS, we'd need react-native-permissions or native modules
            // For now, simulate permission request
            const granted = await new Promise((resolve) => {
                Alert.alert(
                    step.title,
                    `Allow ${step.title}?`,
                    [
                        {
                            text: 'Don\'t Allow',
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
                    [step.id]: true
                }));
                console.log(`✅ ${step.id} permission granted (iOS simulated)`);
            } else {
                console.log(`❌ ${step.id} permission denied (iOS simulated)`);
            }

            return granted;
        } catch (error) {
            console.error(`❌ iOS permission request failed:`, error);
            return false;
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
                    t('permission_required', 'Permission Required'),
                    `${currentPermission.title} is required to continue. Please grant permission to proceed.`,
                    [{ text: t('ok', 'OK') }]
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
                        adUnitId={ADS_UNIT.NATIVE_ONBOARDING}
                        hasMedia={true}
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
                             permissions[permissionSteps[currentStep].id] ? t('next', 'Next') : 'Grant Permission'}
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
        paddingHorizontal: 10,
        paddingBottom: 10,
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