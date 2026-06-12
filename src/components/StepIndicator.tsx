import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

interface StepIndicatorProps {
  total: number;
  completed: number;
  /** Bar color for the completed portion. Defaults to the primary brand color. */
  accent?: string;
}

/**
 * A small horizontal progress bar + "n of m steps" caption used inside a
 * task card to show how far through a task the user is.
 */
export default function StepIndicator({
  total,
  completed,
  accent = colors.primary,
}: StepIndicatorProps) {
  const ratio = total === 0 ? 0 : Math.min(1, completed / total);

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: completed }}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: accent },
          ]}
        />
      </View>
      <Text style={styles.caption}>
        {completed} of {total} steps complete
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
