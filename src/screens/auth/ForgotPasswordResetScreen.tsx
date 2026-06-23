import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useConfirmForgotPassword,
  useForgotPassword,
  useSignIn,
} from '../../features/auth';
import {
  getErrorName,
  messageForForgotPasswordError,
  messageForResetPasswordError,
  messageForSignInError,
} from '../../features/auth/lib/errorMessages';
import type { AuthStackParamList } from '../../navigation/types';
import BackButton from '../../shared/components/BackButton';
import PasswordField from '../../shared/components/PasswordField';
import PrimaryButton from '../../shared/components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../shared/theme/tokens';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordReset'>;
type Route = RouteProp<AuthStackParamList, 'ForgotPasswordReset'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

// Matches Cognito's default password policy. Server is the source of truth —
// these just give fast client feedback before the round-trip.
const PASSWORD_RULES: { test: (p: string) => boolean; message: string }[] = [
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

/**
 * Step 2 of the 2-step Forgot Password flow: collect the reset code AND the
 * new password on one screen, then submit both atomically to Cognito's
 * confirmResetPassword. Combining them matches the only backend shape Cognito
 * supports (there is no validate-code-only API).
 *
 * On success we auto-sign-in so the user lands on Home without a third
 * password prompt.
 */
export default function ForgotPasswordResetScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { email } = route.params;

  const confirmMutation = useConfirmForgotPassword();
  const signInMutation = useSignIn();
  const resendMutation = useForgotPassword();

  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [codeError, setCodeError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [resendInfo, setResendInfo] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const hiddenInputRef = useRef<TextInput>(null);

  // setTimeout-per-tick so resending cleanly restarts the chain when
  // secondsLeft jumps back to 60.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const isBusy = confirmMutation.isPending || signInMutation.isPending;
  const canSubmit =
    code.length === CODE_LENGTH &&
    password.length > 0 &&
    confirm.length > 0 &&
    !isBusy;
  const canResend = secondsLeft <= 0 && !resendMutation.isPending;

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (codeError) setCodeError(undefined);
    if (formError) setFormError(undefined);
  };

  const handleSubmit = () => {
    // Cascade top-to-bottom: show the first failing field's error.
    setFormError(undefined);
    setCodeError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);

    if (code.length !== CODE_LENGTH) {
      setCodeError('Please enter the 6-digit code.');
      return;
    }
    if (!password) {
      setPasswordError('Please choose a new password.');
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

    confirmMutation.mutate(
      { username: email, confirmationCode: code, newPassword: password },
      {
        onSuccess: () => {
          // Password reset on the server. Auto-sign-in so the user lands on
          // Home without re-typing anything. When isSignedIn flips true, the
          // navigation root swaps stacks automatically.
          signInMutation.mutate(
            { username: email, password },
            {
              onError: (err) => {
                setFormError(
                  messageForSignInError(err) +
                    ' Please sign in manually with your new password.',
                );
                navigation.navigate('SignIn');
              },
            },
          );
        },
        onError: (err) => {
          const name = getErrorName(err);
          // Route the error to the closest field so the user knows where to
          // look. CodeMismatch / Expired live with the code boxes; password
          // policy lives with the password field.
          if (name === 'CodeMismatchException' || name === 'ExpiredCodeException') {
            setCodeError(messageForResetPasswordError(err));
          } else if (name === 'InvalidPasswordException') {
            setPasswordError(messageForResetPasswordError(err));
          } else {
            setFormError(messageForResetPasswordError(err));
          }
        },
      },
    );
  };

  const handleResend = () => {
    if (!canResend) return;
    setFormError(undefined);
    setResendInfo(undefined);
    resendMutation.mutate(
      { username: email },
      {
        onSuccess: () => {
          setSecondsLeft(RESEND_COOLDOWN_SECONDS);
          setResendInfo('A new code has been sent.');
        },
        onError: (err) => {
          setFormError(messageForForgotPasswordError(err));
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { paddingTop: insets.top + spacing.md }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.bannerTitle}>Reset Password</Text>
        <Text style={styles.bannerSubtitle}>
          Step 2 of 2 — enter code and new password
        </Text>
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
          <Text style={styles.instruction}>
            Enter the 6-digit code we sent to{' '}
            <Text style={styles.instructionStrong}>{email}</Text>, then choose a
            new password.
          </Text>

          <Pressable
            accessibilityRole="none"
            onPress={() => hiddenInputRef.current?.focus()}
            style={styles.codeRow}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const isCursor = focused && i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    code[i] ? styles.codeBoxFilled : null,
                    isCursor ? styles.codeBoxFocused : null,
                    codeError ? styles.codeBoxError : null,
                  ]}
                >
                  <Text style={styles.codeChar}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={hiddenInputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoFocus
            caretHidden
            textContentType="oneTimeCode"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />

          {codeError ? <Text style={styles.fieldError}>{codeError}</Text> : null}

          <View style={styles.spacer} />

          <PasswordField
            label="New password"
            placeholder="Choose a password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError(undefined);
              if (formError) setFormError(undefined);
            }}
            autoComplete="password-new"
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
            autoComplete="password-new"
            textContentType="newPassword"
            errorText={confirmError}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          {resendInfo && !formError ? (
            <Text style={styles.formInfo}>{resendInfo}</Text>
          ) : null}

          <PrimaryButton
            label="Save Password"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isBusy}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Didn't get a code? </Text>
            <Pressable
              accessibilityRole="link"
              onPress={handleResend}
              disabled={!canResend}
              hitSlop={6}
            >
              <Text style={[styles.footerLink, !canResend ? styles.footerLinkDim : null]}>
                {canResend ? 'Resend email' : `Resend email (${secondsLeft}s)`}
              </Text>
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
  instruction: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  instructionStrong: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  codeBoxFocused: {
    borderColor: colors.primary,
  },
  codeBoxError: {
    borderColor: colors.danger,
  },
  codeChar: {
    ...typography.title,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  fieldError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  spacer: {
    height: spacing.lg,
  },
  formError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
  formInfo: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.md,
  },
  submitBtn: {
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
  footerLinkDim: {
    color: colors.disabled,
    textDecorationLine: 'none',
  },
});
