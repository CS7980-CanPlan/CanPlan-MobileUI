import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CATEGORY_PRESETS,
  DEFAULT_CATEGORY_COLOR,
  normalizeHex,
} from '../../features/categories/colors';
import { colors, radius, spacing, typography } from '../../shared/theme/tokens';
import ColorPaletteModal from './ColorPaletteModal';

export interface CategoryFormValues {
  name: string;
  color: string;
}

interface CategoryFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  initialColor?: string | null;
  /** Default category: name is locked and it can't be deleted. */
  isDefault?: boolean;
  saving?: boolean;
  deleting?: boolean;
  onCancel: () => void;
  onSubmit: (values: CategoryFormValues) => void;
  onDelete?: () => void;
}

export default function CategoryFormModal({
  visible,
  mode,
  initialName,
  initialColor,
  isDefault = false,
  saving = false,
  deleting = false,
  onCancel,
  onSubmit,
  onDelete,
}: CategoryFormModalProps) {
  const insets = useSafeAreaInsets();
  const seedColor = (raw: string | null | undefined) =>
    (raw ? normalizeHex(raw) : null) ?? raw ?? DEFAULT_CATEGORY_COLOR;

  const [name, setName] = useState(initialName ?? '');
  const [color, setColor] = useState(seedColor(initialColor));
  const [paletteVisible, setPaletteVisible] = useState(false);

  // Reset the form whenever it opens for a new target.
  useEffect(() => {
    if (visible) {
      setName(initialName ?? '');
      setColor(seedColor(initialColor));
      setPaletteVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialName, initialColor]);

  const trimmedName = name.trim();
  const nameValid = isDefault || trimmedName.length > 0;
  const busy = saving || deleting;
  const canSubmit = nameValid && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: trimmedName, color });
  };

  const presetSelected = CATEGORY_PRESETS.includes(color as (typeof CATEGORY_PRESETS)[number]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
            onPress={() => {}}
          >
            <View style={styles.grabber} />

            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                disabled={busy}
                hitSlop={8}
              >
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.title}>
                {mode === 'create' ? 'Add Category' : 'Edit Category'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={!canSubmit}
                hitSlop={8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.submit, canSubmit ? null : styles.disabled]}>
                    {mode === 'create' ? 'Add' : 'Update'}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>CATEGORY NAME</Text>
                <TextInput
                  accessibilityLabel="Category name"
                  value={name}
                  onChangeText={setName}
                  editable={!isDefault && !busy}
                  placeholder="e.g. Morning Routine"
                  placeholderTextColor={colors.disabled}
                  style={[styles.nameInput, isDefault ? styles.nameInputLocked : null]}
                />
                {isDefault ? (
                  <Text style={styles.lockedHint}>
                    The default category can’t be renamed.
                  </Text>
                ) : null}
              </View>

              {/* Colour */}
              <View style={styles.card}>
                <View style={styles.colourHeader}>
                  <Text style={styles.cardLabel}>COLOUR</Text>
                  <View style={[styles.selectedColour, { backgroundColor: color }]} />
                </View>

                <View style={styles.swatchGrid}>
                  {CATEGORY_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      accessibilityRole="button"
                      accessibilityLabel={`Colour ${preset}`}
                      accessibilityState={{ selected: color === preset }}
                      onPress={() => setColor(preset)}
                      style={[
                        styles.swatchWrap,
                        color === preset ? { borderColor: preset } : null,
                      ]}
                    >
                      <View style={[styles.swatch, { backgroundColor: preset }]} />
                    </Pressable>
                  ))}

                  {/* Multicolour "custom" square → opens the full palette. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Custom colour"
                    accessibilityState={{ selected: !presetSelected }}
                    onPress={() => setPaletteVisible(true)}
                    style={[
                      styles.swatchWrap,
                      !presetSelected ? { borderColor: color } : null,
                    ]}
                  >
                    <View style={[styles.swatch, styles.customQuad]}>
                      <View style={[styles.quad, { backgroundColor: '#E0552E' }]} />
                      <View style={[styles.quad, { backgroundColor: '#F2C44D' }]} />
                      <View style={[styles.quad, { backgroundColor: '#3E7BE8' }]} />
                      <View style={[styles.quad, { backgroundColor: '#2BB24C' }]} />
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Delete (edit, non-default only) */}
              {mode === 'edit' && !isDefault && onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onDelete}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed ? styles.deletePressed : null,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color={colors.danger} />
                  ) : (
                    <Text style={styles.deleteText}>Delete Category</Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <ColorPaletteModal
        visible={paletteVisible}
        value={color}
        onCancel={() => setPaletteVisible(false)}
        onSelect={(hex) => {
          setColor(hex);
          setPaletteVisible(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 14, 6, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg + spacing.sm,
    borderTopRightRadius: radius.lg + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  cancel: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  submit: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  disabled: {
    color: colors.disabled,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  nameInput: {
    marginTop: spacing.sm,
    ...typography.heading,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  nameInputLocked: {
    color: colors.textMuted,
  },
  lockedHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  colourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  selectedColour: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Wrapper draws the selection ring (with a white gap via padding); the inner
  // swatch is the actual colour.
  swatchWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.md + 4,
    padding: 3,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  customQuad: {
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quad: {
    width: '50%',
    height: '50%',
  },
  deleteButton: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9D9DC',
    marginTop: spacing.sm,
  },
  deletePressed: {
    opacity: 0.8,
  },
  deleteText: {
    ...typography.button,
    color: colors.danger,
  },
});
