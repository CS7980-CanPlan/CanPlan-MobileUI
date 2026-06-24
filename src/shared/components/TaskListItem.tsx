import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMediaDownloadUrl } from '../../features/media/hooks/useMedia';
import type { Category, Task } from '../api/canplanTypes';
import CachedImage from './CachedImage';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

interface TaskListItemProps {
  task: Task;
  category?: Category;
  onPress: () => void;
}

export default function TaskListItem({ task, category, onPress }: TaskListItemProps) {
  const coverImageQuery = useMediaDownloadUrl(task.taskId, task.coverImageAssetId ?? '');
  const coverUri = coverImageQuery.data?.downloadUrl ?? null;
  const placeholderColor = category?.color?.trim() || colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${task.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {coverUri ? (
        <CachedImage
          accessibilityLabel={`${task.title} cover photo`}
          uri={coverUri}
          cacheKey={task.coverImageAssetId ?? ''}
          style={styles.cover}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: placeholderColor }]}>
          {coverImageQuery.isLoading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Ionicons name="image-outline" size={24} color={colors.onPrimary} />
          )}
        </View>
      )}

      <Text numberOfLines={1} style={styles.title}>
        {task.title}
      </Text>

      <Ionicons name="chevron-forward" size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  pressed: {
    opacity: 0.72,
  },
});
