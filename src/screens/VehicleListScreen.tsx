import React, { useState, useEffect, useRef, memo } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicles } from '../context/VehicleContext';
import { COLORS } from '../config/theme';

// --- GLOBAL MEMORY CACHE ---
// Stores: { "vehicleID": { lat: 27.1, lng: 85.2, address: "Thamel", timestamp: 12345 } }
// This prevents refetching when scrolling or when vehicle moves slightly.
const ADDRESS_CACHE: Record<string, { lat: number; lng: number; address: string; timestamp: number }> = {};

// Helper to determine if we should refetch (only if moved > ~20 meters)
const shouldRefetch = (id: string, newLat: number, newLng: number) => {
    const cached = ADDRESS_CACHE[id];
    if (!cached) return true;
    
    const diffLat = Math.abs(cached.lat - newLat);
    const diffLng = Math.abs(cached.lng - newLng);
    // 0.0002 degrees is approx 20-25 meters
    return diffLat > 0.0002 || diffLng > 0.0002;
};

// --- SMART WRAPPER COMPONENT ---
// Handles the geocoding logic for a SINGLE item to avoid re-rendering the whole list
const SmartVehicleItem = memo(({ item, navigation }: { item: any, navigation: any }) => {
    const [address, setAddress] = useState<string | null>(
        ADDRESS_CACHE[item.id] ? ADDRESS_CACHE[item.id].address : null
    );
    
    // FIX: Use useRef instead of useState to track fetching status.
    // This avoids unnecessary re-renders and fixes the useEffect dependency warning.
    const isFetching = useRef(false);

    useEffect(() => {
        // 1. Check if we have a valid cache
        if (!shouldRefetch(item.id, item.latitude, item.longitude)) {
            setAddress(ADDRESS_CACHE[item.id].address);
            return;
        }

        // 2. Debounce mechanism (wait 1s before fetching to avoid API spam on moving vehicles)
        const timer = setTimeout(async () => {
            if (isFetching.current) return;
            
            try {
                isFetching.current = true;
                // Using OpenStreetMap Nominatim (Free, but strict rate limits. In production use Google/Mapbox)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.latitude}&lon=${item.longitude}&accept-language=en`,
                    { headers: { 'User-Agent': 'VeloTrackerApp/1.0' } }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Format the address logic
                    let formatted = '';
                    if (data.address) {
                        const specific = data.address.hamlet || data.address.pedestrian || data.address.road || '';
                        const general = data.address.village || data.address.municipality || data.address.town || data.address.city || '';
                        formatted = [specific, general].filter(Boolean).join(', ');
                        if (formatted.length < 5) formatted = data.display_name.split(',').slice(0, 2).join(',');
                    }

                    // Update Cache
                    ADDRESS_CACHE[item.id] = {
                        lat: item.latitude,
                        lng: item.longitude,
                        address: formatted,
                        timestamp: Date.now()
                    };

                    setAddress(formatted);
                }
            // FIX: Removed unused 'error' variable
            } catch {
                // Fail silently, keep coordinates
            } finally {
                isFetching.current = false;
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [item.latitude, item.longitude, item.id]);

    return (
        <VehicleListItem 
            id={item.id} 
            lat={item.latitude} 
            lng={item.longitude}
            speed={item.speed}
            address={address} // Pass the resolved address
            onPress={() => navigation.navigate('LiveMap', { vehicleId: item.id })}
        />
    );
});

export default function VehicleListScreen({ navigation }: any) {
  const { vehicles, isConnected, connectionError } = useVehicles();
  const vehicleList = Object.values(vehicles);

  return (
    <ScreenContainer>
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Live Vehicle</Text>
                <Text style={styles.subtitle}>Real-time monitoring</Text>
            </View>
            <View style={[styles.badge, isConnected ? styles.badgeSuccess : styles.badgeError]}>
                <Text style={[styles.badgeText, isConnected ? styles.textSuccess : styles.textError]}>
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                </Text>
            </View>
        </View>
        
        {connectionError && (
            <View style={styles.errorBox}>
                <Text style={styles.errorText}>{connectionError}</Text>
            </View>
        )}

        <FlatList
            contentContainerStyle={styles.listContent}
            data={vehicleList}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            // Use the Smart Wrapper here instead of direct component
            renderItem={({ item }) => (
                <SmartVehicleItem item={item} navigation={navigation} />
            )}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Waiting for vehicles...</Text>
                    <Text style={styles.emptySub}>Ensure your MQTT devices are transmitting.</Text>
                </View>
            }
        />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary },
    
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    badgeSuccess: { backgroundColor: '#ecfdf5', borderColor: COLORS.success },
    badgeError: { backgroundColor: '#fef2f2', borderColor: COLORS.error },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    textSuccess: { color: COLORS.success },
    textError: { color: COLORS.error },

    errorBox: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 15 },
    errorText: { color: COLORS.error, fontSize: 12 },

    listContent: { paddingBottom: 20 },
    
    emptyContainer: { marginTop: 50, alignItems: 'center' },
    emptyText: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '600' },
    emptySub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, opacity: 0.7 },
});