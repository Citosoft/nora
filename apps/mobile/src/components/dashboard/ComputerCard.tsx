import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { ComputerReport } from "@/types/dashboard.types";
import type { RuntimeReachability } from "@/types/reachability.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { describeReachability } from "@/reachability/probeRuntime";
import { chatsOverview } from "@/state/chatsOverview";
import { recentChats } from "@/state/dashboard";
import { reachabilityTone } from "@/state/reachabilityTone";
import { useConversationList } from "@/hooks/useConversationList";
import { useProjects } from "@/hooks/useProjects";
import { useRuntimeReachability } from "@/hooks/useRuntimeReachability";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { StatusDot } from "@/components/common/StatusDot";
import { ConversationRow } from "@/components/conversations/ConversationRow";
import { MetricChip } from "./MetricChip";

interface ComputerCardProps {
  runtime: RuntimeDirectoryEntry;
  isDefault: boolean;
  now: Date;
  onReport: (installationId: string, report: ComputerReport) => void;
}

const recentLimit = 3;

/** One computer on the dashboard: its live status, and once it answers, what needs you, what's running and its latest chats. */
export function ComputerCard({ runtime, isDefault, now, onReport }: ComputerCardProps) {
  const { reachability } = useRuntimeReachability(runtime);
  const online = reachability.status === "online";
  useEffect(() => {
    if (!online) onReport(runtime.installationId, { status: reachability.status === "checking" ? "checking" : "offline" });
  }, [online, onReport, reachability.status, runtime.installationId]);
  if (online) return <OnlineComputerCard runtime={runtime} reachability={reachability} isDefault={isDefault} now={now} onReport={onReport} />;
  return (
    <ListSection>
      <ComputerHeaderRow runtime={runtime} reachability={reachability} isDefault={isDefault} />
    </ListSection>
  );
}

function OnlineComputerCard({ runtime, reachability, isDefault, now, onReport }: ComputerCardProps & { reachability: RuntimeReachability }) {
  const styles = useThemedStyles(createStyles);
  const lookup = useRuntimeSession(runtime.installationId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const list = useConversationList(session, null);
  const projects = useProjects(session);
  const summaries = list.state.status === "ready" ? list.state.value : list.state.status === "error" ? list.state.stale ?? [] : [];
  const overview = chatsOverview(summaries);
  const loaded = list.state.status !== "loading";
  const projectNames = new Map((projects.state.status === "ready" ? projects.state.value : []).map((project) => [project.id, project.name]));
  const id = runtime.installationId;

  useEffect(() => {
    onReport(id, loaded ? { status: "online", needsYou: overview.pendingRequests, working: overview.working } : { status: "checking" });
  }, [id, loaded, onReport, overview.pendingRequests, overview.working]);

  const openChat = (conversationId: string): void => router.push(routes.conversation(id, conversationId));
  return (
    <ListSection>
      <ComputerHeaderRow runtime={runtime} reachability={reachability} isDefault={isDefault} />
      {loaded ? (
        <View style={styles.metrics}>
          {overview.pendingRequests ? <MetricChip tone="attention" label={`${overview.pendingRequests} ${overview.pendingRequests === 1 ? "needs" : "need"} you`}
            accessibilityHint="Opens the inbox" onPress={() => router.push(routes.inbox(id))} /> : null}
          {overview.working ? <MetricChip tone="active" label={`${overview.working} running`} accessibilityHint="Opens activity"
            onPress={() => router.push(routes.activity(id))} /> : null}
          {!overview.pendingRequests && !overview.working ? <MetricChip tone="neutral" label="Nothing waiting" /> : null}
        </View>
      ) : null}
      {recentChats(summaries, recentLimit).map((summary) => (
        <ConversationRow key={summary.conversation.id} summary={summary} now={now} onOpen={openChat}
          projectName={projectNames.get(summary.conversation.workspace.projectId) ?? null} />
      ))}
    </ListSection>
  );
}

function ComputerHeaderRow({ runtime, reachability, isDefault }: { runtime: RuntimeDirectoryEntry; reachability: RuntimeReachability; isDefault: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <ListRow title={runtime.name} subtitle={describeReachability(reachability)} value={isDefault ? "Default" : null} accessory="chevron"
      titleLines={1} subtitleLines={1} accessibilityHint="Opens this computer" onPress={() => router.push(routes.runtime(runtime.installationId))}
      leading={
        <View style={styles.glyph}>
          <Icon name={runtime.environment === "server" ? "server-outline" : "laptop-outline"} size={24} color={colors.text} />
          <View style={styles.badge}><StatusDot tone={reachabilityTone(reachability)} size={9} /></View>
        </View>
      } />
  );
}

const createStyles = (theme: Theme) => ({
  metrics: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm, paddingHorizontal: layout.gutter, paddingVertical: spacing.md },
  glyph: { width: layout.iconTile, alignItems: "center" as const },
  badge: { position: "absolute" as const, right: -2, bottom: -2, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.composer }
});
