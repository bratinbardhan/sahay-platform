import * as Crypto from 'expo-crypto';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Vibration } from 'react-native';

import { SyncQueueService } from '@/services/SyncQueueService';
import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type RoutineReminderModalProps = {
  visible: boolean;
  routine: 'Hydration' | 'Medication adherence';
  patientId: string;
  scheduledAt: number;
  onComplete: () => void;
};

export function RoutineReminderModal({
  visible,
  routine,
  patientId,
  scheduledAt,
  onComplete,
}: RoutineReminderModalProps) {
  const complete = async (): Promise<void> => {
    Vibration.vibrate(80);
    const completedAt = Date.now();
    await SyncQueueService.enqueueEvent('routine_completed', {
      id: Crypto.randomUUID(),
      patient_id: patientId,
      routine,
      scheduled_at: scheduledAt,
      completed_at: completedAt,
      latency_ms: Math.max(0, completedAt - scheduledAt),
    });
    onComplete();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{routine}</Text>
          <Text style={styles.message}>A gentle reminder from Sahāy</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Complete ${routine}`}
            onPress={() => void complete()}
            style={({ pressed }) => [styles.complete, pressed && styles.pressed]}
          >
            <Text style={styles.completeText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 2, padding: 32 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.text, fontSize: 22, textAlign: 'center', marginVertical: 24 },
  complete: {
    minHeight: MIN_TOUCH_DP,
    backgroundColor: colors.reinforcementGreen,
    borderColor: colors.border,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: { color: colors.text, fontSize: 24, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
