import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyCategories } from '../../features/categories/hooks/useCategories';
import {
  useDeleteTask,
  useTasksByOwner,
  useUpdateTask,
} from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import { getCurrentUserId } from '../../shared/api/authTokenProvider';
import type { Task } from '../../shared/api/canplanTypes';
import BackButton from '../../shared/components/BackButton';
import CategoryPickerSheet from '../../shared/components/CategoryPickerSheet';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type ManageTasksNavigation = NativeStackNavigationProp<MainStackParamList, 'ManageTasks'>;
type TaskPositions = Record<string, number>;

const MANAGE_TASK_ROW_SLOT_HEIGHT = 64;
const REORDER_ANIMATION_DURATION_MS = 260;

function orderTasksByIds(tasks: Task[], orderedIds: string[]) {
  if (orderedIds.length === 0) return tasks;

  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const used = new Set<string>();
  const ordered: Task[] = [];

  for (const id of orderedIds) {
    const task = byId.get(id);
    if (task) {
      ordered.push(task);
      used.add(id);
    }
  }

  for (const task of tasks) {
    if (!used.has(task.taskId)) ordered.push(task);
  }

  return ordered;
}

function makeTaskPositions(tasks: Task[]) {
  return tasks.reduce<TaskPositions>((positions, task, index) => {
    positions[task.taskId] = index;
    return positions;
  }, {});
}

function orderedIdsFromPositions(positions: TaskPositions) {
  return Object.entries(positions)
    .sort(([, a], [, b]) => a - b)
    .map(([taskId]) => taskId);
}

function clampIndex(value: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, 0), max);
}

function movePosition(positions: TaskPositions, from: number, to: number) {
  'worklet';

  if (from === to) return positions;

  const next = { ...positions };
  const movingDown = to > from;

  for (const taskId in positions) {
    const position = positions[taskId];
    if (position === from) {
      next[taskId] = to;
    } else if (movingDown && position > from && position <= to) {
      next[taskId] = position - 1;
    } else if (!movingDown && position >= to && position < from) {
      next[taskId] = position + 1;
    }
  }

  return next;
}

