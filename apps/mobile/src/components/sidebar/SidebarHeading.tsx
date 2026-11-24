import { Text } from "react-native";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** Inset of sidebar text from the drawer edge, aligned with the rows' icons. */
export const sidebarTextInset = spacing.md + 2;

/** A muted group title in the sidebar ("Bots", "Chats"), and its quieter note variant for loading and empty states. */
export function SidebarHeading({ title, note = false }: { title: string; note?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={note ? styles.note : styles.heading} accessibilityRole={note ? "text" : "header"}>{title}</Text>;
}

const createStyles = (theme: Theme) => ({
  heading: { ...type.body, color: theme.colors.textMuted, paddingHorizontal: sidebarTextInset, paddingVertical: spacing.sm },
  note: { ...type.subheadline, color: theme.colors.textMuted, paddingHorizontal: sidebarTextInset, paddingVertical: spacing.xs }
});
