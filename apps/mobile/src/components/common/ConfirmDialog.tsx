import type { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { hairline, radii, spacing, type } from "@/theme/tokens";
import { glassStyle } from "@/platform/glassStyle";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Destructive confirmations are drawn in red. */
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/** An iOS alert that works the same on web and native (React Native's `Alert` is a no-op on web). */
export function ConfirmDialog({ visible, title, message, confirmLabel, destructive = false, busy = false, error, onConfirm, onCancel, children }: ConfirmDialogProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.alert, glassStyle]} accessibilityViewIsModal>
          <View style={styles.body}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {children ? <View style={styles.extra}>{children}</View> : null}
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} disabled={busy} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} accessibilityState={{ busy }} onPress={onConfirm} disabled={busy}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              {busy ? <ActivityIndicator color={destructive ? colors.danger : colors.accent} />
                : <Text style={[styles.confirm, destructive && styles.destructive]}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, alignItems: "center" as const, justifyContent: "center" as const, padding: spacing.xxl },
  alert: { width: 300, maxWidth: "100%" as const, borderRadius: radii.xl, backgroundColor: theme.colors.elevated },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs },
  title: { ...type.headline, color: theme.colors.text, textAlign: "center" as const },
  message: { ...type.footnote, color: theme.colors.text, textAlign: "center" as const },
  extra: { marginTop: spacing.md },
  error: { ...type.footnote, color: theme.colors.danger, textAlign: "center" as const, marginTop: spacing.xs },
  actions: { flexDirection: "row" as const, borderTopWidth: hairline, borderTopColor: theme.colors.separator },
  action: { flex: 1, minHeight: 48, alignItems: "center" as const, justifyContent: "center" as const },
  pressed: { backgroundColor: theme.colors.pressed },
  divider: { width: hairline, backgroundColor: theme.colors.separator },
  cancel: { ...type.body, color: theme.colors.accent },
  confirm: { ...type.headline, color: theme.colors.accent },
  destructive: { color: theme.colors.danger }
});
