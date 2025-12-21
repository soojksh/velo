import React, { useEffect, useRef, useMemo, useLayoutEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  BackHandler, // <--- 1. Import BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVehicles } from '../context/VehicleContext';
import { COLORS, SHADOWS } from '../config/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.55; 
const SHEET_MIN_HEIGHT = 120;
const SHEET_RANGE = SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;

export default function LiveMapScreen({ route, navigation }: any) {
  const { vehicleId } = route.params || {};
  const { vehicles } = useVehicles();
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  const animatedValue = useRef(new Animated.Value(0)).current; 
  const currentValue = useRef(0);
  const lastPosition = useRef(0);

  // Address State
  const [address, setAddress] = useState<string>('Locating address...');
  
  // Refs for throttling
  const lastFetchCoords = useRef<{lat: number, lng: number} | null>(null);
  const lastFetchTime = useRef<number>(0);

  const targetVehicle = vehicleId ? vehicles[vehicleId] : null;
  const displayedVehicles = useMemo(() => {
    return targetVehicle ? [targetVehicle] : [];
  }, [targetVehicle]);

  // Remove Default Header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- 2. SYSTEM BACK BUTTON HANDLER ---
  useEffect(() => {
    const onBackPress = () => {
      // Logic: If user presses system back, go back to previous screen (Vehicle List)
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true; // Tell system "We handled this event, don't close the app"
      }
      return false; // Let system handle it (e.g. exit app if no screens left)
    };

    // Add Listener
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    // Cleanup on unmount
    return () => subscription.remove();
  }, [navigation]);


  // --- ADDRESS FETCHING LOGIC ---
  useEffect(() => {
    if (!targetVehicle) return;

    const lat = targetVehicle.latitude;
    const lng = targetVehicle.longitude;
    const now = Date.now();

    if (lastFetchCoords.current) {
        const diffLat = Math.abs(lastFetchCoords.current.lat - lat);
        const diffLng = Math.abs(lastFetchCoords.current.lng - lng);
        if (diffLat < 0.0002 && diffLng < 0.0002) {
            return; 
        }
    }

    if (now - lastFetchTime.current < 3000) {
        return;
    }

    let isMounted = true;
    const fetchAddress = async () => {
        try {
            lastFetchTime.current = Date.now();
            lastFetchCoords.current = { lat, lng };

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
                { 
                    headers: { 'User-Agent': 'VeloTrackerApp/1.0' } 
                }
            );
            
            if (!response.ok) return;

            const data = await response.json();
            
            if (isMounted && data.address) {
                const specific = data.address.hamlet || data.address.pedestrian || data.address.road || '';
                const general = data.address.village || data.address.municipality || data.address.town || data.address.city || '';
                const district = data.address.county || data.address.district || '';

                let fullAddr = [specific, general, district].filter(Boolean).join(', ');

                if (fullAddr.length < 5) {
                    fullAddr = data.display_name.split(',').slice(0, 3).join(',');
                }

                setAddress(fullAddr);
            }
        } catch {
             // Silent fail
        }
    };

    fetchAddress();

    return () => { isMounted = false; };
  }, [targetVehicle]); 

  // Animation Listener
  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => {
      currentValue.current = value;
    });
    return () => {
      animatedValue.removeListener(id);
    };
  }, [animatedValue]);

  // Pan Responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animatedValue.setOffset(currentValue.current);
        animatedValue.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const progressDelta = -(gestureState.dy / SHEET_RANGE);
        animatedValue.setValue(progressDelta);
      },
      onPanResponderRelease: (_, gestureState) => {
        animatedValue.flattenOffset();
        const progress = currentValue.current;
        let toValue = 0; 
        if ((lastPosition.current === 0 && progress > 0.2) || (gestureState.vy < -0.5)) toValue = 1;
        else if ((lastPosition.current === 1 && progress < 0.8) || (gestureState.vy > 0.5)) toValue = 0;
        else toValue = lastPosition.current;

        Animated.spring(animatedValue, {
            toValue, friction: 6, tension: 50, useNativeDriver: false,
        }).start();
        lastPosition.current = toValue;
      },
    })
  ).current;

  const bottomSheetStyle = {
    height: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SHEET_MIN_HEIGHT + insets.bottom, SHEET_MAX_HEIGHT],
        extrapolate: 'clamp',
    }),
  };

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style> body { margin: 0; padding: 0; } #map { width: 100%; height: 100vh; } </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([27.7172, 85.3240], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            var markers = {};
            document.addEventListener('message', function(event) { handleUpdate(event.data); });
            window.addEventListener('message', function(event) { handleUpdate(event.data); });

            function handleUpdate(dataStr) {
                try {
                    var data = JSON.parse(dataStr);
                    var vehicles = data.vehicles;
                    var targetId = data.targetId;

                    Object.keys(markers).forEach(function(id) {
                         if (!vehicles.find(v => v.id === id)) {
                             map.removeLayer(markers[id]);
                             delete markers[id];
                         }
                    });

                    vehicles.forEach(function(v) {
                        if (markers[v.id]) {
                            markers[v.id].setLatLng([v.latitude, v.longitude]);
                        } else {
                            var color = 'blue';
                            var marker = L.circleMarker([v.latitude, v.longitude], {
                                radius: 12, fillColor: color, color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.8
                            }).addTo(map);
                            markers[v.id] = marker;
                        }
                    });

                    if (targetId && vehicles.find(v => v.id === targetId)) {
                        var v = vehicles.find(v => v.id === targetId);
                        map.panTo([v.latitude, v.longitude]);
                    }
                } catch (e) {}
            }
        </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (webViewRef.current) {
        const data = JSON.stringify({ vehicles: displayedVehicles, targetId: vehicleId });
        webViewRef.current.postMessage(data);
    }
  }, [displayedVehicles, vehicleId]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: leafletHtml }}
        style={styles.map}
        onLoadEnd={() => {
            if (webViewRef.current) {
                const data = JSON.stringify({ vehicles: displayedVehicles, targetId: vehicleId });
                webViewRef.current.postMessage(data);
            }
        }}
      />

      {/* Custom Back Button (Still useful for UI, but now Hardware Back works too) */}
      {/* <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity> */}

      <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
        </View>

        <View style={styles.sheetContent}>
            {targetVehicle ? (
                <>
                    <View style={styles.sheetHeader}>
                        <View style={styles.textContainer}>
                            <Text style={styles.vehicleTitle}>{targetVehicle.id}</Text>
                            <View style={styles.addressRow}>
                                <Text style={styles.pinIcon}>📍</Text>
                                <Text style={styles.addressText} numberOfLines={2}>
                                    {address}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.speedBadge}>
                            <Text style={styles.speedValue}>{targetVehicle.speed || 0}</Text>
                            <Text style={styles.speedUnit}>km/h</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>LATITUDE</Text>
                            <Text style={styles.detailValue}>{targetVehicle.latitude.toFixed(5)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>LONGITUDE</Text>
                            <Text style={styles.detailValue}>{targetVehicle.longitude.toFixed(5)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>LAST UPDATE</Text>
                            <Text style={styles.detailValue}>
                                {new Date(targetVehicle.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>STATUS</Text>
                            <Text style={styles.statusValue}>Online</Text>
                        </View>
                    </View>
                </>
            ) : (
                <View style={styles.centerContent}>
                    <Text style={styles.placeholderText}>Connecting to vehicle...</Text>
                    <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
                </View>
            )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  map: { flex: 1 },
  
  backButton: {
    position: 'absolute', left: 20, width: 40, height: 40,
    backgroundColor: 'white', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.medium, zIndex: 10,
  },
  backButtonText: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: -2 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.medium, elevation: 20, overflow: 'hidden',
  },
  dragHandleArea: {
    height: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2,
  },
  sheetContent: {
    flex: 1, paddingHorizontal: 24, paddingBottom: 20,
  },

  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10,
  },
  textContainer: {
    flex: 1, paddingRight: 10,
  },
  vehicleTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pinIcon: { fontSize: 12, marginRight: 4, marginTop: 2 },
  addressText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, flex: 1 },
  
  speedBadge: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
  },
  speedValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  speedUnit: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailItem: { width: '48%', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 10 },
  detailLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', marginBottom: 4 },
  detailValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  statusValue: { fontSize: 14, color: COLORS.success, fontWeight: '600' },

  centerContent: { alignItems: 'center', marginTop: 20 },
  placeholderText: { color: COLORS.textSecondary },
  spinner: { marginTop: 10 },
});