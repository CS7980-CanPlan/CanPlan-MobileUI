import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../navigation/types';
import BackButton from '../shared/components/BackButton';
import PercentSlider from '../shared/components/PercentSlider';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type InterfaceSettingsNavigation = NativeStackNavigationProp<MainStackParamList, 'Interface'>;

type StartingPage = 'CALENDAR' | 'ALL_TASKS' | 'CATEGORIES';

const STARTING_PAGE_OPTIONS: Array<{ value: StartingPage; label: string }> = [
  { value: 'CALENDAR', label: 'Calendar' },
  { value: 'ALL_TASKS', label: 'All Tasks' },
  { value: 'CATEGORIES', label: 'Categories' },
];

/** Toggle options in display order, with their initial (UI-only) default. */
type ToggleKey =
  | 'simpleMode'
  | 'allowChangingDate'
  | 'useCategories'
  | 'showOverdue'
  | 'onlyToday'
  | 'allowCompleteOnStart'
  | 'autoAddCompleted';

const TOGGLE_OPTIONS: Array<{ key: ToggleKey; label: string; defaultOn: boolean }> = [
  { key: 'simpleMode', label: "Enable 'Simple Mode'", defaultOn: false },
  { key: 'allowChangingDate', label: 'Allow Changing Date in Calendar', defaultOn: true },
  { key: 'useCategories', label: 'Use Categories to Manage Tasks', defaultOn: true },
  { key: 'showOverdue', label: 'Show Overdue Tasks on Launch', defaultOn: false },
  { key: 'onlyToday', label: "Only Show Today's Tasks", defaultOn: false },
  { key: 'allowCompleteOnStart', label: 'Allow Completing Tasks on Start', defaultOn: true },
  { key: 'autoAddCompleted', label: 'Automatically Add Completed Tasks to Calendar', defaultOn: true },
];

const initialToggleState = (): Record<ToggleKey, boolean> =>
  TOGGLE_OPTIONS.reduce(
    (acc, option) => ({ ...acc, [option.key]: option.defaultOn }),
    {} as Record<ToggleKey, boolean>,
  );

export default function InterfaceSettingsScreen() {
  const navigation = useNavigation<InterfaceSettingsNavigation>();
  const insets = useSafeAreaInsets();

  // UI-only for now — nothing is persisted yet.
  const [startingPage, setStartingPage] = useState<StartingPage>('CALENDAR');
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(initialToggleState);
  const [iconSize, setIconSize] = useState(50);

  const setToggle = (key: ToggleKey, next: boolean) =>
    setToggles((current) => ({ ...current, [key]: next }));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} variant="dark" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Interface
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>STARTING PAGE</Text>
        <Text style={styles.sectionSubtitle}>Only visible when Simple Mode is enabled</Text>

        <View style={styles.card}>
          {STARTING_PAGE_OPTIONS.map((option, index) => {
            const isSelected = startingPage === option.value;
            return (
              <Fragment key={option.value}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setStartingPage(option.value)}
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

        <Text style={[styles.sectionLabel, styles.sectionSpacer]}>OPTIONS</Text>

        <View style={styles.card}>
          {TOGGLE_OPTIONS.map((option, index) => (
            <Fragment key={option.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Switch
                  accessibilityLabel={option.label}
                  value={toggles[option.key]}
                  onValueChange={(next) => setToggle(option.key, next)}
                  trackColor={{ false: colors.disabled, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                  ios_backgroundColor={colors.disabled}
                />
              </View>
            </Fragment>
          ))}
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacer]}>
          TASK ICON SIZE — {iconSize}%
        </Text>

        <View style={styles.card}>
          <View style={styles.sliderCardContent}>
            <PercentSlider
              value={iconSize}
              onChange={setIconSize}
              accessibilityLabel="Task icon size"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEdgeLabel}>Small</Text>
              <Text style={styles.sliderEdgeLabel}>Large</Text>
            </View>
          </View>
        </View>
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
  },
  sectionSpacer: {
    marginTop: spacing.xl,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
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
  sliderCardContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderEdgeLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
});
