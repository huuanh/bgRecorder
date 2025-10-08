import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../constants';
import { ADS_UNIT } from '../AdManager';
import { NativeAdView, NativeMediaView, NativeAsset, NativeAssetType, NativeAd } from 'react-native-google-mobile-ads';
import { useVipStatus } from '../utils/VipUtils';
import useTranslation from '../hooks/useTranslation';
const { width, height } = Dimensions.get('window');

// Native Ad Component
export const NativeAdComponent = (props) => {
    const { t } = useTranslation();
    const { isVip, loading } = useVipStatus();
    const [nativeAd, setNativeAd] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMediaVisible, setIsMediaVisible] = useState(true);
    const hasToggle = props.hasToggleMedia !== undefined ? props.hasToggleMedia : false;

    useEffect(() => {
        // Don't load ads for VIP users
        if (isVip) {
            console.log('👑 VIP user detected - skipping ad load');
            setIsLoading(false);
            return;
        }

        const loadNativeAd = async () => {
            try {
                console.log('🔍 Loading Native Ad...', props);
                const unitId = props.adUnitId || ADS_UNIT.NATIVE;

                const ad = await NativeAd.createForAdRequest(unitId);
                console.log('✅ Native Ad loaded:', {
                    headline: ad.headline,
                    body: ad.body,
                    icon: ad.icon ? 'Available' : 'None',
                    callToAction: ad.callToAction
                });

                setNativeAd(ad);
                setIsLoading(false);
            } catch (error) {
                console.error('❌ Native Ad failed:', error);
                setIsLoading(false);
            }
        };

        loadNativeAd();
    }, [isVip]);

    // Don't render anything for VIP users
    if (isVip) {
        return null;
    }

    if (isLoading) {
        return (
            <View style={styles.nativeAdContainer}>
                <View style={styles.nativeAdView}>
                    <Text style={styles.loadingText}>Loading ad...</Text>
                </View>
            </View>
        );
    }

    if (!nativeAd) {
        return (
            <View style={styles.nativeAdContainer}>
                <Text style={styles.errorText}>Failed to load ad</Text>
            </View>
        );
    }

    return (
        <View style={styles.nativeAdContainer}>
            {/* Sponsored Label with Toggle Button */}
            <View style={styles.sponsoredLabelContainer}>
                {hasToggle && <TouchableOpacity
                    style={styles.toggleMediaButton}
                    onPress={() => setIsMediaVisible(!isMediaVisible)}
                >
                    <Text style={styles.toggleMediaButtonText}>
                        {isMediaVisible ? '📺' : '👁️'}
                    </Text>
                </TouchableOpacity>}
                <View style={styles.sponsoredLabel}>
                    <Text style={styles.sponsoredText}>Ad</Text>
                </View>
            </View>
            <NativeAdView nativeAd={nativeAd} style={styles.nativeAdView}>
                {/* Media Section - Conditionally Rendered */}
                {isMediaVisible && props.hasMedia && (
                    <TouchableOpacity
                        style={styles.nativeAdMediaContainer}
                        onPress={() => {
                            console.log('Native ad media clicked');
                            // Media click should also trigger ad action
                        }}
                        activeOpacity={0.8}
                    >
                        <NativeMediaView style={styles.nativeAdMedia} />
                    </TouchableOpacity>
                )}

                {/* Header Section */}
                <TouchableOpacity
                    style={styles.nativeAdHeader}
                    onPress={() => {
                        console.log('Native ad header clicked');
                        // Header click should also trigger ad action
                    }}
                    activeOpacity={0.8}
                >
                    {/* Icon */}
                    {nativeAd.icon && (
                        <NativeAsset assetType={NativeAssetType.ICON} style={styles.nativeAdIconContainer}>
                            <Image
                                source={{ uri: nativeAd.icon.url }}
                                style={styles.nativeAdIcon}
                                resizeMode="cover"
                            />
                        </NativeAsset>
                    )}

                    {/* Text Content */}
                    <View style={styles.nativeAdHeaderText}>
                        {/* Headline */}
                        <NativeAsset assetType={NativeAssetType.HEADLINE}>
                            <Text style={styles.nativeAdHeadline} numberOfLines={2}>
                                {nativeAd.headline}
                            </Text>
                        </NativeAsset>

                        {/* Advertiser */}
                        {nativeAd.advertiser && (
                            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                                <Text style={styles.nativeAdAdvertiser}>
                                    {nativeAd.advertiser}
                                </Text>
                            </NativeAsset>
                        )}

                        <View style={styles.nativeAdInfoRow}>
                            {nativeAd.starRating > 0 && (
                                <NativeAsset assetType={NativeAssetType.STAR_RATING}>
                                    <Text style={styles.nativeAdRating}>⭐ {nativeAd.starRating}/5</Text>
                                </NativeAsset>
                            )}

                            {nativeAd.price && nativeAd.price.trim() !== "" && (
                                <NativeAsset assetType={NativeAssetType.PRICE}>
                                    <Text style={styles.nativeAdPrice}>{nativeAd.price}</Text>
                                </NativeAsset>
                            )}
                        </View>

                        {/* Body/Tagline Section */}
                        {nativeAd.body && (
                            <NativeAsset assetType={NativeAssetType.BODY}>
                                <Text style={styles.nativeAdBody} numberOfLines={3}>
                                    {nativeAd.body}
                                </Text>
                            </NativeAsset>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Call to Action Button */}
                {nativeAd.callToAction && (
                    <TouchableOpacity
                        style={styles.nativeAdCTA}
                        onPress={() => {
                            console.log('Native ad CTA clicked');
                            // The native ad will handle the actual click automatically
                        }}
                    >
                        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                            <Text style={styles.nativeAdCTAText}>
                                {nativeAd.callToAction}
                            </Text>
                        </NativeAsset>
                    </TouchableOpacity>
                )}
            </NativeAdView>
        </View>
    );
};


