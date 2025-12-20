import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // simple validation: just check if fields are not empty
    if (username.length > 0 && password.length > 0) {
        // Navigate to the main app flow
        // "replace" prevents the user from going back to login by pressing back
        navigation.replace('Vehicles'); 
    } else {
        Alert.alert('Error', 'Please enter any username and password');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.header}>Velo Tracker</Text>
        <Text style={styles.subHeader}>Enter your credentials to continue</Text>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
                style={styles.input} 
                placeholder="admin" 
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput 
                style={styles.input} 
                placeholder="••••••" 
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});