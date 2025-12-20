import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { COLORS, SHADOWS } from '../config/theme';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username.length > 0 && password.length > 0) {
        navigation.replace('Vehicles'); 
    } else {
        Alert.alert('Details Required', 'Please enter your username and password.');
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        
        {/* Logo / Header Area */}
        <View style={styles.headerContainer}>
            <View style={styles.logoCircle}>
                <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subText}>Sign in to track your fleet</Text>
        </View>

        {/* Inputs */}
        <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
                style={styles.input} 
                placeholder="e.g. FleetManager" 
                placeholderTextColor={COLORS.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput 
                style={styles.input} 
                placeholder="••••••••" 
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin}
                activeOpacity={0.8}
            >
                <Text style={styles.loginButtonText}>Login Securely</Text>
            </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  subText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 5 },
  
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.medium, // Apply blue shadow
  },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});