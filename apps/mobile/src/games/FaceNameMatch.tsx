import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { PatientProfile, ReminiscenceMedia } from '@sahay/types';

import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { HighContrastCard } from '@/components/HighContrastCard';
import { getFamilyPhotos } from '@/db/patientRepository';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type FaceNameMatchProps = {
  patient: PatientProfile;
};

type Trial = {
  prompt: ReminiscenceMedia;
  options: ReminiscenceMedia[];
};

function buildTrial(photos: ReminiscenceMedia[]): Trial | null {
  if (photos.length < 2) {
    return null;
  }
  const prompt = photos[Math.floor(Math.random() * photos.length)];
  const distractorPool = photos.filter((photo) => photo.id !== prompt.id);
  const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)];
  const options = Math.random() > 0.5 ? [prompt, distractor] : [distractor, prompt];
  return { prompt, options };
}

function relationLabel(media: ReminiscenceMedia): string {
  return `${media.relation_tag} ${media.label_text}`.trim();
}

export function FaceNameMatch({ patient }: FaceNameMatchProps) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(
    patient,
    'face_name_match'
  );
  const [photos, setPhotos] = useState<ReminiscenceMedia[]>([]);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [guiding, setGuiding] = useState(false);
  const [fadedId, setFadedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const rows = await getFamilyPhotos(patient.id);
      setPhotos(rows);
      setTrial(buildTrial(rows));
      beginTask();
    })();
    return () => {
      void persistSession();
    };
  }, [patient.id]);

  const advance = useCallback(
    (clean: boolean) => {
      setGuiding(false);
      setFadedId(null);
      setTrial(buildTrial(photos));
      void completeTask(clean).then(() => beginTask());
    },
    [beginTask, completeTask, photos]
  );

  const onChoose = useCallback(
    (choice: ReminiscenceMedia) => {
      if (!trial) {
        return;
      }
      if (choice.id === trial.prompt.id) {
        advance(fadedId === null);
        return;
      }
      setGuiding(true);
      setFadedId(choice.id);
    },
    [advance, fadedId, trial]
  );

  const empty = useMemo(() => photos.length < 2 && trial === null, [photos.length, trial]);

  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Family photos will appear here when a caregiver adds them.</Text>
      </View>
    );
  }

  if (!trial) {
    return null;
  }

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="This familiar face">
      <View style={styles.root}>
        <Text style={styles.hint}>Who is this?</Text>
        <View style={styles.options}>
          {trial.options.map((option) => {
            const isCorrect = option.id === trial.prompt.id;
            const faded = fadedId === option.id;
            return (
              <OptionCard
                key={option.id}
                option={option}
                highlighted={guiding && isCorrect}
                faded={faded}
                onPress={() => onChoose(option)}
              />
            );
          })}
        </View>
        <Text style={styles.tokens}>DEMITOKENS {session.demitokensEarned}</Text>
      </View>
    </ErrorlessFeedbackWrapper>
  );
}

function OptionCard({
  option,
  highlighted,
  faded,
  onPress,
}: {
  option: ReminiscenceMedia;
  highlighted: boolean;
  faded: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(faded ? 0.28 : 1, { duration: 380 });
    scale.value = withTiming(highlighted ? 1.03 : 1, { duration: 380 });
  }, [faded, highlighted, opacity, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.optionWrap, animated]}>
      <Pressable onPress={onPress} accessibilityLabel={relationLabel(option)}>
        <HighContrastCard highlighted={highlighted} style={styles.optionCard}>
          <Image
            source={{ uri: option.file_url }}
            style={styles.photo}
            accessibilityLabel={relationLabel(option)}
          />
          <Text style={styles.optionLabel}>{relationLabel(option)}</Text>
        </HighContrastCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hint: {
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
  },
  options: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  optionWrap: {
    flex: 1,
    minHeight: MIN_TOUCH_DP,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 12,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.guide,
    minHeight: MIN_TOUCH_DP,
  },
  optionLabel: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  tokens: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
