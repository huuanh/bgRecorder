import { useState, useEffect } from 'react';
import NetworkManager from '../utils/NetworkManager';

export const useNetworkConnection = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Initial network check
        const checkInitialNetwork = async () => {
            try {
                const connected = await NetworkManager.checkConnection();
                setIsConnected(connected);
            } catch (error) {
                console.log('❌ useNetworkConnection: Initial check error:', error);
                setIsConnected(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkInitialNetwork();

        // Listen for network changes
        const networkListener = (connected) => {
            setIsConnected(connected);
        };

        NetworkManager.addListener(networkListener);

        // Cleanup
        return () => {
            NetworkManager.removeListener(networkListener);
        };
    }, []);

    const checkConnection = async () => {
        setIsChecking(true);
        try {
            const connected = await NetworkManager.checkConnection();
            setIsConnected(connected);
            return connected;
        } catch (error) {
            console.log('❌ useNetworkConnection: Check error:', error);
            setIsConnected(false);
            return false;
        } finally {
            setIsChecking(false);
        }
    };

    const waitForConnection = async (timeout = 30000) => {
        try {
            await NetworkManager.waitForConnection(timeout);
            return true;
        } catch (error) {
            console.log('❌ useNetworkConnection: Wait timeout:', error);
            return false;
        }
    };

    return {
        isConnected,
        isChecking,
        checkConnection,
        waitForConnection,
    };
};

export default useNetworkConnection;
