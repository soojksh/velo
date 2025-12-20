import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicles } from '../context/VehicleContext';

export default function VehicleListScreen({ navigation }: any) {
  const { vehicles, isConnected, connectionError } = useVehicles();
  const vehicleList = Object.values(vehicles);

  return (
    <ScreenContainer>
        <View style={styles.headerContainer}>
            <Text style={styles.title}>Fleet Status</Text>
            
            {/* We use an array to apply conditional styles cleanly */}
            <Text style={[styles.statusBase, isConnected ? styles.connected : styles.disconnected]}>
                {isConnected ? '● Connected to AWS IoT' : '● Disconnected'}
            </Text>
            
            {connectionError && (
                <Text style={styles.errorText}>{connectionError}</Text>
            )}
        </View>

        <FlatList
            data={vehicleList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <VehicleListItem 
                    id={item.id} 
                    lat={item.latitude} 
                    lng={item.longitude}
                    onPress={() => navigation.navigate('LiveMap', { vehicleId: item.id })}
                />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No vehicles online yet...</Text>}
        />
    </ScreenContainer>
  );
}

// Define all styles here once, outside the render loop
const styles = StyleSheet.create({
    headerContainer: {
        marginBottom: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
    },
    statusBase: {
        fontSize: 14,
        marginTop: 4,
    },
    connected: {
        color: 'green',
    },
    disconnected: {
        color: 'red',
    },
    errorText: {
        color: 'red', 
        fontSize: 10, 
        marginTop: 5 
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666'
    }
});