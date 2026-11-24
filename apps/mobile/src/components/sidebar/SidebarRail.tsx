import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconName } from "@/types/icon.types";
import type { SidebarProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, radii, spacing } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { botChatHref } from "@/state/botChats";
import { chatsOverview } from "@/state/chatsOverview";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { useBots } from "@/hooks/useBots";
import { useConversationList } from "@/hooks/useConversationList";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BotAvatar } from "@/components/common/BotAvatar";
import { Icon } from "@/components/common/Icon";
import { SidebarGlyph } from "@/components/common/SidebarGlyph";

type SidebarRailProps = Pick<SidebarProps, "runtimeId" | "activeConversationId"> & { onExpand: () => void };

/** The permanent sidebar collapsed to one column of icons: the same destinations and bots, without labels or the chat list. */
export function SidebarRail({ runtimeId, activeConversationId, onExpand }: SidebarRailProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const list = useConversationList(session, null);
  const bots = useBots(capabilityGate(info, "bots.chat").enabled ? session : null);
  const summaries = list.state.status === "ready" ? list.state.value : list.state.status === "error" ? list.state.stale ?? [] : [];
  const overview = useMemo(() => chatsOverview(summaries), [summaries]);
  const botList = bots.state.status === "ready" ? bots.state.value : bots.state.status === "error" ? bots.state.stale ?? [] : [];
  const destination = (icon: IconName, label: string, href: Parameters<typeof router.push>[0], selected = false, badge = false) => (
    <RailButton key={label} label={label} selected={selected} badge={badge} onPress={() => router.push(href)}>
      <Icon name={icon} size={23} color={colors.text} />
    </RailButton>
  );
  return (
    <View style={[styles.rail, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <RailButton label="Expand sidebar" onPress={onExpand}><SidebarGlyph color={colors.text} /></RailButton>
      <RailButton label="New chat" selected={activeConversationId === null} onPress={() => router.replace(routes.newConversation(runtimeId))}>
        <Icon name="create-outline" size={23} color={colors.text} />
      </RailButton>
      {destination("file-tray-outline", "Inbox", routes.inbox(runtimeId), false, overview.pendingRequests > 0)}
      {destination("pulse-outline", "Activity", routes.activity(runtimeId), false, overview.working > 0)}
      <ScrollView style={styles.bots} contentContainerStyle={styles.botsContent} showsVerticalScrollIndicator={false}>
        {botList.map((bot) => (
          <RailButton key={`${bot.id}/${bot.scope.kind === "workspace" ? bot.scope.workspaceId : ""}`} label={bot.name}
            selected={!!bot.chatConversationId && bot.chatConversationId === activeConversationId} onPress={() => router.replace(botChatHref(runtimeId, bot))}>
            <BotAvatar avatar={bot.avatar} name={bot.name} size={28} />
          </RailButton>
        ))}
      </ScrollView>
      {destination("home-outline", "Home", routes.home)}
      {destination("desktop-outline", "Computers", routes.computers)}
      {destination("settings-outline", "Settings", routes.settings)}
    </View>
  );
}

function RailButton({ label, onPress, children, selected = false, badge = false }: { label: string; onPress: () => void; children: ReactNode; selected?: boolean; badge?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [styles.button, selected && styles.selected, pressed && styles.pressed]}>
      {children}
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  rail: { width: layout.railWidth, alignItems: "center" as const, gap: spacing.xs, backgroundColor: theme.colors.sidebar,
    borderRightWidth: hairline, borderRightColor: theme.colors.separator },
  button: { width: layout.minTouchTarget, height: layout.minTouchTarget, borderRadius: radii.sm + 2, alignItems: "center" as const, justifyContent: "center" as const },
  selected: { backgroundColor: theme.colors.sidebarSelected },
  pressed: { opacity: 0.55 },
  badge: { position: "absolute" as const, top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.tones.attention.solid },
  bots: { flex: 1, alignSelf: "stretch" as const },
  botsContent: { alignItems: "center" as const, gap: spacing.xs, paddingTop: spacing.sm }
});
