import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MemoryItemResponse } from '@sahay/types';

import { getMemoryItems } from '@/db/patientRepository';
import { DEMO_MEMORIES } from '@/db/mockData';

interface ReminiscenceScreenProps {
  /** Active patient id; when absent (or empty vault) the demo album is shown. */
  patientId?: string;
}

/**
 * Familiar Memory Album (Phase 7) — a high-contrast, large-format carousel.
 * White text on deep charcoal, ≥64×64 dp touch targets, zero-friction cycling.
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
          onPress={goToPrevious}
          style={[styles.navButton, index === 0 && styles.navButtonDisabled]}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play audio narration"
          onPress={handlePlayAudio}
          style={styles.playButton}
        >
          <Text style={styles.playButtonText}>▶ Play Audio</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next memory"
          accessibilityState={{ disabled: index === items.length - 1 }}
          disabled={index === items.length - 1}
          onPress={goToNext}
          style={styles.navButton}
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
    backgroundColor: '#2C3E50',
    padding: 24,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1F2A36',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#3A4A5A',
  },
  tag: {
    color: '#F5B971',
    fontSize: 22,
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
    backgroundColor: '#E67E22',
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
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#3A4A5A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.8,
  },
});