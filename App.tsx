import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VehicleProvider } from './src/context/VehicleContext';
import VehicleListScreen from './src/screens/VehicleListScreen';
import LiveMapScreen from './src/screens/LiveMapScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <VehicleProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Vehicles" component={VehicleListScreen} />
          <Stack.Screen name="LiveMap" component={LiveMapScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </VehicleProvider>
  );
}

export default App;