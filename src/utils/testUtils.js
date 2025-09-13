import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Test utility để thêm video mẫu cho testing
export const addTestVideo = async () => {
    try {
        const testVideo = {
            id: Date.now(),
            title: 'Test_Video_Sample.mp4',
            duration: '00:01:45',
            size: '32 MB',
            date: new Date().toLocaleString(),
            filePath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Sample video URL
            quality: 'HD 720p',
            camera: 'Front',
            thumbnail: null
        };

        const storedVideos = await AsyncStorage.getItem('recorded_videos');
        const videos = storedVideos ? JSON.parse(storedVideos) : [];
        
        // Kiểm tra xem video test đã tồn tại chưa
        const existingTest = videos.find(v => v.title === testVideo.title);
        if (!existingTest) {
            videos.unshift(testVideo);
            await AsyncStorage.setItem('recorded_videos', JSON.stringify(videos));
            console.log('✅ Test video added successfully');
            Alert.alert('Test Video Added', 'A sample video has been added to your gallery for testing video playback.');
        } else {
            console.log('ℹ️ Test video already exists');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to add test video:', error);
        return false;
    }
};

export const clearAllVideos = async () => {
    try {
        await AsyncStorage.removeItem('recorded_videos');
        console.log('🗑️ All videos cleared');
        Alert.alert('Success', 'All videos have been cleared from storage.');
        return true;
    } catch (error) {
        console.error('❌ Failed to clear videos:', error);
        return false;
    }
};

export const getVideoCount = async () => {
    try {
        const storedVideos = await AsyncStorage.getItem('recorded_videos');
        const videos = storedVideos ? JSON.parse(storedVideos) : [];
        return videos.length;
    } catch (error) {
        console.error('Failed to get video count:', error);
        return 0;
    }
};