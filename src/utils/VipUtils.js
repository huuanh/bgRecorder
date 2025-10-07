import VIPManager from './VIPManager';

// Helper functions to check VIP status throughout the app
export const checkVipStatus = () => {
  const vipManager = VIPManager.getInstance();
  return vipManager.getIsVip();
};

export const checkVipStatusWithRefresh = async () => {
  const vipManager = VIPManager.getInstance();
  return await vipManager.getVipStatusWithRefresh();
};

export const addVipStatusListener = (callback) => {
  const vipManager = VIPManager.getInstance();
  vipManager.addVipStatusCallback(callback);
};

export const removeVipStatusListener = (callback) => {
  const vipManager = VIPManager.getInstance();
  vipManager.removeVipStatusCallback(callback);
};

export const getVipInfo = () => {
  const vipManager = VIPManager.getInstance();
  return vipManager.getVipInfo();
};

// React hook to use VIP status in components
import { useState, useEffect } from 'react';

export const useVipStatus = () => {
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const vipManager = VIPManager.getInstance();
    
    // Get initial VIP status
    const initialStatus = vipManager.getIsVip();
    setIsVip(initialStatus);
    setLoading(false);

    // Listen for VIP status changes
    const handleVipStatusChange = (newStatus) => {
      setIsVip(newStatus);
    };

    vipManager.addVipStatusCallback(handleVipStatusChange);

    // Cleanup listener on unmount
    return () => {
      vipManager.removeVipStatusCallback(handleVipStatusChange);
    };
  }, []);

  const refreshVipStatus = async () => {
    setLoading(true);
    const vipManager = VIPManager.getInstance();
    const newStatus = await vipManager.refreshVipStatus();
    setIsVip(newStatus);
    setLoading(false);
    return newStatus;
  };

  return {
    isVip,
    loading,
    refreshVipStatus
  };
};

export default {
  checkVipStatus,
  checkVipStatusWithRefresh,
  addVipStatusListener,
  removeVipStatusListener,
  getVipInfo,
  useVipStatus
};