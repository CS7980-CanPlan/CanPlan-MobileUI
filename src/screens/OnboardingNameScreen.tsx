import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateMyProfile } from '../features/users/hooks/useCreateProfile';
import PrimaryButton from '../shared/components/PrimaryButton';
import TextField from '../shared/components/TextField';
import { colors, radius, spacing, typography } from '../shared/theme/tokens';

export default function OnboardingNameScreen() {
  const insets = useSafeAreaInsets();
  const createProfileMutation = useCreateMyProfile();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const canSubmit = name.trim().length > 0 && !createProfileMutation.isPending;

  const handleGetStarted = () => {
    setFormError(undefined);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter your name.');
      return;
    }
    setNameError(undefined);

    createProfileMutation.mutate(
      { displayName: trimmed },
      {
        onSuccess: () => {
          // The seeded profile cache (see useCreateMyProfile) immediately
          // flips App.tsx's needsOnboarding check, which swaps the stack
          // to Home — no explicit navigate needed.
        },
        onError: (err) => {
          const message =
            (err as { message?: string })?.message ?? 'Could not save your name. Please try again.';
          setFormError(message);
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.bannerTitle}>What's your name?</Text>
        <Text style={styles.bannerSubtitle}>Step 3 of 3 — almost done!</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <Text style={styles.intro}>
            Tell us your name so we can personalise your experience.
          </Text>

          <TextField
            label="Your name"
            placeholder="e.g. Alex"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(undefined);
              if (formError) setFormError(undefined);
            }}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="givenName"
            errorText={nameError}
            returnKeyType="done"
            onSubmitEditing={canSubmit ? handleGetStarted : undefined}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <PrimaryButton
            label="Get Started"
            onPress={handleGetStarted}
            disabled={!canSubmit}
            loading={createProfileMutation.isPending}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  banner: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  bannerTitle: {
    ...typography.title,
    color: colors.onPrimary,
  },
  bannerSubtitle: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
    opacity: 0.95,
    marginTop: spacing.xs,
  },
  formWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  intro: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});
