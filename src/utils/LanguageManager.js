import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { TRANSLATIONS } from './Translations';

const LANGUAGE_STORAGE_KEY = 'app_language';

export const SUPPORTED_LANGUAGES = {
  'en': {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: require('../../assets/setting/lang/united_states.png'),
    isRTL: false
  },
  'ko': {
    code: 'ko-KR',
    name: '한국어',
    nativeName: '한국어',
    flag: require('../../assets/setting/lang/south_korea.png'),
    isRTL: false
  },
  'ja': {
    code: 'ja-JP',
    name: '日本語',
    nativeName: '日本語',
    flag: require('../../assets/setting/lang/japan.png'),
    isRTL: false
  },
  'es': {
    code: 'es-ES',
    name: 'Español',
    nativeName: 'Español',
    flag: require('../../assets/setting/lang/spain.png'),
    isRTL: false
  },
  'pt': {
    code: 'pt-PT',
    name: 'Português',
    nativeName: 'Português',
    flag: require('../../assets/setting/lang/portugal.png'),
    isRTL: false
  },
  'fr': {
    code: 'fr-FR',
    name: 'Français',
    nativeName: 'Français',
    flag: require('../../assets/setting/lang/france.png'),
    isRTL: false
  },
  'de': {
    code: 'de-DE',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: require('../../assets/setting/lang/germany.png'),
    isRTL: false
  },
  'hi': {
    code: 'hi-IN',
    name: 'हिन्दी',
    nativeName: 'हिन्दी',
    flag: require('../../assets/setting/lang/india.png'),
    isRTL: false
  },
  'ar': {
    code: 'ar-SA',
    name: 'العربية',
    nativeName: 'العربية',
    flag: require('../../assets/setting/lang/saudi_arabia.png'),
    isRTL: true
  },
  'vi': {
    code: 'vi-VN',
    name: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    flag: require('../../assets/setting/lang/vietnam.png'),
    isRTL: false
  }
};

class LanguageManager {
  constructor() {
    this.currentLanguage = 'en'; // Default
    this.listeners = [];
    this.translations = {};
    this.init();
  }

  static getInstance() {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  async init() {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
        this.currentLanguage = savedLanguage;
      }
      
      // Load translations for current language
      await this.loadTranslations(this.currentLanguage);
      
      // Set RTL if needed
      const langInfo = SUPPORTED_LANGUAGES[this.currentLanguage];
      if (langInfo && langInfo.isRTL !== I18nManager.isRTL) {
        I18nManager.forceRTL(langInfo.isRTL);
      }
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.log('Error initializing language manager:', error);
    }
  }

  async setLanguage(languageCode) {
    try {
      if (!SUPPORTED_LANGUAGES[languageCode]) {
        throw new Error(`Unsupported language: ${languageCode}`);
      }

      const oldLanguage = this.currentLanguage;
      this.currentLanguage = languageCode;

      // Save to storage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      console.log(`Language changed from ${oldLanguage} to ${languageCode}`);

      // Load new translations
      await this.loadTranslations(languageCode);

      // Handle RTL change
      const langInfo = SUPPORTED_LANGUAGES[languageCode];
      if (langInfo && langInfo.isRTL !== I18nManager.isRTL) {
        I18nManager.forceRTL(langInfo.isRTL);
        // RTL change requires app restart
        return { requiresRestart: true };
      }

      // Notify listeners
      this.notifyListeners();

      return { requiresRestart: false };
    } catch (error) {
      console.log('Error setting language:', error);
      return { error: error.message };
    }
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  async isFirstTimeUser() {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      console.log('Saved language:', savedLanguage);
      return !savedLanguage; // First time if no language saved
    } catch (error) {
      console.log('Error checking first time user:', error);
      return false;
    }
  }

  getCurrentLanguageInfo() {
    return SUPPORTED_LANGUAGES[this.currentLanguage] || SUPPORTED_LANGUAGES['en'];
  }

  getSupportedLanguages() {
    return Object.keys(SUPPORTED_LANGUAGES).map(key => ({
      id: key,
      ...SUPPORTED_LANGUAGES[key]
    }));
  }

  async loadTranslations(languageCode) {
    try {
      // Load translations from the comprehensive translations file
      this.translations = TRANSLATIONS[languageCode] || TRANSLATIONS['en'];
    } catch (error) {
      console.log('Error loading translations:', error);
      // Fallback to Vietnamese
      this.translations = TRANSLATIONS['en'];
    }
  }

  translate(key, defaultValue = '') {
    return this.translations[key] || defaultValue || key;
  }

  // Short alias for translate
  t(key, defaultValue = '') {
    return this.translate(key, defaultValue);
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentLanguage);
      } catch (error) {
        console.log('Error notifying language listener:', error);
      }
    });
  }
}

export default LanguageManager;