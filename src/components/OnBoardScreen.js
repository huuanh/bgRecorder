import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import AdManager, { ADS_UNIT } from '../AdManager.js';
import { NativeAdComponent } from './NativeAdComponent';

const OnBoardScreen = ({ onNext }) => {
  const [adShown, setAdShown] = useState(false);

  useEffect(() => {
    // Show App Open Ad when component mounts
        const showAd = async () => {
      if (!adShown) {
        console.log('🚀 OnBoardScreen: Attempting to show App Open Ad...');
        try {
          // Fix: Use adManagerInstance instead of AdManager
          // const result = await AdManager.showAppOpenAd();
          // console.log('✅ App Open Ad result:', result);
          setAdShown(true);
        } catch (error) {
          console.log('❌ App Open Ad failed:', error.message);
          setAdShown(true);
        }
      }
    };

    const timer = setTimeout(showAd, 500);
    return () => clearTimeout(timer);
}, [adShown]);
  
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/onboard/bg1.png')} style={styles.bgImage} />
      <Image source={require('../../assets/onboard/1.png')} style={styles.slideImage} />
      <View style={styles.botGroup}>
        <Text style={styles.slideTitle}>Record video everywhere</Text>
        <NativeAdComponent adUnitId={ADS_UNIT.NATIVE} hasMedia={false} />
        <TouchableOpacity onPress={onNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 16,
  },
  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  slideImage: {
    width: 190,
    height: 190,
    marginBottom: 160,
    resizeMode: 'contain',
  },

  botGroup: {
    position: 'absolute',
    bottom: 5,
    width: '100%',
    paddingHorizontal: 10,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TERTIARY,
    marginBottom: 10,
    textAlign: 'center',
  },
  nextBtn: {
    backgroundColor: COLORS.TERTIARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  adBox: {
    backgroundColor: COLORS.SECONDARY,
    // borderRadius: 16,
    padding: 0, // Remove padding as NativeAdComponent handles it
    width: '100%',
    minHeight: 200,
    overflow: 'hidden',
  },
});

export default OnBoardScreen;
