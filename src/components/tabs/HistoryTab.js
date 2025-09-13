import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

const HistoryTab = () => {
    const [recordings] = useState([
        {
            id: 1,
            date: 'Today',
            sessions: [
                {
                    id: 101,
                    time: '14:30 - 14:35',
                    duration: '05:32',
                    quality: 'HD 720p',
                    size: '125 MB',
                    status: 'completed'
                },
                {
                    id: 102,
                    time: '10:15 - 10:18',
                    duration: '03:20',
                    quality: 'HD 720p', 
                    size: '89 MB',
                    status: 'completed'
                }
            ]
        },
        {
            id: 2,
            date: 'Yesterday',
            sessions: [
                {
                    id: 201,
                    time: '09:45 - 09:55',
                    duration: '10:15',
                    quality: 'FHD 1080p',
                    size: '245 MB',
                    status: 'completed'
                },
                {
                    id: 202,
                    time: '16:22 - 16:24',
                    duration: '02:45',
                    quality: 'HD 720p',
                    size: '67 MB',
                    status: 'failed'
                }
            ]
        },
        {
            id: 3,
            date: 'Sep 11, 2025',
            sessions: [
                {
                    id: 301,
                    time: '13:10 - 13:25',
                    duration: '15:30',
                    quality: 'UHD 4K',
                    size: '890 MB',
                    status: 'completed'
                }
            ]
        }
    ]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return '#10B981';
            case 'failed':
                return '#EF4444';
            case 'processing':
                return '#F59E0B';
            default:
                return '#6B7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'processing':
                return '⏳';
            default:
                return '⚪';
        }
    };

    const renderSessionItem = (session) => (
        <TouchableOpacity key={session.id} style={styles.sessionItem}>
            <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTime}>{session.time}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                        <Text style={styles.statusIcon}>{getStatusIcon(session.status)}</Text>
                        <Text style={styles.statusText}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </Text>
                    </View>
                </View>
                <View style={styles.sessionDetails}>
                    <Text style={styles.sessionMeta}>
                        {session.duration} • {session.quality} • {session.size}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.sessionActions}>
                <Text style={styles.actionIcon}>⋮</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderDateGroup = (dateGroup) => (
        <View key={dateGroup.id} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{dateGroup.date}</Text>
            {dateGroup.sessions.map(renderSessionItem)}
        </View>
    );

    return (
        <View style={styles.tabContent}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Recording History</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterIcon}>🔍</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {recordings.reduce((total, day) => total + day.sessions.length, 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total Sessions</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {recordings.reduce((total, day) => 
                            total + day.sessions.filter(s => s.status === 'completed').length, 0
                        )}
                    </Text>
                    <Text style={styles.statLabel}>Successful</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {Math.round(
                            recordings.reduce((total, day) => 
                                total + day.sessions.reduce((dayTotal, session) => 
                                    dayTotal + parseFloat(session.size.replace(' MB', '')), 0
                                ), 0
                            ) / 1024 * 10
                        ) / 10} GB
                    </Text>
                    <Text style={styles.statLabel}>Total Size</Text>
                </View>
            </View>

            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {recordings.length > 0 ? (
                    recordings.map(renderDateGroup)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyTitle}>No recording history</Text>
                        <Text style={styles.emptyDescription}>
                            Your recording sessions will appear here
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    filterButton: {
        padding: 8,
    },
    filterIcon: {
        fontSize: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E3A8A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    historyList: {
        flex: 1,
    },
    dateGroup: {
        marginBottom: 24,
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
        paddingLeft: 4,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    sessionInfo: {
        flex: 1,
        marginRight: 12,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sessionTime: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusIcon: {
        fontSize: 10,
        marginRight: 4,
    },
    statusText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    sessionDetails: {
        marginTop: 4,
    },
    sessionMeta: {
        fontSize: 12,
        color: '#6B7280',
    },
    sessionActions: {
        padding: 8,
    },
    actionIcon: {
        fontSize: 16,
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});

export default HistoryTab;