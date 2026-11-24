import { Text, View } from "react-native";
import type { RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { CapabilityGate } from "@/types/runtimeSession.types";
import type { CommandRunner } from "@/types/pendingCommand.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, radii, spacing, type } from "@/theme/tokens";
import { relativeTime } from "@/state/relativeTime";
import { useNow } from "@/hooks/useNow";
import { useRequestDecision } from "@/hooks/useRequestDecision";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { IconTile } from "@/components/common/IconTile";
import { ApprovalRequestCard } from "./ApprovalRequestCard";
import { QuestionRequestCard } from "./QuestionRequestCard";

interface RequestCardProps {
  runtimeId: string;
  conversationId: string;
  request: RuntimeRequest;
  runner: CommandRunner;
  gate: CapabilityGate;
  /** Shown above the title in cross-conversation lists. */
  context?: string;
  /** Adds an "Open chat" link (cross-conversation lists). */
  onOpenConversation?: () => void;
}

/** A pending approval or question; the decision is recorded on the runtime, which keeps the audit trail. */
export function RequestCard({ runtimeId, conversationId, request, runner, gate, context, onOpenConversation }: RequestCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const now = useNow();
  const { decide, busy, error } = useRequestDecision(runner, { runtimeId, conversationId, requestId: request.id });
  const responding = request.status === "responding";
  const disabled = !gate.enabled || responding;
  const onDecide = (response: Parameters<typeof decide>[0]): void => void decide(response);
  const approval = request.kind === "approval";
  return (
    <View style={styles.card} accessibilityLabel={`${approval ? "Approval needed" : "Question"}: ${request.title}`}>
      <View style={styles.header}>
        <IconTile icon={approval ? "hand-left" : "chatbubble-ellipses"} color={colors.tones.attention.solid} size={layout.iconTile} />
        <View style={styles.headerText}>
          <Text style={styles.kind} numberOfLines={1}>{context ?? (approval ? "Needs your approval" : "Nora has a question")}</Text>
          <Text style={styles.expires}>{context ? (approval ? "Needs your approval · " : "Question · ") : ""}Expires {relativeTime(request.expiresAt, now)}</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header">{request.title}</Text>
      {approval
        ? <ApprovalRequestCard request={request} disabled={disabled} busy={busy} onDecide={onDecide} />
        : <QuestionRequestCard request={request} disabled={disabled} busy={busy} onDecide={onDecide} />}
      {responding ? <Text style={styles.expires}>Sending your answer to the agent…</Text> : null}
      {!gate.enabled ? <Banner tone="neutral" title="Answer on your computer" message={gate.reason} /> : null}
      {error ? <Banner tone="danger" title="Not sent" message={error} /> : null}
      {onOpenConversation ? <Button label="Open chat" icon="chatbubble-outline" variant="ghost" compact onPress={onOpenConversation}
        accessibilityLabel={`Open ${context ?? "chat"}`} /> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  card: { borderRadius: radii.xl, backgroundColor: theme.colors.surface, padding: spacing.lg, gap: spacing.md,
    borderWidth: hairline, borderColor: theme.colors.cardBorder, boxShadow: `0px 2px 14px ${theme.colors.shadow}` },
  header: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md },
  headerText: { flex: 1, minWidth: 0 },
  kind: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.text },
  title: { ...type.title3, color: theme.colors.text },
  expires: { ...type.footnote, color: theme.colors.textMuted }
});
