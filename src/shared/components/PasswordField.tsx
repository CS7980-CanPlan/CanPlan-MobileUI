import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInputProps } from 'react-native';

import { colors } from '../theme/tokens';
import TextField from './TextField';

interface PasswordFieldProps
  extends Omit<TextInputProps, 'style' | 'secureTextEntry' | 'autoCapitalize'> {
  label: string;
  errorText?: string;
}

/**
 * TextField specialized for passwords: secureTextEntry is on by default, with
 * an eye-toggle icon on the right to reveal/hide the value. The caller still
 * sets `autoComplete` / `textContentType` for sign-in vs sign-up semantics.
 */
export default function PasswordField({ label, errorText, ...inputProps }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...inputProps}
      label={label}
      errorText={errorText}
      secureTextEntry={!show}
      autoCapitalize="none"
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          onPress={() => setShow((v) => !v)}
          hitSlop={8}
        >
          <Ionicons
            name={show ? 'eye-off' : 'eye'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      }
    />
  );
}
