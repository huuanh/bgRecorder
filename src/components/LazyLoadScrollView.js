import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import useTranslation from '../hooks/useTranslation';

const { height: screenHeight } = Dimensions.get('window');

/**
 * LazyLoadScrollView - Only renders components when they're visible in viewport
 * This helps with performance when there are many video thumbnails
 */
const LazyLoadScrollView = ({
    children, 
    renderItem, 
    data, 
    itemHeight = 100,
    preloadOffset = 200, // Load items 200px before they become visible
    ...scrollViewProps 
}) => {
    const [scrollY, setScrollY] = useState(0);
    const scrollViewRef = useRef(null);
    const { t } = useTranslation(); 
    const handleScroll = (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        setScrollY(currentScrollY);
    };

    const isItemVisible = (index) => {
        const itemTop = index * itemHeight;
        const itemBottom = itemTop + itemHeight;
        const viewportTop = scrollY - preloadOffset;
        const viewportBottom = scrollY + screenHeight + preloadOffset;

        return itemBottom >= viewportTop && itemTop <= viewportBottom;
    };

    const renderVisibleItems = () => {
        if (!data || !renderItem) {
            return children;
        }

        return data.map((item, index) => {
            const visible = isItemVisible(index);
            
            if (!visible) {
                // Render placeholder with correct height
                return (
                    <View 
                        key={item.id || index} 
                        style={{ height: itemHeight, backgroundColor: 'transparent' }}
                    />
                );
            }

            return renderItem(item, index);
        });
    };

    return (
        <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            {...scrollViewProps}
        >
            {renderVisibleItems()}
        </ScrollView>
    );
};

export default LazyLoadScrollView;