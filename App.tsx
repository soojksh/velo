import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useVehicleStore } from './src/store/vehicleStore'; // Import the store

// Import Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import LiveMapScreen from './src/screens/LiveMapScreen';
import { COLORS } from './src/config/theme';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  // Initialize Connection on App Launch
  const connect = useVehicleStore((state) => state.connect);
  
  useEffect(() => {
    connect();
    // Optional: Add cleanup if you want to disconnect when App unmounts (rare in RN)
    // return () => disconnect(); 
  }, [connect]);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTitleStyle: { fontWeight: 'bold', color: COLORS.textPrimary },
          headerShadowVisible: false, 
          headerTintColor: COLORS.primary, 
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Vehicles" 
          component={VehicleListScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="LiveMap" 
          component={LiveMapScreen} 
          options={{ 
              title: 'Tracking', 
              headerBackTitle: '', 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;