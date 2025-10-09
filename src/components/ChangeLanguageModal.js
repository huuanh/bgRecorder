import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import LanguageManager from '../utils/LanguageManager';
import useTranslation from '../hooks/useTranslation';
import { COLORS } from '../constants';
import { NativeAdComponent } from './NativeAdComponent';

const ChangeLanguageModal = ({ visible, onClose }) => {
  const [currentLanguage, setCurrentLanguage] = useState('vi');
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [languages, setLanguages] = useState([]);
  const { t } = useTranslation();
  const languageManager = LanguageManager.getInstance();

  useEffect(() => {
    if (visible) {
      loadCurrentLanguage();
      loadSupportedLanguages();
    }
  }, [visible]);

  const loadCurrentLanguage = () => {
    const current = languageManager.getCurrentLanguage();
    setCurrentLanguage(current);
    setSelectedLanguage(current);
  };

  const loadSupportedLanguages = () => {
    const supported = languageManager.getSupportedLanguages();
    setLanguages(supported);
  };

  const handleLanguageSelect = (languageId) => {
    setSelectedLanguage(languageId);
  };

  const handleApply = async () => {
    if (selectedLanguage === currentLanguage) {
      onClose();
      return;
    }

    try {
      // Show confirmation dialog
      const result = await languageManager.setLanguage(selectedLanguage);
        if (result.error) {
          Alert.alert(
            t('error', 'Lỗi'), 
            result.error
          );
          return;
        } else {
          onClose();
        }
    } catch (error) {
      console.log('Error changing language:', error);
      Alert.alert(
        t('error', 'Lỗi'), 
        t('language_error', 'Không thể thay đổi ngôn ngữ. Vui lòng thử lại.')
      );
    }
  };

  const renderLanguageItem = (language) => {
    const isSelected = selectedLanguage === language.id;
    
    return (
      <TouchableOpacity
        key={language.id}
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem
        ]}
        onPress={() => handleLanguageSelect(language.id)}
        activeOpacity={0.7}
      >
        <View style={styles.languageContent}>
          <Image source={language.flag} style={styles.flagIcon} />
          <Text style={[
            styles.languageName,
            isSelected && styles.selectedLanguageName
          ]}>
            {language.nativeName || language.name}
          </Text>
        </View>
        
        <View style={[
          styles.radioButton,
          isSelected && styles.selectedRadioButton
        ]}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t('select_language', 'Select Language')}
            </Text>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>
                {t('apply', 'Apply')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Language List */}
          <ScrollView 
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          >
            {languages.map(renderLanguageItem)}
          </ScrollView>
          <View style={styles.adComponent}>
            <NativeAdComponent/>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    paddingTop: StatusBar.currentHeight || 42,
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BACKGROUND,
    // borderRadius: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TERTIARY,
  },
  applyButton: {
    backgroundColor: COLORS.TERTIARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: COLORS.ITEM,
  },
  selectedLanguageItem: {
    backgroundColor: COLORS.SECONDARY,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: COLORS.TERTIARY,
    fontWeight: '600',
  },
  selectedLanguageName: {
    color: '#007AFF',
    fontWeight: '900',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: COLORS.TERTIARY,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.TERTIARY,
  },
  adComponent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  }

});

export default ChangeLanguageModal;