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
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVehicles } from '../context/VehicleContext';
import { COLORS, SHADOWS } from '../config/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Dimensions for Sheet and Button positioning
const SHEET_MIN_HEIGHT = 140; 
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.55; 
const SHEET_RANGE = SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;

export default function LiveMapScreen({ route, navigation }: any) {
  const { vehicleId } = route.params || {};
  const { vehicles } = useVehicles();
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  
  // Shared Animation Value for Sheet AND Button
  const animatedValue = useRef(new Animated.Value(0)).current; 
  const currentValue = useRef(0);
  const lastPosition = useRef(0);

  const [address, setAddress] = useState<string>('Locating address...');
  const lastFetchCoords = useRef<{lat: number, lng: number} | null>(null);
  const lastFetchTime = useRef<number>(0);

  const targetVehicle = vehicleId ? vehicles[vehicleId] : null;
  const displayedVehicles = useMemo(() => {
    return targetVehicle ? [targetVehicle] : [];
  }, [targetVehicle]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // System Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  // Manual Re-Center Function
  const handleRecenter = () => {
    if (webViewRef.current && targetVehicle) {
        webViewRef.current.postMessage(JSON.stringify({ 
            type: 'RECENTER', 
            payload: { lat: targetVehicle.latitude, lng: targetVehicle.longitude } 
        }));
    }
  };

  // Address Fetching
  useEffect(() => {
    if (!targetVehicle) return;
    const lat = targetVehicle.latitude;
    const lng = targetVehicle.longitude;
    const now = Date.now();

    if (lastFetchCoords.current) {
        const diffLat = Math.abs(lastFetchCoords.current.lat - lat);
        const diffLng = Math.abs(lastFetchCoords.current.lng - lng);
        if (diffLat < 0.0002 && diffLng < 0.0002) return; 
    }
    if (now - lastFetchTime.current < 3000) return;

    let isMounted = true;
    const fetchAddress = async () => {
        try {
            lastFetchTime.current = Date.now();
            lastFetchCoords.current = { lat, lng };
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
                { headers: { 'User-Agent': 'VeloTrackerApp/1.0' } }
            );
            if (!response.ok) return;
            const data = await response.json();
            if (isMounted && data.address) {
                const specific = data.address.hamlet || data.address.pedestrian || data.address.road || '';
                const general = data.address.village || data.address.municipality || data.address.town || data.address.city || '';
                const district = data.address.county || data.address.district || '';
                let fullAddr = [specific, general, district].filter(Boolean).join(', ');
                if (fullAddr.length < 5) fullAddr = data.display_name.split(',').slice(0, 3).join(',');
                setAddress(fullAddr);
            }
        } catch {}
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

  // 1. Interpolate Sheet Height
  const bottomSheetStyle = {
    height: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SHEET_MIN_HEIGHT + insets.bottom, SHEET_MAX_HEIGHT],
        extrapolate: 'clamp',
    }),
  };

  // 2. Interpolate Button Position (Rides on top of the sheet)
  const buttonStyle = {
    bottom: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SHEET_MIN_HEIGHT + 20 + insets.bottom, SHEET_MAX_HEIGHT + 20],
        extrapolate: 'clamp',
    }),
  };

  // --- EXPERT MAP LOGIC (NO JITTER, CORRECT PATH) ---
  const mapLibreHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
        <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
        <style> 
            body { margin: 0; padding: 0; } 
            #map { width: 100%; height: 100vh; } 
            
            /* -- FIXED MARKER STYLING -- */
            .vehicle-marker {
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform-origin: center center;
                /* IMPORTANT: Removed transition/animation properties here to prevent JS conflict */
            }
            /* SVG inside the marker */
            .vehicle-marker svg {
                filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // TRUCK SVG
            const TRUCK_SVG = \`
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="white" stroke="#059df5" stroke-width="2"/>
                <path d="M12 4L19 19L12 16L5 19L12 4Z" fill="#059df5"/>
            </svg>
            \`;

            var map = new maplibregl.Map({
                container: 'map',
                style: {
                    'version': 8,
                    'sources': {
                        'osm-raster-tiles': {
                            'type': 'raster',
                            'tiles': ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            'tileSize': 256,
                            'attribution': '&copy; OpenStreetMap'
                        }
                    },
                    'layers': [
                        { 'id': 'osm-raster-layer', 'type': 'raster', 'source': 'osm-raster-tiles', 'minzoom': 0, 'maxzoom': 19 }
                    ]
                },
                center: [85.3240, 27.7172],
                zoom: 15, 
                pitch: 0, // Flat view reduces jitter perception
                attributionControl: false
            });

            var markers = {};
            var pathHistory = []; 
            var traceSourceId = 'vehicle-trace';
            var animState = {}; 
            const ANIMATION_DURATION = 15000;

            // --- BEARING CALCULATION ---
            function getBearing(startLat, startLng, destLat, destLng) {
                var startLatRad = startLat * (Math.PI / 180);
                var startLngRad = startLng * (Math.PI / 180);
                var destLatRad = destLat * (Math.PI / 180);
                var destLngRad = destLng * (Math.PI / 180);

                var y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
                var x = Math.cos(startLatRad) * Math.sin(destLatRad) -
                        Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
                
                var brng = Math.atan2(y, x);
                brng = brng * (180 / Math.PI);
                return (brng + 360) % 360;
            }

            map.on('load', function() {
                map.addSource(traceSourceId, {
                    'type': 'geojson',
                    'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
                });
                map.addLayer({
                    'id': 'trace-layer',
                    'type': 'line',
                    'source': traceSourceId,
                    'layout': { 'line-join': 'round', 'line-cap': 'round' },
                    'paint': { 
                        'line-color': '#059df5', 
                        'line-width': 6, 
                        'line-opacity': 0.7 
                    }
                });
            });

            document.addEventListener('message', function(event) { handleMessage(event.data); });
            window.addEventListener('message', function(event) { handleMessage(event.data); });

            function handleMessage(payload) {
                try {
                    var msg = JSON.parse(payload);
                    
                    // --- RECENTER EVENT ---
                    if (msg.type === 'RECENTER') {
                        map.flyTo({
                            center: [msg.payload.lng, msg.payload.lat],
                            zoom: 16,
                            speed: 1.5,
                            curve: 1
                        });
                        return;
                    }

                    // --- VEHICLE UPDATE ---
                    var vehicles = msg.vehicles;
                    var targetId = msg.targetId;
                    
                    // Cleanup
                    Object.keys(markers).forEach(function(id) {
                         if (!vehicles.find(v => v.id === id)) {
                             markers[id].remove();
                             delete markers[id];
                             if (animState[id]) cancelAnimationFrame(animState[id].requestID);
                         }
                    });

                    vehicles.forEach(function(v) {
                        var targetLngLat = [v.longitude, v.latitude];

                        if (markers[v.id]) {
                            // Animate existing
                            var currentLngLat = markers[v.id].getLngLat();
                            var startLngLat = [currentLngLat.lng, currentLngLat.lat];

                            if (startLngLat[0] !== targetLngLat[0] || startLngLat[1] !== targetLngLat[1]) {
                                var bearing = getBearing(startLngLat[1], startLngLat[0], targetLngLat[1], targetLngLat[0]);
                                animateMarker(v.id, startLngLat, targetLngLat, bearing);
                            }
                        } else {
                            // Create new
                            var el = document.createElement('div');
                            el.className = 'vehicle-marker';
                            el.innerHTML = TRUCK_SVG;
                            
                            var marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
                                .setLngLat(targetLngLat)
                                .addTo(map);
                            markers[v.id] = marker;

                            // Initialize path history with START point
                            if (v.id === targetId && pathHistory.length === 0) {
                                pathHistory.push(targetLngLat);
                            }
                        }
                    });

                    // REMOVED AUTO-FOLLOW HERE to fix re-center issue
                } catch (e) { }
            }

            function animateMarker(id, start, end, bearing) {
                var startTime = performance.now();
                
                // Set rotation immediately to face new point
                if (markers[id]) markers[id].setRotation(bearing);

                // Push START point to history if it's new (prevents erasing)
                var lastHist = pathHistory[pathHistory.length-1];
                if (!lastHist || (lastHist[0] !== start[0] || lastHist[1] !== start[1])) {
                    pathHistory.push(start);
                }

                function loop(now) {
                    var elapsed = now - startTime;
                    var progress = Math.min(elapsed / ANIMATION_DURATION, 1);

                    var lng = start[0] + (end[0] - start[0]) * progress;
                    var lat = start[1] + (end[1] - start[1]) * progress;
                    var currentPos = [lng, lat];

                    // 1. Move Marker
                    if (markers[id]) markers[id].setLngLat(currentPos);

                    // 2. Draw Trace: History + Current Tip
                    if (map.getSource(traceSourceId)) {
                        // We construct a new array for visualization: History + [CurrentMovingPoint]
                        var livePath = [...pathHistory, currentPos];
                        
                        map.getSource(traceSourceId).setData({
                            'type': 'Feature', 
                            'properties': {}, 
                            'geometry': { 'type': 'LineString', 'coordinates': livePath }
                        });
                    }

                    if (progress < 1) {
                        animState[id] = { requestID: requestAnimationFrame(loop) };
                    } else {
                        // Animation Complete: Commit the END point to history
                        pathHistory.push(end);
                        if (markers[id]) markers[id].setLngLat(end);
                    }
                }

                if (animState[id]) cancelAnimationFrame(animState[id].requestID);
                animState[id] = { requestID: requestAnimationFrame(loop) };
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
        source={{ html: mapLibreHtml }}
        style={styles.map}
        onLoadEnd={() => {
            if (webViewRef.current) {
                const data = JSON.stringify({ vehicles: displayedVehicles, targetId: vehicleId });
                webViewRef.current.postMessage(data);
            }
        }}
      />

      {/* Floating Back Button */}
      <TouchableOpacity 
        style={[styles.fab, styles.backFab, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.fabIcon}>←</Text>
      </TouchableOpacity>

      {/* RECENTER BUTTON: Animated to ride the sheet */}
      <Animated.View style={[styles.fabWrapper, buttonStyle]}>
          <TouchableOpacity 
            style={[styles.fab, styles.recenterFab]} 
            onPress={handleRecenter}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>🎯</Text>
          </TouchableOpacity>
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
        </View>

        <View style={styles.sheetContent}>
            {targetVehicle ? (
                <>
                    <View style={styles.sheetHeader}>
                        <View style={styles.textContainer}>
                            <View style={styles.titleRow}>
                                <Text style={styles.vehicleTitle}>{targetVehicle.id}</Text>
                                <View style={styles.liveTag}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                            </View>
                            
                            <View style={styles.addressRow}>
                                <Text style={styles.pinIcon}>📍</Text>
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {address}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.speedBadge}>
                            <Text style={styles.speedLabel}>SPEED</Text>
                            <Text style={styles.speedValue}>{targetVehicle.speed || 0}</Text>
                            <Text style={styles.speedUnit}>km/h</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>LATITUDE</Text>
                            <Text style={styles.statValue}>{targetVehicle.latitude.toFixed(5)}</Text>
                        </View>
                        <View style={[styles.statItem, styles.statBorder]}>
                            <Text style={styles.statLabel}>LONGITUDE</Text>
                            <Text style={styles.statValue}>{targetVehicle.longitude.toFixed(5)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>UPDATED</Text>
                            <Text style={styles.statValue}>
                                {new Date(targetVehicle.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </View>
                    </View>
                </>
            ) : (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.placeholderText}>Connecting to satellite...</Text>
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
  
  // Wrapper for Animated Position
  fabWrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  fab: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    elevation: 5,
  },
  backFab: { position: 'absolute', left: 20, zIndex: 20 },
  recenterFab: { backgroundColor: COLORS.primary },
  fabIcon: { fontSize: 22, color: COLORS.textPrimary }, 
  
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    ...SHADOWS.medium, elevation: 25, overflow: 'hidden',
  },
  dragHandleArea: {
    height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
  },
  dragHandle: {
    width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10,
  },
  sheetContent: {
    flex: 1, paddingHorizontal: 24, paddingBottom: 30,
  },

  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  textContainer: { flex: 1, paddingRight: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vehicleTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginRight: 8 },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe4e6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f43f5e', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#f43f5e' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  pinIcon: { fontSize: 14, marginRight: 4, color: COLORS.textSecondary },
  addressText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  speedBadge: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', 
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#dbeafe'
  },
  speedLabel: { fontSize: 9, fontWeight: '900', color: '#3b82f6', letterSpacing: 0.5 },
  speedValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary, lineHeight: 26 },
  speedUnit: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f3f4f6' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  centerContent: { alignItems: 'center', marginTop: 30 },
  placeholderText: { color: COLORS.textSecondary, marginTop: 10, fontWeight: '500' },
});