import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../config/theme';

interface Props {
    id: string;
    lat: number;
    lng: number;
    onPress: () => void;
}

export default function VehicleListItem({ id, lat, lng, onPress }: Props) {
    return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.carIcon}>🚙</Text>
            </View>
            
            <View style={styles.infoContainer}>
                <Text style={styles.vehicleId}>{id}</Text>
                <View style={styles.coordRow}>
                    <Text style={styles.coordLabel}>LAT: <Text style={styles.coordValue}>{lat.toFixed(4)}</Text></Text>
                    <Text style={styles.coordLabel}>LNG: <Text style={styles.coordValue}>{lng.toFixed(4)}</Text></Text>
                </View>
            </View>

            <View style={styles.actionContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.arrow}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    iconContainer: {
        width: 48, height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    carIcon: { fontSize: 24 },
    infoContainer: { flex: 1 },
    vehicleId: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    coordRow: { flexDirection: 'row', gap: 10 },
    coordLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
    coordValue: { color: COLORS.primary, fontWeight: 'bold' },
    
    actionContainer: { alignItems: 'center', justifyContent: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
    arrow: { fontSize: 24, color: COLORS.textSecondary, fontWeight: '200' },
});