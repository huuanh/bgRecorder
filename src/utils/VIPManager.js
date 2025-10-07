import AsyncStorage from '@react-native-async-storage/async-storage';
import IAPManager from './IAPManager';

const VIP_STATUS_KEY = '@bgrecorder_vip_status';
const VIP_EXPIRY_KEY = '@bgrecorder_vip_expiry';
const VIP_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class VIPManager {
  constructor() {
    if (VIPManager.instance) {
      return VIPManager.instance;
    }
    
    this.isVip = false;
    this.vipExpiry = null;
    this.lastCheckTime = null;
    this.vipStatusCallbacks = [];
    
    VIPManager.instance = this;
  }

  static getInstance() {
    if (!VIPManager.instance) {
      VIPManager.instance = new VIPManager();
    }
    return VIPManager.instance;
  }

  // Initialize VIP status
  async initialize() {
    try {
      console.log('🔧 Initializing VIP Manager...');
      
      // Load cached VIP status from storage
      await this.loadCachedVipStatus();
      
      // Check current VIP status from IAP
      await this.refreshVipStatus();
      
      console.log('✅ VIP Manager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing VIP Manager:', error);
    }
  }

  // Load cached VIP status from AsyncStorage
  async loadCachedVipStatus() {
    try {
      const cachedVipStatus = await AsyncStorage.getItem(VIP_STATUS_KEY);
      const cachedVipExpiry = await AsyncStorage.getItem(VIP_EXPIRY_KEY);
      
      if (cachedVipStatus !== null) {
        this.isVip = JSON.parse(cachedVipStatus);
        console.log('📱 Loaded cached VIP status:', this.isVip);
      }
      
      if (cachedVipExpiry !== null) {
        this.vipExpiry = new Date(cachedVipExpiry);
        console.log('📱 Loaded cached VIP expiry:', this.vipExpiry);
        
        // Check if cached VIP status has expired
        if (this.vipExpiry && new Date() > this.vipExpiry) {
          console.log('⏰ Cached VIP status has expired');
          this.isVip = false;
          await this.saveVipStatus(false);
        }
      }
    } catch (error) {
      console.error('❌ Error loading cached VIP status:', error);
      this.isVip = false;
    }
  }

  // Refresh VIP status from IAP Manager
  async refreshVipStatus() {
    try {
      console.log('🔄 Refreshing VIP status...');
      
      const iapManager = IAPManager.getInstance();
      
      // Make sure IAP is initialized
      if (!iapManager.isReady()) {
        console.log('⚠️ IAP Manager not ready, skipping VIP check');
        return this.isVip;
      }
      
      // Refresh entitlements from store
      await iapManager.refreshEntitlements();
      
      // Get current VIP status
      const currentVipStatus = iapManager.getIsVip();
      
      // Update local status if changed
      if (currentVipStatus !== this.isVip) {
        console.log('🔄 VIP status changed:', this.isVip, '->', currentVipStatus);
        this.isVip = currentVipStatus;
        await this.saveVipStatus(currentVipStatus);
        
        // Notify all callbacks
        this.notifyVipStatusCallbacks(currentVipStatus);
      }
      
      this.lastCheckTime = new Date();
      console.log('✅ VIP status refreshed:', this.isVip);
      
      return this.isVip;
    } catch (error) {
      console.error('❌ Error refreshing VIP status:', error);
      return this.isVip;
    }
  }

  // Save VIP status to AsyncStorage
  async saveVipStatus(isVip, expiry) {
    try {
      await AsyncStorage.setItem(VIP_STATUS_KEY, JSON.stringify(isVip));
      
      if (expiry) {
        await AsyncStorage.setItem(VIP_EXPIRY_KEY, expiry.toISOString());
        this.vipExpiry = expiry;
      }
      
      console.log('💾 VIP status saved:', isVip);
    } catch (error) {
      console.error('❌ Error saving VIP status:', error);
    }
  }

  // Get current VIP status
  getIsVip() {
    return this.isVip;
  }

  // Set VIP status (used when purchase is successful)
  async setVipStatus(isVip, expiry) {
    if (this.isVip !== isVip) {
      this.isVip = isVip;
      await this.saveVipStatus(isVip, expiry);
      this.notifyVipStatusCallbacks(isVip);
    }
  }

  // Check if we need to refresh VIP status (based on time interval)
  shouldRefreshVipStatus() {
    if (!this.lastCheckTime) {
      return true;
    }
    
    const timeSinceLastCheck = new Date().getTime() - this.lastCheckTime.getTime();
    return timeSinceLastCheck > VIP_CHECK_INTERVAL;
  }

  // Add callback for VIP status changes
  addVipStatusCallback(callback) {
    this.vipStatusCallbacks.push(callback);
  }

  // Remove VIP status callback
  removeVipStatusCallback(callback) {
    const index = this.vipStatusCallbacks.indexOf(callback);
    if (index > -1) {
      this.vipStatusCallbacks.splice(index, 1);
    }
  }

  // Notify all callbacks about VIP status change
  notifyVipStatusCallbacks(isVip) {
    this.vipStatusCallbacks.forEach(callback => {
      try {
        callback(isVip);
      } catch (error) {
        console.error('❌ Error in VIP status callback:', error);
      }
    });
  }

  // Get VIP status with auto-refresh if needed
  async getVipStatusWithRefresh() {
    if (this.shouldRefreshVipStatus()) {
      await this.refreshVipStatus();
    }
    return this.isVip;
  }

  // Clear all VIP data (for testing or logout)
  async clearVipData() {
    try {
      await AsyncStorage.removeItem(VIP_STATUS_KEY);
      await AsyncStorage.removeItem(VIP_EXPIRY_KEY);
      this.isVip = false;
      this.vipExpiry = null;
      this.lastCheckTime = null;
      this.notifyVipStatusCallbacks(false);
      console.log('🧹 VIP data cleared');
    } catch (error) {
      console.error('❌ Error clearing VIP data:', error);
    }
  }

  // Get VIP info for debugging
  getVipInfo() {
    return {
      isVip: this.isVip,
      vipExpiry: this.vipExpiry,
      lastCheckTime: this.lastCheckTime,
      shouldRefresh: this.shouldRefreshVipStatus()
    };
  }
}

export default VIPManager;