const styles = StyleSheet.create({
    // Native Ad Styles
    nativeAdContainer: {
        width: "100%",
        borderRadius: 5,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.PRIMARY,
        // elevation: 6,
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.25,
        // shadowRadius: 6,
        // marginVertical: 5,
        backgroundColor: COLORS.BACKGROUND,
        color: COLORS.TERTIARY,
        minHeight: 120,
        justifyContent: 'center',
        alignItems: 'center',
        // paddingTop: 10,
        // marginHorizontal: 10,
    },
    nativeAdView: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: 5,
        position: 'relative',
        minHeight: 120,
    },
    sponsoredLabelContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingVertical: 2,
        zIndex: 1,
    },
    sponsoredLabel: {
        backgroundColor: COLORS.TERTIARY,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        opacity: 0.6,
    },
    sponsoredText: {
        fontSize: 9,
        color: COLORS.WHITE,
        fontWeight: '600',
    },
    toggleMediaButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleMediaButtonText: {
        fontSize: 12,
        color: '#ffffff',
        textAlign: 'center',
    },
    nativeAdHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 2,
        position: 'relative',
    },
    nativeAdIconContainer: {
        // marginRight: 10,
    },
    nativeAdIcon: {
        width: 40,
        height: 40,
        // borderRadius: 20,
        margin: 2,
    },
    nativeAdHeaderText: {
        flex: 1,
        paddingRight: 4,
    },
    nativeAdHeadline: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.TERTIARY,
        marginVertical: 2,
        lineHeight: 20,
    },
    nativeAdAdvertiser: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        opacity: 0.9,
        marginBottom: 2,
        fontWeight: '500',
    },
    nativeAdRating: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        fontWeight: '600',
    },
    nativeAdPrice: {
        paddingLeft: 10,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    nativeAdInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nativeAdMediaContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        overflow: 'hidden',
        width: '100%',
    },
    nativeAdMedia: {
        width: '100%',
        height: (height / width <= 16 / 9) ? height * 0.19 : height * 0.24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    nativeAdBody: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        lineHeight: 16,
        textAlign: 'left',
    },
    nativeAdCTA: {
        backgroundColor: COLORS.TERTIARY,
        // paddingVertical: 12,
        // paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        // elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        width: '100%',
        marginTop: 8,
    },
    nativeAdCTAText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        width: "100%",
        paddingVertical: 12,
        textAlign: 'center',
        // backgroundColor: 'red'
    },
    loadingText: {
        color: COLORS.TERTIARY,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    errorText: {
        color: COLORS.TERTIARY,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
        opacity: 0.7,
    },
});
