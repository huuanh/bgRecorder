import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import useTranslation from '../hooks/useTranslation';

/**
 * SafeCameraWrapper - Delays camera initialization until React context is ready
 * This prevents "Tried to access a JS module before the React instance was fully set up" errors
 */
const SafeCameraWrapper = ({ children, delay = 1500 }) => {
    const { t } = useTranslation();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        console.log('📷 SafeCameraWrapper: Waiting for React context to be ready...');
        
        const timer = setTimeout(() => {
            console.log('📷 SafeCameraWrapper: Ready to initialize camera components');
            setIsReady(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    if (!isReady) {
        return (
            <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: '#F8F9FA'
            }}>
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text style={{ 
                    marginTop: 10, 
                    color: '#6B7280',
                    fontSize: 14 
                }}>
                    Initializing camera...
                </Text>
            </View>
        );
    }

    return children;
};

export default SafeCameraWrapper;