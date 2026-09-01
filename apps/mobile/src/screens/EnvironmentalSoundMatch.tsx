import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { PatientProfile } from '@sahay/types';

import { synthesizeAmbient } from '@/audio/synthesize';
import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { HighContrastCard } from '@/components/HighContrastCard';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/designSystem';

type SoundItem = { id: 'rain' | 'temple_bell' | 'livestock'; label: string; glyph: string };

const ITEMS: SoundItem[] = [
  { id: 'rain', label: 'Rain on leaves', glyph: '🌧️' },
  { id: 'temple_bell', label: 'Temple bell', glyph: '🔔' },
  { id: 'livestock', label: 'Village livestock', glyph: '🐃' },
];

export function EnvironmentalSoundMatch({ patient }: { patient: PatientProfile }) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(patient, 'environmental_sound_match');
  const [targetIndex, setTargetIndex] = useState(0);
  const [options, setOptions] = useState<SoundItem[]>([]);
  const [guiding, setGuiding] = useState(false);
  const [wrongTapped, setWrongTapped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fadedId, setFadedId] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const scale = useSharedValue(1);

  const target = ITEMS[targetIndex];

  const play = useCallback(async (id: typeof target.id) => {
    try {
      await soundRef.current?.unloadAsync();
      const uri = await synthesizeAmbient(id);
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }, []);

  const setup = useCallback((idx: number) => {
    setTargetIndex(idx);
    setGuiding(false);
    setWrongTapped(false);
    setBusy(false);
    setFadedId(null);
    scale.value = 1;

    // Shuffle options
    const nextTarget = ITEMS[idx];
    const pool = ITEMS.filter(x => x.id !== nextTarget.id);
    const distractor = pool[Math.floor(Math.random() * pool.length)];
    const list = Math.random() > 0.5 ? [nextTarget, distractor] : [distractor, nextTarget];
    setOptions(list);

    void play(nextTarget.id);
    beginTask();
  }, [beginTask, play]);

  useEffect(() => {
    void Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    setup(0);
    return () => {
      void persistSession();
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const tap = (item: SoundItem) => {
    if (busy) return;
    if (item.id === target.id) {
      setBusy(true);
      setGuiding(true); // Triggers ErrorlessFeedbackWrapper positive feedback pulse
      scale.value = withSequence(withTiming(1.15, { duration: 200 }), withTiming(0.95, { duration: 200 }), withTiming(1));
      setTimeout(() => {
        void completeTask(!wrongTapped).then(() => {
          setup((targetIndex + 1) % ITEMS.length);
        });
      }, 1000);
    } else {
      setWrongTapped(true);
      setGuiding(true);
      setFadedId(item.id);
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="Match the sound you hear">
      <View style={styles.root}>
        <Text style={styles.hint}>Listen, then tap the matching scene</Text>
        <LargeTouchButton label="Play Sound" onPress={() => void play(target.id)} style={styles.playBtn} />
        <View style={styles.options}>
          {options.map((item) => {
            const isCorrect = item.id === target.id;
            const isFaded = fadedId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => tap(item)}
                style={[styles.pressable, isFaded ? styles.faded : null]}
              >
                <Animated.View style={isCorrect ? pulseStyle : null}>
                  <HighContrastCard highlighted={guiding && isCorrect} style={styles.card}>
                    <Text style={styles.glyph}>{item.glyph}</Text>
                    <Text style={styles.label}>{item.label}</Text>
                  </HighContrastCard>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.tokens}>DEMITOKENS {session.demitokensEarned}</Text>
      </View>
    </ErrorlessFeedbackWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  hint: { fontSize: 22, color: colors.text, textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  playBtn: { width: '100%', marginBottom: 12 },
  options: { gap: 16 },
  pressable: { minHeight: MIN_TOUCH_DP },
  faded: { opacity: 0.3 },
  card: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  glyph: { fontSize: 44 },
  label: { fontSize: 24, fontWeight: '700', color: colors.text, flex: 1 },
  tokens: { textAlign: 'center', fontSize: 18, color: colors.primary, fontWeight: '700', marginTop: 'auto' },
});
