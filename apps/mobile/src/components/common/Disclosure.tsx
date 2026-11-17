import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { hairline, spacing } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

interface DisclosureProps {
  summary: ReactNode;
  /** Spoken label for the toggle. */
  label: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

/** A quiet transcript row whose details expand underneath (tool output, reasoning, plans), like Codex's step rows. */
export function Disclosure({ summary, label, children, initiallyOpen = false }: DisclosureProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <View style={styles.summary}>{summary}</View>
        <Icon name={open ? "chevron-down" : "chevron-forward"} size={14} color={colors.textMuted} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  header: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, minHeight: 32 },
  pressed: { opacity: 0.6 },
  summary: { flexShrink: 1, minWidth: 0 },
  body: { marginTop: spacing.xs, marginLeft: 7, paddingLeft: spacing.md + 2, borderLeftWidth: hairline * 3, borderLeftColor: theme.colors.separator,
    gap: spacing.sm, paddingVertical: spacing.xs }
});
