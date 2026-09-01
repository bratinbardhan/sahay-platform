import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PatientProfile } from '@sahay/types';

import { synthesizeMelody } from '@/audio/synthesize';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { FOLK_TUNES } from '@/games/catalog';
import { addDemitokens } from '@/db/patientRepository';
import { colors, MIN_TOUCH_DP } from '@/theme/colors';

type SensoryMusicPlayerProps = {
  patient: PatientProfile;
};

export function SensoryMusicPlayer({ patient }: SensoryMusicPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [tuneIndex, setTuneIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [awarded, setAwarded] = useState(false);

  const tune = FOLK_TUNES[tuneIndex % FOLK_TUNES.length];

  useEffect(() => {
    void Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const toggle = async (): Promise<void> => {
    if (playing && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlaying(false);
      return;
    }

    const uri = await synthesizeMelody(tune.notes, `sahay-${tune.id}.wav`);
    const { sound: next } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: true }
    );
    soundRef.current = next;
    setPlaying(true);
    if (!awarded) {
      setAwarded(true);
      void addDemitokens(patient.id, 1);
    }
  };

  const nextTune = async (): Promise<void> => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlaying(false);
    setTuneIndex((index) => index + 1);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{tune.label}</Text>
      <Text style={styles.subtitle}>One gentle song. Tap when you are ready.</Text>
      <LargeTouchButton
        label={playing ? 'Pause' : 'Play'}
        onPress={() => {
          void toggle();
        }}
        style={styles.play}
      />
      <LargeTouchButton
        label="Another song"
        variant="secondary"
        onPress={() => {
          void nextTune();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  play: {
    minWidth: 220,
    minHeight: MIN_TOUCH_DP + 24,
  },
});
