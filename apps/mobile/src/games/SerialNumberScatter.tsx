import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { PatientProfile } from '@sahay/types';

import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { useGameplaySession } from '@/games/useGameplaySession';
import { colors, MIN_TOUCH_DP } from '@/theme/colors';

type SerialNumberScatterProps = {
  patient: PatientProfile;
};

type ScatterToken = {
  value: number;
  x: number;
  y: number;
};

function layoutNumbers(count: number, width: number, height: number, size: number): ScatterToken[] {
  const values = Array.from({ length: count }, (_, i) => i + 1);
  const placed: ScatterToken[] = [];
  const pad = 16;

  for (const value of values) {
    let attempt = 0;
    let x = pad;
    let y = pad;
    while (attempt < 40) {
      x = pad + Math.random() * Math.max(8, width - size - pad * 2);
      y = pad + Math.random() * Math.max(8, height - size - pad * 2);
      const overlap = placed.some(
        (token) => Math.hypot(token.x - x, token.y - y) < size + 12
      );
      if (!overlap) {
        break;
      }
      attempt += 1;
    }
    placed.push({ value, x, y });
  }
  return placed;
}

export function SerialNumberScatter({ patient }: SerialNumberScatterProps) {
  const { width, height } = useWindowDimensions();
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(
    patient,
    'serial_number_scatter'
  );
  const playHeight = Math.max(280, height - 220);
  const [nextExpected, setNextExpected] = useState(1);
  const [guiding, setGuiding] = useState(false);
  const [roundSeed, setRoundSeed] = useState(0);
  const itemCount = session.difficulty.itemCount;
  const targetSize = session.difficulty.targetSizeDp;

  const tokens = useMemo(
    () => layoutNumbers(itemCount, width - 32, playHeight, targetSize),
    [itemCount, playHeight, roundSeed, targetSize, width]
  );

  useEffect(() => {
    beginTask();
    return () => {
      void persistSession();
    };
  }, []);

  const onTap = useCallback(
    async (value: number) => {
      if (value === nextExpected) {
        setGuiding(false);
        await completeTask(true);
        const finishedRound = nextExpected >= itemCount;
        if (finishedRound) {
          setNextExpected(1);
          setRoundSeed((seed) => seed + 1);
        } else {
          setNextExpected(value + 1);
        }
        beginTask();
        return;
      }

      setGuiding(true);
      await completeTask(false);
      beginTask();
    },
    [beginTask, completeTask, itemCount, nextExpected]
  );

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="Tap the next number">
      <View style={styles.root}>
        <Text style={styles.hint}>Tap 1, then 2, then 3…</Text>
        <View style={[styles.board, { height: playHeight }]}>
          {tokens.map((token) => {
            const isNext = token.value === nextExpected;
            const faded = guiding && !isNext;
            const size = Math.max(MIN_TOUCH_DP, session.difficulty.targetSizeDp);
            return (
              <Pressable
                key={`${token.value}-${token.x}`}
                onPress={() => {
                  void onTap(token.value);
                }}
                style={[
                  styles.number,
                  {
                    left: token.x,
                    top: token.y,
                    width: size,
                    height: size,
                    opacity: faded ? 0.35 : 1,
                    borderColor: isNext && guiding ? colors.primary : colors.border,
                    transform: [{ scale: isNext && guiding ? 1.08 : 1 }],
                  },
                ]}
              >
                <Text style={styles.numberText}>{token.value}</Text>
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
  },
  hint: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  board: {
    position: 'relative',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  number: {
    position: 'absolute',
    minWidth: MIN_TOUCH_DP,
    minHeight: MIN_TOUCH_DP,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.card,
  },
  tokens: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
