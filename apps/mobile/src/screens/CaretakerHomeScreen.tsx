import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { TierBadge } from '@/components/TierBadge';
import { colors } from '@/theme/theme';

/** Minimal caretaker console — Phase 2 will grow this into the full app. */
export function CaretakerHomeScreen() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Namaste, {user.full_name}</Text>
          <Text style={styles.subtitle}>Caretaker Console</Text>
        </View>
        <TierBadge tier={user.tier} />
      </View>

      <Text style={styles.note}>
        Your loved one&apos;s therapy sessions sync automatically from their Sahāy
        device. Full care-plan, analytics and premium insights arrive in Phase 2.
      </Text>

      <LargeTouchButton
        label="Sign out"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    opacity: 0.7,
    marginTop: 4,
  },
  note: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.text,
    opacity: 0.85,
  },
});