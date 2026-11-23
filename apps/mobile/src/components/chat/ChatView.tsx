import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { ComposerStop } from "@/types/composer.types";
import type { ConversationHandle } from "@/types/conversationHook.types";
import type { TimelineEntry } from "@/types/conversationState.types";
import type { CommandRunner } from "@/types/pendingCommand.types";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { deliveredSends, latestFailure, pendingSendsFor, workingLabel } from "@/state/chatState";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { buildTimelineEntries } from "@/state/timelineEntries";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { RequestCard } from "@/components/approvals/RequestCard";
import { Banner } from "@/components/common/Banner";
import { KeyboardAvoidingArea } from "@/components/common/KeyboardAvoidingArea";
import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { Composer } from "./Composer";
import { PendingSendRow } from "./PendingSendRow";
import { TimelineEntryView } from "./TimelineEntryView";

interface ChatViewProps {
  runtime: ConnectedRuntime;
  runtimeId: string;
  conversation: ConversationHandle;
  view: ConversationView;
  runner: CommandRunner;
  onSend: (text: string) => Promise<void>;
  stop: ComposerStop | null;
}

const entryKey = (entry: TimelineEntry): string => entry.item.id;
const nearBottomPx = 120;

export function ChatView({ runtime, runtimeId, conversation, view, runner, onSend, stop }: ChatViewProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const list = useRef<FlatList<TimelineEntry>>(null);
  const atBottom = useRef(true);
  const conversationId = view.header.conversation.id;
  const info = runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null;
  const sendGate = capabilityGate(info, "messages.send");
  const decideGate = capabilityGate(info, "actions.decide");
  const reachable = runtime.snapshot.info.status !== "error";
  const entries = useMemo(() => buildTimelineEntries(view.items), [view.items]);
  const sends = pendingSendsFor(runner.pending, conversationId);
  const failure = latestFailure(view);
  const working = workingLabel(view);
  const requests = view.header.pendingRequests;

  useEffect(() => {
    for (const delivered of deliveredSends(view, sends)) void runner.discard(delivered.key);
  }, [runner, sends, view]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    atBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < nearBottomPx;
  }, []);
  const followNewContent = useCallback(() => {
    if (atBottom.current) list.current?.scrollToEnd({ animated: false });
  }, []);

  const send = async (text: string): Promise<void> => {
    atBottom.current = true;
    const pendingSend = onSend(text);
    setDraft("");
    // Show the user's own message (pending row or echoed item) even if content-size events were coalesced.
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    await pendingSend;
  };

  return (
    <KeyboardAvoidingArea>
      <FlatList ref={list} data={entries} keyExtractor={entryKey} renderItem={({ item }) => <TimelineEntryView entry={item} />}
        contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={64} onContentSizeChange={followNewContent} onLayout={followNewContent}
        accessibilityLabel="Conversation" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        ListHeaderComponent={view.nextBefore !== null ? (
          <View style={styles.older}>
            <Button label="Load earlier messages" variant="ghost" compact busy={conversation.olderHistory.loading} onPress={conversation.loadOlder} />
            {conversation.olderHistory.error ? <Text style={styles.muted}>{conversation.olderHistory.error}</Text> : null}
          </View>
        ) : entries.length === 0 ? <Text style={styles.muted}>No messages yet.</Text> : undefined}
        ListFooterComponent={
          <View style={styles.footer}>
            {failure?.failure ? <Banner tone="danger" title="The last task failed" message={failure.failure.message} /> : null}
            {requests.map((request) => (
              <RequestCard key={request.id} runtimeId={runtimeId} conversationId={conversationId} request={request} runner={runner} gate={decideGate} />
            ))}
            {sends.map((command) => (
              <PendingSendRow key={command.key} command={command} sending={runner.inFlight.has(command.key)}
                onRetry={() => void runner.retry(command.key)}
                onDiscard={() => {
                  setDraft((current) => current || command.instruction);
                  void runner.discard(command.key);
                }} />
            ))}
            {working ? (
              <View style={styles.working} accessibilityLiveRegion="polite">
                {stop ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="time-outline" size={15} color={colors.textMuted} />}
                <Text style={styles.workingText}>{working}</Text>
              </View>
            ) : null}
          </View>
        } />
      <Composer draft={draft} onDraftChange={setDraft} onSend={send} stop={stop} placeholder="Reply to Nora"
        disabledReason={!reachable ? "Your computer is offline" : sendGate.enabled ? null : sendGate.reason} />
    </KeyboardAvoidingArea>
  );
}

const createStyles = (theme: Theme) => ({
  content: { width: "100%" as const, maxWidth: layout.chatColumnWidth, alignSelf: "center" as const, paddingHorizontal: layout.gutter + 2, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  older: { alignItems: "center" as const, gap: spacing.xs },
  footer: { gap: spacing.md },
  muted: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const },
  working: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  workingText: { ...type.subheadline, color: theme.colors.textMuted }
});
