import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getErrorMessage,
  getErrorName,
  messageForSignUpError,
} from '../features/auth/lib/errorMessages';
import { useResendSignUpCode, useSignUp } from '../features/auth';
import type { AuthStackParamList } from '../navigation/types';
import BackButton from '../shared/components/BackButton';
import PasswordField from '../shared/components/PasswordField';
import PrimaryButton from '../shared/components/PrimaryButton';
import TextField from '../shared/components/TextField';
import { colors, radius, spacing, typography } from '../shared/theme/tokens';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'CreateAccount'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordRule {
  test: (p: string) => boolean;
  message: string;
}

// Matches the Cognito default password policy. The pool's actual policy is
// the source of truth — if the pool requires more (e.g. special chars), the
// server returns InvalidPasswordException with the exact rule and we display
// that. These rules just give faster, friendlier feedback before the round-trip.
const PASSWORD_RULES: PasswordRule[] = [
  { test: (p) => p.length >= 8, message: 'Password must be at least 8 characters.' },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must include an uppercase letter.' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must include a lowercase letter.' },
  { test: (p) => /\d/.test(p), message: 'Password must include a number.' },
];

function firstPasswordError(password: string): string | undefined {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.message;
  }
  return undefined;
}

export default function CreateAccountScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const signUpMutation = useSignUp();
  const resendMutation = useResendSignUpCode();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const isBusy = signUpMutation.isPending || resendMutation.isPending;
  const canSubmit = email.length > 0 && password.length > 0 && confirm.length > 0 && !isBusy;

  const handleContinue = () => {
    // Cascade top-to-bottom: show the first failing field's error, clear the
    // rest. Each click of Continue advances to the next problem (if any).
    setFormError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter your email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setPasswordError('Please choose a password.');
      return;
    }
    const pErr = firstPasswordError(password);
    if (pErr) {
      setPasswordError(pErr);
      return;
    }

    if (!confirm) {
      setConfirmError('Please re-enter your password.');
      return;
    }
    if (confirm !== password) {
      setConfirmError('Passwords do not match.');
      return;
    }

    signUpMutation.mutate(
      { username: trimmedEmail, password, email: trimmedEmail },
      {
        onSuccess: () => {
          navigation.navigate('VerifyEmail', { email: trimmedEmail, password });
        },
        onError: (err) => {
          const errName = getErrorName(err);
          if (errName === 'UsernameExistsException') {
            // Auto-resend to detect state. Three outcomes:
            //   - resend OK → unconfirmed user, fresh code in inbox → go verify
            //   - resend says "already confirmed" → user is verified → sign in
            //   - resend fails for any other reason (rate limit, network, etc.)
            //     → assume unconfirmed and go to verify anyway. They likely
            //     still have a working code from earlier, and the Verify
            //     screen has its own Resend button with its own cooldown.
            resendMutation.mutate(
              { username: trimmedEmail },
              {
                onSuccess: () => {
                  navigation.navigate('VerifyEmail', { email: trimmedEmail, password });
                },
                onError: (resendErr) => {
                  if (/confirmed/i.test(getErrorMessage(resendErr))) {
                    setFormError('This email is already registered. Please sign in.');
                  } else {
                    navigation.navigate('VerifyEmail', { email: trimmedEmail, password });
                  }
                },
              },
            );
          } else if (errName === 'LimitExceededException') {
            // Cognito's email-send quota is exhausted. The most common cause:
            // the email is already registered as an unconfirmed user, and
            // signUp on an unconfirmed user tries to resend the verification
            // code — which hits the daily limit. Surface this clearly rather
            // than as "too many attempts" (which sounds like the user did
            // something wrong).
            setFormError(
              'This email may already be registered. Try signing in, or wait a few minutes and try again.',
            );
          } else if (errName === 'InvalidPasswordException') {
            setPasswordError(messageForSignUpError(err));
          } else {
            setFormError(messageForSignUpError(err));
          }
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { paddingTop: insets.top + spacing.md }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.bannerTitle}>Create Account</Text>
        <Text style={styles.bannerSubtitle}>Step 1 of 3 — your login details</Text>
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
          <TextField
            label="Email address"
            placeholder="e.g. alex@email.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(undefined);
              if (formError) setFormError(undefined);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            errorText={emailError}
          />

          <View style={styles.spacer} />

          <PasswordField
            label="Password"
            placeholder="Choose a password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError(undefined);
              if (formError) setFormError(undefined);
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            errorText={passwordError}
          />

          <View style={styles.spacer} />

          <PasswordField
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (confirmError) setConfirmError(undefined);
              if (formError) setFormError(undefined);
            }}
            // Same textContentType as above so iOS auto-mirrors the strong
            // password into both fields when the user accepts the suggestion.
            autoComplete="new-password"
            textContentType="newPassword"
            errorText={confirmError}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <View style={{ flex: 1 }} />

          <PrimaryButton
            label="Continue  →"
            onPress={handleContinue}
            disabled={!canSubmit}
            loading={isBusy}
            style={styles.continueBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.goBack()}
              hitSlop={6}
            >
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
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
    marginTop: spacing.lg,
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
  spacer: {
    height: spacing.lg,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
  continueBtn: {
    marginTop: spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textMuted,
  },
  footerLink: {
    ...typography.bodyStrong,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
