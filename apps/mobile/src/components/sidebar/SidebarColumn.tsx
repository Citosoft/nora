import { View } from "react-native";
import type { SidebarProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout } from "@/theme/tokens";
import { usePreferences } from "@/hooks/usePreferences";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { SidebarContent } from "./SidebarContent";
import { SidebarRail } from "./SidebarRail";

/** The sidebar as a permanent left column on desktop-sized windows; it collapses to an icon rail, and remembers which it was. */
export function SidebarColumn(props: Omit<SidebarProps, "persistent" | "visible" | "onClose">) {
  const styles = useThemedStyles(createStyles);
  const { preferences, update } = usePreferences();
  const setCollapsed = (sidebarCollapsed: boolean): void => { void update((current) => ({ ...current, sidebarCollapsed })); };
  if (preferences.sidebarCollapsed) {
    return <SidebarRail runtimeId={props.runtimeId} activeConversationId={props.activeConversationId} onExpand={() => setCollapsed(false)} />;
  }
  return (
    <View style={styles.column}>
      <SidebarContent {...props} visible persistent onClose={() => setCollapsed(true)} />
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  column: { width: layout.sidebarWidth, backgroundColor: theme.colors.sidebar, borderRightWidth: hairline, borderRightColor: theme.colors.separator }
});
