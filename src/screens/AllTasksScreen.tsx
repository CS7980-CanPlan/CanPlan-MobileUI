import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategoriesByOwner } from '../features/categories/hooks/useCategories';
import { useMediaDownloadUrl } from '../features/media/hooks/useMedia';
import { useDeleteTask, useTaskSteps, useTasksByOwner } from '../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../navigation/types';
import { getCurrentUserId } from '../shared/api/authTokenProvider';
import type { Category, Task } from '../shared/api/canplanTypes';
import BackButton from '../shared/components/BackButton';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type AllTasksNavigation = NativeStackNavigationProp<MainStackParamList, 'AllTasks'>;

interface TaskCardProps {
  task: Task;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}

function pluralizeSteps(count: number): string {
  return `${count} ${count === 1 ? 'step' : 'steps'}`;
}

function TaskCard({ task, category, onEdit, onDelete, deleteDisabled }: TaskCardProps) {
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

      <View style={styles.taskContent}>
        <Text numberOfLines={2} style={styles.taskTitle}>{task.title}</Text>
        <Text style={[styles.categoryName, { color: categoryColor }]}>{categoryName}</Text>
        <Text style={styles.stepSummary}>
          {stepsQuery.isLoading ? 'Loading steps…' : pluralizeSteps(stepCount)}
        </Text>
        <View style={styles.openTaskCircle}>
          <Ionicons name="chevron-forward" size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.taskActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${task.title}`}
          disabled={deleteDisabled}
          onPress={onEdit}
          style={({ pressed }) => [styles.editTaskButton, pressed && !deleteDisabled ? styles.editTaskPressed : null]}
        >
          <Text style={styles.editTaskText}>Edit Task</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
          disabled={deleteDisabled}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteTaskButton, pressed && !deleteDisabled ? styles.deleteTaskPressed : null]}
        >
          <Text style={styles.deleteTaskText}>Delete Task</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AllTasksScreen() {
  const navigation = useNavigation<AllTasksNavigation>();
  const insets = useSafeAreaInsets();
  const [ownerId, setOwnerId] = useState('');
  const [identityError, setIdentityError] = useState<string>();
  const [taskToDelete, setTaskToDelete] = useState<Task>();
  const tasksQuery = useTasksByOwner(ownerId);
  const categoriesQuery = useCategoriesByOwner(ownerId);
  const deleteTaskMutation = useDeleteTask();

  useEffect(() => {
    let mounted = true;

    void getCurrentUserId()
      .then((userId) => {
        if (mounted) {
          setOwnerId(userId);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setIdentityError(
            error instanceof Error ? error.message : 'Could not load your tasks. Please try again.',
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const tasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [tasksQuery.data],
  );
  const categoryById = useMemo(
    () =>
      new Map(
        (categoriesQuery.data?.pages.flatMap((page) => page.items) ?? []).map((category) => [
          category.categoryId,
          category,
        ]),
      ),
    [categoriesQuery.data],
  );
  const error = identityError || (tasksQuery.error ? tasksQuery.error.message : undefined);

  const handleDeleteTask = async () => {
    if (!taskToDelete || deleteTaskMutation.isPending) {
      return;
    }

    try {
      const deletedTask = await deleteTaskMutation.mutateAsync(taskToDelete.taskId);
      if (!deletedTask) {
        throw new Error('Task deletion returned no task. Please try again.');
      }
      setTaskToDelete(undefined);
    } catch (deleteError) {
      setIdentityError(
        deleteError instanceof Error ? deleteError.message : 'Could not delete the task. Please try again.',
      );
      setTaskToDelete(undefined);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
        <Text accessibilityRole="header" style={styles.headerTitle}>All Tasks</Text>
        {tasks.length > 1 ? (
          <View accessibilityRole="text" accessibilityLabel="Reordering is not available" style={styles.reorderChip}>
            <Text style={styles.reorderText}>Reorder</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!error && (tasksQuery.isLoading || !ownerId) ? (
          <View accessibilityRole="progressbar" style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : null}

        {!error && ownerId && !tasksQuery.isLoading && tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyText}>Create a task to see it here.</Text>
          </View>
        ) : null}

        <View style={styles.taskList}>
          {tasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              category={task.categoryId ? categoryById.get(task.categoryId) : undefined}
              onEdit={() => navigation.navigate('CreateTask', { taskId: task.taskId })}
              onDelete={() => setTaskToDelete(task)}
              deleteDisabled={deleteTaskMutation.isPending}
            />
          ))}
        </View>

        {tasksQuery.hasNextPage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load more tasks"
            accessibilityState={{ busy: tasksQuery.isFetchingNextPage }}
            disabled={tasksQuery.isFetchingNextPage}
            onPress={() => {
              void tasksQuery.fetchNextPage();
            }}
            style={({ pressed }) => [styles.loadMoreButton, pressed ? styles.pressed : null]}
          >
            {tasksQuery.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.loadMoreText}>Load more</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a task"
          onPress={() => navigation.navigate('CreateTask')}
          style={({ pressed }) => [styles.addTaskButton, pressed ? styles.addTaskButtonPressed : null]}
        >
          <Ionicons name="add" size={32} color={colors.primary} />
          <Text style={styles.addTaskText}>Add a task</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={Boolean(taskToDelete)}
        title={`Delete “${taskToDelete?.title ?? ''}”?`}
        message="This task and its steps cannot be restored."
        confirmLabel={deleteTaskMutation.isPending ? 'Deleting…' : 'Delete Task'}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          void handleDeleteTask();
        }}
        onCancel={() => {
          if (!deleteTaskMutation.isPending) {
            setTaskToDelete(undefined);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    flex: 1,
    ...typography.title,
    color: colors.text,
  },
  reorderChip: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  reorderText: {
    ...typography.bodyStrong,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEE8E8',
  },
  errorText: {
    flex: 1,
    ...typography.caption,
    color: colors.danger,
  },
  loadingState: {
    minHeight: 180,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  emptyState: {
    minHeight: 220,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  taskList: {
    gap: spacing.lg,
  },
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
  taskTitle: {
    ...typography.title,
    color: colors.text,
  },
  categoryName: {
    ...typography.bodyStrong,
    marginTop: spacing.sm,
  },
  stepSummary: {
    ...typography.heading,
    color: colors.textMuted,
    marginTop: spacing.md,
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
  loadMoreButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  loadMoreText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  addTaskButton: {
    minHeight: 142,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(224, 119, 68, 0.7)',
    borderRadius: radius.lg + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(224, 119, 68, 0.035)',
  },
  addTaskButtonPressed: {
    backgroundColor: 'rgba(224, 119, 68, 0.1)',
  },
  addTaskText: {
    ...typography.title,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
