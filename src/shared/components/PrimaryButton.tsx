import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: PrimaryButtonProps) {
  const isInactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.btn,
        isInactive
          ? styles.btnDisabled
          : pressed
            ? styles.btnPressed
            : styles.btnActive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: { backgroundColor: colors.primary },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnDisabled: { backgroundColor: colors.disabled },
  label: {
    ...typography.button,
    color: colors.onPrimary,
  },
});
