/**
 * Native Ad Usage Examples
 * ======================
 * 
 * This file contains examples of how to use the NativeAdComponent
 * and its preset variations in different scenarios.
 */

import React from 'react';
import NativeAdComponent, { 
  SmallNativeAd, 
  MediumNativeAd, 
  LargeNativeAd, 
  CardNativeAd, 
  MinimalNativeAd 
} from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import { COLORS } from '../constants';

// ======================
// Example Components
// ======================

// 1. Basic Usage Examples
export const BasicNativeAdExample = () => (
  <>
    {/* Default native ad */}
    <NativeAdComponent />

    {/* With custom ad unit */}
    <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} />
  </>
);

// 2. Preset Components Examples
export const PresetExamples = () => (
  <>
    {/* Small ad (no media, compact) */}
    <SmallNativeAd />

    {/* Medium ad (with media) */}
    <MediumNativeAd />

    {/* Large ad (full-width with media) */}
    <LargeNativeAd />

    {/* Card style ad (with shadow) */}
    <CardNativeAd />

    {/* Minimal ad (text only) */}
    <MinimalNativeAd />
  </>
);

// 3. Customization Examples
export const CustomizationExample = () => (
  <NativeAdComponent
    // Ad configuration
    adUnitId={ADS_UNIT.NATIVE}
    
    // Display options
    showMediaView={true}
    showIcon={true}
    showAdvertiser={true}
    showCallToAction={true}
    mediaViewHeight={200}
    
    // Styling
    backgroundColor={COLORS.BACKGROUND}
    textColor={COLORS.TEXT}
    ctaBackgroundColor={COLORS.PRIMARY}
    ctaTextColor="#FFFFFF"
    borderRadius={12}
    padding={16}
    
    // Event handlers
    onAdLoaded={() => console.log('Ad loaded')}
    onAdFailedToLoad={(error) => console.log('Ad failed:', error)}
    onAdClicked={() => console.log('Ad clicked')}
    
    // Custom style
    style={{ marginVertical: 8 }}
  />
);

// 4. Placeholder Mode Example
export const PlaceholderExample = () => (
  <NativeAdComponent
    showPlaceholder={true}
    placeholderContent={{
      headline: "Your App Name",
      tagline: "Download now and get premium features",
      advertiser: "App Store",
      callToAction: "Install",
      icon: require('../../assets/loading/icon.png'),
      media: require('../../assets/onboard/bg1.png')
    }}
  />
);

// 5. Different Layout Examples
export const LayoutExamples = () => (
  <>
    {/* List item ad */}
    <SmallNativeAd
      style={{ marginHorizontal: 16, marginVertical: 8 }}
      backgroundColor="#f8f8f8"
    />

    {/* Content section ad */}
    <MediumNativeAd
      showMediaView={true}
      mediaViewHeight={160}
      backgroundColor={COLORS.BACKGROUND}
      borderRadius={12}
    />

    {/* Full-screen ad */}
    <LargeNativeAd
      mediaViewHeight={250}
      backgroundColor="#000000"
      textColor="#FFFFFF"
      ctaBackgroundColor="#FF6B35"
    />
  </>
);

// 6. Card Style Examples
export const CardExamples = () => (
  <CardNativeAd
    style={{
      marginHorizontal: 20,
      marginVertical: 12,
      elevation: 6,
      shadowOpacity: 0.2,
    }}
  />
);

// 7. Inline Text Ad Example
export const InlineTextExample = () => (
  <MinimalNativeAd
    backgroundColor="transparent"
    textColor={COLORS.TEXT}
    style={{ marginVertical: 4 }}
  />
);

// 8. Conditional Rendering Examples
export const ConditionalExample = ({ isAdEnabled, isAdLoaded }) => (
  <>
    {/* Show ad only if conditions are met */}
    {isAdEnabled && (
      <MediumNativeAd
        onAdLoaded={() => console.log('Ad loaded')}
        onAdFailedToLoad={() => console.log('Ad failed')}
      />
    )}

    {/* Fallback to placeholder if real ad fails */}
    <NativeAdComponent
      showPlaceholder={!isAdLoaded}
      onAdFailedToLoad={() => console.log('Showing placeholder')}
    />
  </>
);

// 9. Dynamic Styling Examples
export const DynamicStylingExample = ({ isDarkMode, screenWidth }) => (
  <>
    {/* Theme-based styling */}
    <NativeAdComponent
      backgroundColor={isDarkMode ? '#1a1a1a' : '#ffffff'}
      textColor={isDarkMode ? '#ffffff' : '#000000'}
      ctaBackgroundColor={isDarkMode ? '#4a90e2' : '#007AFF'}
    />

    {/* Size-based styling */}
    <NativeAdComponent
      mediaViewHeight={screenWidth > 400 ? 200 : 150}
      padding={screenWidth > 400 ? 20 : 16}
      borderRadius={screenWidth > 400 ? 16 : 12}
    />
  </>
);

// 10. Advanced Usage Examples
export const AdvancedExample = ({ analytics, showInterstitialAd }) => (
  <NativeAdComponent
    onAdLoaded={() => {
      analytics.track('native_ad_loaded');
      console.log('Ad analytics tracked');
    }}
    onAdClicked={() => {
      analytics.track('native_ad_clicked');
      showInterstitialAd();
    }}
  />
);

// 11. Error Handling Example
export const ErrorHandlingExample = ({ showFallback }) => (
  <NativeAdComponent
    onAdFailedToLoad={(error) => {
      console.log('Ad failed to load:', error);
    }}
    showPlaceholder={showFallback}
    placeholderContent={{
      headline: "Discover New Features",
      tagline: "Update to the latest version for better experience",
      callToAction: "Update Now"
    }}
  />
);

// 12. Performance Optimization Example
export const OptimizedExample = React.memo(() => (
  <MediumNativeAd
    adUnitId={ADS_UNIT.NATIVE}
    onAdLoaded={() => console.log('Memoized ad loaded')}
  />
));

export default {
  BasicNativeAdExample,
  PresetExamples,
  CustomizationExample,
  PlaceholderExample,
  LayoutExamples,
  CardExamples,
  InlineTextExample,
  ConditionalExample,
  DynamicStylingExample,
  AdvancedExample,
  ErrorHandlingExample,
  OptimizedExample,
};