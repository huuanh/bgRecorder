import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { ADS_UNIT } from '../adManager.js';
import { NativeAdView, HeadlineView, TaglineView, AdvertiserView, CallToActionView, IconView, TestIds } from 'react-native-google-mobile-ads';

const NativeAdBox = () => {
  // Tạm thời comment out native ad để tránh lỗi
  return (
    <View style={styles.adBox}>
      <Text style={styles.adHeadline}>Demo Native Ad</Text>
      <Text style={styles.adTagline}>This is a placeholder for native ad</Text>
      <Text style={styles.adAdvertiser}>Google</Text>
      <TouchableOpacity style={styles.adCallToAction}>
        <Text style={{color: 'white'}}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Uncomment below when ready to test real native ads
  /*
  return (
    <NativeAdView
      unitId={TestIds.NATIVE}
      adChoicesPlacement="topRight"
      style={styles.adBox}
      onError={(error) => {
        console.log('Native Ad Error:', error);
      }}
      onAdLoaded={() => {
        console.log('Native Ad Loaded');
      }}
    >
      <HeadlineView style={styles.adHeadline} />
      <TaglineView style={styles.adTagline} />
      <AdvertiserView style={styles.adAdvertiser} />
      <CallToActionView style={styles.adCallToAction} />
      <IconView style={styles.adIcon} />
    </NativeAdView>
  );
  */
};

const OnBoardScreen = ({ onNext }) => {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/onboard/bg1.png')} style={styles.bgImage} />
      <Image source={require('../../assets/onboard/1.png')} style={styles.slideImage} />
      <View style={styles.botGroup}>
        <Text style={styles.slideTitle}>Record video everywhere</Text>
        <NativeAdBox />
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
    color: COLORS.PRIMARY,
    marginBottom: 10,
    textAlign: 'center',
  },
  nextBtn: {
    backgroundColor: COLORS.PRIMARY,
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
    borderRadius: 16,
    padding: 16,
    // marginVertical: 16,
    width: '100%',
    minHeight: 120,
  },
  adHeadline: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  adTagline: {
    fontSize: 14,
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  adAdvertiser: {
    fontSize: 12,
    color: COLORS.TEXT,
    opacity: 0.7,
    marginBottom: 8,
  },
  adCallToAction: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  adIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default OnBoardScreen;
