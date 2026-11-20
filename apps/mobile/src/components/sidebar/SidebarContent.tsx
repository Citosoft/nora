import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import type { SidebarProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { botChatHref } from "@/state/botChats";
import { chatsOverview } from "@/state/chatsOverview";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { filterByProject, filterConversations } from "@/state/conversationSearch";
import { deriveExecutionState } from "@/state/executionState";
import { useBots } from "@/hooks/useBots";
import { useConversationList } from "@/hooks/useConversationList";
import { useProjects } from "@/hooks/useProjects";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BarIconButton } from "@/components/common/BarIconButton";
import { BotAvatar } from "@/components/common/BotAvatar";
import { Icon } from "@/components/common/Icon";
import { SearchField } from "@/components/common/SearchField";
import { SidebarGlyph } from "@/components/common/SidebarGlyph";
import { StatusDot } from "@/components/common/StatusDot";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarRow } from "./SidebarRow";

/** Header (computer switcher, search, close), destinations, projects, chats and the account footer. */
export function SidebarContent({ runtimeId, runtimeName, activeConversationId, persistent = false, onClose }: SidebarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const projects = useProjects(session);
  const list = useConversationList(session, null);
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const bots = useBots(capabilityGate(info, "bots.chat").enabled ? session : null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const state = list.state;
  const summaries = useMemo(() => (state.status === "ready" ? state.value : state.status === "error" ? state.stale ?? [] : []), [state]);
  const projectList = projects.state.status === "ready" ? projects.state.value : [];
  const botList = bots.state.status === "ready" ? bots.state.value : bots.state.status === "error" ? bots.state.stale ?? [] : [];
  const summaryById = useMemo(() => new Map(summaries.map((summary) => [summary.conversation.id, summary])), [summaries]);
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
        <Pressable accessibilityRole="button" accessibilityLabel={`${runtimeName}. Switch computer`} onPress={() => go(routes.home, "replace")}
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
          <Text style={styles.brandText} numberOfLines={1}>Nora</Text>
          <Icon name="chevron-down" size={17} color={colors.textMuted} />
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
            <SidebarRow label="New chat" icon="create-outline" selected={activeConversationId === null} onPress={() => go(routes.newConversation(runtimeId, projectId), "replace")} />
            <SidebarRow label="Inbox" icon="file-tray-outline" detail={overview.pendingRequests ? String(overview.pendingRequests) : null}
              onPress={() => go(routes.inbox(runtimeId))} />
            <SidebarRow label="Activity" icon="pulse-outline" detail={overview.working ? `${overview.working} running` : null} onPress={() => go(routes.activity(runtimeId))} />
            <SidebarRow label="Computers" icon="desktop-outline" onPress={() => go(routes.home, "replace")} />
          </View>
        )}
        {!searching && projectList.length > 1 ? (
          <View style={styles.group}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Projects</Text>
            {projectList.map((project) => (
              <SidebarRow key={project.id} label={project.name} icon={projectId === project.id ? "folder-open-outline" : "folder-outline"} selected={projectId === project.id}
                accessibilityLabel={`${project.name}, ${projectId === project.id ? "showing its chats" : "show its chats"}`}
                onPress={() => setProjectId((current) => (current === project.id ? null : project.id))}
                trailing={<BarIconButton label={`New chat in ${project.name}`} onPress={() => go(routes.newConversation(runtimeId, project.id), "replace")}>
                  <Icon name="create-outline" size={20} color={colors.textMuted} />
                </BarIconButton>} />
            ))}
          </View>
        ) : null}
        {!searching && botList.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Bots</Text>
            {botList.map((bot) => {
              const chat = bot.chatConversationId ? summaryById.get(bot.chatConversationId) : undefined;
              const status = chat ? deriveExecutionState(chat) : null;
              const flagged = status?.tone === "active" || status?.tone === "attention" || status?.tone === "danger";
              return (
                <SidebarRow key={`${bot.id}/${bot.scope.kind === "workspace" ? bot.scope.workspaceId : ""}`} label={bot.name} selected={!!bot.chatConversationId && bot.chatConversationId === activeConversationId}
                  leading={<BotAvatar avatar={bot.avatar} name={bot.name} size={26} />}
                  accessibilityLabel={`${bot.name}${bot.role ? `, ${bot.role}` : ""}${status ? `, ${status.label}` : ""}`}
                  onPress={() => go(botChatHref(runtimeId, bot), "replace")}
                  trailing={status && flagged ? <View style={styles.dot}><StatusDot tone={status.tone} /></View> : null} />
              );
            })}
          </View>
        ) : null}
        <View style={styles.group}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{searching ? "Results" : filterName ? `Chats in ${filterName}` : "Chats"}</Text>
          {state.status === "loading" ? <Text style={styles.note}>Loading…</Text> : null}
          {state.status === "error" ? <Text style={styles.note}>{state.message}</Text> : null}
          {state.status !== "loading" && chats.length === 0 ? <Text style={styles.note}>{searching && search.trim() ? "No matching chats." : "No chats yet."}</Text> : null}
          {chats.map((item) => {
            const status = deriveExecutionState(item);
            const flagged = status.tone === "active" || status.tone === "attention" || status.tone === "danger";
            return (
              <SidebarRow key={item.conversation.id} label={item.conversation.title} selected={item.conversation.id === activeConversationId}
                accessibilityLabel={`${item.conversation.title}, ${status.label}`}
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
  header: { height: 56, flexDirection: "row" as const, alignItems: "center" as const, paddingLeft: spacing.xl, paddingRight: spacing.sm },
  brand: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2 },
  pressed: { opacity: 0.55 },
  brandText: { ...type.title2, fontWeight: "600" as const, color: theme.colors.text, flexShrink: 1 },
  search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  content: { paddingHorizontal: spacing.sm + 2, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: 2 },
  sectionTitle: { ...type.body, color: theme.colors.textMuted, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm },
  note: { ...type.subheadline, color: theme.colors.textMuted, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.xs },
  dot: { width: 28, alignItems: "center" as const }
});
