import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMediaDownloadUrl } from '../../features/media/hooks/useMedia';
import { useTaskSteps } from '../../features/tasks/hooks/useTaskApi';
import type { Category, Task } from '../api/canplanTypes';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

interface TaskCardProps {
  task: Task;
  category?: Category;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  /** When true, the chevron-forward open button is hidden. */
  hideOpenButton?: boolean;
  /** When true, the category name is rendered above the title (and not inline). */
  categoryAboveTitle?: boolean;
  /** When true, the description is wrapped in a bordered box. */
  boxedDescription?: boolean;
}

function pluralizeSteps(count: number): string {
  return `${count} ${count === 1 ? 'step' : 'steps'}`;
}

export default function TaskCard({
  task,
  category,
  onOpen,
  onEdit,
  onDelete,
  deleteDisabled,
  hideOpenButton = false,
  categoryAboveTitle = false,
  boxedDescription = false,
}: TaskCardProps) {
  const stepsQuery = useTaskSteps(task.taskId);
  const coverImageQuery = useMediaDownloadUrl(task.taskId, task.coverImageAssetId ?? '');
  const stepCount = useMemo(
    () => stepsQuery.data?.pages.flatMap((page) => page.items).length ?? 0,
    [stepsQuery.data],
  );
  const categoryColor = category?.color?.trim() || colors.primary;
  const categoryName = category?.name?.trim() || 'No category';

  return (
    <View style={styles.taskCard}>
      {coverImageQuery.data?.downloadUrl ? (
        <View style={styles.coverImageWrap}>
          <Image
            accessibilityLabel={`${task.title} task photo`}
            source={{ uri: coverImageQuery.data.downloadUrl }}
            style={styles.coverImage}
          />
          <View style={[styles.coverCategoryBar, { backgroundColor: categoryColor }]} />
        </View>
      ) : (
        <View style={[styles.coverPlaceholder, { borderLeftColor: categoryColor }]}>
          {coverImageQuery.isLoading ? (
            <ActivityIndicator color={categoryColor} />
          ) : (
            <Ionicons name="image-outline" size={32} color={categoryColor} />
          )}
        </View>
      )}

      <View
        style={[
          styles.taskContent,
          hideOpenButton ? styles.taskContentNoButton : null,
          categoryAboveTitle ? styles.taskContentTopAligned : null,
        ]}
      >
        {categoryAboveTitle ? (
          <Text style={[styles.categoryName, styles.categoryAbove, { color: categoryColor }]}>
            {categoryName}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={styles.taskTitle}>
          {task.title}
        </Text>
        {!categoryAboveTitle ? (
          <Text style={[styles.categoryName, { color: categoryColor }]}>{categoryName}</Text>
        ) : null}
        <Text style={styles.stepSummary}>
          {stepsQuery.isLoading ? 'Loading steps…' : pluralizeSteps(stepCount)}
        </Text>
        {task.description?.trim() ? (
          boxedDescription ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={[styles.taskDescription, styles.taskDescriptionBoxed]}>
                {task.description.trim()}
              </Text>
            </View>
          ) : (
            <Text numberOfLines={2} style={styles.taskDescription}>
              {task.description.trim()}
            </Text>
          )
        ) : null}
        {hideOpenButton ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${task.title}`}
            onPress={onOpen}
            style={({ pressed }) => [styles.openTaskCircle, pressed ? styles.pressed : null]}
          >
            <Ionicons name="chevron-forward" size={28} color={colors.primary} />
          </Pressable>
        )}
      </View>
      <View style={styles.taskActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${task.title}`}
          disabled={deleteDisabled}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editTaskButton,
            pressed && !deleteDisabled ? styles.editTaskPressed : null,
          ]}
        >
          <Text style={styles.editTaskText}>Edit Task</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
          disabled={deleteDisabled}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteTaskButton,
            pressed && !deleteDisabled ? styles.deleteTaskPressed : null,
          ]}
        >
          <Text style={styles.deleteTaskText}>Delete Task</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    overflow: 'hidden',
    borderRadius: radius.lg + spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  coverImage: {
    width: '100%',
    height: 142,
  },
  coverImageWrap: {
    height: 142,
  },
  coverCategoryBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: spacing.sm,
  },
  coverPlaceholder: {
    height: 142,
    borderLeftWidth: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  taskContent: {
    minHeight: 176,
    padding: spacing.xl,
    paddingRight: 96,
    justifyContent: 'center',
  },
  taskContentNoButton: {
    paddingRight: spacing.xl,
  },
  taskContentTopAligned: {
    minHeight: 0,
    paddingTop: spacing.md,
    justifyContent: 'flex-start',
  },
  taskTitle: {
    ...typography.title,
    color: colors.text,
  },
  categoryName: {
    ...typography.bodyStrong,
    marginTop: spacing.sm,
  },
  categoryAbove: {
    marginTop: 0,
    marginBottom: spacing.sm,
    marginLeft: -spacing.md,
  },
  descriptionBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  stepSummary: {
    ...typography.heading,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  taskDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  taskDescriptionBoxed: {
    color: '#4D453B',
    marginTop: spacing.xs,
  },
  descriptionLabel: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  openTaskCircle: {
    position: 'absolute',
    right: spacing.xl,
    top: '50%',
    width: 64,
    height: 64,
    marginTop: -32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDE8',
  },
  taskActions: {
    minHeight: 64,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  editTaskButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  deleteTaskButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTaskPressed: {
    backgroundColor: colors.surfaceWarm,
  },
  deleteTaskPressed: {
    backgroundColor: '#FEE8E8',
  },
  editTaskText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  deleteTaskText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
