import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
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

import {
  useDeleteTaskStep,
  useReorderTaskSteps,
  useTaskSteps,
} from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import type { Connection, TaskStep } from '../../shared/api/canplanTypes';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import { queryKeys } from '../../shared/query/queryKeys';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type ReorderStepsNavigation = NativeStackNavigationProp<MainStackParamList, 'ReorderSteps'>;
type ReorderStepsRoute = RouteProp<MainStackParamList, 'ReorderSteps'>;
type StepPositions = Record<string, number>;

const REORDER_STEP_ROW_SLOT_HEIGHT = 64;
const REORDER_ANIMATION_DURATION_MS = 260;
const TASK_STEPS_QUERY_LIMIT = 50;

function orderStepsByIds(steps: TaskStep[], orderedIds: string[]) {
  if (orderedIds.length === 0) return steps;

  const byId = new Map(steps.map((step) => [step.stepId, step]));
  const used = new Set<string>();
  const ordered: TaskStep[] = [];

  for (const id of orderedIds) {
    const step = byId.get(id);
    if (step) {
      ordered.push(step);
      used.add(id);
    }
  }

  for (const step of steps) {
    if (!used.has(step.stepId)) ordered.push(step);
  }

  return ordered;
}

function makeStepPositions(steps: TaskStep[]) {
  return steps.reduce<StepPositions>((positions, step, index) => {
    positions[step.stepId] = index;
    return positions;
  }, {});
}

function orderedIdsFromPositions(positions: StepPositions) {
  return Object.entries(positions)
    .sort(([, a], [, b]) => a - b)
    .map(([stepId]) => stepId);
}

function clampIndex(value: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, 0), max);
}

function movePosition(positions: StepPositions, from: number, to: number) {
  'worklet';

  if (from === to) return positions;

  const next = { ...positions };
  const movingDown = to > from;

  for (const stepId in positions) {
    const position = positions[stepId];
    if (position === from) {
      next[stepId] = to;
    } else if (movingDown && position > from && position <= to) {
      next[stepId] = position - 1;
    } else if (!movingDown && position >= to && position < from) {
      next[stepId] = position + 1;
    }
  }

  return next;
}

function reorderCachedStepPages(
  cached: InfiniteData<Connection<TaskStep>> | undefined,
  orderedSteps: TaskStep[],
) {
  const reorderedSteps = orderedSteps.map((step, index) => ({
    ...step,
    order: index + 1,
  }));

  if (!cached) {
    return {
      pages: [{ items: reorderedSteps, nextToken: null }],
      pageParams: [undefined],
    };
  }

  let cursor = 0;
  return {
    ...cached,
    pages: cached.pages.map((page) => {
      const pageSize = page.items.length;
      const items = reorderedSteps.slice(cursor, cursor + pageSize);
      cursor += pageSize;
      return { ...page, items };
    }),
  };
}

