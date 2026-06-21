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

import { useConfirmSignUp, useResendSignUpCode, useSignIn } from '../features/auth';
import {
  messageForConfirmError,
  messageForSignInError,
} from '../features/auth/lib/errorMessages';
import type { AuthStackParamList } from '../navigation/types';
import BackButton from '../shared/components/BackButton';
import PrimaryButton from '../shared/components/PrimaryButton';
import { colors, radius, spacing, typography } from '../shared/theme/tokens';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type Route = RouteProp<AuthStackParamList, 'VerifyEmail'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const { email, password } = route.params;

  const confirmMutation = useConfirmSignUp();
  const resendMutation = useResendSignUpCode();
  const signInMutation = useSignIn();

  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [resendInfo, setResendInfo] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const hiddenInputRef = useRef<TextInput>(null);

  // Tick the resend countdown down to zero. setTimeout-per-tick (not setInterval)
  // so resending cleanly restarts the chain when secondsLeft jumps back to 60.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const isVerifying = confirmMutation.isPending || signInMutation.isPending;
  const canVerify = code.length === CODE_LENGTH && !isVerifying;
  const canResend = secondsLeft <= 0 && !resendMutation.isPending;

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (formError) setFormError(undefined);
  };

  const handleVerify = () => {
    setFormError(undefined);
    confirmMutation.mutate(
      { username: email, confirmationCode: code },
      {
        onSuccess: (result) => {
          if (!result.isSignUpComplete) {
            setFormError(`Additional step required: ${result.nextStep}.`);
            return;
          }
          // Auto sign-in using the password that came through from
          // CreateAccount, so the user lands in the onboarding flow without
          // re-typing their credentials. When isSignedIn flips true the
          // navigation root swaps stacks (Auth → Onboarding or Main).
          signInMutation.mutate(
            { username: email, password },
            {
              onError: (err) => {
                // Auto sign-in failed — drop them back to manual sign-in
                // with a clear hint.
                setFormError(
                  messageForSignInError(err) +
                    ' Please sign in manually with your email and password.',
                );
                navigation.navigate('SignIn');
              },
            },
          );
        },
        onError: (err) => {
          setFormError(messageForConfirmError(err));
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
          setFormError(messageForConfirmError(err));
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { paddingTop: insets.top + spacing.md }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.bannerTitle}>Check your email</Text>
        <Text style={styles.bannerSubtitle}>Step 2 of 3 — verify your address</Text>
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
            We sent a 6-digit code to{' '}
            <Text style={styles.instructionStrong}>{email}</Text>. Enter it
            below to verify your account.
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

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          {resendInfo && !formError ? (
            <Text style={styles.formInfo}>{resendInfo}</Text>
          ) : null}

          <PrimaryButton
            label="Verify Email  ✓"
            onPress={handleVerify}
            disabled={!canVerify}
            loading={isVerifying}
            style={styles.verifyBtn}
          />

          <View style={{ flex: 1 }} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Didn't get a code? </Text>
            <Pressable
              accessibilityRole="link"
              onPress={handleResend}
              disabled={!canResend}
              hitSlop={6}
            >
              <Text style={[styles.footerLink, !canResend ? styles.footerLinkDim : null]}>
                {canResend
                  ? 'Resend email'
                  : `Resend email (${secondsLeft}s)`}
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
    marginBottom: spacing.xl,
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
  formError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  formInfo: {
    ...typography.caption,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  verifyBtn: {
    marginTop: spacing.sm,
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
