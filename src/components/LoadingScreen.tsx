import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.iconBox}>
        <Image source={require('../../assets/loading/icon.png')} style={styles.icon} />
      </View>
      <Text style={styles.title}>Background Video Recoder</Text>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar} />
        <View style={styles.progressBarBg} />
      </View>
      <Text style={styles.adsText}>This action may contain ads</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBox: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 40,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.4,
  },
  progressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TEXT,
    zIndex: 1,
  },
  adsText: {
    color: COLORS.TEXT,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default LoadingScreen;
