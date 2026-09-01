import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PatientProfile } from '@sahay/types';

import { addDemitokens } from '@/db/patientRepository';
import { colors } from '@/theme/colors';

type AmbientRippleScreensaverProps = {
  patient: PatientProfile;
};

type Ripple = {
  id: number;
  x: number;
  y: number;
  scale: Animated.Value;
  opacity: Animated.Value;
};

type Leaf = {
  id: number;
  x: number;
  y: number;
  drift: Animated.Value;
  fade: Animated.Value;
};

let nextId = 1;

export function AmbientRippleScreensaver({ patient }: AmbientRippleScreensaverProps) {
  const { width, height } = useWindowDimensions();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const awarded = useRef(false);

  const spawn = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      const id = nextId;
      nextId += 1;
      const scale = new Animated.Value(0.2);
      const opacity = new Animated.Value(0.55);
      const ripple: Ripple = { id, x: locationX, y: locationY, scale, opacity };

      const leafId = nextId;
      nextId += 1;
      const drift = new Animated.Value(0);
      const fade = new Animated.Value(0.9);
      const leaf: Leaf = {
        id: leafId,
        x: locationX + (Math.random() * 40 - 20),
        y: locationY,
        drift,
        fade,
      };

      setRipples((prev) => [...prev.slice(-8), ripple]);
      setLeaves((prev) => [...prev.slice(-12), leaf]);

      Animated.parallel([
        Animated.timing(scale, { toValue: 4.2, duration: 1600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 90, duration: 2200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]).start();

      if (!awarded.current) {
        awarded.current = true;
        void addDemitokens(patient.id, 1);
      }
    },
    [patient.id]
  );

  return (
    <View style={styles.root} onStartShouldSetResponder={() => true} onResponderGrant={spawn}>
      <LinearGradient
        colors={[colors.landscapeSky, '#E7F0D8', colors.background] as const}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.hill, { width, bottom: height * 0.18, backgroundColor: colors.landscapeHill }]} />
      <View
        style={[
          styles.hill,
          {
            width: width * 1.2,
            bottom: height * 0.08,
            left: -40,
            backgroundColor: colors.landscapeHillDark,
          },
        ]}
      />
      <Text style={styles.caption}>Touch the hills. Watch the water and leaves.</Text>
      {ripples.map((ripple) => (
        <Animated.View
          key={ripple.id}
          pointerEvents="none"
          style={[
            styles.ripple,
            {
              left: ripple.x - 40,
              top: ripple.y - 40,
              opacity: ripple.opacity,
              transform: [{ scale: ripple.scale }],
            },
          ]}
        />
      ))}
      {leaves.map((leaf) => (
        <Animated.View
          key={leaf.id}
          pointerEvents="none"
          style={[
            styles.leaf,
            {
              left: leaf.x,
              top: leaf.y,
              opacity: leaf.fade,
              transform: [{ translateY: leaf.drift }],
            },
          ]}
        >
          <Text style={styles.leafGlyph}>🍃</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  hill: {
    position: 'absolute',
    height: 180,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
  },
  caption: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: '90%',
    textAlign: 'center',
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(230, 126, 34, 0.12)',
  },
  leaf: {
    position: 'absolute',
  },
  leafGlyph: {
    fontSize: 28,
  },
});
