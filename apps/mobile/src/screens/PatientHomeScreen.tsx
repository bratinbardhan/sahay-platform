import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { Bell, Home, Pill, Plus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PatientHomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minimal Zero-Friction</Text>
        <View style={styles.headerIcons}>
          <Pressable style={styles.iconBtn}><Plus color="#1F2937" size={28} /></Pressable>
          <Pressable style={styles.iconBtn}><Bell color="#1F2937" size={28} /></Pressable>
        </View>
      </View>

      <View style={styles.massiveTargetsRow}>
        <Pressable style={styles.massiveTarget}>
          <Home color="#1E293B" size={40} />
          <Text style={styles.massiveTargetText}>Patient App</Text>
        </Pressable>
        <Pressable style={styles.massiveTarget}>
          <Pill color="#1E293B" size={40} />
          <Text style={styles.massiveTargetText}>Massive Targets</Text>
        </Pressable>
      </View>

      <View style={styles.adaptiveCard}>
        <View style={styles.adaptiveCardContent}>
          <Text style={styles.adaptiveCardTitle}>Take Morning Pill</Text>
          <Text style={styles.adaptiveCardSub}>8:00 AM</Text>
        </View>
        <View style={styles.adaptiveCardImagePlaceholder}>
          <Pill color="#1E293B" size={40} />
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavCenterBtn}>
          <Plus color="#FFFFFF" size={40} />
        </View>
        <View style={styles.bottomNav} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  headerTitle: { color: '#1F2937', fontSize: 32, fontWeight: '900', maxWidth: '60%' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 12, backgroundColor: '#F5E6D3', borderRadius: 40 },
  massiveTargetsRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  massiveTarget: { flex: 1, height: 160, backgroundColor: '#F5E6D3', borderRadius: 32, padding: 24, justifyContent: 'space-between' },
  massiveTargetText: { color: '#1E293B', fontSize: 22, fontWeight: '800' },
  adaptiveCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 1 },
  adaptiveCardContent: { flex: 1 },
  adaptiveCardTitle: { color: '#1F2937', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  adaptiveCardSub: { color: '#475569', fontSize: 18, fontWeight: '600' },
  adaptiveCardImagePlaceholder: { width: 80, height: 80, backgroundColor: '#F5E6D3', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  bottomNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, justifyContent: 'flex-end', zIndex: 50 },
  bottomNav: { height: 90, backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  bottomNavCenterBtn: { position: 'absolute', top: 0, left: (width / 2) - 45, width: 90, height: 90, backgroundColor: '#1E293B', borderRadius: 45, justifyContent: 'center', alignItems: 'center', zIndex: 60, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }
});