export default function ReorderStepsScreen() {
  const navigation = useNavigation<ReorderStepsNavigation>();
  const route = useRoute<ReorderStepsRoute>();
  const insets = useSafeAreaInsets();
  const { taskId } = route.params;
  const queryClient = useQueryClient();

  const stepsQuery = useTaskSteps(taskId, TASK_STEPS_QUERY_LIMIT);
  const deleteStepMutation = useDeleteTaskStep();
  const reorderStepsMutation = useReorderTaskSteps();

  const [orderedSteps, setOrderedSteps] = useState<TaskStep[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const latestStepOrderRef = useRef<string[]>([]);

  const remoteSteps = useMemo(
    () =>
      [...(stepsQuery.data?.pages.flatMap((page) => page.items) ?? [])].sort(
        (a, b) => a.order - b.order,
      ),
    [stepsQuery.data],
  );

  // Seed local order once the remote payload arrives, and again if the remote
  // list size changes (e.g. after a deletion).
  useEffect(() => {
    setOrderedSteps((prev) => {
      if (remoteSteps.length === 0) {
        latestStepOrderRef.current = [];
        return prev.length === 0 ? prev : [];
      }

      const preferredOrder =
        latestStepOrderRef.current.length > 0
          ? latestStepOrderRef.current
          : prev.map((step) => step.stepId);
      const remoteById = new Map(remoteSteps.map((step) => [step.stepId, step]));
      const kept = preferredOrder
        .map((stepId) => remoteById.get(stepId))
        .filter((step): step is TaskStep => Boolean(step));
      const seen = new Set(kept.map((s) => s.stepId));
      const additions = remoteSteps.filter((s) => !seen.has(s.stepId));
      const next = [...kept, ...additions];
      latestStepOrderRef.current = next.map((step) => step.stepId);
      // Preserve `prev` reference when the content is unchanged so unrelated
      // re-renders of stepsQuery (e.g. background refetch returning the same
      // ids in the same order) can't kick the list back via this setState.
      if (
        next.length === prev.length &&
        next.every((s, i) => s.stepId === prev[i].stepId)
      ) {
        return prev;
      }
      return next;
    });
  }, [remoteSteps]);

  const toggleSelected = useCallback((stepId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;
  const deleteDisabled = selectedCount === 0 || deleteStepMutation.isPending;

  const handleDone = async () => {
    const stepsForSave = orderStepsByIds(orderedSteps, latestStepOrderRef.current);
    const hasOrderChanged =
      stepsForSave.length === remoteSteps.length &&
      stepsForSave.some((step, idx) => step.stepId !== remoteSteps[idx]?.stepId);

    if (!hasOrderChanged || reorderStepsMutation.isPending) {
      navigation.goBack();
      return;
    }
    try {
      await reorderStepsMutation.mutateAsync({
        taskId,
        steps: stepsForSave.map((step, idx) => ({
          stepId: step.stepId,
          order: idx + 1,
        })),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.steps(taskId, TASK_STEPS_QUERY_LIMIT),
      });
      queryClient.setQueryData<InfiniteData<Connection<TaskStep>>>(
        queryKeys.tasks.steps(taskId, TASK_STEPS_QUERY_LIMIT),
        (cached) => reorderCachedStepPages(cached, stepsForSave),
      );
      navigation.goBack();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not save the new order.',
      );
    }
  };

  const handleDelete = async () => {
    if (deleteDisabled) return;
    try {
      for (const stepId of selectedIds) {
        await deleteStepMutation.mutateAsync({ taskId, stepId });
      }
      setOrderedSteps((prev) => {
        const next = orderStepsByIds(prev, latestStepOrderRef.current).filter(
          (s) => !selectedIds.has(s.stepId),
        );
        latestStepOrderRef.current = next.map((step) => step.stepId);
        return next;
      });
      setSelectedIds(new Set());
      setConfirmDelete(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not delete the selected steps.',
      );
      setConfirmDelete(false);
    }
  };

  const handleOrderChange = useCallback((positions: StepPositions) => {
    latestStepOrderRef.current = orderedIdsFromPositions(positions);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text style={styles.headerActionText}>Cancel</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Reorder Steps
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          accessibilityState={{ disabled: reorderStepsMutation.isPending }}
          disabled={reorderStepsMutation.isPending}
          onPress={() => {
            void handleDone();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.headerActionText, styles.headerActionPrimary]}>
            {reorderStepsMutation.isPending ? 'Saving…' : 'Done'}
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {stepsQuery.isLoading && orderedSteps.length === 0 ? (
        <View accessibilityRole="progressbar" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading steps…</Text>
        </View>
      ) : (
        <SortableStepList
          steps={orderedSteps}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete selected"
          accessibilityState={{ disabled: deleteDisabled }}
          disabled={deleteDisabled}
          onPress={() => setConfirmDelete(true)}
          style={({ pressed }) => [
            styles.bottomAction,
            pressed && !deleteDisabled ? styles.bottomActionPressed : null,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={26}
            color={deleteDisabled ? colors.disabled : colors.text}
          />
          <Text
            style={[
              styles.bottomActionLabel,
              deleteDisabled ? styles.bottomActionLabelDisabled : null,
            ]}
          >
            Delete
          </Text>
        </Pressable>
      </View>

      {confirmDelete ? (
        <ConfirmDialog
          visible
          title={`Delete ${selectedCount} ${selectedCount === 1 ? 'step' : 'steps'}?`}
          message="These steps cannot be restored."
          confirmLabel={deleteStepMutation.isPending ? 'Deleting…' : 'Delete Steps'}
          cancelLabel="Cancel"
          destructive
          onConfirm={() => {
            void handleDelete();
          }}
          onCancel={() => {
            if (!deleteStepMutation.isPending) setConfirmDelete(false);
          }}
        />
      ) : null}
    </View>
  );
}

interface SortableStepListProps {
  steps: TaskStep[];
  selectedIds: Set<string>;
  onToggle: (stepId: string) => void;
  onOrderChange: (positions: StepPositions) => void;
  contentContainerStyle: StyleProp<ViewStyle>;
}

function SortableStepList({
  steps,
  selectedIds,
  onToggle,
  onOrderChange,
  contentContainerStyle,
}: SortableStepListProps) {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const positions = useSharedValue<StepPositions>(makeStepPositions(steps));
  const stepIdsKey = useMemo(() => steps.map((step) => step.stepId).join('|'), [steps]);

  useEffect(() => {
    const nextPositions = makeStepPositions(steps);
    positions.value = nextPositions;
    onOrderChange(nextPositions);
  }, [onOrderChange, positions, stepIdsKey, steps]);

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.listItemsStack, { height: steps.length * REORDER_STEP_ROW_SLOT_HEIGHT }]}>
        {steps.map((step, index) => (
          <SortableStepRow
            key={step.stepId}
            item={step}
            fallbackIndex={index}
            positions={positions}
            itemCount={steps.length}
            selected={selectedIds.has(step.stepId)}
            onToggle={onToggle}
            onOrderChange={onOrderChange}
            setScrollEnabled={setScrollEnabled}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface SortableStepRowProps {
  item: TaskStep;
  fallbackIndex: number;
  positions: SharedValue<StepPositions>;
  itemCount: number;
  selected: boolean;
  onToggle: (stepId: string) => void;
  onOrderChange: (positions: StepPositions) => void;
  setScrollEnabled: (enabled: boolean) => void;
}

function SortableStepRow({
  item,
  fallbackIndex,
  positions,
  itemCount,
  selected,
  onToggle,
  onOrderChange,
  setScrollEnabled,
}: SortableStepRowProps) {
  const isDragging = useSharedValue(false);
  const dragTop = useSharedValue(0);
  const startTop = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      const currentPosition = positions.value[item.stepId] ?? 0;
      startTop.value = currentPosition * REORDER_STEP_ROW_SLOT_HEIGHT;
      dragTop.value = startTop.value;
      isDragging.value = true;
      runOnJS(setScrollEnabled)(false);
    })
    .onUpdate((event) => {
      const nextTop = startTop.value + event.translationY;
      const nextPosition = clampIndex(
        Math.round(nextTop / REORDER_STEP_ROW_SLOT_HEIGHT),
        itemCount - 1,
      );
      const currentPosition = positions.value[item.stepId] ?? 0;

      dragTop.value = nextTop;
      if (nextPosition !== currentPosition) {
        positions.value = movePosition(positions.value, currentPosition, nextPosition);
      }
    })
    .onFinalize(() => {
      const finalTop = (positions.value[item.stepId] ?? 0) * REORDER_STEP_ROW_SLOT_HEIGHT;
      dragTop.value = withTiming(finalTop, { duration: REORDER_ANIMATION_DURATION_MS }, () => {
        isDragging.value = false;
        runOnJS(setScrollEnabled)(true);
        runOnJS(onOrderChange)({ ...positions.value });
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const restingTop = (positions.value[item.stepId] ?? 0) * REORDER_STEP_ROW_SLOT_HEIGHT;

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
        accessibilityLabel={`Select step ${fallbackIndex + 1}`}
        onPress={() => onToggle(item.stepId)}
        hitSlop={8}
        style={[styles.checkbox, selected ? styles.checkboxChecked : null]}
      >
        {selected ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
      </Pressable>
      <Text numberOfLines={1} style={styles.rowTitle}>
        {item.text || `Step ${fallbackIndex + 1}`}
      </Text>
      <GestureDetector gesture={gesture}>
        <Pressable
          accessibilityLabel={`Drag step ${fallbackIndex + 1} to reorder`}
          hitSlop={8}
          style={styles.dragHandle}
        >
          <Ionicons name="reorder-three" size={28} color={colors.textMuted} />
        </Pressable>
      </GestureDetector>
    </Animated.View>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerAction: {
    minWidth: 60,
    paddingVertical: spacing.xs,
  },
  headerActionText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  headerActionPrimary: {
    color: colors.primary,
    textAlign: 'right',
  },
  headerTitle: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
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
    minHeight: REORDER_STEP_ROW_SLOT_HEIGHT - spacing.md,
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
  pressed: {
    opacity: 0.6,
  },
});
