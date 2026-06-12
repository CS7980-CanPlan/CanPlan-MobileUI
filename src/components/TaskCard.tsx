import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Task } from '../types';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';
import StepIndicator from './StepIndicator';

interface TaskCardProps {
  task: Task;
  /** Called when the user taps the card. Wire to a "task detail" route later. */
  onPress?: (task: Task) => void;
}

/** Maps a task status to a label + accent color shown on the card. */
const statusMeta: Record<
  Task['status'],
  { label: string; color: string }
> = {
  not_started: { label: 'Not started', color: colors.textMuted },
  in_progress: { label: 'In progress', color: colors.warning },
  completed: { label: 'Completed', color: colors.success },
};

/**
 * A single task summary card shown in the home screen's task list. Tapping it
 * is intended to open the task's step-by-step execution screen (not built yet).
 */
export default function TaskCard({ task, onPress }: TaskCardProps) {
  const meta = statusMeta[task.status];
  const completedSteps = task.steps.filter((step) => step.completed).length;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(task)}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${meta.label}, ${completedSteps} of ${task.steps.length} steps complete`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
      </View>

      {task.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      <StepIndicator
        total={task.steps.length}
        completed={completedSteps}
        accent={meta.color}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  status: {
    ...typography.caption,
    fontWeight: '600',
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
