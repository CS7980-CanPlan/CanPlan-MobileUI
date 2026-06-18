import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeData } from '../features/home/hooks/useHomeData';
import Header from '../shared/components/Header';
import TaskCard from '../shared/components/TaskCard';
import { colors, radius, spacing, typography } from '../shared/theme/tokens';
import type { Task } from '../shared/types';

/**
 * Landing screen for the primary user.
 *
 * All data and request state come from the `useHomeData` hook (TanStack Query).
 * The screen is purely presentational: it renders loading, error, empty, and
 * success states. Business logic lives in the feature hooks/APIs/mappers.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { profile, tasks, summary, isLoading, isError } = useHomeData();

  const renderItem = ({ item }: ListRenderItemInfo<Task>) => (
    <TaskCard task={item} />
  );

  return (
    <View style={styles.screen}>
      <Header
        title="My day"
        subtitle={profile ? `Hi, ${profile.fullName.split(' ')[0]}` : undefined}
      />

      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        ListHeaderComponent={
          <View>
            {isError ? (
              <Text style={styles.error}>
                Unable to load your tasks. Please try again.
              </Text>
            ) : isLoading || !summary ? (
              <View style={styles.summaryLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.summaryGrid}>
                <SummaryTile label="Tasks today" value={summary.tasksToday} accent={colors.primary} />
                <SummaryTile label="Steps left" value={summary.stepsRemaining} accent={colors.warning} />
                <SummaryTile label="Done" value={summary.completedToday} accent={colors.success} />
              </View>
            )}

            <Text style={styles.sectionHeading}>Today's tasks</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={styles.empty}>
              You have no tasks scheduled. Enjoy your day!
            </Text>
          )
        }
      />
    </View>
  );
}

interface SummaryTileProps {
  label: string;
  value: number;
  accent: string;
}

function SummaryTile({ label, value, accent }: SummaryTileProps) {
  return (
    <View style={[styles.tile, { borderTopColor: accent }]}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryLoading: {
    paddingVertical: spacing.xl,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  tileValue: {
    ...typography.metric,
    color: colors.text,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    paddingVertical: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
