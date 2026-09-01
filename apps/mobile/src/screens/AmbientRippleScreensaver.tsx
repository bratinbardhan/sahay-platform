import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { PatientProfile } from '@sahay/types';

import { addDemitokens } from '@/db/patientRepository';
import { colors } from '@/theme/designSystem';

type Ripple = { id: string; x: number; y: number; color: string };

export function AmbientRippleScreensaver({ patient }: { patient: PatientProfile }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastSpawn = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const awarded = useRef(false);

  const addRipple = useCallback((x: number, y: number) => {
    const dist = Math.hypot(x - lastSpawn.current.x, y - lastSpawn.current.y);
    if (dist > 30 || (lastSpawn.current.x === 0 && lastSpawn.current.y === 0)) {
      const id = Math.random().toString();
      const color = Math.random() > 0.5 ? colors.primary : colors.text;
      setRipples((prev) => [...prev, { id, x, y, color }]);
      lastSpawn.current = { x, y };

      if (!awarded.current) {
        awarded.current = true;
        void addDemitokens(patient.id, 1);
      }
    }
  }, [patient.id]);

  const removeRipple = useCallback((id: string) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const pan = Gesture.Pan()
    .onStart((e) => {
      runOnJS(addRipple)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(addRipple)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(() => { lastSpawn.current = { x: 0, y: 0 }; })();
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        {ripples.map((ripple) => (
          <RippleCircle key={ripple.id} ripple={ripple} onComplete={removeRipple} />
        ))}
      </View>
    </GestureDetector>
  );
}

function RippleCircle({ ripple, onComplete }: { ripple: Ripple; onComplete: (id: string) => void }) {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(0.5);

  useState(() => {
    scale.value = withTiming(4, { duration: 1500 });
    opacity.value = withTiming(0, { duration: 1500 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)(ripple.id);
      }
    });
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bg = ripple.color === colors.primary ? 'rgba(230, 126, 34, 0.08)' : 'rgba(44, 62, 80, 0.05)';

  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: ripple.x - 40,
          top: ripple.y - 40,
          borderColor: ripple.color,
          backgroundColor: bg,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    pointerEvents: 'none',
  },
});
