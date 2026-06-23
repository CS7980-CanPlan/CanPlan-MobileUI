import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteTask, useTasksByOwner } from '../../features/tasks/hooks/useTaskApi';
import type { MainStackParamList } from '../../navigation/types';
import { getCurrentUserId } from '../../shared/api/authTokenProvider';
import type { Task } from '../../shared/api/canplanTypes';
import BackButton from '../../shared/components/BackButton';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../../shared/theme/tokens';

type ManageTasksNavigation = NativeStackNavigationProp<MainStackParamList, 'ManageTasks'>;

export default function ManageTasksScreen() {
  const navigation = useNavigation<ManageTasksNavigation>();
  const insets = useSafeAreaInsets();
  const [ownerId, setOwnerId] = useState('');
  const [identityError, setIdentityError] = useState<string>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
  const tasksQuery = useTasksByOwner(ownerId);
  const deleteTaskMutation = useDeleteTask();

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
      if (prev.length === 0) return remoteTasks;
      const remoteIds = new Set(remoteTasks.map((t) => t.taskId));
      const kept = prev.filter((t) => remoteIds.has(t.taskId));
      const seen = new Set(kept.map((t) => t.taskId));
      const additions = remoteTasks.filter((t) => !seen.has(t.taskId));
      return [...kept, ...additions];
    });
  }, [remoteTasks]);

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const actionsDisabled = selectedCount === 0 || deleteTaskMutation.isPending;

  const handleDelete = async () => {
    if (selectedCount === 0 || deleteTaskMutation.isPending) return;
    try {
      for (const taskId of selectedIds) {
        await deleteTaskMutation.mutateAsync(taskId);
      }
      setOrderedTasks((prev) => prev.filter((t) => !selectedIds.has(t.taskId)));
      setSelectedIds(new Set());
      setConfirmDelete(false);
    } catch (err) {
      setIdentityError(
        err instanceof Error ? err.message : 'Could not delete the selected tasks.',
      );
      setConfirmDelete(false);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
    const selected = selectedIds.has(item.taskId);
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive ? styles.rowActive : null]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select ${item.title}`}
            onPress={() => toggleSelected(item.taskId)}
            hitSlop={8}
            style={[styles.checkbox, selected ? styles.checkboxChecked : null]}
          >
            {selected ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
          </Pressable>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.title}
          </Text>
          <Pressable
            accessibilityLabel={`Drag ${item.title} to reorder`}
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
        <DraggableFlatList
          data={orderedTasks}
          keyExtractor={(item) => item.taskId}
          onDragEnd={({ data }) => setOrderedTasks(data)}
          renderItem={renderItem}
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
          onPress={() => {
            // Placeholder — future: open category picker to move selected tasks.
          }}
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
    </View>
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
});
