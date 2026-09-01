import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { PatientProfile } from '@sahay/types';

import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { HighContrastCard } from '@/components/HighContrastCard';
import { NER_SORT_ITEMS, type SortCategory, type SortItem } from '@/games/catalog';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type RapidFireSortingProps = {
  patient: PatientProfile;
};

function nextItem(excludeId?: string): SortItem {
  const pool = NER_SORT_ITEMS.filter((item) => item.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function RapidFireSorting({ patient }: RapidFireSortingProps) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(
    patient,
    'rapid_fire_sorting'
  );
  const [item, setItem] = useState<SortItem>(() => nextItem());
  const [guiding, setGuiding] = useState(false);
  const translateX = useSharedValue(0);
  const fruitOpacity = useSharedValue(1);
  const bambooOpacity = useSharedValue(1);
  const fruitPulse = useSharedValue(1);
  const bambooPulse = useSharedValue(1);
  const busy = useRef(false);

  const swipeThreshold = Math.max(64, 96 - session.difficulty.smoothedDifficulty * 28);
  const cardSize = Math.max(MIN_TOUCH_DP, session.difficulty.targetSizeDp + 80);

  useEffect(() => {
    beginTask();
    return () => {
      void persistSession();
    };
  }, []);

  const resetZones = useCallback(() => {
    fruitOpacity.value = withTiming(1, { duration: 280 });
    bambooOpacity.value = withTiming(1, { duration: 280 });
    fruitPulse.value = withTiming(1, { duration: 220 });
    bambooPulse.value = withTiming(1, { duration: 220 });
    setGuiding(false);
  }, [bambooOpacity, bambooPulse, fruitOpacity, fruitPulse]);

  const guideToCorrect = useCallback(
    (correct: SortCategory, incorrect: SortCategory) => {
      setGuiding(true);

      const fadeTarget = incorrect === 'fruit' ? fruitOpacity : bambooOpacity;
      const pulseTarget = correct === 'fruit' ? fruitPulse : bambooPulse;
      fadeTarget.value = withTiming(0.22, { duration: 420 });
      pulseTarget.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 480, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) })
        ),
        3,
        false
      );

      const targetX = correct === 'fruit' ? -140 : 140;
      translateX.value = withTiming(targetX, { duration: 560 });
    },
    [bambooOpacity, fruitOpacity, fruitPulse, bambooPulse, translateX]
  );

  const finishTrial = useCallback(
    async (clean: boolean, current: SortItem) => {
      await completeTask(clean);
      translateX.value = 0;
      resetZones();
      setItem(nextItem(current.id));
      beginTask();
      busy.current = false;
    },
    [beginTask, completeTask, resetZones, translateX]
  );

  const settle = useCallback(
    (chosen: SortCategory) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      const correct = chosen === item.category;

      if (correct) {
        const targetX = chosen === 'fruit' ? -140 : 140;
        translateX.value = withTiming(targetX, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(finishTrial)(true, item);
          }
        });
        return;
      }

      const incorrect = chosen;
      guideToCorrect(item.category, incorrect);
      setTimeout(() => {
        void finishTrial(false, item);
      }, 1700);
    },
        [finishTrial, guideToCorrect, item, translateX]
  );

  const pan = Gesture.Pan()
    .enabled(!guiding)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX <= -swipeThreshold) {
        runOnJS(settle)('fruit');
        return;
      }
      if (event.translationX >= swipeThreshold) {
        runOnJS(settle)('bamboo');
        return;
      }
      translateX.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fruitZoneStyle = useAnimatedStyle(() => ({
    opacity: fruitOpacity.value,
    transform: [{ scale: fruitPulse.value }],
  }));

  const bambooZoneStyle = useAnimatedStyle(() => ({
    opacity: bambooOpacity.value,
    transform: [{ scale: bambooPulse.value }],
  }));

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="Let us place it here">
      <View style={styles.root}>
        <Text style={styles.hint}>Slide toward fruits or bamboo tools</Text>
        <View style={styles.zones}>
          <Animated.View style={[styles.zonePress, fruitZoneStyle]}>
            <HighContrastCard
              style={styles.zone}
              highlighted={guiding && item.category === 'fruit'}
            >
              <Text style={styles.zoneLabel}>Fruits</Text>
              <Text style={styles.zoneGlyph}>🍍</Text>
            </HighContrastCard>
          </Animated.View>
          <Animated.View style={[styles.zonePress, bambooZoneStyle]}>
            <HighContrastCard
              style={styles.zone}
              highlighted={guiding && item.category === 'bamboo'}
            >
              <Text style={styles.zoneLabel}>Bamboo</Text>
              <Text style={styles.zoneGlyph}>🎋</Text>
            </HighContrastCard>
          </Animated.View>
        </View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardWrap, cardStyle]}>
            <HighContrastCard style={[styles.itemCard, { minHeight: cardSize }]}>
              <Text style={styles.glyph}>{item.glyph}</Text>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </HighContrastCard>
          </Animated.View>
        </GestureDetector>
        <Text style={styles.tokens}>DEMITOKENS {session.demitokensEarned}</Text>
      </View>
    </ErrorlessFeedbackWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  hint: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  zones: {
    flexDirection: 'row',
    gap: 12,
  },
  zonePress: {
    flex: 1,
    minHeight: MIN_TOUCH_DP,
  },
  zone: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    minHeight: MIN_TOUCH_DP,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  zoneGlyph: {
    fontSize: 36,
  },
  cardWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  itemCard: {
    width: '86%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 64,
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  tokens: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
