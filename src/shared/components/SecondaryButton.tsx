import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        pressed && !disabled ? styles.btnPressed : null,
        disabled ? styles.btnDisabled : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          disabled ? styles.labelDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: 'rgba(224, 119, 68, 0.08)',
  },
  btnDisabled: {
    borderColor: colors.disabled,
  },
  label: {
    ...typography.button,
    color: colors.primary,
  },
  labelDisabled: {
    color: colors.disabled,
  },
});
