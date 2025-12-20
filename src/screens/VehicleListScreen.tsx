import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import VehicleListItem from '../components/VehicleListItem';
import { useVehicles } from '../context/VehicleContext';
import { COLORS } from '../config/theme';

export default function VehicleListScreen({ navigation }: any) {
  const { vehicles, isConnected, connectionError } = useVehicles();
  const vehicleList = Object.values(vehicles);

  return (
    <ScreenContainer>
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Live Fleet</Text>
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
            renderItem={({ item }) => (
                <VehicleListItem 
                    id={item.id} 
                    lat={item.latitude} 
                    lng={item.longitude}
                    onPress={() => navigation.navigate('LiveMap', { vehicleId: item.id })}
                />
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