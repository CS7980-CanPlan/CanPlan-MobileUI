import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../navigation/types';
import BackButton from '../shared/components/BackButton';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type NotificationsNavigation = NativeStackNavigationProp<MainStackParamList, 'Notifications'>;

type NotificationAlert = 'NONE' | 'FIFTEEN_MINUTES_BEFORE' | 'AT_TIME';

const ALERT_OPTIONS: Array<{ value: NotificationAlert; label: string }> = [
  { value: 'NONE', label: 'None' },
  { value: 'FIFTEEN_MINUTES_BEFORE', label: '15 Minutes Before Event' },
  { value: 'AT_TIME', label: 'At Time of Event' },
];

export default function NotificationsSettingsScreen() {
  const navigation = useNavigation<NotificationsNavigation>();
  const insets = useSafeAreaInsets();

  // UI-only for now — selection is local and not persisted yet.
  const [selected, setSelected] = useState<NotificationAlert>('AT_TIME');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>NOTIFICATIONS ALERT</Text>

        <View style={styles.card}>
          {ALERT_OPTIONS.map((option, index) => {
            const isSelected = selected === option.value;
            return (
              <Fragment key={option.value}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(option.value)}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  ) : null}
                </Pressable>
              </Fragment>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          Currently, these settings will only apply to newly created repeat instances on tasks
        </Text>
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    marginLeft: spacing.md,
    ...typography.title,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 64,
  },
  rowPressed: {
    backgroundColor: colors.surfaceWarm,
  },
  rowLabel: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  helperText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
