import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PatientProfile, UserTier } from '@sahay/types';

import { useAuth } from '@/auth/AuthProvider';
import { TierBadge } from '@/components/TierBadge';
import { HighContrastCard } from '@/components/HighContrastCard';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { LedgerService } from '@/db/LedgerService';
import { gamesForGds, therapyStageFromGds, type GameModuleId } from '@/games/gdsRouting';
import { RapidFireSorting } from '@/games/RapidFireSorting';
import { SensoryMusicPlayer } from '@/games/SensoryMusicPlayer';
import { SerialNumberScatter } from '@/games/SerialNumberScatter';
import { AmbientRippleScreensaver } from '@/screens/AmbientRippleScreensaver';
import { EnvironmentalSoundMatch } from '@/screens/EnvironmentalSoundMatch';
import { FaceNameMatch } from '@/screens/FaceNameMatch';
import { usePatient } from '@/patient/PatientProvider';
import { colors } from '@/theme/theme';

/**
 * Patient root: reads GDS from SQLite and renders only permitted modules.
       * No login, tabs, or multi-level menus.
 */
export function AppRouter({ tier }: { tier: UserTier }) {
  const { signOut } = useAuth();
  const { patient, ready, refresh } = usePatient();
  const [activeGame, setActiveGame] = useState<GameModuleId | null>(null);
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);

  // Pull the verified balance from the ledger whenever the patient changes
  // or after a game session completes.
  const refreshBalance = useCallback(async () => {
    if (!patient) return;
    const balance = await LedgerService.getCachedBalance(patient.id);
    setLedgerBalance(balance);
  }, [patient]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  if (!ready || !patient) {
    return (
      <View style={styles.center}>
        <Text style={styles.greeting}>Sahāy</Text>
      </View>
    );
  }

  const stage = therapyStageFromGds(patient.assigned_gds_stage);

  // Stage 3 (GDS 6-7) goes directly to the menu-free calming screensaver
  if (stage === 3 && !activeGame) {
    return <AmbientRippleScreensaver patient={patient} />;
  }

  if (activeGame) {
    return (
      <View style={styles.root}>
        <View style={styles.backRow}>
          <LargeTouchButton
            label="Home"
            variant="secondary"
            onPress={() => setActiveGame(null)}
          />
        </View>
        <View style={styles.body}>
          <ActiveGame patient={patient} gameId={activeGame} />
        </View>
      </View>
    );
  }

  const games = gamesForGds(patient.assigned_gds_stage);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Namaste, {patient.name}</Text>
          <Text style={styles.tokens}>DEMITOKENS {ledgerBalance ?? patient.demitoken_balance}</Text>
        </View>
        <View style={styles.headerActions}>
          <TierBadge tier={tier} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => void signOut()}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.games}>
        {games.map((game) => (
          <HighContrastCard key={game.id} style={styles.card}>
            <LargeTouchButton label={game.title} onPress={() => setActiveGame(game.id)} />
          </HighContrastCard>
        ))}
      </View>
    </View>
  );
}

function ActiveGame({ patient, gameId }: { patient: PatientProfile; gameId: GameModuleId }) {
    switch (gameId) {
    case 'rapid_fire_sorting':
      return <RapidFireSorting patient={patient} />;
    case 'serial_number_scatter':
      return <SerialNumberScatter patient={patient} />;
    case 'face_name_match':
      return <FaceNameMatch patient={patient} />;
    case 'environmental_sound_match':
      return <EnvironmentalSoundMatch patient={patient} />;
    case 'sensory_music':
      return <SensoryMusicPlayer patient={patient} />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tokens: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 28,
  },
  games: {
    gap: 20,
  },
  card: {
    paddingVertical: 12,
  },
  backRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
  },
});
