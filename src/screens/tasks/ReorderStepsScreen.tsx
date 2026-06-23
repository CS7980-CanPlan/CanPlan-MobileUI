import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteTaskStep, useTaskSteps } from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import type { TaskStep } from '../../shared/api/canplanTypes';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type ReorderStepsNavigation = NativeStackNavigationProp<MainStackParamList, 'ReorderSteps'>;
type ReorderStepsRoute = RouteProp<MainStackParamList, 'ReorderSteps'>;

export default function ReorderStepsScreen() {
  const navigation = useNavigation<ReorderStepsNavigation>();
  const route = useRoute<ReorderStepsRoute>();
  const insets = useSafeAreaInsets();
  const { taskId } = route.params;

  const stepsQuery = useTaskSteps(taskId);
  const deleteStepMutation = useDeleteTaskStep();

  const [orderedSteps, setOrderedSteps] = useState<TaskStep[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

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
      if (prev.length === 0) return remoteSteps;
      const remoteIds = new Set(remoteSteps.map((s) => s.stepId));
      // Drop locally-removed steps, then append any new remote ones.
      const filtered = prev.filter((s) => remoteIds.has(s.stepId));
      const seen = new Set(filtered.map((s) => s.stepId));
      const additions = remoteSteps.filter((s) => !seen.has(s.stepId));
      return [...filtered, ...additions];
    });
  }, [remoteSteps]);

  const toggleSelected = (stepId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const deleteDisabled = selectedCount === 0 || deleteStepMutation.isPending;

  const handleDelete = async () => {
    if (deleteDisabled) return;
    try {
      for (const stepId of selectedIds) {
        await deleteStepMutation.mutateAsync({ taskId, stepId });
      }
      setOrderedSteps((prev) => prev.filter((s) => !selectedIds.has(s.stepId)));
      setSelectedIds(new Set());
      setConfirmDelete(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not delete the selected steps.',
      );
      setConfirmDelete(false);
    }
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<TaskStep>) => {
    const index = getIndex() ?? 0;
    const selected = selectedIds.has(item.stepId);
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive ? styles.rowActive : null]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select step ${index + 1}`}
            onPress={() => toggleSelected(item.stepId)}
            hitSlop={8}
            style={[styles.checkbox, selected ? styles.checkboxChecked : null]}
          >
            {selected ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
          </Pressable>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.text || `Step ${index + 1}`}
          </Text>
          <Pressable
            accessibilityLabel={`Drag step ${index + 1} to reorder`}
            onLongPress={drag}
            delayLongPress={120}
            hitSlop={8}
            style={styles.dragHandle}
          >
            <Ionicons name="reorder-three" size={28} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  };

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
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.headerActionText, styles.headerActionPrimary]}>Done</Text>
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
        <DraggableFlatList
          data={orderedSteps}
          keyExtractor={(item) => item.stepId}
          onDragEnd={({ data }) => setOrderedSteps(data)}
          renderItem={renderItem}
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
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  rowActive: {
    ...shadow.cardStrong,
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
