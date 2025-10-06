import { useState } from 'react';
import IAPManager from '../utils/IAPManager';

const useIAP = () => {
    const [showIAPModal, setShowIAPModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Show IAP modal with source tracking
    const showIAP = (source = 'unknown') => {
        IAPManager.showIAP(source);
        setShowIAPModal(true);
    };

    // Hide IAP modal
    const hideIAP = () => {
        setShowIAPModal(false);
    };

    // Handle purchase
    const handlePurchase = async (planId, planDetails) => {
        setIsLoading(true);
        try {
            const success = await IAPManager.handlePurchase(planId, planDetails);
            if (success) {
                hideIAP();
            }
            return success;
        } catch (error) {
            console.error('❌ Purchase error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Restore purchases
    const restorePurchases = async () => {
        setIsLoading(true);
        try {
            const success = await IAPManager.restorePurchases();
            return success;
        } catch (error) {
            console.error('❌ Restore error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Check premium status
    const checkPremiumStatus = async () => {
        try {
            const isPremium = await IAPManager.isPremiumUser();
            return isPremium;
        } catch (error) {
            console.error('❌ Premium check error:', error);
            return false;
        }
    };

    return {
        showIAPModal,
        isLoading,
        showIAP,
        hideIAP,
        handlePurchase,
        restorePurchases,
        checkPremiumStatus,
    };
};

export default useIAP;