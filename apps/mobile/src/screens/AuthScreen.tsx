import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { UserRole } from '@sahay/types';

import { useAuth } from '@/auth/AuthProvider';
import { LargeTouchButton } from '@/components/LargeTouchButton';
import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type Mode = 'login' | 'signup';

const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; title: string; hint: string }> = [
  { value: 'PATIENT', title: 'Patient', hint: 'Therapeutic games & calm therapy' },
  { value: 'CARETAKER', title: 'Caretaker', hint: 'Monitor & manage care plans' },
];

/** Unified login / signup screen with an explicit Patient ↔ Caretaker switch. */
export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole =
    ROLE_OPTIONS.find((option) => option.value === role) ?? ROLE_OPTIONS[0];

  const submit = async () => {
    if (submitting) {
      return;
    }
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(emailTrimmed, password, role);
      } else {
        await signUp(emailTrimmed, password, fullName.trim(), role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Sahāy</Text>
        <Text style={styles.tagline}>One account · Patient &amp; Caretaker</Text>

        {/* Login / Sign up segmented toggle */}
        <View style={styles.segment} accessibilityRole="tablist">
          {(['login', 'signup'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(m)}
                style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
              >
                <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
                  {m === 'login' ? 'Login' : 'Sign up'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Role switchboard */}
        <Text style={styles.sectionLabel}>I am logging in as a</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setRole(option.value)}
                style={[styles.roleCard, active ? styles.roleCardActive : null, styles.minTouch]}
              >
                <Text style={[styles.roleTitle, active ? styles.roleTitleActive : null]}>
                  {option.title}
                </Text>
                <Text style={[styles.roleHint, active ? styles.roleHintActive : null]}>
                  {option.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'signup' ? (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#8890A0"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8890A0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8890A0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.submitWrap}>
          <LargeTouchButton
            label={
              mode === 'login'
                ? `Login as ${selectedRole.title}`
                : `Create ${selectedRole.title} account`
            }
            onPress={() => void submit()}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 88,
    paddingBottom: 48,
  },
  brand: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 32,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#EDEAE3',
    borderRadius: 999,
    padding: 4,
    marginBottom: 28,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.text,
  },
  segmentLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.6,
  },
  segmentLabelActive: {
    color: colors.card,
    opacity: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#C9CFD6',
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.card,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF1E0',
  },
  minTouch: {
    minHeight: MIN_TOUCH_DP,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  roleTitleActive: {
    color: colors.primary,
  },
  roleHint: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    opacity: 0.65,
  },
  roleHintActive: {
    opacity: 0.9,
  },
  input: {
    borderWidth: 2,
    borderColor: '#C9CFD6',
    borderRadius: 16,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
    marginBottom: 14,
    minHeight: MIN_TOUCH_DP,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B3452C',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitWrap: {
    marginTop: 4,
  },
});