export default function ManageTasksScreen() {
  const navigation = useNavigation<ManageTasksNavigation>();
  const insets = useSafeAreaInsets();
  const [ownerId, setOwnerId] = useState('');
  const [identityError, setIdentityError] = useState<string>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
  const latestTaskOrderRef = useRef<string[]>([]);
  const tasksQuery = useTasksByOwner(ownerId);
  const categoriesQuery = useMyCategories(Boolean(ownerId));
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();

  useEffect(() => {
    let mounted = true;

    void getCurrentUserId()
      .then((userId) => {
        if (mounted) setOwnerId(userId);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setIdentityError(
            err instanceof Error ? err.message : 'Could not load your tasks. Please try again.',
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const remoteTasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [tasksQuery.data],
  );
  const error = identityError || tasksQuery.error?.message;

  // Seed local order from the server payload, then keep our reorder local while
  // merging in any additions/removals from the server.
  useEffect(() => {
    setOrderedTasks((prev) => {
      if (remoteTasks.length === 0) {
        latestTaskOrderRef.current = [];
        return prev.length === 0 ? prev : [];
      }

      const preferredOrder =
        latestTaskOrderRef.current.length > 0
          ? latestTaskOrderRef.current
          : prev.map((task) => task.taskId);
      const remoteById = new Map(remoteTasks.map((task) => [task.taskId, task]));
      const kept = preferredOrder
        .map((taskId) => remoteById.get(taskId))
        .filter((task): task is Task => Boolean(task));
      const seen = new Set(kept.map((t) => t.taskId));
      const additions = remoteTasks.filter((t) => !seen.has(t.taskId));
      const next = [...kept, ...additions];
      latestTaskOrderRef.current = next.map((task) => task.taskId);

      if (next.length === prev.length && next.every((task, index) => task === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [remoteTasks]);

  const toggleSelected = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;
  const actionsDisabled =
    selectedCount === 0 || deleteTaskMutation.isPending || updateTaskMutation.isPending;
  const categories = useMemo(
    () => categoriesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [categoriesQuery.data],
  );

  const handleDelete = async () => {
    if (selectedCount === 0 || deleteTaskMutation.isPending) return;
    try {
      for (const taskId of selectedIds) {
        await deleteTaskMutation.mutateAsync(taskId);
      }
      setOrderedTasks((prev) => {
        const next = orderTasksByIds(prev, latestTaskOrderRef.current).filter(
          (t) => !selectedIds.has(t.taskId),
        );
        latestTaskOrderRef.current = next.map((task) => task.taskId);
        return next;
      });
      setSelectedIds(new Set());
      setConfirmDelete(false);
      navigation.navigate('AllTasks');
    } catch (err) {
      setIdentityError(
        err instanceof Error ? err.message : 'Could not delete the selected tasks.',
      );
      setConfirmDelete(false);
    }
  };

  const handleMoveToCategory = async (categoryId: string) => {
    setCategorySheetVisible(false);
    if (selectedCount === 0 || updateTaskMutation.isPending) return;
    try {
      for (const taskId of selectedIds) {
        await updateTaskMutation.mutateAsync({ taskId, categoryId });
      }
      setSelectedIds(new Set());
    } catch (err) {
      setIdentityError(
        err instanceof Error ? err.message : 'Could not move the selected tasks.',
      );
    }
  };

  const handleOrderChange = useCallback((positions: TaskPositions) => {
    latestTaskOrderRef.current = orderedIdsFromPositions(positions);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          All Tasks
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.doneButton, pressed ? styles.donePressed : null]}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!error && (tasksQuery.isLoading || !ownerId) && orderedTasks.length === 0 ? (
        <View accessibilityRole="progressbar" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      ) : (
        <SortableTaskList
          tasks={orderedTasks}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onOrderChange={handleOrderChange}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 96 + spacing.xl },
          ]}
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <BottomAction
          icon="trash-outline"
          label="Delete"
          disabled={actionsDisabled}
          onPress={() => setConfirmDelete(true)}
        />
        <BottomAction
          icon="folder-open-outline"
          label="Add to"
          disabled={actionsDisabled}
          onPress={() => setCategorySheetVisible(true)}
        />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'task' : 'tasks'}?`}
        message="These tasks and their steps cannot be restored."
        confirmLabel={deleteTaskMutation.isPending ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          if (!deleteTaskMutation.isPending) setConfirmDelete(false);
        }}
      />

      <CategoryPickerSheet
        visible={categorySheetVisible}
        categories={categories}
        isLoading={categoriesQuery.isLoading}
        busy={updateTaskMutation.isPending}
        title={`Add ${selectedCount} ${selectedCount === 1 ? 'task' : 'tasks'} to…`}
        onCancel={() => {
          if (!updateTaskMutation.isPending) setCategorySheetVisible(false);
        }}
        onSelect={(categoryId) => {
          void handleMoveToCategory(categoryId);
        }}
      />
    </View>
  );
}

interface SortableTaskListProps {
  tasks: Task[];
  selectedIds: Set<string>;
  onToggle: (taskId: string) => void;
  onOrderChange: (positions: TaskPositions) => void;
  contentContainerStyle: StyleProp<ViewStyle>;
}

function SortableTaskList({
  tasks,
  selectedIds,
  onToggle,
  onOrderChange,
  contentContainerStyle,
}: SortableTaskListProps) {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const positions = useSharedValue<TaskPositions>(makeTaskPositions(tasks));
  const taskIdsKey = useMemo(() => tasks.map((task) => task.taskId).join('|'), [tasks]);

  useEffect(() => {
    const nextPositions = makeTaskPositions(tasks);
    positions.value = nextPositions;
    onOrderChange(nextPositions);
  }, [onOrderChange, positions, taskIdsKey, tasks]);

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.listItemsStack, { height: tasks.length * MANAGE_TASK_ROW_SLOT_HEIGHT }]}>
        {tasks.map((task) => (
          <SortableTaskRow
            key={task.taskId}
            item={task}
            positions={positions}
            itemCount={tasks.length}
            selected={selectedIds.has(task.taskId)}
            onToggle={onToggle}
            onOrderChange={onOrderChange}
            setScrollEnabled={setScrollEnabled}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface SortableTaskRowProps {
  item: Task;
  positions: SharedValue<TaskPositions>;
  itemCount: number;
  selected: boolean;
  onToggle: (taskId: string) => void;
  onOrderChange: (positions: TaskPositions) => void;
  setScrollEnabled: (enabled: boolean) => void;
}

function SortableTaskRow({
  item,
  positions,
  itemCount,
  selected,
  onToggle,
  onOrderChange,
  setScrollEnabled,
}: SortableTaskRowProps) {
  const isDragging = useSharedValue(false);
  const dragTop = useSharedValue(0);
  const startTop = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      const currentPosition = positions.value[item.taskId] ?? 0;
      startTop.value = currentPosition * MANAGE_TASK_ROW_SLOT_HEIGHT;
      dragTop.value = startTop.value;
      isDragging.value = true;
      runOnJS(setScrollEnabled)(false);
    })
    .onUpdate((event) => {
      const nextTop = startTop.value + event.translationY;
      const nextPosition = clampIndex(
        Math.round(nextTop / MANAGE_TASK_ROW_SLOT_HEIGHT),
        itemCount - 1,
      );
      const currentPosition = positions.value[item.taskId] ?? 0;

      dragTop.value = nextTop;
      if (nextPosition !== currentPosition) {
        positions.value = movePosition(positions.value, currentPosition, nextPosition);
      }
    })
    .onFinalize(() => {
      const finalTop = (positions.value[item.taskId] ?? 0) * MANAGE_TASK_ROW_SLOT_HEIGHT;
      dragTop.value = withTiming(finalTop, { duration: REORDER_ANIMATION_DURATION_MS }, () => {
        isDragging.value = false;
        runOnJS(setScrollEnabled)(true);
        runOnJS(onOrderChange)({ ...positions.value });
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const restingTop = (positions.value[item.taskId] ?? 0) * MANAGE_TASK_ROW_SLOT_HEIGHT;

    return {
      top: isDragging.value
        ? dragTop.value
        : withTiming(restingTop, { duration: REORDER_ANIMATION_DURATION_MS }),
      zIndex: isDragging.value ? 10 : 0,
    };
  });

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`Select ${item.title}`}
        onPress={() => onToggle(item.taskId)}
        hitSlop={8}
        style={[styles.checkbox, selected ? styles.checkboxChecked : null]}
      >
        {selected ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
      </Pressable>
      <Text numberOfLines={1} style={styles.rowTitle}>
        {item.title}
      </Text>
      <GestureDetector gesture={gesture}>
        <Pressable
          accessibilityLabel={`Drag ${item.title} to reorder`}
          hitSlop={8}
          style={styles.dragHandle}
        >
          <Ionicons name="reorder-three" size={28} color={colors.textMuted} />
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

interface BottomActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function BottomAction({ icon, label, disabled, onPress }: BottomActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomAction,
        pressed && !disabled ? styles.bottomActionPressed : null,
      ]}
    >
      <Ionicons name={icon} size={26} color={disabled ? colors.disabled : colors.text} />
      <Text style={[styles.bottomActionLabel, disabled ? styles.bottomActionLabelDisabled : null]}>
        {label}
      </Text>
    </Pressable>
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
  doneButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  donePressed: {
    opacity: 0.6,
  },
  doneText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
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
    flex: 1,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  list: {
    backgroundColor: colors.bg,
  },
  listItemsStack: {
    position: 'relative',
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: MANAGE_TASK_ROW_SLOT_HEIGHT - spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  rowTitle: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  dragHandle: {
    paddingHorizontal: spacing.xs,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  bottomActionPressed: {
    opacity: 0.6,
  },
  bottomActionLabel: {
    ...typography.caption,
    color: colors.text,
  },
  bottomActionLabelDisabled: {
    color: colors.disabled,
  },
});
