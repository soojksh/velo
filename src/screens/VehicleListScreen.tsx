import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { FlatList, View, StyleSheet, Text } from 'react-native';
import Geocoder from 'react-native-geocoder'; 
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicleStore } from '../store/vehicleStore'; 
import { COLORS } from '../config/theme';

// --- GLOBAL MEMORY CACHE ---
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
const SmartVehicleItem = memo(({ vehicleId, navigation }: { vehicleId: string, navigation: any }) => {
    // SELECTOR: Subscribes ONLY to this specific vehicle's data
    const item = useVehicleStore(state => state.vehicles[vehicleId]);

    const [address, setAddress] = useState<string | null>(
        ADDRESS_CACHE[vehicleId] ? ADDRESS_CACHE[vehicleId].address : null
    );
    
    const isFetching = useRef(false);

    // Guard Clause: Render nothing if item is missing (deleted)
    // We return null at the end, but we need to check validity for hooks logic
    
    useEffect(() => {
        if (!item) return;

        // 1. Check Cache first
        // If we don't need to refetch, simply sync with cache if state differs
        if (!shouldRefetch(item.id, item.latitude, item.longitude)) {
            const cachedAddr = ADDRESS_CACHE[item.id]?.address;
            if (cachedAddr && address !== cachedAddr) {
                setAddress(cachedAddr);
            }
            return;
        }

        // 2. Debounce Network Request
        const timer = setTimeout(async () => {
            if (isFetching.current) return;
            
            try {
                isFetching.current = true;
                
                const res = await Geocoder.geocodePosition({
                    lat: item.latitude,
                    lng: item.longitude
                });

                if (res && res.length > 0) {
                    const data = res[0];
                    const parts = [
                        data.streetName,
                        data.subLocality,
                        data.locality
                    ];
                    
                    let formatted = parts.filter(Boolean).join(', ');
                    
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

                    // Only update state if it actually changed
                    setAddress((prev) => (prev !== formatted ? formatted : prev));
                }
            } catch {
                // Fail silently
            } finally {
                isFetching.current = false;
            }
        }, 1000); 

        return () => clearTimeout(timer);
    // Added 'address' to dependencies to satisfy linter. 
    // The strict check (address !== cachedAddr) prevents infinite loops.
    }, [item, address]); 

    if (!item) return null;

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
  // OPTIMIZATION TRICK:
  // Instead of passing a custom equality function (which caused your TS error),
  // we select the Keys as a JSON string.
  // 1. The selector runs. If vehicles change positions, keys are same -> string is same.
  // 2. Zustand sees string hasn't changed -> No Re-render.
  // 3. We parse it back to an array inside the component.
  const vehicleIdsString = useVehicleStore((state) => JSON.stringify(Object.keys(state.vehicles)));
  
  const vehicleIds = useMemo(() => JSON.parse(vehicleIdsString), [vehicleIdsString]);
  
  const isConnected = useVehicleStore((state) => state.isConnected);
  const connectionError = useVehicleStore((state) => state.connectionError);

  return (
    <ScreenContainer>
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Live Vehicle</Text>
                {/* <Text style={styles.subtitle}>Real-time monitoring</Text> */}
            </View>
            {/* <View style={[styles.badge, isConnected ? styles.badgeSuccess : styles.badgeError]}>
                <Text style={[styles.badgeText, isConnected ? styles.textSuccess : styles.textError]}>
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                </Text>
            </View> */}
        </View>
        
        {connectionError && (
            <View style={styles.errorBox}>
                <Text style={styles.errorText}>{connectionError}</Text>
            </View>
        )}

        <FlatList
            contentContainerStyle={styles.listContent}
            data={vehicleIds} 
            keyExtractor={(id) => id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: id }) => (
                <SmartVehicleItem vehicleId={id} navigation={navigation} />
            )}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Waiting for vehicles...</Text>
                    {/* <Text style={styles.emptySub}>Ensure your MQTT devices are transmitting.</Text> */}
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