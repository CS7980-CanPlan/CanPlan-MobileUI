import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildGrays,
  buildSpectrum,
  normalizeHex,
} from '../../features/categories/colors';
import { colors, radius, spacing, typography } from '../../shared/theme/tokens';

interface ColorPaletteModalProps {
  visible: boolean;
  /** The currently-selected colour, used to seed the HEX input. */
  value: string;
  onCancel: () => void;
  onSelect: (hex: string) => void;
}

const SWATCH = 30;

/**
 * Full colour palette behind the "custom colour" square: a hue × lightness
 * spectrum, a grayscale row, and a manual `#RRGGBB` entry field. Returns the
 * chosen colour via `onSelect`.
 */
export default function ColorPaletteModal({
  visible,
  value,
  onCancel,
  onSelect,
}: ColorPaletteModalProps) {
  const insets = useSafeAreaInsets();
  const spectrum = useMemo(() => buildSpectrum(), []);
  const grays = useMemo(() => buildGrays(), []);

  const [hexInput, setHexInput] = useState(value);
  useEffect(() => {
    if (visible) setHexInput(value);
  }, [visible, value]);

  const normalized = normalizeHex(hexInput);
  const preview = normalized ?? value;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={() => {}}
        >
          <View style={styles.grabber} />

          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Custom Colour</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!normalized}
              onPress={() => normalized && onSelect(normalized)}
              hitSlop={8}
            >
              <Text style={[styles.done, normalized ? null : styles.disabled]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.hexRow}>
              <View style={[styles.hexPreview, { backgroundColor: preview }]} />
              <TextInput
                accessibilityLabel="Custom colour hex code"
                value={hexInput}
                onChangeText={setHexInput}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="#RRGGBB"
                placeholderTextColor={colors.disabled}
                maxLength={7}
                style={styles.hexInput}
              />
            </View>

            {spectrum.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.swatchRow}>
                {row.map((hex) => (
                  <Swatch
                    key={hex}
                    hex={hex}
                    selected={normalized === hex}
                    onPress={() => onSelect(hex)}
                  />
                ))}
              </View>
            ))}

            <View style={[styles.swatchRow, styles.grayRow]}>
              {grays.map((hex) => (
                <Swatch
                  key={hex}
                  hex={hex}
                  selected={normalized === hex}
                  onPress={() => onSelect(hex)}
                />
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Swatch({
  hex,
  selected,
  onPress,
}: {
  hex: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Colour ${hex}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: hex }, selected ? styles.swatchSelected : null]}
    />
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '82%',
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
  done: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  disabled: {
    color: colors.disabled,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  hexPreview: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hexInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...typography.bodyStrong,
    color: colors.text,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  grayRow: {
    marginTop: spacing.sm,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radius.sm,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
});
