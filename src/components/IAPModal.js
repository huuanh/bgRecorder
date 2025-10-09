import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Image,
    ScrollView,
    Animated,
} from 'react-native';
import { COLORS } from '../constants';
import IAPManager from '../utils/IAPManager';
import useTranslation from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const IAPModal = ({ visible, onClose }) => {
    const { t } = useTranslation(); 
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    
    // Animation for start trial button
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            loadSubscriptionData();
            setupPurchaseListeners();
            startButtonAnimation();
        } else {
            stopButtonAnimation();
        }
        
        return () => {
            // Cleanup listeners when modal closes
            if (!visible) {
                cleanupPurchaseListeners();
                stopButtonAnimation();
            }
        };
    }, [visible]);

    // Button animation functions
    const startButtonAnimation = () => {
        const animateScale = () => {
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.02,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                if (visible) {
                    animateScale();
                }
            });
        };
        animateScale();
    };

    const stopButtonAnimation = () => {
        scaleAnim.stopAnimation();
        scaleAnim.setValue(1);
    };

    const loadSubscriptionData = async () => {
        try {
            setLoading(true);
            const iapManager = IAPManager.getInstance();
            
            // Đảm bảo IAP đã được khởi tạo
            if (!iapManager.isReady()) {
                console.log('🔧 IAP not ready, initializing...');
                await iapManager.initialize();
            }
            
            // Thêm delay nhỏ để đảm bảo initialization hoàn tất
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const subscriptions = iapManager.getSubscriptions();
            console.log('📋 Raw subscriptions:', subscriptions);
            console.log('📋 Subscriptions length:', subscriptions?.length);
            console.log('📋 First subscription:', subscriptions?.[0]);
            
            // If no subscriptions loaded, try to refresh
            if (!subscriptions || subscriptions.length === 0) {
                console.log('🔄 No subscriptions found, trying to refresh...');
                // Force reload subscriptions
                await iapManager.initialize();
                const refreshedSubscriptions = iapManager.getSubscriptions();
                console.log('🔄 Refreshed subscriptions:', refreshedSubscriptions);
            }
            
            const finalSubscriptions = iapManager.getSubscriptions();
            if (finalSubscriptions && finalSubscriptions.length > 0) {
                const processedPlans = processSubscriptionData(finalSubscriptions[0]);
                setSubscriptionPlans(processedPlans);
                
                // Set default selected plan (ưu tiên gói năm có free trial)
                const defaultPlan = processedPlans.find(plan => plan.basePlanId === 'year' && plan.hasFreeTrail) 
                    || processedPlans.find(plan => plan.hasFreeTrail)
                    || processedPlans[0];
                
                if (defaultPlan) {
                    setSelectedPlan(defaultPlan.id);
                }
            } else {
                console.log('⚠️ No subscriptions available, using fallback plans');
                // Use fallback static plans if no subscriptions from store
                const fallbackPlans = getFallbackPlans();
                setSubscriptionPlans(fallbackPlans);
                if (fallbackPlans.length > 0) {
                    setSelectedPlan(fallbackPlans[0].id);
                }
            }
        } catch (error) {
            console.error('❌ Error loading subscription data:', error);
            // Use fallback plans on error
            const fallbackPlans = getFallbackPlans();
            setSubscriptionPlans(fallbackPlans);
            if (fallbackPlans.length > 0) {
                setSelectedPlan(fallbackPlans[0].id);
            }
        } finally {
            setLoading(false);
        }
    };

    const getFallbackPlans = () => {
        return [
            {
                id: 'year_freetrial',
                basePlanId: 'year',
                title: t('year', '1 Year'),
                price: '1.850.000 ₫',
                originalPrice: null,
                discount: null,
                isBestOption: true,
                hasFreeTrail: true,
                freeTrialText: t('free_for_3_days', 'Free for 3 days'),
                description: t('best_value', 'Best Value'),
                offerToken: 'fallback_offer_token',
                billingPeriod: 'P1Y',
                priceAmountMicros: '1850000000000',
                priceCurrencyCode: 'VND'
            },
            {
                id: '3months_freetrial',
                basePlanId: '3months',
                title: t('months', '3 Months'),
                price: '474.000 ₫',
                originalPrice: null,
                discount: null,
                isBestOption: false,
                hasFreeTrail: true,
                freeTrialText: t('free_for_3_days', 'Free for 3 days'),
                description: t('popular_choice', 'Popular Choice'),
                offerToken: 'fallback_offer_token',
                billingPeriod: 'P3M',
                priceAmountMicros: '474000000000',
                priceCurrencyCode: 'VND'
            },
            {
                id: '1month_freetrial',
                basePlanId: '1month',
                title: t('month', '1 Month'),
                price: '158.000 ₫',
                originalPrice: null,
                discount: null,
                isBestOption: false,
                hasFreeTrail: true,
                freeTrialText: t('free_for_3_days', 'Free for 3 days'),
                description: t('try_it_out', 'Try it out'),
                offerToken: 'fallback_offer_token',
                billingPeriod: 'P1M',
                priceAmountMicros: '158000000000',
                priceCurrencyCode: 'VND'
            }
        ];
    };

    const processSubscriptionData = (subscription) => {
        if (!subscription?.subscriptionOfferDetailsAndroid) {
            return [];
        }

        const offers = subscription.subscriptionOfferDetailsAndroid;
        const processedPlans = [];

        // Group by basePlanId
        const planGroups = {};
        offers.forEach(offer => {
            const basePlanId = offer.basePlanId;
            if (!planGroups[basePlanId]) {
                planGroups[basePlanId] = [];
            }
            planGroups[basePlanId].push(offer);
        });

        // Process each plan group
        Object.keys(planGroups).forEach(basePlanId => {
            const planOffers = planGroups[basePlanId];
            
            // Tìm offer có free trial (offerId: 'freetrial')
            const freeTrialOffer = planOffers.find(offer => offer.offerId === 'freetrial');
            const regularOffer = planOffers.find(offer => !offer.offerId);

            // Sử dụng free trial offer nếu có, nếu không thì dùng regular offer
            const primaryOffer = freeTrialOffer || regularOffer || planOffers[0];
            
            if (primaryOffer) {
                const mainPhase = primaryOffer.pricingPhases.pricingPhaseList.find(phase => 
                    phase.recurrenceMode === 1 // Recurring phase
                ) || primaryOffer.pricingPhases.pricingPhaseList[primaryOffer.pricingPhases.pricingPhaseList.length - 1];

                const freeTrialPhase = primaryOffer.pricingPhases.pricingPhaseList.find(phase => 
                    phase.recurrenceMode === 2 && phase.priceAmountMicros === "0"
                );

                let title, isBestOption = false;
                switch (basePlanId) {
                    case '1month':
                        title = '1 ' + t('month', '1 Month');
                        break;
                    case '3months':
                        title = '3 ' + t('months', '3 Months');
                        break;
                    case 'year':
                        title = '1 ' + t('year', '1 Year');
                        isBestOption = true;
                        break;
                    default:
                        title = basePlanId;
                }

                processedPlans.push({
                    id: `${basePlanId}_${primaryOffer.offerId || 'regular'}`,
                    basePlanId: basePlanId,
                    title: title,
                    price: mainPhase.formattedPrice,
                    originalPrice: null, // Có thể tính toán từ regular offer nếu cần
                    discount: null,
                    isBestOption: isBestOption,
                    hasFreeTrail: !!freeTrialPhase,
                    freeTrialText: freeTrialPhase ? `${freeTrialPhase.formattedPrice} for ${getPeriodText(freeTrialPhase.billingPeriod)}` : null,
                    description: isBestOption ? t('best_value', 'Best Value') : t('popular_choice', 'Popular Choice'),
                    offerToken: primaryOffer.offerToken,
                    billingPeriod: mainPhase.billingPeriod,
                    priceAmountMicros: mainPhase.priceAmountMicros,
                    priceCurrencyCode: mainPhase.priceCurrencyCode
                });
            }
        });

        // Sort plans: year, 3months, 1month
        const sortOrder = { 'year': 0, '3months': 1, '1month': 2 };
        processedPlans.sort((a, b) => {
            return (sortOrder[a.basePlanId] ?? 999) - (sortOrder[b.basePlanId] ?? 999);
        });

        return processedPlans;
    };

    const getPeriodText = (billingPeriod) => {
        switch (billingPeriod) {
            case 'P3D': return '3 days';
            case 'P1W': return '1 week';
            case 'P1M': return '1 month';
            case 'P3M': return '3 months';
            case 'P1Y': return '1 year';
            default: return billingPeriod;
        }
    };

    const getFreeTrialInfoText = () => {
        const selectedPlanData = subscriptionPlans.find(plan => plan.id === selectedPlan);
        if (selectedPlanData && selectedPlanData.hasFreeTrail) {
            return `Free for 3 days, then ${selectedPlanData.price} per ${getPeriodText(selectedPlanData.billingPeriod).toLowerCase()}`;
        }
        return selectedPlanData ? `${selectedPlanData.price} per ${getPeriodText(selectedPlanData.billingPeriod).toLowerCase()}` : 'Select subscription plan';
    };

    const handlePurchaseSuccess = (purchase) => {
        console.log('✅ Purchase successful in IAP Modal:', purchase);
        setPurchasing(false);
        onClose();
    };

    const handlePurchaseError = (error) => {
        console.log('❌ Purchase error in IAP Modal:', error);
        setPurchasing(false);
        
        // Don't close modal for user cancellation, let them try again
        if (error.code !== 'USER_CANCELED' && error.responseCode !== 1) {
            // Show detailed error message
            let errorMessage = 'Purchase failed. ';
            
            if (error.code === 'unknown' && error.message?.includes('not available')) {
                errorMessage += 'Product not available. Please check:\n' +
                    '• App is signed with release key\n' +
                    '• Product exists in Google Play Console\n' +
                    '• Subscription is active in Play Console';
            } else if (error.responseCode === 4) {
                errorMessage += 'Product not available for purchase.';
            } else {
                errorMessage += `Error: ${error.message || error.code || 'Unknown error'}`;
            }
            
            console.error('💥 Purchase error details:', errorMessage);
            // You can show an alert or toast here
            // Alert.alert('Purchase Error', errorMessage);
        }
    };

    const setupPurchaseListeners = () => {
        const iapManager = IAPManager.getInstance();
        iapManager.addPurchaseSuccessCallback(handlePurchaseSuccess);
        iapManager.addPurchaseErrorCallback(handlePurchaseError);
        console.log('🔧 Setting up purchase listeners for IAP Modal');
    };

    const cleanupPurchaseListeners = () => {
        const iapManager = IAPManager.getInstance();
        iapManager.removePurchaseSuccessCallback(handlePurchaseSuccess);
        iapManager.removePurchaseErrorCallback(handlePurchaseError);
        setPurchasing(false);
        console.log('🧹 Cleaning up purchase listeners for IAP Modal');
    };

    const handlePlanSelect = (planId) => {
        setSelectedPlan(planId);
    };

    const handleStartFreeTrial = async () => {
        const selectedPlanData = subscriptionPlans.find(plan => plan.id === selectedPlan);
        if (selectedPlanData && !purchasing) {
            console.log('🛒 Starting purchase for plan:', selectedPlan, selectedPlanData);
            
            try {
                setPurchasing(true);
                const iapManager = IAPManager.getInstance();
                
                // Set a timeout to reset purchasing state if no callback is received
                const purchaseTimeout = setTimeout(() => {
                    console.log('⏰ Purchase timeout - resetting purchasing state');
                    setPurchasing(false);
                }, 30000); // 30 seconds timeout
                
                // Get the actual subscription product ID from subscriptions data
                const subscriptions = iapManager.getSubscriptions();
                const productId = subscriptions && subscriptions.length > 0 ? subscriptions[0].id : 'boom.bvr.recorder.pro.sub';
                
                console.log('🛒 Using product ID:', productId, 'with offer token:', selectedPlanData.offerToken);
                
                // Check if this is a fallback plan
                if (selectedPlanData.offerToken === 'fallback_offer_token') {
                    console.log('⚠️ Using fallback plan - this is for testing only');
                    // For fallback, just use regular purchase without offer token
                    await iapManager.requestPurchase(productId, selectedPlanData.basePlanId);
                } else {
                    // Request purchase với offerToken
                    await iapManager.requestPurchaseWithOffer(
                        productId,
                        selectedPlanData.offerToken,
                        selectedPlanData.basePlanId
                    );
                }
                
                // Clear timeout on successful request
                clearTimeout(purchaseTimeout);
                
                // Modal sẽ được đóng khi purchase thành công trong listener
                // hoặc purchasing sẽ được reset nếu có lỗi
            } catch (error) {
                console.error('❌ Purchase failed:', error);
                setPurchasing(false);
            }
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Text key={star} style={styles.star}>⭐</Text>
                ))}
            </View>
        );
    };

    const renderPlanItem = (plan) => {
        const isSelected = selectedPlan === plan.id;
        
        return (
            <TouchableOpacity
                key={plan.id}
                style={[
                    styles.planItem,
                    isSelected && styles.selectedPlan,
                    plan.isBestOption && styles.bestOptionPlan
                ]}
                onPress={() => handlePlanSelect(plan.id)}
            >
                {plan.isBestOption && (
                    <View style={styles.bestOptionBadge}>
                        <Text style={styles.bestOptionText}>{t('bestOption', 'Best Option')}</Text>
                    </View>
                )}
                
                <View style={styles.planContent}>
                    <View style={styles.planLeft}>
                        <Text style={styles.planTitle}>{plan.title}</Text>
                        {plan.discount && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{plan.discount}</Text>
                            </View>
                        )}
                        {plan.originalPrice && (
                            <Text style={styles.originalPrice}>{t('regularPrice', 'Regular price')} {plan.originalPrice}</Text>
                        )}
                        {plan.hasFreeTrail && plan.freeTrialText && (
                            <Text style={styles.freeTrialDescription}>{plan.freeTrialText}</Text>
                        )}
                    </View>
                    
                    <View style={styles.planRight}>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                        {plan.hasFreeTrail && (
                            <View style={styles.freeTrialBadge}>
                                <Text style={styles.freeTrialText}>{t('freeTrial', 'FREE TRIAL')}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                            <Text style={styles.mainTitle}>{t('becomePremiumMember', 'Become a Premium member!')}</Text>
                            <Text style={styles.subtitle}>{t('enjoyAdFreeExperience', 'Enjoy an ad-free experience.')}</Text>
                            <Text style={styles.subtitle}>{t('unlockPremiumFeatures', 'Unlock the Premium version with unlimited features.')}</Text>
                            {renderStars()}
                        </View>

                        {/* Plans Section */}
                        <View style={styles.plansSection}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.loadingText}>{t('loadingSubscriptionPlans', 'Loading subscription plans...')}</Text>
                                </View>
                            ) : (
                                subscriptionPlans.map(plan => renderPlanItem(plan))
                            )}
                        </View>

                        {/* Free Trial Info */}
                        {!loading && subscriptionPlans.length > 0 && (
                            <Text style={styles.freeTrialInfo}>
                                {getFreeTrialInfoText()}
                            </Text>
                        )}

                        {/* Start Free Trial Button */}
                        {!loading && subscriptionPlans.length > 0 && (
                            <Animated.View
                                style={[
                                    { transform: [{ scale: scaleAnim }] }
                                ]}
                            >
                                <TouchableOpacity 
                                    style={[
                                        styles.startTrialButton,
                                        (purchasing || !selectedPlan) && styles.disabledButton
                                    ]}
                                    onPress={handleStartFreeTrial}
                                    disabled={!selectedPlan || purchasing}
                                >
                                    <Text style={styles.startTrialText}>
                                        {purchasing ? t('processing', 'PROCESSING...') : 
                                            subscriptionPlans.find(plan => plan.id === selectedPlan)?.hasFreeTrail 
                                                ? t('startFreeTrial', 'START FREE TRIAL ››') 
                                                : t('buyNow', 'BUY NOW ››')
                                        }
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* Footer Text */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {t('cancellationInfo', 'You can cancel your subscription on Google Play Store anytime.')}{'\n'}
                                {t('billingInfo', 'After the free trial period, the subscription will be billed periodically at the price shown above.')}{'\n'}
                                {t('termsAndConditions', 'Terms & Conditions')}
                            </Text>
                        </View>
                    </ScrollView>
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
        width: width,
        height: "100%",
        backgroundColor: COLORS.BACKGROUND,
        // borderRadius: 20,
        overflow: 'hidden',
        paddingVertical: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 0,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#6B7280',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.ACTIVE,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.TERTIARY,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
    },
    starsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    star: {
        fontSize: 24,
    },
    plansSection: {
        marginBottom: 20,
    },
    planItem: {
        backgroundColor: COLORS.ITEM,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
    },
    selectedPlan: {
        borderColor: '#FF6B35',
        backgroundColor: COLORS.ITEM,
    },
    bestOptionPlan: {
        // borderColor: '#FF6B35',
        backgroundColor: COLORS.ITEM,
    },
    bestOptionBadge: {
        position: 'absolute',
        top: 0,
        right: 20,
        backgroundColor: '#FF6B35',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        zIndex: 1,
    },
    bestOptionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    planContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 20,
    },
    planLeft: {
        flex: 1,
    },
    planTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    discountBadge: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    discountText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    originalPrice: {
        fontSize: 12,
        color: COLORS.TERTIARY,
        textDecorationLine: 'line-through',
    },
    planRight: {
        alignItems: 'flex-end',
    },
    planPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    freeTrialBadge: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    freeTrialText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    freeTrialInfo: {
        textAlign: 'center',
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    startTrialButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    disabledButton: {
        backgroundColor: '#9CA3AF',
        opacity: 0.6,
    },
    startTrialText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 1,
    },
    footer: {
        paddingHorizontal: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    freeTrialDescription: {
        fontSize: 12,
        color: '#10B981',
        marginTop: 4,
        fontWeight: '500',
    },
});

export default IAPModal;