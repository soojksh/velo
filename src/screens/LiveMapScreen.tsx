import React, { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVehicles } from '../context/VehicleContext';
import { COLORS, SHADOWS } from '../config/theme';

const SHEET_MAX_HEIGHT = 320; // Expanded height
const SHEET_MIN_HEIGHT = 110; // Collapsed height
const DRAG_THRESHOLD = 50;

export default function LiveMapScreen({ route, navigation }: any) {
  const { vehicleId } = route.params || {};
  const { vehicles } = useVehicles();
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  const animatedValue = useRef(new Animated.Value(0)).current; 
  const lastGestureDy = useRef(0);

  // Data
  const allVehicles = useMemo(() => Object.values(vehicles), [vehicles]);
  const targetVehicle = vehicleId ? vehicles[vehicleId] : null;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animatedValue.setOffset(lastGestureDy.current);
        animatedValue.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0 && lastGestureDy.current === 0) {
             animatedValue.setValue(gestureState.dy / - (SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT));
        } else if (gestureState.dy > 0 && lastGestureDy.current === 1) {
             animatedValue.setValue(1 - (gestureState.dy / (SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        animatedValue.flattenOffset();
        
        if (gestureState.dy < -DRAG_THRESHOLD) {
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: false, 
            }).start();
            lastGestureDy.current = 1;
        } else if (gestureState.dy > DRAG_THRESHOLD) {
            Animated.spring(animatedValue, {
                toValue: 0,
                useNativeDriver: false,
            }).start();
            lastGestureDy.current = 0;
        } else {
            Animated.spring(animatedValue, {
                toValue: lastGestureDy.current,
                useNativeDriver: false,
            }).start();
        }
      },
    })
  ).current;

  const bottomSheetStyle = {
    height: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SHEET_MIN_HEIGHT + insets.bottom, SHEET_MAX_HEIGHT],
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

                    vehicles.forEach(function(v) {
                        if (markers[v.id]) {
                            markers[v.id].setLatLng([v.latitude, v.longitude]);
                        } else {
                            var color = (v.id === targetId) ? 'blue' : 'red';
                            var marker = L.circleMarker([v.latitude, v.longitude], {
                                radius: 10, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8
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
        const data = JSON.stringify({ vehicles: allVehicles, targetId: vehicleId });
        webViewRef.current.postMessage(data);
    }
  }, [allVehicles, vehicleId]);

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
                const data = JSON.stringify({ vehicles: allVehicles, targetId: vehicleId });
                webViewRef.current.postMessage(data);
            }
        }}
      />

      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
        </View>

        <View style={styles.sheetContent}>
            {targetVehicle ? (
                <>
                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={styles.vehicleTitle}>Vehicle {targetVehicle.id}</Text>
                            <Text style={styles.statusText}>● Online & Transmitting</Text>
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
                            <Text style={styles.detailValue}>{targetVehicle.latitude.toFixed(6)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>LONGITUDE</Text>
                            <Text style={styles.detailValue}>{targetVehicle.longitude.toFixed(6)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>LAST UPDATE</Text>
                            <Text style={styles.detailValue}>
                                {new Date(targetVehicle.timestamp).toLocaleTimeString()}
                            </Text>
                        </View>
                    </View>
                </>
            ) : (
                <View style={styles.centerContent}>
                    <Text style={styles.placeholderText}>Select a vehicle to view details</Text>
                </View>
            )}
        </View>
      </Animated.View>

      {allVehicles.length === 0 && (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  map: { flex: 1 },
  
  // Back Button
  backButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    zIndex: 10,
  },
  backButtonText: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: -2 },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...SHADOWS.medium,
    elevation: 20, 
  },
  dragHandleArea: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statusText: { fontSize: 14, color: COLORS.success, marginTop: 4, fontWeight: '600' },
  
  speedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  speedValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  speedUnit: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', marginBottom: 4 },
  detailValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },

  centerContent: { alignItems: 'center', marginTop: 20 },
  placeholderText: { color: COLORS.textSecondary },

  loading: {
    position: 'absolute', top: 50, alignSelf: 'center',
    backgroundColor: 'white', padding: 10, borderRadius: 20,
    ...SHADOWS.small
  }
});