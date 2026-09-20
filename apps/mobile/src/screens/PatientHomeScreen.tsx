import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BystanderSOSModal } from '@/components/BystanderSOSModal';
import { gamesForGds, therapyStageFromGds } from '@/games/gdsRouting';
import { usePatient } from '@/patient/PatientProvider';
import { bhashiniVoiceService } from '@/services/voice/BhashiniVoiceService';
import { colors, MIN_TOUCH_DP } from '@/theme/theme';

export default function PatientHomeScreen() {
  const { patient } = usePatient();
  const [now, setNow] = useState(() => new Date());
  const [listening, setListening] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const timeOfDay = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const stage = patient ? therapyStageFromGds(patient.assigned_gds_stage) : 1;
  const games = useMemo(() => (patient ? gamesForGds(patient.assigned_gds_stage) : []), [patient]);

  const speak = async (): Promise<void> => {
    setListening(true);
    await bhashiniVoiceService.speak('नमस्कार, मैं आपकी सहायता के लिए यहाँ हूँ।', { language: 'hi-IN' });
    setListening(false);
  };

  if (!patient) {
    return <View style={styles.container}><Text style={styles.title}>Sahāy</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.clock}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      <Text style={styles.timeOfDay}>{timeOfDay}, {patient.name}</Text>
      <View style={styles.statusRow}>
        <Text style={styles.stage}>GDS Stage {stage}</Text>
        <Text style={styles.tokens}>DEMITOKENS {patient.demitoken_balance}</Text>
      </View>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Start Bhashini voice assistant" onPress={() => void speak()} style={styles.voice}>
          <Text style={styles.voiceText}>{listening ? 'Listening…' : 'Speak with Sahāy'}</Text>
        </Pressable>
      </Animated.View>
      <Text style={styles.sectionTitle}>Today’s gentle activities</Text>
      <View style={styles.gameGrid}>
        {games.map((game) => (
          <Pressable key={game.id} accessibilityRole="button" accessibilityLabel={`Open ${game.title}`} style={styles.gameCard}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameStage}>Stage {stage}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Need help" onPress={() => setShowHelp(true)} style={styles.help}>
        <Text style={styles.helpText}>Need Help</Text>
      </Pressable>
      <BystanderSOSModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        patient={{ id: patient.id, name: patient.name, emergencyContact: '112' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, alignItems: 'center' },
  title: { color: colors.text, fontSize: 36, fontWeight: '900' },
  clock: { color: colors.text, fontSize: 56, fontWeight: '900', marginTop: 16 },
  timeOfDay: { color: colors.text, fontSize: 26, marginBottom: 16 },
  statusRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  stage: { color: colors.text, fontSize: 22, fontWeight: '800', backgroundColor: colors.reinforcementPeach, padding: 12 },
  tokens: { color: colors.text, fontSize: 22, fontWeight: '800', padding: 12 },
  voice: { minWidth: 220, minHeight: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  voiceText: { color: colors.card, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '800', marginVertical: 28 },
  gameGrid: { width: '100%', gap: 12 },
  gameCard: { minHeight: MIN_TOUCH_DP, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, padding: 18 },
  gameTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  gameStage: { color: colors.text, fontSize: 18, marginTop: 6 },
  help: { minHeight: MIN_TOUCH_DP, minWidth: 160, marginTop: 24, backgroundColor: colors.reinforcementPeach, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  helpText: { color: colors.text, fontSize: 22, fontWeight: '800' },
});
