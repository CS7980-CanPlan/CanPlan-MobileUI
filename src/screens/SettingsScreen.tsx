import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyProfile } from '../features/users/hooks/useMyProfile';
import { useUpdateMyProfile } from '../features/users/hooks/useUpdateMyProfile';
import type { MainStackParamList } from '../navigation/types';
import type { JsonValue } from '../shared/api/canplanTypes';
import BackButton from '../shared/components/BackButton';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import { colors, radius, shadow, spacing, typography } from '../shared/theme/tokens';

type SettingsNavigation = NativeStackNavigationProp<MainStackParamList, 'Settings'>;

/** The stored accessibility settings as a plain object we can read/merge. */
type AccessibilitySettings = Record<string, JsonValue>;

function asSettingsObject(value: JsonValue | null | undefined): AccessibilitySettings {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AccessibilitySettings)
    : {};
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  // The settings as last saved on the server (the comparison baseline).
  const savedSettings = useMemo(
    () => asSettingsObject(profile?.accessibilitySettings),
    [profile?.accessibilitySettings],
  );
  const savedSimpleMode = savedSettings.simpleMode === true;

  const [simpleMode, setSimpleMode] = useState(savedSimpleMode);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);

  // Sync local state if the profile loads/changes while we're not editing.
  const isDirty = simpleMode !== savedSimpleMode;
  useEffect(() => {
    if (!isDirty) {
      setSimpleMode(savedSimpleMode);
    }
    // Only re-sync when the saved value changes (e.g. profile finishes loading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSimpleMode]);

  // Simple Mode as it was when this screen opened — used to detect whether the
  // user toggled it during this visit, so we can swap to the right root screen.
  const initialSimpleModeRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (initialSimpleModeRef.current === null && !isLoading) {
      initialSimpleModeRef.current = savedSimpleMode;
    }
  }, [isLoading, savedSimpleMode]);

  // Intercept every way of leaving (swipe, hardware back) when there are
  // unsaved changes, and treat it like tapping Cancel.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty) {
        return;
      }
      event.preventDefault();
      setConfirmCancelVisible(true);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  // Leave Settings. If Simple Mode changed during this visit, reset the stack to
  // that mode's root screen (Simple Mode → All Tasks; normal → Home). Otherwise
  // just go back to wherever we came from, preserving history.
  const leave = useCallback(
    (effectiveSimpleMode: boolean) => {
      const initial = initialSimpleModeRef.current ?? effectiveSimpleMode;
      if (effectiveSimpleMode !== initial) {
        navigation.reset({
          index: 0,
          routes: [{ name: effectiveSimpleMode ? 'AllTasks' : 'Home' }],
        });
      } else {
        navigation.goBack();
      }
    },
    [navigation],
  );

  const handleDone = useCallback(() => {
    updateProfile.mutate(
      { accessibilitySettings: { ...savedSettings, simpleMode } },
      { onSuccess: () => leave(simpleMode) },
    );
  }, [updateProfile, savedSettings, simpleMode, leave]);

  const handleCancelPress = useCallback(() => {
    if (updateProfile.isPending) {
      return;
    }
    if (isDirty) {
      setConfirmCancelVisible(true);
      return;
    }
    leave(savedSimpleMode);
  }, [isDirty, leave, savedSimpleMode, updateProfile.isPending]);

  const handleDiscardChanges = useCallback(() => {
    setConfirmCancelVisible(false);
    setSimpleMode(savedSimpleMode);
    leave(savedSimpleMode);
  }, [savedSimpleMode, leave]);

  const handleKeepEditing = useCallback(() => {
    setConfirmCancelVisible(false);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={handleCancelPress} variant="dark" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Settings
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          accessibilityState={{ disabled: updateProfile.isPending, busy: updateProfile.isPending }}
          disabled={updateProfile.isPending}
          onPress={handleDone}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerAction,
            pressed && !updateProfile.isPending ? styles.pressed : null,
          ]}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.headerActionText, styles.headerActionPrimary]}>Done</Text>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View accessibilityRole="progressbar" style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>OPTIONS</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Enable &apos;Simple Mode&apos;</Text>
              <Switch
                accessibilityLabel="Enable Simple Mode"
                value={simpleMode}
                onValueChange={setSimpleMode}
                trackColor={{ false: colors.disabled, true: colors.primary }}
                thumbColor={colors.onPrimary}
                ios_backgroundColor={colors.disabled}
              />
            </View>
          </View>

          {updateProfile.isError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              Could not save your settings. Please try again.
            </Text>
          ) : null}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirmCancelVisible}
        title="Cancel changes?"
        message="You changed your settings. Do you want to cancel these changes?"
        confirmLabel="Cancel Changes"
        cancelLabel="Keep Editing"
        onConfirm={handleDiscardChanges}
        onCancel={handleKeepEditing}
      />
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
    minWidth: 68,
    minHeight: 32,
    justifyContent: 'center',
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
    ...typography.title,
    color: colors.text,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.sm,
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
    minHeight: 72,
  },
  rowLabel: {
    flex: 1,
    ...typography.heading,
    color: colors.text,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
