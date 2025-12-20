import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
    id: string;
    lat: number;
    lng: number;
    onPress: () => void;
}

export default function VehicleListItem({ id, lat, lng, onPress }: Props) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.iconBox}>
                <Text style={styles.iconText}>🚗</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.title}>Vehicle ID: {id}</Text>
                <Text style={styles.subtitle}>Lat: {lat.toFixed(4)} | Lng: {lng.toFixed(4)}</Text>
            </View>
            <View style={styles.status}>
                <View style={styles.dot} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 10,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
    },
    iconBox: { marginRight: 15, justifyContent: 'center' },
    iconText: { fontSize: 24 },
    info: { flex: 1, justifyContent: 'center' },
    title: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    subtitle: { color: '#666', marginTop: 4 },
    status: { justifyContent: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' }
});