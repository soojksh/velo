import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../config/theme";

export default function ScreenContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Set Status Bar to dark content for better visibility */}
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background, // New background color
    },
    container: { 
        flex: 1, 
        padding: 16 // Increased padding for breathing room
    }
});