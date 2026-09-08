import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MemoryItemResponse } from '@sahay/types';

import { getMemoryItems } from '@/db/patientRepository';
import { DEMO_MEMORIES } from '@/db/mockData';

interface ReminiscenceScreenProps {
  patientId?: string;
}

/**
 * Familiar Memory Album (Phase 7) — WCAG-AAA high-contrast carousel.
 * Stark white text on deep charcoal, ≥64×64 dp touch targets with pressed
 * scaling feedback, and large-format typography for low-vision users.
 */
export default function ReminiscenceScreen({ patientId }: ReminiscenceScreenProps) {
  const [items, setItems] = useState<MemoryItemResponse[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let rows: MemoryItemResponse[] | null = null;
      if (patientId) {
        try {
          rows = await getMemoryItems(patientId);
        } catch {
          rows = null; // DB unavailable — fall back to the demo album below.
        }
      }
      if (cancelled) return;
      if (rows && rows.length > 0) {
        setItems(rows);
      } else {
        setItems(DEMO_MEMORIES);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (items === null) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.placeholder}>Loading memories…</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.placeholder}>No memories yet.</Text>
      </View>
    );
  }

  const current = items[index];
  const goToPrevious = () => setIndex((i) => Math.max(0, i - 1));
  const goToNext = () => setIndex((i) => Math.min(items.length - 1, i + 1));

  const handlePlayAudio = () => {
    console.log('[Reminiscence] Play Audio tapped:', current.audio_narration_url ?? 'no narration url');
  };

  return (
    <View style={styles.root}>
            <View style={styles.card}>
        <Text style={styles.subtitle}>Memory Album</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Image
          source={{ uri: current.image_url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={current.title}
        />
        <Text style={styles.tag}>
          {current.relationship_tag}
          {current.era_or_date ? ` · ${current.era_or_date}` : ''}
        </Text>
        <Text style={styles.caption}>{current.caption_text}</Text>
      </View>

      <View style={styles.controls}>
                <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous memory"
          accessibilityState={{ disabled: index === 0 }}
          disabled={index === 0}
          hitSlop={8}
          onPress={goToPrevious}
          style={({ pressed }) => [
            styles.navButton,
            index === 0 ? styles.navButtonDisabled : null,
            pressed && index !== 0 ? styles.pressed : null,
          ]}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play audio narration"
          hitSlop={8}
          onPress={handlePlayAudio}
          style={({ pressed }) => [styles.playButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.playButtonText}>▶ Play Audio</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next memory"
          accessibilityState={{ disabled: index === items.length - 1 }}
          disabled={index === items.length - 1}
          hitSlop={8}
          onPress={goToNext}
          style={({ pressed }) => [
            styles.navButton,
            index === items.length - 1 ? styles.navButtonDisabled : null,
            pressed && index !== items.length - 1 ? styles.pressed : null,
          ]}
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.counter}>
        {index + 1} of {items.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  tag: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
    navButton: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  playButton: {
    flex: 1,
    minHeight: 64,
    minWidth: 64,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  counter: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.9,
  },
});