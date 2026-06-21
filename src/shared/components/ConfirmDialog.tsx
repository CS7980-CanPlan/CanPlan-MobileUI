import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.btn,
              destructive ? styles.btnDanger : styles.btnPrimary,
              pressed ? styles.btnPressed : null,
            ]}
          >
            <Text style={styles.btnTextPrimary}>{confirmLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              pressed ? styles.btnGhostPressed : null,
            ]}
          >
            <Text style={styles.btnTextGhost}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 14, 6, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'stretch',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  btn: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnPrimary: { backgroundColor: colors.primary },
  btnPressed: { opacity: 0.85 },
  btnGhost: { backgroundColor: colors.surfaceWarm },
  btnGhostPressed: { backgroundColor: colors.border },
  btnTextPrimary: {
    ...typography.button,
    color: colors.onPrimary,
  },
  btnTextGhost: {
    ...typography.button,
    color: colors.text,
  },
});
