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
import Geocoder from 'react-native-geocoder';
import { COLORS, SHADOWS } from '../config/theme';
// --- UPDATED IMPORT: Use the Zustand Store instead of Context ---
import { useVehicleStore } from '../store/vehicleStore'; 

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MIN_HEIGHT = 120; 
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.30; 
const SHEET_RANGE = SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;

export default function LiveMapScreen({ route, navigation }: any) {
  const { vehicleId } = route.params || {};
  
  // OPTIMIZATION: Only subscribe to THIS specific vehicle
  const targetVehicle = useVehicleStore((state) => state.vehicles[vehicleId]);
  // We no longer need the full 'vehicles' list from context

  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  
  const animatedValue = useRef(new Animated.Value(0)).current; 
  const currentValue = useRef(0);
  const lastPosition = useRef(0);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');

  const [address, setAddress] = useState<string>('Locating address...');
  const lastFetchCoords = useRef<{lat: number, lng: number} | null>(null);
  const lastFetchTime = useRef<number>(0);

  // We wrap targetVehicle in an array for the WebView message logic which expects a list
  const displayedVehicles = useMemo(() => {
    return targetVehicle ? [targetVehicle] : [];
  }, [targetVehicle]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  const handleRecenter = () => {
    if (webViewRef.current && targetVehicle) {
        webViewRef.current.postMessage(JSON.stringify({ 
            type: 'RECENTER', 
            payload: { lat: targetVehicle.latitude, lng: targetVehicle.longitude } 
        }));
    }
  };

  // --- UPDATED GEOCODING LOGIC ---
  useEffect(() => {
    if (!targetVehicle) return;
    const lat = targetVehicle.latitude;
    const lng = targetVehicle.longitude;
    const now = Date.now();

    // 1. Check Distance (Don't refetch if moved less than ~20 meters)
    if (lastFetchCoords.current) {
        const diffLat = Math.abs(lastFetchCoords.current.lat - lat);
        const diffLng = Math.abs(lastFetchCoords.current.lng - lng);
        if (diffLat < 0.0002 && diffLng < 0.0002) return; 
    }
    
    // 2. Check Time (Don't refetch more than once every 3 seconds)
    if (now - lastFetchTime.current < 3000) return;

    let isMounted = true;

    const fetchAddress = async () => {
        try {
            lastFetchTime.current = Date.now();
            lastFetchCoords.current = { lat, lng };
            
            // --- NATIVE GEOCODER CALL ---
            const res = await Geocoder.geocodePosition({ lat, lng });
            
            if (isMounted && res && res.length > 0) {
                const data = res[0];

                // Intelligent Formatting: Street -> Neighborhood -> City
                const parts = [
                    data.streetName,
                    data.subLocality,
                    data.locality
                ];

                let fullAddr = parts.filter(Boolean).join(', ');

                // Fallback to the pre-formatted string if we got sparse data
                if (fullAddr.length < 5 && data.formattedAddress) {
                    fullAddr = data.formattedAddress;
                }

                setAddress(fullAddr);
            }
        } catch {
            // If native geocoder fails (e.g. timeout), keep old address or ignore
        }
    };
    
    fetchAddress();
    return () => { isMounted = false; };
  }, [targetVehicle]); 

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => {
      currentValue.current = value;
    });
    return () => {
      animatedValue.removeListener(id);
    };
  }, [animatedValue]);

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

  const buttonStyle = {
    bottom: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SHEET_MIN_HEIGHT + 20 + insets.bottom, SHEET_MAX_HEIGHT + 20],
        extrapolate: 'clamp',
    }),
  };

  const addressContainerHeight = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 70], 
      extrapolate: 'clamp'
  });

  const collapsedOpacity = animatedValue.interpolate({
      inputRange: [0, 0.2],
      outputRange: [1, 0],
      extrapolate: 'clamp'
  });

  const expandedOpacity = animatedValue.interpolate({
      inputRange: [0.1, 0.4],
      outputRange: [0, 1],
      extrapolate: 'clamp'
  });

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
            .vehicle-marker {
                width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
                transform-origin: center center;
            }
            .vehicle-marker svg { filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3)); }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
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
                            'attribution': '&copy; OpenStreetMap',
                            'maxzoom': 19 
                        }
                    },
                    'layers': [
                        { 'id': 'osm-raster-layer', 'type': 'raster', 'source': 'osm-raster-tiles', 'minzoom': 0, 'maxzoom': 22 }
                    ]
                },
                center: [85.3240, 27.7172], // Default Kathmandu
                zoom: 15,
                maxZoom: 19, 
                pitch: 0, 
                attributionControl: false
            });

            var markers = {};
            var pathHistory = []; 
            var traceSourceId = 'vehicle-trace';
            var animState = {}; 
            const ANIMATION_DURATION = 15000;
            var isFirstLoad = true; 

            // --- ZOOM LIMIT LISTENER ---
            var lastToastTime = 0;
            map.on('zoomend', function() {
                if (map.getZoom() >= 19) {
                    var now = Date.now();
                    if (now - lastToastTime > 3000) {
                        lastToastTime = now;
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                            type: 'ZOOM_LIMIT_REACHED' 
                        }));
                    }
                }
            });

            function getBearing(startLat, startLng, destLat, destLng) {
                var startLatRad = startLat * (Math.PI / 180);
                var startLngRad = startLng * (Math.PI / 180);
                var destLatRad = destLat * (Math.PI / 180);
                var destLngRad = destLng * (Math.PI / 180);
                var y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
                var x = Math.cos(startLatRad) * Math.sin(destLatRad) -
                        Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
                var brng = Math.atan2(y, x);
                return ((brng * 180 / Math.PI) + 360) % 360;
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
                    'paint': { 'line-color': '#059df5', 'line-width': 6, 'line-opacity': 0.7 }
                });
            });

            document.addEventListener('message', function(event) { handleMessage(event.data); });
            window.addEventListener('message', function(event) { handleMessage(event.data); });

            function handleMessage(payload) {
                try {
                    var msg = JSON.parse(payload);
                    
                    if (msg.type === 'RECENTER') {
                        map.flyTo({
                            center: [msg.payload.lng, msg.payload.lat],
                            zoom: 16,
                            speed: 1.5,
                            curve: 1
                        });
                        return;
                    }

                    var vehicles = msg.vehicles;
                    var targetId = msg.targetId;
                    
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
                            // Update Existing
                            var currentLngLat = markers[v.id].getLngLat();
                            var startLngLat = [currentLngLat.lng, currentLngLat.lat];
                            if (startLngLat[0] !== targetLngLat[0] || startLngLat[1] !== targetLngLat[1]) {
                                var bearing = getBearing(startLngLat[1], startLngLat[0], targetLngLat[1], targetLngLat[0]);
                                animateMarker(v.id, startLngLat, targetLngLat, bearing);
                            }
                        } else {
                            // Create New
                            var el = document.createElement('div');
                            el.className = 'vehicle-marker';
                            el.innerHTML = TRUCK_SVG;
                            var marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
                                .setLngLat(targetLngLat).addTo(map);
                            markers[v.id] = marker;

                            if (v.id === targetId && pathHistory.length === 0) {
                                pathHistory.push(targetLngLat);
                            }
                        }
                    });

                    // --- INSTANT SNAP ON FIRST LOAD ---
                    if (isFirstLoad && targetId && vehicles.find(v => v.id === targetId)) {
                        var v = vehicles.find(v => v.id === targetId);
                        // jumpTo is instant (no animation)
                        map.jumpTo({ 
                            center: [v.longitude, v.latitude],
                            zoom: 15
                        });
                        isFirstLoad = false;
                    }

                } catch { } 
            }

            function animateMarker(id, start, end, bearing) {
                var startTime = performance.now();
                if (markers[id]) markers[id].setRotation(bearing);

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

                    if (markers[id]) markers[id].setLngLat(currentPos);

                    if (map.getSource(traceSourceId)) {
                        var livePath = [...pathHistory, currentPos];
                        map.getSource(traceSourceId).setData({
                            'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': livePath }
                        });
                    }

                    if (progress < 1) {
                        animState[id] = { requestID: requestAnimationFrame(loop) };
                    } else {
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

  const onWebViewMessage = (event: any) => {
      try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'ZOOM_LIMIT_REACHED') {
              showToast("Maximum zoom level reached");
          }
      } catch { }
  };

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
        onMessage={onWebViewMessage} 
        onLoadEnd={() => {
            if (webViewRef.current) {
                const data = JSON.stringify({ vehicles: displayedVehicles, targetId: vehicleId });
                webViewRef.current.postMessage(data);
            }
        }}
      />

      {/* Custom Toast Notification */}
      <Animated.View style={[styles.toastContainer, { opacity: toastOpacity, top: insets.top + 70 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* RECENTER BUTTON */}
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
                            
                            <Animated.View style={[styles.addressRow, { height: addressContainerHeight }]}>
                                <Animated.Text 
                                    style={[styles.addressText, styles.absoluteText, { opacity: collapsedOpacity }]} 
                                    numberOfLines={1}
                                >
                                    {address}
                                </Animated.Text>

                                <Animated.Text 
                                    style={[styles.addressText, styles.absoluteText, { opacity: expandedOpacity }]} 
                                >
                                    {address}
                                </Animated.Text>
                            </Animated.View>
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
  
  toastContainer: {
    position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, zIndex: 100,
  },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },

  fabWrapper: { position: 'absolute', right: 20, zIndex: 20 },
  fab: {
    width: 44, height: 44, backgroundColor: 'white', borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium, elevation: 5,
  },
  recenterFab: { backgroundColor: COLORS.primary },
  fabIcon: { fontSize: 22, color: COLORS.textPrimary }, 
  
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    ...SHADOWS.medium, elevation: 25, overflow: 'hidden',
  },
  dragHandleArea: {
    height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
  },
  dragHandle: {
    width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10,
  },
  sheetContent: { flex: 1, paddingHorizontal: 24, paddingBottom: 30 },

  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 5 },
  textContainer: { flex: 1, paddingRight: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vehicleTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginRight: 8 },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffffff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff66ff', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#00ff66ff' },
  
  addressRow: { flexDirection: 'row', overflow: 'hidden' },
  absoluteText: { position: 'absolute', left: 0, right: 0, top: 0 }, 
  addressText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', lineHeight: 20 },
  
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