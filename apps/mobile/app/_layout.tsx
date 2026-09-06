import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { API_BASE_URL } from '@/config/apiConfig';
import { PatientProvider } from '@/patient/PatientProvider';
import { colors } from '@/theme/colors';

export default function RootLayout() {
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

  return (
    <GestureHandlerRootView style={styles.root}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
