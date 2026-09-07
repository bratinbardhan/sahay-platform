import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { bhashiniVoiceService } from '../services/voice/BhashiniVoiceService';
import ReminiscenceScreen from './ReminiscenceScreen';
import { usePatient } from '@/patient/PatientProvider';

export default function PatientHomeScreen() {
  const { patient } = usePatient();
  const [isListening, setIsListening] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);

  const handleVoicePress = async () => {
    setIsListening(!isListening);
    if (!isListening) {
      await bhashiniVoiceService.speak("नमस्कार, मैं आपकी सहायता के लिए यहाँ हूँ।", { language: 'hi-IN' });
      setIsListening(false);
    }
  };

  if (showAlbum) {
    return (
      <View style={styles.container}>
        <ReminiscenceScreen patientId={patient?.id} />
        <TouchableOpacity
          style={styles.albumBackButton}
          onPress={() => setShowAlbum(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.albumBackText}>‹ Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Patient Home Screen</Text>
      <TouchableOpacity
        style={styles.albumButton}
        onPress={() => setShowAlbum(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.albumBackText}>🖼 Memory Album</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, isListening && styles.listening]}
        onPress={handleVoicePress}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>{isListening ? '...' : '🎤'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  listening: { backgroundColor: '#FF3B30' },
  fabText: { fontSize: 24 },
  albumButton: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: '#E67E22',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  albumBackButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    minWidth: 64,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: '#E67E22',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  albumBackText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
});

