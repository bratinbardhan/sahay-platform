import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { API_BASE_URL } from '@/config/apiConfig';
import { PatientProvider } from '@/patient/PatientProvider';
import { AuthScreen } from '@/screens/AuthScreen';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootContent() {
  const { user, loading } = useAuth();

  // Startup health ping — verifies the app can reach the backend API.
  // Logs success or the exact error for debugging connectivity issues.
  useEffect(() => {
    const healthUrl = `${API_BASE_URL}/health`;
    console.log(`[Sahāy] Pinging backend health endpoint: ${healthUrl}`);

    fetch(healthUrl)
      .then((response) => {
        if (!response.ok) {
          console.warn(
            `[Sahāy] Backend health check returned HTTP ${response.status} (${response.statusText}) at ${healthUrl}`
          );
          return;
        }
        return response.json();
      })
      .then((data) => {
        console.log(
          `[Sahāy] ✅ Backend reachable — health check OK:`,
          JSON.stringify(data)
        );
      })
      .catch((error) => {
        console.error(
          `[Sahāy] ❌ Backend UNREACHABLE at ${healthUrl}. ` +
            `Ensure the backend is running and EXPO_PUBLIC_API_URL is set to your LAN IP. ` +
            `Error:`,
          error instanceof Error ? error.message : String(error)
        );
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>Sahāy</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen />
      </>
    );
  }

  return (
    <PatientProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </PatientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
  },
});
