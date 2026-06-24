import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Category } from '../api/canplanTypes';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface CategoryPickerSheetProps {
  visible: boolean;
  categories: Category[];
  isLoading?: boolean;
  selectedCategoryId?: string;
  busy?: boolean;
  title?: string;
  onCancel: () => void;
  onSelect: (categoryId: string) => void;
}

/** Bottom-sheet category chooser shared by the task editor and Manage Tasks. */
export default function CategoryPickerSheet({
  visible,
  categories,
  isLoading = false,
  selectedCategoryId,
  busy = false,
  title = 'Choose Category',
  onCancel,
  onSelect,
}: CategoryPickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close category selector"
          disabled={busy}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel category selection"
              disabled={busy}
              onPress={onCancel}
              style={styles.textButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.textButton}>
              {busy ? <ActivityIndicator color={colors.primary} /> : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              {categories.map((category, index) => (
                <View key={category.categoryId}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={category.name}
                    accessibilityState={{ selected: selectedCategoryId === category.categoryId }}
                    disabled={busy}
                    onPress={() => onSelect(category.categoryId)}
                    style={({ pressed }) => [styles.row, pressed && !busy ? styles.rowPressed : null]}
                  >
                    <View style={[styles.mark, { backgroundColor: category.color || colors.primary }]} />
                    <Text style={styles.rowText}>{category.name}</Text>
                    {selectedCategoryId === category.categoryId ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
            {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
            {!isLoading && categories.length === 0 ? (
              <Text style={styles.helper}>No categories are available yet.</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(27, 34, 48, 0.48)',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: radius.lg + spacing.md,
    borderTopRightRadius: radius.lg + spacing.md,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.disabled,
  },
  headerRow: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textButton: {
    minWidth: 70,
    minHeight: 40,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.bg,
  },
  rowText: {
    flex: 1,
    ...typography.bodyStrong,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  mark: {
    width: 12,
    height: 34,
    borderRadius: radius.pill,
  },
  loading: {
    marginVertical: spacing.lg,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
