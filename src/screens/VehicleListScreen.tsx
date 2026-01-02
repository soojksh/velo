import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { 
    FlatList, 
    View, 
    StyleSheet, 
    Text, 
    Dimensions, 
    Animated, 
    Easing, 
    ActivityIndicator 
} from 'react-native';
import Geocoder from 'react-native-geocoder'; 
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicleStore } from '../store/vehicleStore'; 
import { COLORS, SHADOWS } from '../config/theme';

const { width } = Dimensions.get('window');

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

// --- EXPERT ANIMATION COMPONENT (Slower & Smoother) ---
const EmptyStateAnimation = () => {
    // Animation Values
    const driveAnim = useRef(new Animated.Value(0)).current;
    const cityAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const roadAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Truck Driving (Slower Duration)
        const driveLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(driveAnim, {
                    toValue: 1,
                    duration: 6000, // Slower movement (6 seconds)
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1), 
                    useNativeDriver: true,
                }),
                Animated.timing(driveAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        );

        // 2. City Parallax (Slower to match)
        const cityLoop = Animated.loop(
            Animated.timing(cityAnim, {
                toValue: 1,
                duration: 12000, 
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        // 3. Road Markings (Slower)
        const roadLoop = Animated.loop(
            Animated.timing(roadAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        // 4. Radar Ripple Effect
        const radarLoop = Animated.loop(
            Animated.parallel([
                Animated.timing(rippleAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                })
            ])
        );

        driveLoop.start();
        cityLoop.start();
        roadLoop.start();
        radarLoop.start();

        return () => {
            driveLoop.stop();
            cityLoop.stop();
            roadLoop.stop();
            radarLoop.stop();
        };
    }, []);

    // Interpolations
    const vehicleX = driveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [width + 60, -60] // Starts Right, Ends Left
    });

    const cityX = cityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 100] // Moves slightly Right to create Leftward Parallax
    });

    const roadX = roadAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 100] // Road lines move Right
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 3]
    });

    return (
        <View style={styles.emptyContainer}>
            {/* --- SCANNER RADAR --- */}
            <View style={styles.radarWrapper}>
                <Animated.View style={[
                    styles.radarRing, 
                    {
                        transform: [{ scale: rippleScale }], 
                        opacity: opacityAnim,
                        borderWidth: 2, 
                    }
                ]} />
                 <Animated.View style={[
                    styles.radarRing, 
                    {
                        transform: [{ scale: Animated.multiply(rippleScale, 0.7) }], 
                        opacity: opacityAnim,
                        borderWidth: 1,
                    }
                ]} />
                <View style={styles.radarCenter}>
                    <ActivityIndicator color="white" size="small" />
                </View>
            </View>

            <View style={styles.spacer} />

            {/* --- SCENE CONTAINER --- */}
            <View style={styles.sceneContainer}>
                {/* Background City (Parallax) */}
                <Animated.View style={[styles.citySkyline, { transform: [{ translateX: cityX }] }]}>
                    <View style={[styles.building, { height: 40, left: -50 }]} />
                    <View style={[styles.building, { height: 60, left: 0 }]} />
                    <View style={[styles.building, { height: 30, left: 40 }]} />
                    <View style={[styles.building, { height: 50, left: 80 }]} />
                    <View style={[styles.building, { height: 25, left: 130 }]} />
                    <View style={[styles.building, { height: 45, left: 170 }]} />
                    <View style={[styles.building, { height: 70, left: 220 }]} />
                    <View style={[styles.building, { height: 35, left: 270 }]} />
                    <View style={[styles.building, { height: 55, left: 320 }]} />
                </Animated.View>

                {/* Road */}
                <View style={styles.road}>
                    <Animated.View style={{ 
                        flexDirection: 'row', 
                        width: '200%', 
                        transform: [{ translateX: roadX }] 
                    }}>
                        <View style={styles.roadMarking} />
                        <View style={[styles.roadMarking, { marginLeft: 80 }]} />
                        <View style={[styles.roadMarking, { marginLeft: 80 }]} />
                        <View style={[styles.roadMarking, { marginLeft: 80 }]} />
                        <View style={[styles.roadMarking, { marginLeft: 80 }]} />
                        <View style={[styles.roadMarking, { marginLeft: 80 }]} />
                    </Animated.View>
                </View>

                {/* Moving Vehicle */}
                <Animated.View style={[styles.vehicleWrapper, { transform: [{ translateX: vehicleX }] }]}>
                    <View style={styles.shadow} />
                    <Text style={styles.vehicleIcon}>🚚</Text>
                    <View style={styles.windContainer}>
                        <View style={styles.windTop} />
                        <View style={styles.windBottom} />
                    </View>
                </Animated.View>
            </View>

            {/* --- STATUS TEXT --- */}
            <View style={styles.textWrapper}>
                <Text style={styles.titleText}>Scanning Network...</Text>
                <Text style={styles.subText}>Waiting for vehicles to come online</Text>
            </View>
        </View>
    );
};

