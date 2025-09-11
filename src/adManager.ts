import { AppOpenAd, InterstitialAd, BannerAd, AdEventType, TestIds, AdsConsent, MobileAds, NativeAd, NativeAdView } from 'react-native-google-mobile-ads';
// Preload Interstitial Ad
export const preloadInterstitialAd = (unitId: string) => {
  const interstitial = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  interstitial.load();
  return interstitial;
};

// Preload App Open Ad
export const preloadAppOpenAd = (unitId: string) => {
  const appOpenAd = AppOpenAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  appOpenAd.load();
  return appOpenAd;
};

// Preload Native Ad
export const preloadNativeAd = async (unitId: string) => {
  // NativeAdView là component, NativeAd là instance quản lý ad
  return await NativeAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
};

// Quản lý các ad unit cho từng môi trường
export const ADS_UNIT = {
  DEV: {
    BANNER: TestIds.BANNER,
    INTERSTITIAL: TestIds.INTERSTITIAL,
    APP_OPEN: TestIds.APP_OPEN,
  },
  PROD: {
    BANNER: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
    INTERSTITIAL: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
    APP_OPEN: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
  },
};

// Khởi tạo MobileAds SDK
export const initAds = async () => {
  await MobileAds().initialize();
  // Nếu cần xin consent, có thể dùng AdsConsent.requestInfoUpdate()
};

// Tạo và quản lý Interstitial Ad
export const createInterstitialAd = (unitId: string) => {
  const interstitial = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  return interstitial;
};

// Tạo và quản lý App Open Ad
export const createAppOpenAd = (unitId: string) => {
  const appOpenAd = AppOpenAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  return appOpenAd;
};

// Hàm show Interstitial Ad
export const showInterstitialAd = (interstitial: InterstitialAd, onClosed?: () => void) => {
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    onClosed && onClosed();
  });
  interstitial.load();
  interstitial.show();
};

// Hàm show App Open Ad
export const showAppOpenAd = (appOpenAd: AppOpenAd, onClosed?: () => void) => {
  appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
    onClosed && onClosed();
  });
  appOpenAd.load();
  appOpenAd.show();
};

// BannerAd có thể dùng trực tiếp trong component
// import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
// <BannerAd unitId={ADS_UNIT.DEV.BANNER} size={BannerAdSize.FULL_BANNER} />
