import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import NativeAdComponent, { 
  SmallNativeAd, 
  MediumNativeAd, 
  LargeNativeAd, 
  CardNativeAd, 
  MinimalNativeAd 
} from './NativeAdComponent';
import { ADS_UNIT } from '../AdManager';
import { COLORS } from '../constants';

const NativeAdShowcase = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Native Ad Component Showcase</Text>
      <Text style={styles.subtitle}>Auto-loading ads based on ad unit types</Text>

      {/* Banner Ad Unit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Banner Ad Unit (Small)</Text>
        <SmallNativeAd
          adUnitId={ADS_UNIT.BANNER}
          enableRealAds={false}
          backgroundColor={COLORS.SECONDARY}
          textColor={COLORS.TEXT}
          ctaBackgroundColor={COLORS.PRIMARY}
        />
      </View>

      {/* Native Ad Unit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Native Ad Unit (Medium)</Text>
        <MediumNativeAd
          adUnitId={ADS_UNIT.NATIVE}
          enableRealAds={false}
          backgroundColor={COLORS.BACKGROUND}
          textColor={COLORS.TEXT}
          ctaBackgroundColor={COLORS.PRIMARY}
        />
      </View>

      {/* Interstitial Ad Unit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interstitial Ad Unit (Large)</Text>
        <LargeNativeAd
          adUnitId={ADS_UNIT.INTERSTITIAL}
          enableRealAds={false}
          backgroundColor={COLORS.BACKGROUND}
          textColor={COLORS.TEXT}
          ctaBackgroundColor="#FF6B35"
        />
      </View>

      {/* Rewarded Ad Unit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewarded Ad Unit (Card)</Text>
        <CardNativeAd
          adUnitId={ADS_UNIT.REWARDED}
          enableRealAds={false}
          backgroundColor={COLORS.BACKGROUND}
          textColor={COLORS.TEXT}
          ctaBackgroundColor="#4CAF50"
        />
      </View>

      {/* App Open Ad Unit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Open Ad Unit (Minimal)</Text>
        <MinimalNativeAd
          adUnitId={ADS_UNIT.APP_OPEN}
          enableRealAds={false}
          backgroundColor="transparent"
          textColor={COLORS.TEXT}
          ctaBackgroundColor={COLORS.PRIMARY}
        />
      </View>

      {/* Real Ads Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real Ads (Enable for Testing)</Text>
        <Text style={styles.note}>
          Set enableRealAds={true} to load actual ads from Google AdMob
        </Text>
        
        <MediumNativeAd
          adUnitId={ADS_UNIT.NATIVE}
          enableRealAds={true} // This will load real ads
          backgroundColor={COLORS.BACKGROUND}
          textColor={COLORS.TEXT}
          ctaBackgroundColor={COLORS.PRIMARY}
          onAdLoaded={() => console.log('✅ Real ad loaded!')}
          onAdFailedToLoad={(error) => console.log('❌ Real ad failed:', error)}
          onAdClicked={() => console.log('🔗 Real ad clicked!')}
        />
      </View>

      {/* Custom Fallback Content */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Fallback Content</Text>
        <NativeAdComponent
          adUnitId="custom-ad-unit"
          enableRealAds={false}
          fallbackContent={{
            headline: "Custom App Feature",
            tagline: "This is a custom fallback content when ad unit is not mapped",
            advertiser: "Custom Brand",
            callToAction: "Try Now",
            icon: require('../../assets/loading/icon.png'),
            media: require('../../assets/onboard/bg1.png')
          }}
          backgroundColor={COLORS.SECONDARY}
          textColor={COLORS.TEXT}
          ctaBackgroundColor="#9C27B0"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    color: COLORS.TEXT,
    opacity: 0.6,
    fontStyle: 'italic',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
});

export default NativeAdShowcase;