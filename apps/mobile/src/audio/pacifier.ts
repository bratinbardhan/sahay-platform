import { Audio } from 'expo-av';

import { synthesizePacifier } from '@/audio/synthesize';

/** The pacifier must feel calming — soft volume, a few gentle repetitions. */
const PACIFIER_VOLUME = 0.45;
const PACIFIER_REPEATS = 3;

let cachedUri: string | null = null;

function waitForCompletion(sound: Audio.Sound): Promise<void> {
  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        resolve();
      }
    });
  });
}

/**
 * Plays the pre-recorded caregiver pacifier locally during an offline
 * anti-wandering breach ("please sit down and rest, help is on the way").
 * Never raises, never uses alarming sounds — zero-failure clinical rule.
 */
export async function playSoothingPacifier(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    if (!cachedUri) {
      cachedUri = await synthesizePacifier();
    }

    const { sound } = await Audio.Sound.createAsync({ uri: cachedUri });
    await sound.setVolumeAsync(PACIFIER_VOLUME);

    for (let repetition = 0; repetition < PACIFIER_REPEATS; repetition += 1) {
      await sound.replayAsync();
      await waitForCompletion(sound);
    }

    await sound.unloadAsync();
  } catch (error) {
    // Pacifier playback is best-effort; a failure must never alarm the patient.
    console.warn('[pacifier] soothing audio skipped:', error);
  }
}