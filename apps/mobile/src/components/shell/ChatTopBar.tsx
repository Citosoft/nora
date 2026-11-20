import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.background }}>
      <View style={{ height: layout.navBarHeight + 4, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm,
        width: "100%", ...(wide ? {} : { maxWidth: layout.maxContentWidth }), alignSelf: "center" }}>
        {wide ? null : <BarIconButton label="Open sidebar" onPress={onOpenSidebar} disabled={sidebarDisabled}><SidebarGlyph color={colors.text} /></BarIconButton>}
        <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>{center}</View>
        <BarIconButton label="New chat" onPress={onNewChat}><Icon name="create-outline" size={25} color={colors.text} /></BarIconButton>
      </View>
    </View>
  );
}
