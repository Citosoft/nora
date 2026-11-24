import { useMemo } from "react";
import { View } from "react-native";
import type { SidebarBotsProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { spacing } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { botChatHref } from "@/state/botChats";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { deriveExecutionState } from "@/state/executionState";
import { useBots } from "@/hooks/useBots";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BarIconButton } from "@/components/common/BarIconButton";
import { BotAvatar } from "@/components/common/BotAvatar";
import { Icon } from "@/components/common/Icon";
import { StatusDot } from "@/components/common/StatusDot";
import { SidebarRow } from "./SidebarRow";
import { SidebarHeading } from "./SidebarHeading";

export function SidebarBots({ runtimeId, projectId, activeConversationId, summaries, onNavigate }: SidebarBotsProps) {
  const lookup = useRuntimeSession(runtimeId);
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const canManage = capabilityGate(info, "bots.manage").enabled;
  const session = lookup.status === "ready" && capabilityGate(info, "bots.chat").enabled ? lookup.session : null;
  const bots = useBots(session);
  const list = bots.state.status === "ready" ? bots.state.value : bots.state.status === "error" ? bots.state.stale ?? [] : [];
  const byId = useMemo(() => new Map(summaries.map((summary) => [summary.conversation.id, summary])), [summaries]);
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  if (!list.length && !canManage) return null;
  return <View style={styles.group}>
    <SidebarHeading title="Bots" />
    {canManage ? <>
      <SidebarRow label="Create bot" icon="add-circle-outline" onPress={() => onNavigate(routes.createBot(runtimeId, projectId))} />
      <SidebarRow label="Manage bots" icon="people-outline" onPress={() => onNavigate(routes.manageBots(runtimeId))} />
    </> : null}
    {list.map((bot) => {
      const chat = bot.chatConversationId ? byId.get(bot.chatConversationId) : undefined;
      const status = chat ? deriveExecutionState(chat) : null;
      const flagged = status && (status.tone === "active" || status.tone === "attention" || status.tone === "danger");
      return <SidebarRow key={`${bot.id}/${bot.scope.kind === "workspace" ? bot.scope.workspaceId : ""}`} label={bot.name}
        selected={!!bot.chatConversationId && bot.chatConversationId === activeConversationId}
        leading={<BotAvatar avatar={bot.avatar} name={bot.name} size={26} />}
        accessibilityLabel={`${bot.name}${bot.role ? `, ${bot.role}` : ""}${status ? `, ${status.label}` : ""}`}
        onPress={() => onNavigate(botChatHref(runtimeId, bot), "replace")}
        trailing={<View style={styles.actions}>
          {flagged ? <StatusDot tone={status.tone} /> : null}
          {canManage ? <BarIconButton label={`Edit ${bot.name}`} onPress={() => onNavigate(routes.editBot(runtimeId, bot.id, bot.scope))}>
            <Icon name="create-outline" size={19} color={colors.textMuted} />
          </BarIconButton> : null}
        </View>} />;
    })}
  </View>;
}

const createStyles = (_theme: Theme) => ({
  group: { gap: spacing.xxs },
  actions: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs }
});
