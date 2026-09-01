import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { PatientProfile } from '@sahay/types';
import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { HighContrastCard } from '@/components/HighContrastCard';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/designSystem';

type Question = { id: string; prompt: string; correctImage: string; wrongImage: string; correctLabel: string };

const MOCK: Question[] = [
  {
    id: '1',
    prompt: 'Where is your grandson, Rahul?',
    correctImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    wrongImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    correctLabel: 'Grandson Rahul',
  },
  {
    id: '2',
    prompt: 'Where is your daughter, Priya?',
    correctImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    wrongImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    correctLabel: 'Daughter Priya',
  },
];

export function FaceNameMatch({ patient }: { patient: PatientProfile }) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(patient, 'face_name_match');
  const [index, setIndex] = useState(0);
  const [leftCorrect, setLeftCorrect] = useState(true);
  const [guiding, setGuiding] = useState(false);
  const [wrongTapped, setWrongTapped] = useState(false);
  const [busy, setBusy] = useState(false);

  const leftOpacity = useSharedValue(1);
  const leftScale = useSharedValue(1);
  const rightOpacity = useSharedValue(1);
  const rightScale = useSharedValue(1);

  const q = MOCK[index];

  const setup = useCallback((i: number) => {
    setIndex(i);
    setLeftCorrect(Math.random() > 0.5);
    setGuiding(false);
    setWrongTapped(false);
    setBusy(false);
    leftOpacity.value = 1;
    leftScale.value = 1;
    rightOpacity.value = 1;
    rightScale.value = 1;
    beginTask();
  }, [beginTask, leftOpacity, leftScale, rightOpacity, rightScale]);

  useEffect(() => {
    setup(0);
    return () => { void persistSession(); };
  }, []);

  const tap = (isLeft: boolean) => {
    if (busy) return;
    const isCorrect = isLeft ? leftCorrect : !leftCorrect;
    if (isCorrect) {
      setBusy(true);
      const scale = isLeft ? leftScale : rightScale;
      scale.value = withSequence(withTiming(1.15, { duration: 200 }), withTiming(0.95, { duration: 200 }), withTiming(1));
      setTimeout(() => {
        void completeTask(!wrongTapped).then(() => setup((index + 1) % MOCK.length));
      }, 800);
    } else {
      setWrongTapped(true);
      setGuiding(true);
      const op = isLeft ? leftOpacity : rightOpacity;
      op.value = withTiming(0.3, { duration: 300 });
    }
  };

  const animLeft = useAnimatedStyle(() => ({ opacity: leftOpacity.value, transform: [{ scale: leftScale.value }] }));
  const animRight = useAnimatedStyle(() => ({ opacity: rightOpacity.value, transform: [{ scale: rightScale.value }] }));

  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>{q.prompt}</Text>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <ErrorlessFeedbackWrapper isGuiding={guiding && leftCorrect} guidanceLabel={q.correctLabel}>
            <TouchableOpacity onPress={() => tap(true)} style={styles.btn}>
              <Animated.View style={[styles.wrap, animLeft]}>
                <HighContrastCard highlighted={guiding && leftCorrect} style={styles.card}>
                  <Image source={{ uri: leftCorrect ? q.correctImage : q.wrongImage }} style={styles.img} />
                </HighContrastCard>
              </Animated.View>
            </TouchableOpacity>
          </ErrorlessFeedbackWrapper>
        </View>
        <View style={styles.cell}>
          <ErrorlessFeedbackWrapper isGuiding={guiding && !leftCorrect} guidanceLabel={q.correctLabel}>
            <TouchableOpacity onPress={() => tap(false)} style={styles.btn}>
              <Animated.View style={[styles.wrap, animRight]}>
                <HighContrastCard highlighted={guiding && !leftCorrect} style={styles.card}>
                  <Image source={{ uri: leftCorrect ? q.wrongImage : q.correctImage }} style={styles.img} />
                </HighContrastCard>
              </Animated.View>
            </TouchableOpacity>
          </ErrorlessFeedbackWrapper>
        </View>
      </View>
      <Text style={styles.tokens}>DEMITOKENS {session.demitokensEarned}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, justifyContent: 'space-between' },
  prompt: { fontSize: 26, color: colors.text, textAlign: 'center', fontWeight: '800', marginVertical: 16 },
  grid: { flex: 1, flexDirection: 'row', gap: 16, alignItems: 'center' },
  cell: { flex: 1, aspectRatio: 0.75 },
  btn: { flex: 1, minHeight: MIN_TOUCH_DP },
  wrap: { flex: 1 },
  card: { flex: 1, padding: 8 },
  img: { width: '100%', height: '100%', borderRadius: 16 },
  tokens: { marginVertical: 12, textAlign: 'center', fontSize: 18, color: colors.primary, fontWeight: '700' },
});
