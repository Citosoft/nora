import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ActionSheetProps } from "@/types/listUi.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, radii, spacing, type } from "@/theme/tokens";
import { glassStyle } from "@/platform/glassStyle";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

/** iOS action sheet: grouped choices rising from the bottom with a separate Cancel button. Picking an option closes it. */
export function ActionSheet({ visible, title, message, options, onClose }: ActionSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityViewIsModal>
          <View style={[styles.group, glassStyle]}>
            {title || message ? (
              <View style={styles.header}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {message ? <Text style={styles.message}>{message}</Text> : null}
              </View>
            ) : null}
            {options.map((option, index) => (
              <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: option.selected === true }}
                onPress={() => { onClose(); option.onPress(); }}
                style={({ pressed }) => [styles.option, (index > 0 || Boolean(title || message)) && styles.separated, pressed && styles.pressed]}>
                {option.icon ? <Icon name={option.icon} size={20} color={option.destructive ? colors.danger : colors.accent} /> : null}
                <Text style={[styles.label, option.destructive && styles.destructive]} numberOfLines={1}>{option.label}</Text>
                {option.selected ? <Icon name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.group, styles.option, glassStyle, pressed && styles.pressed]}>
            <Text style={[styles.label, styles.cancel]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => ({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" as const },
  dismiss: { position: "absolute" as const, top: 0, bottom: 0, left: 0, right: 0 },
  sheet: { width: "100%" as const, maxWidth: 520, alignSelf: "center" as const, paddingHorizontal: spacing.sm, gap: spacing.sm },
  group: { borderRadius: radii.md, backgroundColor: theme.colors.elevated },
  header: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md + 2, gap: spacing.xxs, alignItems: "center" as const },
  title: { ...type.footnote, fontWeight: "600" as const, color: theme.colors.textMuted, textAlign: "center" as const },
  message: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const },
  option: { minHeight: 57, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.sm,
    paddingHorizontal: layout.gutter },
  separated: { borderTopWidth: hairline, borderTopColor: theme.colors.separator },
  pressed: { backgroundColor: theme.colors.pressed },
  label: { fontSize: 20, lineHeight: 25, color: theme.colors.accent, flexShrink: 1 },
  destructive: { color: theme.colors.danger },
  cancel: { fontWeight: "600" as const }
});
