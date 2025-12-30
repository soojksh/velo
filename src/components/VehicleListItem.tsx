import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../config/theme';

interface Props {
    id: string;
    lat: number;
    lng: number;
    speed?: number;
    address?: string | null; // <--- NEW PROP
    onPress: () => void;
}

export default function VehicleListItem({ id, lat, lng, speed, address, onPress }: Props) {
    return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.leftSection}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🚚</Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.titleRow}>
                    <Text style={styles.idText}>{id}</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Live</Text>
                    </View>
                </View>
                
                {/* LOGIC: Show Address if available, otherwise show Lat/Lng */}
                <View style={styles.metaRow}>
                    {address ? (
                        <Text style={styles.addressText} numberOfLines={1}>
                            📍 {address}
                        </Text>
                    ) : (
                        <>
                            <Text style={styles.coordText}>
                                <Text style={styles.label}>Lat:</Text> {lat.toFixed(4)}
                            </Text>
                            <Text style={styles.divider}>|</Text>
                            <Text style={styles.coordText}>
                                <Text style={styles.label}>Lng:</Text> {lng.toFixed(4)}
                            </Text>
                        </>
                    )}
                </View>
                
                {speed !== undefined && (
                    <Text style={styles.speedText}>{speed} km/h</Text>
                )}
            </View>

            <View style={styles.rightSection}>
                <View style={styles.arrowButton}>
                    <Text style={styles.arrowText}>→</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small, 
    },
    leftSection: {
        marginRight: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 24,
    },
    infoSection: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginRight: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginRight: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.success,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 20, // Ensures height consistency when switching between text types
    },
    label: {
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    coordText: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontFamily: 'monospace', 
    },
    divider: {
        marginHorizontal: 6,
        color: COLORS.border,
    },
    // NEW STYLE FOR ADDRESS
    addressText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    speedText: {
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 4,
        fontWeight: '600',
    },
    rightSection: {
        marginLeft: 12,
    },
    arrowButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowText: {
        fontSize: 18,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: -2, 
    },
});