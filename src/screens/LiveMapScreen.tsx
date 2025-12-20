import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useVehicles } from '../context/VehicleContext';

export default function LiveMapScreen({ route }: any) {
    const { vehicleId } = route.params || {};
    const { vehicles } = useVehicles();
    
    // 1. Create a reference to control the map programmatically
    const mapRef = useRef<MapView>(null);

    const targetVehicle = vehicleId ? vehicles[vehicleId] : null;
    const allVehicles = Object.values(vehicles);

    // 2. Use 'targetVehicle' to animate the camera
    // This fixes the "unused variable" warning AND improves UX
    useEffect(() => {
        if (targetVehicle && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: targetVehicle.latitude,
                longitude: targetVehicle.longitude,
                latitudeDelta: 0.02, // Zoom level (smaller = closer)
                longitudeDelta: 0.02,
            }, 1000); // Animation duration in ms
        }
    }, [targetVehicle]); // Re-run if the vehicle moves or updates

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef} // 3. Connect the ref here
                style={styles.map}
                initialRegion={{
                    latitude: 60.1699, 
                    longitude: 24.9384,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {allVehicles.map((v) => (
                    <Marker
                        key={v.id}
                        coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                        title={`Vehicle ${v.id}`}
                        description={v.timestamp ? `Updated: ${v.timestamp}` : ''}
                        // Highlight the selected vehicle in blue, others in red
                        pinColor={v.id === vehicleId ? 'blue' : 'red'}
                    />
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 }
});