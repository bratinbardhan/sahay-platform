import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PatientProfile } from '@sahay/types';

import { ErrorlessFeedbackWrapper } from '@/components/ErrorlessFeedbackWrapper';
import { NER_SORT_ITEMS, type SortCategory, type SortItem } from '@/games/catalog';
import { useGameplaySession } from '@/games/useGameplaySession';
import { bhashiniVoiceService } from '@/services/voice/BhashiniVoiceService';
import { colors } from '@/theme/theme';

type RapidFireSortingProps = { patient: PatientProfile };

function nextItem(excludeId?: string): SortItem {
  const pool = NER_SORT_ITEMS.filter((candidate) => candidate.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function RapidFireSorting({ patient }: RapidFireSortingProps) {
  const { beginTask, completeTask, persistSession, session } = useGameplaySession(patient, 'rapid_fire_sorting');
  const [item, setItem] = useState<SortItem>(() => nextItem());
  const [selected, setSelected] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [matched, setMatched] = useState<SortCategory | null>(null);

  useEffect(() => {
    beginTask();
    return () => { void persistSession(); };
  }, [beginTask, persistSession]);

  const chooseCategory = useCallback(async (category: SortCategory): Promise<void> => {
    if (!selected || guiding) return;
    const correct = category === item.category;
    if (correct) {
      setMatched(category);
      await bhashiniVoiceService.speak('Well done.', { language: 'en-IN' });
      await completeTask(true);
      setItem(nextItem(item.id));
      setSelected(false);
      setMatched(null);
      beginTask();
      return;
    }
    setGuiding(true);
    await bhashiniVoiceService.speak(`Let us place ${item.label} here.`, { language: 'en-IN' });
    setTimeout(() => {
      void completeTask(false).then(() => {
        setGuiding(false);
        setSelected(false);
        setItem(nextItem(item.id));
        beginTask();
      });
    }, 900);
  }, [beginTask, completeTask, guiding, item, selected]);

  const selectItem = (): void => {
    if (guiding) return;
    setSelected(true);
  };

  return (
    <ErrorlessFeedbackWrapper isGuiding={guiding} guidanceLabel="Let us place it here">
      <View style={styles.root}>
        <Text style={styles.hint}>{selected ? 'Now choose the matching group' : 'Tap the item, then choose a group'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${item.label}`} onPress={selectItem} style={[styles.itemCard, selected && styles.selected]}>
          <Text style={styles.glyph}>{item.glyph}</Text>
          <Text style={styles.itemLabel}>{item.label}</Text>
        </Pressable>
        <View style={styles.buckets}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fruit group" onPress={() => void chooseCategory('fruit')} style={[styles.bucket, matched === 'fruit' && styles.correct]}>
            <Text style={styles.bucketText}>Fruits</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Bamboo group" onPress={() => void chooseCategory('bamboo')} style={[styles.bucket, matched === 'bamboo' && styles.correct]}>
            <Text style={styles.bucketText}>Bamboo</Text>
          </Pressable>
        </View>
        <Text style={styles.tokens}>DEMITOKENS {session.demitokensEarned}</Text>
      </View>
    </ErrorlessFeedbackWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16, alignItems: 'center' },
  hint: { color: colors.text, fontSize: 22, textAlign: 'center', marginBottom: 20 },
  itemCard: { width: '90%', minHeight: 220, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  selected: { borderColor: colors.primary, backgroundColor: colors.reinforcementPeach },
  glyph: { fontSize: 64 },
  itemLabel: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 12 },
  buckets: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 24 },
  bucket: { flex: 1, minHeight: 128, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  correct: { backgroundColor: colors.reinforcementGreen, borderColor: colors.text },
  bucketText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  tokens: { color: colors.primary, fontSize: 20, fontWeight: '800', marginTop: 24 },
});
