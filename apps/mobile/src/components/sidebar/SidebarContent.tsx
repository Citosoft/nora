import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import type { SidebarProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { pixelGlyphs } from "@/visuals/pixelGlyphs";
import { providerPresentations } from "@/config/providerIcons";
import { routes } from "@/navigation/routes";
import { chatsOverview } from "@/state/chatsOverview";
import { filterByProject, filterConversations } from "@/state/conversationSearch";
import { deriveExecutionState } from "@/state/executionState";
import { useConversationList } from "@/hooks/useConversationList";
import { useProjects } from "@/hooks/useProjects";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BarIconButton } from "@/components/common/BarIconButton";
import { Icon } from "@/components/common/Icon";
import { SearchField } from "@/components/common/SearchField";
import { SidebarGlyph } from "@/components/common/SidebarGlyph";
import { ProviderIcon } from "@/components/common/ProviderIcon";
import { StatusDot } from "@/components/common/StatusDot";
import { SidebarBots } from "./SidebarBots";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarRow } from "./SidebarRow";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarHeading } from "./SidebarHeading";
import { PixelGlyph } from "@/components/visuals/PixelGlyph";

/** Header (computer switcher, search, close), destinations, projects, chats and the account footer. */
export function SidebarContent({ runtimeId, runtimeName, activeConversationId, persistent = false, onClose }: SidebarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const projects = useProjects(session);
  const list = useConversationList(session, null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const state = list.state;
  const summaries = useMemo(() => (state.status === "ready" ? state.value : state.status === "error" ? state.stale ?? [] : []), [state]);
  const projectList = projects.state.status === "ready" ? projects.state.value : [];
  const overview = useMemo(() => chatsOverview(summaries), [summaries]);
  // A bot's direct chat lives under Bots rather than among the chats.
  const chats = useMemo(() => filterConversations(filterByProject(summaries.filter(({ conversation }) => !conversation.direct), searching ? null : projectId), search),
    [projectId, search, searching, summaries]);
  const filterName = projectList.find((project) => project.id === projectId)?.name;

  const go = (href: Href, mode: "push" | "replace" = "push"): void => {
    onClose();
    if (mode === "replace") router.replace(href);
    else router.push(href);
  };

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${runtimeName}. Go to Home`} onPress={() => go(routes.home, "replace")}
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
          <PixelGlyph bitmap={pixelGlyphs.mark} cell={3.5} />
          <Text style={styles.brandText} numberOfLines={1}>Nora</Text>
        </Pressable>
        <BarIconButton label={searching ? "Close search" : "Search chats"} onPress={() => { setSearching((value) => !value); setSearch(""); }}>
          <Icon name={searching ? "close" : "search-outline"} size={24} color={colors.text} />
        </BarIconButton>
        <BarIconButton label={persistent ? "Collapse sidebar" : "Close sidebar"} onPress={onClose}><SidebarGlyph color={colors.text} /></BarIconButton>
      </View>
      {searching ? <View style={styles.search}><SearchField value={search} onChange={setSearch} placeholder="Search chats" /></View> : null}
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {searching ? null : (
          <View style={styles.group}>
            {projectList.length > 1 ? <WorkspaceSwitcher workspaces={projectList} selectedId={projectId} onSelect={setProjectId} /> : null}
            <SidebarRow label="New chat" icon="create-outline" selected={activeConversationId === null} onPress={() => go(routes.newConversation(runtimeId, projectId), "replace")} />
            <SidebarRow label="Inbox" icon="file-tray-outline" detail={overview.pendingRequests ? String(overview.pendingRequests) : null}
              onPress={() => go(routes.inbox(runtimeId))} />
            <SidebarRow label="Activity" icon="pulse-outline" detail={overview.working ? `${overview.working} running` : null} onPress={() => go(routes.activity(runtimeId))} />
            <SidebarRow label="Computer settings" icon="settings-outline" onPress={() => go(routes.runtimeSettings(runtimeId))} />
            <SidebarRow label="Home" icon="home-outline" onPress={() => go(routes.home, "replace")} />
            <SidebarRow label="Computers" icon="desktop-outline" onPress={() => go(routes.computers)} />
          </View>
        )}
        {!searching ? <SidebarBots runtimeId={runtimeId} projectId={projectId} activeConversationId={activeConversationId}
          summaries={summaries} onNavigate={go} /> : null}
        <View style={styles.group}>
          <SidebarHeading title={searching ? "Results" : filterName ? `Chats in ${filterName}` : "Chats"} />
          {state.status === "loading" ? <SidebarHeading note title="Loading…" /> : null}
          {state.status === "error" ? <SidebarHeading note title={state.message} /> : null}
          {state.status !== "loading" && chats.length === 0 ? <SidebarHeading note title={searching && search.trim() ? "No matching chats." : "No chats yet."} /> : null}
          {chats.map((item) => {
            const status = deriveExecutionState(item);
            const flagged = status.tone === "active" || status.tone === "attention" || status.tone === "danger";
            return (
              <SidebarRow key={item.conversation.id} label={item.conversation.title} selected={item.conversation.id === activeConversationId}
                leading={<ProviderIcon kind={item.conversation.provider.kind} />}
                accessibilityLabel={`${item.conversation.title}, ${providerPresentations[item.conversation.provider.kind].label}, ${status.label}`}
                onPress={() => go(routes.conversation(runtimeId, item.conversation.id), "replace")}
                trailing={flagged ? <View style={styles.dot}><StatusDot tone={status.tone} /></View> : null} />
            );
          })}
        </View>
      </ScrollView>
      <SidebarFooter runtimeId={runtimeId} runtimeName={runtimeName} onOpenSettings={() => go(routes.settings)} />
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  fill: { flex: 1 },
  header: { height: layout.navBarHeight + spacing.xs, flexDirection: "row" as const, alignItems: "center" as const, paddingLeft: spacing.xl, paddingRight: spacing.sm },
  brand: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  pressed: { opacity: 0.55 },
  brandText: { ...type.title3, color: theme.colors.text, flexShrink: 1 },
  search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  content: { paddingHorizontal: spacing.sm + 2, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: spacing.xxs },
  dot: { width: 28, alignItems: "center" as const }
});
