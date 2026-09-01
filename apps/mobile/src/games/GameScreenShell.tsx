import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LargeTouchButton } from '@/components/LargeTouchButton';
import { colors } from '@/theme/colors';

type GameScreenShellProps = {
  children: ReactNode;
};

export function GameScreenShell({ children }: GameScreenShellProps) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.backRow}>
        <LargeTouchButton label="Home" variant="secondary" onPress={() => router.replace('/')} />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
  },
  backRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
  },
});
