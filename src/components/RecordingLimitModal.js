import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Image,
    Dimensions,
} from 'react-native';
import { FONTS, COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const RecordingLimitModal = ({ visible, onClose, onBuyPremium, totalRecordingTime }) => {
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.subtitle}>
                            {t('free_limit_3min', 'You are using the Free version, which allows screen recording for up to 3 minutes. Please upgrade to the Premium version to record the screen without any time limits!')}
                        </Text>

                        {/* Features List */}
                        <View style={styles.featuresList}>
                            <View style={styles.featureItem}>
                                <View style={styles.featureLeft}>
                                    <Image
                                        source={require('../../assets/home/ic/ic_unlimittime.png')}
                                        style={styles.featureIcon}
                                    />
                                    <Text style={styles.featureText}>
                                        {t('unlimited_recording', 'Unlimited Recording')}
                                    </Text>
                                </View>
                                <View style={styles.checkmarkContainer}>
                                    <Text style={styles.checkmark}>✓</Text>
                                </View>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={styles.featureLeft}>
                                    <Image
                                        source={require('../../assets/home/ic/ic_noads.png')}
                                        style={styles.featureIcon}
                                    />
                                    <Text style={styles.featureText}>
                                        {t('no_ads', 'Ad-Free Experience')}
                                    </Text>
                                </View>
                                <View style={styles.checkmarkContainer}>
                                    <Text style={styles.checkmark}>✓</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Native Ad */}
                    <View style={styles.adContainer}>
                        <NativeAdComponent
                            adUnitId={ADS_UNIT.NATIVE_RECORDING_LIMIT}
                            hasMedia={false}
                        />
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.premiumButton}
                            onPress={onBuyPremium}
                        >
                            <Image
                                source={require('../../assets/home/ic/ic_diamond.png')}
                                style={styles.buttonIcon}
                            />
                            <Text style={styles.premiumButtonText}>
                                {t('upgrade_premium', 'Upgrade to Premium')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.continueButton}
                            onPress={onClose}
                        >
                            <Text style={styles.continueButtonText}>
                                {t('continue_limited', 'Continue with Limit')}
                            </Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: COLORS.PRIMARY, // Beige background
        borderRadius: 12,
        width: width * 0.9,
        maxWidth: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    content: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.TERTIARY,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: FONTS.PRIMARY,
    },
    featuresList: {
        marginBottom: 10,
    },
    featureItem: {
        backgroundColor: COLORS.WHITE,
        // marginHorizontal: 20,
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    featureIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    featureLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    featureText: {
        fontSize: 14,
        color: COLORS.TERTIARY,
        fontFamily: FONTS.PRIMARY,
    },
    checkmarkContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.ACCENT, // Orange/gold color
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: COLORS.WHITE,
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: FONTS.PRIMARY,
    },
    adContainer: {
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    buttonContainer: {
        padding: 20,
        gap: 12,
    },
    premiumButton: {
        backgroundColor: COLORS.TERTIARY,
        borderRadius: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    premiumButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: FONTS.PRIMARY,
    },
    continueButton: {
        backgroundColor: 'transparent',
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: COLORS.TERTIARY,
    },
    continueButtonText: {
        color: COLORS.TERTIARY,
        fontSize: 14,
        textAlign: 'center',
        fontFamily: FONTS.PRIMARY,
    },
});

export default RecordingLimitModal;