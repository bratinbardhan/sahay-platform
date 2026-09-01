import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type ErrorlessFeedbackWrapperProps = {
  children: ReactNode;
  /** True while the engine is gently guiding toward the correct choice. */
  isGuiding: boolean;
  guidanceLabel?: string;
};

/**
 * Errorless learning shell: no failure copy, no red, no penalty motion.
 * Guided trials only soften the scene and glow the correct path.
 */
export function ErrorlessFeedbackWrapper({
  children,
  isGuiding,
  guidanceLabel = 'This way…',
}: ErrorlessFeedbackWrapperProps) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!isGuiding) {
      glow.value = withTiming(0, { duration: 200 });
      return;
    }

    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.35, { duration: 700 })
      ),
      -1,
      false
    );
  }, [glow, isGuiding]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.root}>
      {children}
      {isGuiding ? (
        <Animated.View style={[styles.banner, bannerStyle]}>
          <Text style={styles.bannerText}>{guidanceLabel}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: colors.guide,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minHeight: MIN_TOUCH_DP,
    justifyContent: 'center',
  },
  bannerText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
});
