import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '../theme/tokens';

interface BackButtonProps {
  onPress: () => void;
  /** `light` = translucent white over colored banner; `dark` = warm chip over light bg. */
  variant?: 'light' | 'dark';
}

export default function BackButton({ onPress, variant = 'light' }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        variant === 'light' ? styles.btnLight : styles.btnDark,
        pressed ? styles.pressed : null,
      ]}
    >
      <Ionicons
        name="arrow-back"
        size={22}
        color={variant === 'light' ? colors.onPrimary : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  btnDark: {
    backgroundColor: colors.surfaceWarm,
  },
  pressed: {
    opacity: 0.7,
  },
});
