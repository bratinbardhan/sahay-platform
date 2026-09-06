import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { bhashiniVoiceService } from '../services/voice/BhashiniVoiceService';

export default function PatientHomeScreen() {
  const [isListening, setIsListening] = useState(false);

  const handleVoicePress = async () => {
    setIsListening(!isListening);
    if (!isListening) {
      await bhashiniVoiceService.speak("नमस्कार, मैं आपकी सहायता के लिए यहाँ हूँ।", { language: 'hi-IN' });
      setIsListening(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Patient Home Screen</Text>
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
});

