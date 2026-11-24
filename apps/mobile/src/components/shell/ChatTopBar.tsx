import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "@/types/theme.types";
import { layout, spacing } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BarIconButton } from "@/components/common/BarIconButton";
import { Icon } from "@/components/common/Icon";
import { SidebarGlyph } from "@/components/common/SidebarGlyph";

interface ChatTopBarProps {
  center: ReactNode;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  sidebarDisabled?: boolean;
  /** Desktop-sized window: the sidebar is already open beside the chat, so there is no button for it and the bar spans the full width. */
  wide?: boolean;
}

/** ChatGPT's top bar: sidebar glyph, a centred control, and a new-chat glyph, with no background or divider. */
export function ChatTopBar({ center, onOpenSidebar, onNewChat, sidebarDisabled = false, wide = false }: ChatTopBarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={[styles.row, !wide && styles.narrow]}>
        {wide ? null : <BarIconButton label="Open sidebar" onPress={onOpenSidebar} disabled={sidebarDisabled}><SidebarGlyph color={colors.text} /></BarIconButton>}
        <View style={styles.center}>{center}</View>
        <BarIconButton label="New chat" onPress={onNewChat}><Icon name="create-outline" size={25} color={colors.text} /></BarIconButton>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  bar: { backgroundColor: theme.colors.background },
  // A touch taller than a plain navigation bar so the computer pill has room to breathe.
  row: { height: layout.navBarHeight + spacing.xs, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs,
    paddingHorizontal: spacing.sm, width: "100%" as const, alignSelf: "center" as const },
  narrow: { maxWidth: layout.maxContentWidth },
  center: { flex: 1, minWidth: 0, alignItems: "center" as const }
});
