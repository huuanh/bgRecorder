import { useState, useEffect } from 'react';
import LanguageManager from '../utils/LanguageManager';

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState('vi');
  const languageManager = LanguageManager.getInstance();

  useEffect(() => {
    // Get initial language
    const initialLang = languageManager.getCurrentLanguage();
    setCurrentLanguage(initialLang);

    // Listen for language changes
    const unsubscribe = languageManager.addListener((newLanguage) => {
      setCurrentLanguage(newLanguage);
    });

    return unsubscribe;
  }, []);

  const t = (key, defaultValue = '') => {
    return languageManager.translate(key, defaultValue);
  };

  return {
    t,
    currentLanguage,
    languageManager
  };
};

export default useTranslation;