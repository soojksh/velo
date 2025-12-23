import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VehicleProvider } from './src/context/VehicleContext';

// Import Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import LiveMapScreen from './src/screens/LiveMapScreen';
import { COLORS } from './src/config/theme';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <VehicleProvider>
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
            options={{ 
                headerShown: false 
            }} 
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
    </VehicleProvider>
  );
}

export default App;