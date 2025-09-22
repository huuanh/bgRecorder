import { AppState, NativeModules } from 'react-native';

class ReactContextManager {
    constructor() {
        this.isReady = false;
        this.readyCallbacks = [];
        this.initTimer = null;
        
        this.initialize();
    }

    initialize() {
        console.log('🔧 ReactContextManager: Starting initialization...');
        
        // Wait for app to be in active state
        const checkAppState = () => {
            if (AppState.currentState === 'active') {
                console.log('✅ ReactContextManager: App is active');
                this.setupReadyCheck();
            } else {
                console.log('⏳ ReactContextManager: Waiting for app to become active...');
                setTimeout(checkAppState, 100);
            }
        };
        
        checkAppState();
    }

    setupReadyCheck() {
        // Additional delay to ensure React context is fully initialized
        this.initTimer = setTimeout(() => {
            this.isReady = true;
            console.log('✅ ReactContextManager: React context is ready');
            
            // Execute all pending callbacks
            this.readyCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('❌ ReactContextManager: Error in ready callback:', error);
                }
            });
            
            this.readyCallbacks = [];
        }, 2000); // 2 second delay to ensure everything is ready
    }

    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }

    cleanup() {
        if (this.initTimer) {
            clearTimeout(this.initTimer);
        }
        this.readyCallbacks = [];
    }
}

// Create singleton instance
const reactContextManager = new ReactContextManager();

export default reactContextManager;