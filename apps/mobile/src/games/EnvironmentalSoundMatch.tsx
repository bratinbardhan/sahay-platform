import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PatientProfile } from '@sahay/types';

import { synthesizeAmbient } from '@/audio/synthesize';
import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { HighContrastCard } from '@/components/HighContrastCard';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { AMBIENT_SOUNDS, type AmbientSound, type AmbientSoundId } from '@/games/catalog';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/colors';

type EnvironmentalSoundMatchProps = {
  patient: PatientProfile;
};

type Trial = {
  target: AmbientSound;
  options: AmbientSound[];
};

function buildTrial(): Trial {
  const target = AMBIENT_SOUNDS[Math.floor(Math.random() * AMBIENT_SOUNDS.length)];
  const other = AMBIENT_SOUNDS.filter((sound) => sound.id !== target.id);
  const distractor = other[Math.floor(Math.random() * other.length)];
  const options = Math.random() > 0.5 ? [target, distractor] : [distractor, target];
  return { target, options };
}

export function EnvironmentalSoundMatch({ patient }: EnvironmentalSoundMatchProps) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(
    patient,
    'environmental_sound_match'
  );
  const [trial, setTrial] = useState<Trial>(() => buildTrial());
  const [guiding, setGuiding] = useState(false);
  const [fadedId, setFadedId] = useState<AmbientSoundId | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    void Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    beginTask();
    return () => {
      void persistSession();
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const playTarget = useCallback(async (soundId: AmbientSoundId) => {
    await soundRef.current?.unloadAsync();
    const uri = await synthesizeAmbient(soundId);
    const { sound: next } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
    soundRef.current = next;
  }, []);

  useEffect(() => {
    void playTarget(trial.target.id);
  }, [playTarget, trial.target.id]);

  const nextRound = (clean: boolean): void => {
    setGuiding(false);
    setFadedId(null);
    setTrial(buildTrial());
    void completeTask(clean).then(() => beginTask());
  };

  const onChoose = (choice: AmbientSound): void => {
    if (choice.id === trial.target.id) {
      nextRound(fadedId === null);
      return;
    }
    setGuiding(true);
    setFadedId(choice.id);
  };

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="Match the sound you hear">
      <View style={styles.root}>
        <Text style={styles.hint}>Listen, then tap the matching scene</Text>
        <LargeTouchButton label="Play sound again" onPress={() => void playTarget(trial.target.id)} />
        <View style={styles.options}>
          {trial.options.map((option) => {
            const isCorrect = option.id === trial.target.id;
            const faded = fadedId === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChoose(option)}
                style={[styles.option, faded ? styles.faded : null, { minHeight: MIN_TOUCH_DP }]}
              >
                <HighContrastCard highlighted={guiding && isCorrect} style={styles.card}>
                  <Text style={styles.glyph}>{option.glyph}</Text>
                  <Text style={styles.label}>{option.label}</Text>
                </HighContrastCard>
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
  root: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  hint: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  options: {
    gap: 12,
    marginTop: 8,
  },
  option: {
    minHeight: MIN_TOUCH_DP,
  },
  faded: {
    opacity: 0.28,
  },
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  glyph: {
    fontSize: 40,
  },
  label: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  tokens: {
    textAlign: 'center',
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
