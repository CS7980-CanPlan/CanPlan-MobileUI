import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getMyDaySummary,
  getMyProfile,
  getMyTasks,
} from '../api/fakeGraphqlClient';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { MyDaySummary, Task, UserProfile } from '../types';

/**
 * Landing screen for the primary user.
 *
 * Data is fetched through the fake GraphQL API layer on mount. The screen
 * tracks loading and error states so the same structure works once real
 * AppSync calls are swapped in.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<MyDaySummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      setLoading(true);
      setError(null);
      try {
        const [profileData, summaryData, taskData] = await Promise.all([
          getMyProfile(),
          getMyDaySummary(),
          getMyTasks(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setSummary(summaryData);
          setTasks(taskData);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load your tasks. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHome();

    return () => {
      cancelled = true;
    };
  }, []);

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
            <View style={styles.demoBadgeRow}>
              <Text style={styles.demoBadge}>Demo data</Text>
            </View>

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : loading || !summary ? (
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
          loading ? null : (
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
  demoBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  demoBadge: {
    ...typography.caption,
    color: colors.warning,
    backgroundColor: 'rgba(181, 104, 11, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