// --- SMART WRAPPER COMPONENT ---
const SmartVehicleItem = memo(({ vehicleId, navigation }: { vehicleId: string, navigation: any }) => {
    const item = useVehicleStore(state => state.vehicles[vehicleId]);

    const [address, setAddress] = useState<string | null>(
        ADDRESS_CACHE[vehicleId] ? ADDRESS_CACHE[vehicleId].address : null
    );
    
    const isFetching = useRef(false);

    useEffect(() => {
        if (!item) return;

        if (!shouldRefetch(item.id, item.latitude, item.longitude)) {
            const cachedAddr = ADDRESS_CACHE[item.id]?.address;
            if (cachedAddr && address !== cachedAddr) {
                setAddress(cachedAddr);
            }
            return;
        }

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

                    ADDRESS_CACHE[item.id] = {
                        lat: item.latitude,
                        lng: item.longitude,
                        address: formatted,
                        timestamp: Date.now()
                    };

                    setAddress((prev) => (prev !== formatted ? formatted : prev));
                }
            } catch {
                // Fail silently
            } finally {
                isFetching.current = false;
            }
        }, 1000); 

        return () => clearTimeout(timer);
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
            ListEmptyComponent={<EmptyStateAnimation />}
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

    listContent: { paddingBottom: 20, flexGrow: 1 },
    
    emptyContainer: { 
        flex: 1,
        height: 500,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', 
        paddingTop: 60, 
    },
    radarWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    radarCenter: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        zIndex: 10,
        ...SHADOWS.medium
    },
    radarRing: {
        position: 'absolute',
        width: '100%', height: '100%',
        borderRadius: 50,
        borderColor: COLORS.primaryLight,
        backgroundColor: 'rgba(5, 157, 245, 0.1)', 
        zIndex: 1,
    },
    spacer: { 
        height: 30 
    },    
    sceneContainer: {
        width: '100%',
        height: 140, 
        position: 'relative',
        justifyContent: 'flex-end',
        marginBottom: 30,
        overflow: 'hidden' 
    },
    citySkyline: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        position: 'absolute',
        bottom: 14, 
        width: '200%', 
        opacity: 0.3,
    },
    building: {
        width: 30,
        backgroundColor: '#94a3b8', 
        marginRight: 15,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        position: 'absolute',
        bottom: 0,
    },
    road: {
        height: 4,
        backgroundColor: '#cbd5e1',
        width: '100%',
        position: 'absolute',
        bottom: 10,
        borderRadius: 2,
        overflow: 'hidden'
    },
    roadMarking: {
        width: 40,
        height: 2,
        backgroundColor: 'white',
        opacity: 0.9,
        marginTop: 1 
    },
    vehicleWrapper: {
        position: 'absolute',
        bottom: 13, 
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    vehicleIcon: {
        fontSize: 48, 
    },
    shadow: {
        position: 'absolute',
        bottom: 2,
        left: 5,
        width: 38,
        height: 6,
        backgroundColor: 'black',
        borderRadius: 10,
        opacity: 0.15,
        transform: [{ scaleX: 1.2 }]
    },
    windContainer: {
        position: 'absolute',
        right: -25, 
        top: 20,
        transform: [{ rotate: '180deg' }] 
    },
    windTop: {
        width: 20, height: 3, backgroundColor: '#cbd5e1',
        marginBottom: 4, borderRadius: 2, opacity: 0.8
    },
    windBottom: {
        width: 12, height: 3, backgroundColor: '#cbd5e1',
        marginLeft: 8, borderRadius: 2, opacity: 0.6
    },
    
    textWrapper: { alignItems: 'center' },
    titleText: { 
        fontSize: 18, 
        color: COLORS.textPrimary, 
        fontWeight: '800', 
        marginBottom: 6,
        letterSpacing: 0.5
    },
    subText: { 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        fontWeight: '500',
        opacity: 0.8 
    },
});