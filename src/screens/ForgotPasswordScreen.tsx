import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

import { useForgotPassword } from '../features/auth';
import {
  getErrorName,
  messageForForgotPasswordError,
} from '../features/auth/lib/errorMessages';
import type { AuthStackParamList } from '../navigation/types';
import BackButton from '../shared/components/BackButton';
import PrimaryButton from '../shared/components/PrimaryButton';
import TextField from '../shared/components/TextField';
import { colors, radius, spacing, typography } from '../shared/theme/tokens';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Step 1 of the 2-step Forgot Password flow: collect the email and send the
 * Cognito reset code. On success we hand off to ForgotPasswordReset (which
 * collects code + new password together — the only shape Cognito accepts).
 */
export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const forgotPasswordMutation = useForgotPassword();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const canSubmit = email.length > 0 && !forgotPasswordMutation.isPending;

  const handleSubmit = () => {
    setFormError(undefined);
    setEmailError(undefined);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter your email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    forgotPasswordMutation.mutate(
      { username: trimmedEmail },
      {
        onSuccess: () => {
          navigation.navigate('ForgotPasswordReset', { email: trimmedEmail });
        },
        onError: (err) => {
          // UserNotFoundException belongs next to the field — it's about the
          // value the user just typed. Everything else is a form-level error.
          if (getErrorName(err) === 'UserNotFoundException') {
            setEmailError(
              'No account found for this email. Try creating an account first.',
            );
          } else {
            setFormError(messageForForgotPasswordError(err));
          }
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { paddingTop: insets.top + spacing.md }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.bannerTitle}>Forgot Password</Text>
        <Text style={styles.bannerSubtitle}>Step 1 of 2 — enter your email</Text>
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
            Enter the email address linked to your account and we'll send you a
            6-digit verification code.
          </Text>

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
            returnKeyType="send"
            onSubmitEditing={canSubmit ? handleSubmit : undefined}
            errorText={emailError}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <PrimaryButton
            label="Send Code"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={forgotPasswordMutation.isPending}
            style={styles.sendBtn}
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
  sendBtn: {
    marginTop: spacing.xl,
  },
});
