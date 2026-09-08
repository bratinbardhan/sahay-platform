import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { bhashiniVoiceService } from '../services/voice/BhashiniVoiceService';
import ReminiscenceScreen from './ReminiscenceScreen';
import { usePatient } from '@/patient/PatientProvider';

/**
 * Patient home shell — WCAG-AAA elder-friendly UX.
 * Primary home screen: stark white text on deep charcoal (#121212).
 * Memory Album (alternate screen): soft cream (#F8FAFC) with pure black text,
 * rendered by ReminiscenceScreen which already uses the charcoal card palette.
 */
export default function PatientHomeScreen() {
  const { patient } = usePatient();
  const [isListening, setIsListening] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);

  const handleVoicePress = async () => {
    setIsListening(!isListening);
    if (!isListening) {
      await bhashiniVoiceService.speak('नमस्कार, मैं आपकी सहायता के लिए यहाँ हूँ।', {
        language: 'hi-IN',
      });
      setIsListening(false);
    }
  };

  const handleMemoryAlbum = () => setShowAlbum(true);
  const handleBackHome = () => setShowAlbum(false);

  const pressedStyle: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.94 }] };

  if (showAlbum) {
    return (
      <View style={styles.container}>
        <ReminiscenceScreen patientId={patient?.id} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          hitSlop={8}
          onPress={handleBackHome}
          style={({ pressed }) => [styles.albumBackButton, pressed && pressedStyle]}
        >
          <Text style={styles.albumBackText}>‹ Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sahāy</Text>
      <Text style={styles.subtitle}>Your caring companion</Text>

      <View style={styles.gameGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Memory Album"
          hitSlop={8}
          onPress={handleMemoryAlbum}
          style={({ pressed }) => [styles.gameCard, pressed && pressedStyle]}
        >
          <Text style={styles.gameIcon}>🖼</Text>
          <Text style={styles.gameLabel}>Memory Album</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Games"
          hitSlop={8}
          onPress={() => {}}
          style={({ pressed }) => [styles.gameCard, pressed && pressedStyle]}
        >
          <Text style={styles.gameIcon}>🎮</Text>
          <Text style={styles.gameLabel}>Games</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Music"
          hitSlop={8}
          onPress={() => {}}
          style={({ pressed }) => [styles.gameCard, pressed && pressedStyle]}
        >
          <Text style={styles.gameIcon}>🎵</Text>
          <Text style={styles.gameLabel}>Music</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Emergency Help"
          hitSlop={8}
          onPress={() => {}}
          style={({ pressed }) => [styles.gameCard, styles.gameCardAlert, pressed && pressedStyle]}
        >
          <Text style={styles.gameIcon}>🆘</Text>
          <Text style={styles.gameLabel}>Emergency Help</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isListening ? 'Stop voice assistance' : 'Start voice assistance'}
        hitSlop={8}
        onPress={handleVoicePress}
        style={({ pressed }) => [
          styles.fab,
          isListening && styles.listening,
          pressed && pressedStyle,
        ]}
      >
        <Text style={styles.fabText}>{isListening ? '...' : '🎤'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 24,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  gameCard: {
    minWidth: 120,
    minHeight: 120,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#1E293B',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gameCardAlert: {
    backgroundColor: '#7F1D1D',
  },
  gameIcon: {
    fontSize: 40,
  },
  gameLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  listening: {
    backgroundColor: '#B91C1C',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  albumButton: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#1E293B',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumBackButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    minWidth: 64,
    minHeight: 64,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#1E293B',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumBackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

