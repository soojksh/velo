import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VehicleProvider } from './src/context/VehicleContext';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import LiveMapScreen from './src/screens/LiveMapScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <VehicleProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          
          {/* 1. Login Screen (Header Hidden) */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />

          {/* 2. Main List Screen (Left arrow hidden so they can't go back to login) */}
          <Stack.Screen 
            name="Vehicles" 
            component={VehicleListScreen} 
            options={{ 
                title: 'Live Fleet',
                headerBackVisible: false 
            }} 
          />

          {/* 3. Map Detail Screen */}
          <Stack.Screen 
            name="LiveMap" 
            component={LiveMapScreen} 
            options={{ title: 'Vehicle Location' }}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </VehicleProvider>
  );
}

export default App;