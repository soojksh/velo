import React, { useState, useEffect, useRef, memo } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
// --- NEW IMPORT ---
import Geocoder from 'react-native-geocoder'; 
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicles } from '../context/VehicleContext';
import { COLORS } from '../config/theme';

// --- GLOBAL MEMORY CACHE ---
// Stores addresses to prevent re-fetching the same location
const ADDRESS_CACHE: Record<string, { lat: number; lng: number; address: string; timestamp: number }> = {};

// Helper: Only refetch if moved > ~20 meters
const shouldRefetch = (id: string, newLat: number, newLng: number) => {
    const cached = ADDRESS_CACHE[id];
    if (!cached) return true;
    
    const diffLat = Math.abs(cached.lat - newLat);
    const diffLng = Math.abs(cached.lng - newLng);
    return diffLat > 0.0002 || diffLng > 0.0002;
};

// --- SMART WRAPPER COMPONENT ---
// Handles geocoding for a SINGLE item so the whole list doesn't re-render
const SmartVehicleItem = memo(({ item, navigation }: { item: any, navigation: any }) => {
    const [address, setAddress] = useState<string | null>(
        ADDRESS_CACHE[item.id] ? ADDRESS_CACHE[item.id].address : null
    );
    
    // Using useRef to track fetch status avoids unnecessary re-renders
    const isFetching = useRef(false);

    useEffect(() => {
        // 1. Check Cache first
        if (!shouldRefetch(item.id, item.latitude, item.longitude)) {
            setAddress(ADDRESS_CACHE[item.id].address);
            return;
        }

        // 2. Debounce (Wait 1s of stability before asking Native OS)
        const timer = setTimeout(async () => {
            if (isFetching.current) return;
            
            try {
                isFetching.current = true;
                
                // --- NATIVE GEOCODING CALL ---
                const res = await Geocoder.geocodePosition({
                    lat: item.latitude,
                    lng: item.longitude
                });

                if (res && res.length > 0) {
                    const data = res[0];
                    
                    // Intelligent Formatting: Street -> Neighborhood -> City
                    const parts = [
                        data.streetName,
                        data.subLocality,
                        data.locality
                    ];
                    
                    // Filter out empty parts and join
                    let formatted = parts.filter(Boolean).join(', ');
                    
                    // Fallback to formattedAddress if the parts are too short
                    if (formatted.length < 5 && data.formattedAddress) {
                        formatted = data.formattedAddress;
                    }

                    // Save to Cache
                    ADDRESS_CACHE[item.id] = {
                        lat: item.latitude,
                        lng: item.longitude,
                        address: formatted,
                        timestamp: Date.now()
                    };

                    setAddress(formatted);
                }
            } catch (err) {
                // If native geocoder fails (e.g., no internet), we fail silently 
                // and the UI will just show coordinates (handled in VehicleListItem)
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
            address={address} 
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
            // Use the Smart Wrapper here
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