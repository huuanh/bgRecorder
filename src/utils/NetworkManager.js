import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';

class NetworkManager {
    constructor() {
        this.isConnected = true;
        this.listeners = [];
        this.unsubscribe = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryInterval = 3000; // 3 seconds
        
        this.init();
    }

    init() {
        // Subscribe to network state changes
        this.unsubscribe = NetInfo.addEventListener(state => {
            const wasConnected = this.isConnected;
            this.isConnected = state.isConnected && state.isInternetReachable;
            
            console.log('🌐 Network state changed:', {
                isConnected: this.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
                wasConnected: wasConnected
            });

            // Emit network change event
            DeviceEventEmitter.emit('networkStateChanged', {
                isConnected: this.isConnected,
                wasConnected: wasConnected,
                type: state.type
            });

            // Notify all listeners
            this.listeners.forEach(listener => {
                if (typeof listener === 'function') {
                    listener(this.isConnected, wasConnected);
                }
            });

            // Reset retry count when connected
            if (this.isConnected) {
                this.retryCount = 0;
            }
        });

        // Get initial network state
        this.checkConnection();
    }

    async checkConnection() {
        try {
            const state = await NetInfo.fetch();
            this.isConnected = state.isConnected && state.isInternetReachable;
            
            console.log('🔍 Initial network check:', {
                isConnected: this.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type
            });

            return this.isConnected;
        } catch (error) {
            console.log('❌ Error checking network connection:', error);
            this.isConnected = false;
            return false;
        }
    }

    async waitForConnection(timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve(true);
                return;
            }

            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Network connection timeout'));
            }, timeout);

            const listener = (isConnected) => {
                if (isConnected) {
                    cleanup();
                    resolve(true);
                }
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                this.removeListener(listener);
            };

            this.addListener(listener);
        });
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            console.log('📡 Network listener added, total listeners:', this.listeners.length);
        }
    }

    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index !== -1) {
            this.listeners.splice(index, 1);
            console.log('📡 Network listener removed, remaining listeners:', this.listeners.length);
        }
    }

    removeAllListeners() {
        this.listeners = [];
        console.log('📡 All network listeners removed');
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    async retryConnection() {
        if (this.retryCount >= this.maxRetries) {
            console.log('🚫 Max retry attempts reached');
            return false;
        }

        this.retryCount++;
        console.log(`🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`);

        return new Promise((resolve) => {
            setTimeout(async () => {
                const isConnected = await this.checkConnection();
                resolve(isConnected);
            }, this.retryInterval);
        });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.removeAllListeners();
        console.log('🗑️ NetworkManager destroyed');
    }
}

// Export singleton instance
const networkManager = new NetworkManager();
export default networkManager;
