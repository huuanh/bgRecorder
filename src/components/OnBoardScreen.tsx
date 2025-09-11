import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'slide1',
    image: require('../../assets/onboard/1.png'),
    title: 'Record video everywhere',
    description: '',
  },
  {
    key: 'slide2',
    image: require('../../assets/onboard/2.png'),
    title: '',
    description: 'To record video, please allow the app to access your device’s camera',
  },
  {
    key: 'slide3',
    image: require('../../assets/onboard/3.png'),
    title: '',
    description: 'To record video, please allow the app to access your device’s microphone',
  },
  {
    key: 'slide4',
    image: require('../../assets/onboard/4.png'),
    title: '',
    description: 'To record video, please allow the app to access your device’s storage',
  },
  {
    key: 'slide5',
    image: require('../../assets/onboard/5.png'),
    title: '',
    description: 'To display the preview, please allow the app to appear on top of other apps',
  },
];




const OnBoardScreen = ({ onNext }: { onNext?: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onNext && onNext();
    }
  };

  const renderItem = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    const adBox = (
      <View style={styles.adBox}>
        <View style={styles.adHeader}>
          <Image source={require('../../assets/onboard/bg1.png')} style={styles.adIcon} />
          <Text style={styles.adTitle}>9.9 Shopee Ngày Siêu Mua Sắm</Text>
          <Text style={styles.adLabel}>Ad</Text>
        </View>
        <Text style={styles.adDesc}>
          Cảm ơn bạn đã sử dụng Shopee! Chúng tôi đã sửa lỗi và cải thiện ứng dụng để đem đến trải nghiệm tuyệt vời hơn nữa.
        </Text>
        <TouchableOpacity style={styles.watchMoreBtn}>
          <Text style={styles.watchMoreText}>Watch more</Text>
        </TouchableOpacity>
      </View>
    );
    return (
      <View style={styles.slide}>
        <View style={styles.slideContent}>
          <Image source={item.image} style={styles.slideImage} />
          {item.title ? <Text style={styles.slideTitle}>{item.title}</Text> : null}
          {item.description ? <Text style={styles.slideDesc}>{item.description}</Text> : null}
        </View>
        {adBox}
        <View style={styles.bottomRow}>
          <View style={styles.dotsContainer}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, currentIndex === i && styles.dotActive]}
              />
            ))}
          </View>
          <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  slideContent: {
    alignItems: 'center',
    marginTop: 16,
  },
  slideImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 16,
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  adBox: {
    backgroundColor: COLORS.SECONDARY,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
    resizeMode: 'contain',
  },
  adTitle: {
    fontWeight: 'bold',
    color: COLORS.TEXT,
    fontSize: 14,
    flex: 1,
  },
  adLabel: {
    backgroundColor: COLORS.ERROR,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  adDesc: {
    color: COLORS.TEXT,
    fontSize: 13,
    marginBottom: 8,
  },
  watchMoreBtn: {
    backgroundColor: COLORS.TEXT,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  watchMoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
    marginHorizontal: 3,
    opacity: 0.4,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: COLORS.SECONDARY,
  },
  nextBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  nextText: {
    color: COLORS.TEXT,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OnBoardScreen;
