import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import AdManager, { ADS_UNIT } from '../AdManager.js';
import { NativeAdComponent } from './NativeAdComponent';
import useTranslation from '../hooks/useTranslation';
import ChangeLanguageModal from './ChangeLanguageModal';
import { SUPPORTED_LANGUAGES } from '../utils/LanguageManager';

const OnBoardScreen = ({ onNext }) => {
  const { t, languageManager, currentLanguage } = useTranslation();
  const [adShown, setAdShown] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    // Check if first time user and show language modal
    const checkFirstTimeUser = async () => {
      try {
        const isFirstTime = await languageManager.isFirstTimeUser();
        console.log('🌍 First time user check:', isFirstTime);
        
        if (isFirstTime) {
          // Show language modal for first time users
          setTimeout(() => {
            setShowLanguageModal(true);
          }, 1000); // Delay 1s để user thấy UI trước
        }
      } catch (error) {
        console.log('Error checking first time user:', error);
      }
    };

    // Show App Open Ad when component mounts
    const showAd = async () => {
      if (!adShown) {
        console.log('🚀 OnBoardScreen: Attempting to show App Open Ad...');
        try {
          // Fix: Use adManagerInstance instead of AdManager
          const result = await AdManager.showAppOpenAd();
          // console.log('✅ App Open Ad result:', result);
          setAdShown(true);
        } catch (error) {
          console.log('❌ App Open Ad failed:', error.message);
          setAdShown(true);
        }
      }
    };

    checkFirstTimeUser();
    const timer = setTimeout(showAd, 500);
    return () => clearTimeout(timer);
  }, [adShown, languageManager]);

  return (
    <View style={styles.container}>
      {/* <Image source={require('../../assets/onboard/bg1.png')} style={styles.bgImage} /> */}

      <Image source={require('../../assets/onboard/1.png')} style={styles.slideImage} />
      <View style={styles.botGroup}>
        <Text style={styles.slideTitle}>{t('recordVideoEverywhere', 'Record video everywhere')}</Text>
        <NativeAdComponent adUnitId={ADS_UNIT.NATIVE_ONBOARDING} hasMedia={true} />
        <TouchableOpacity onPress={onNext} style={styles.nextBtn}>
          <Text style={styles.nextText}>{t('next', 'Next')}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector Modal */}
      <ChangeLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
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
  languageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 10,
  },
  flagIcon: {
    width: 20,
    height: 15,
    borderRadius: 2,
    marginRight: 8,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TERTIARY,
    marginRight: 4,
  },
  languageArrow: {
    fontSize: 10,
    color: COLORS.TERTIARY,
    opacity: 0.7,
  },
  testButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    elevation: 3,
    zIndex: 10,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  slideImage: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: 100,
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
    borderRadius: 8,
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
