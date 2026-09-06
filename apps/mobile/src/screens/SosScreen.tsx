import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Vibration, TouchableOpacity, Text } from 'react-native';
import { Audio } from 'expo-av';

// Mocking missing dependencies for typecheck
const Location = {
  getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0 } }),
};
const Battery = {
  getBatteryLevelAsync: async () => 0.5,
};

export default function SosScreen({ navigation }: any) {
  const backgroundColor = useRef(new Animated.Value(0)).current;
  const cancelProgress = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // 1. Start Strobe Animation
    const strobe = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundColor, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(backgroundColor, { toValue: 0, duration: 250, useNativeDriver: false }),
      ])
    );
    strobe.start();

    // 2. Start Haptic Pulse
    Vibration.vibrate([0, 500, 200, 500], true);

    // 3. Start Auditory Siren
    const startSiren = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/siren.mp3'),
          { isLooping: true, volume: 1.0 }
        );
        soundRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Siren audio failed, continuing in silent mode:', e);
      }
    };
    startSiren();

    // 4. Auto-dispatch SOS
    const dispatchSOS = async () => {
      let latitude = 0;
      let longitude = 0;
      let battery_level = -1;
      
      try {
        const location = await Location.getCurrentPositionAsync();
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } catch (e) {
        console.warn('Location retrieval failed, using fallback:', e);
      }

      try {
        const battery = await Battery.getBatteryLevelAsync();
        battery_level = Math.round(battery * 100);
      } catch (e) {
        console.warn('Battery retrieval failed, using fallback:', e);
      }
      
      await fetch('http://localhost:8000/api/v1/emergency/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'some-patient-id', // Placeholder
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          battery_level,
          trigger_reason: 'MANUAL_BUTTON',
        }),
      });
    };
    dispatchSOS();

    // Cleanup
    return () => {
      strobe.stop();
      Vibration.cancel();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const animatedStyle = {
    backgroundColor: backgroundColor.interpolate({
      inputRange: [0, 1],
      outputRange: ['#FFBF00', '#FFFFFF']
    })
  };

  const handlePressIn = () => {
    Animated.timing(cancelProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        navigation.goBack();
      }
    });
  };

  const handlePressOut = () => {
    cancelProgress.stopAnimation();
    Animated.timing(cancelProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>SOS ACTIVE</Text>
      <TouchableOpacity 
        style={styles.cancelButton}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.progressBar, { width: cancelProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        <Text>Hold to Cancel (3s)</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 48, fontWeight: 'bold' },
  cancelButton: { padding: 20, backgroundColor: '#DDD', borderRadius: 10, width: 200, alignItems: 'center' },
  progressBar: { height: 5, backgroundColor: 'red', marginBottom: 10 }
});

