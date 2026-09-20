import * as Crypto from 'expo-crypto';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SyncQueueService } from '@/services/SyncQueueService';
import { colors, MIN_TOUCH_DP, theme } from '@/theme/theme';

type BystanderSOSModalProps = {
  visible: boolean;
  patient: { id: string; name: string; bloodGroup?: string; photographUri?: string; emergencyContact: string };
  onClose: () => void;
};

export function BystanderSOSModal({ visible, patient, onClose }: BystanderSOSModalProps) {
  const callCaregiver = async (): Promise<void> => {
    await SyncQueueService.enqueueEvent('sos_triggered', {
      id: Crypto.randomUUID(),
      patient_id: patient.id,
      priority: 'HIGH',
      triggered_at: Date.now(),
      channel: 'caregiver_call',
    });
    await Linking.openURL(`tel:${patient.emergencyContact}`);
  };

  return (
    <Modal visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Text style={styles.heading}>Need Help</Text>
        <View style={styles.patientCard}>
          {patient.photographUri ? <Text style={styles.photo}>{patient.photographUri}</Text> : null}
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.detail}>Blood group: {patient.bloodGroup ?? 'Not recorded'}</Text>
          <Text style={styles.detail}>Emergency contact: {patient.emergencyContact}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Call caregiver now"
          onPress={() => void callCaregiver()}
          style={({ pressed }) => [styles.call, pressed && styles.pressed]}
        >
          <Text style={styles.callText}>Call Caregiver Now</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close help screen" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Return</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' },
  heading: { color: colors.text, fontSize: 38, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  patientCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: theme.radius.card, padding: 24, marginBottom: 24, ...theme.flat },
  photo: { color: colors.text, fontSize: 18, marginBottom: 12 },
  name: { color: colors.text, fontSize: 32, fontWeight: '800', marginBottom: 12 },
  detail: { color: colors.text, fontSize: 22, marginBottom: 8 },
  call: { minHeight: MIN_TOUCH_DP, backgroundColor: colors.primary, borderColor: colors.border, borderWidth: 1, borderRadius: theme.radius.button, alignItems: 'center', justifyContent: 'center', ...theme.flat },
  callText: { color: colors.card, fontSize: 28, fontWeight: '900' },
  close: { minHeight: MIN_TOUCH_DP, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: theme.radius.button },
  closeText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
