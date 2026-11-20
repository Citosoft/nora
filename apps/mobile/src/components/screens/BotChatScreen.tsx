import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { routes } from "@/navigation/routes";
import { botScopeFromParam, findBot } from "@/state/botChats";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { useBots } from "@/hooks/useBots";
import { useCommandRunner } from "@/hooks/useCommandRunner";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useStartBotChat } from "@/hooks/useStartBotChat";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Banner } from "@/components/common/Banner";
import { BotAvatar } from "@/components/common/BotAvatar";
import { Inset } from "@/components/common/Inset";
import { UnsentConversationRow } from "@/components/conversations/UnsentConversationRow";
import { Composer } from "@/components/chat/Composer";
import { ComputerPill } from "@/components/shell/ComputerPill";
import { ConversationShell } from "@/components/shell/ConversationShell";

interface BotChatScreenProps {
  runtimeId: string;
  botId: string;
  /** Set for a workspace bot, which has one chat per workspace; null for a global bot. */
  workspaceId: string | null;
}

/** Where a bot's chat begins: the bot's name and role over the composer; the first message creates the chat and opens it. */
export function BotChatScreen({ runtimeId, botId, workspaceId }: BotChatScreenProps) {
  const lookup = useRuntimeSession(runtimeId);
  return (
    <ConversationShell runtimeId={runtimeId} activeConversationId={null} center={<ComputerPill runtimeId={runtimeId} />}>
      {lookup.status === "ready" ? (
        <BotChatForm runtime={{ session: lookup.session, snapshot: lookup.snapshot, name: lookup.name }} runtimeId={runtimeId} botId={botId} workspaceId={workspaceId} />
      ) : null}
    </ConversationShell>
  );
}

function BotChatForm({ runtime, runtimeId, botId, workspaceId }: BotChatScreenProps & { runtime: ConnectedRuntime }) {
  const styles = useThemedStyles(createStyles);
  const bots = useBots(runtime.session);
  const runner = useCommandRunner(runtime.session);
  const { start, retry, unsent, error } = useStartBotChat(runner, runtimeId);
  const [instruction, setInstruction] = useState("");
  const info = runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null;
  const gate = capabilityGate(info, "bots.chat");
  const sendGate = capabilityGate(info, "messages.send");
  const list = bots.state.status === "ready" ? bots.state.value : [];
  const bot: RemoteBot | null = findBot(list, botId, botScopeFromParam(workspaceId));
  const existingChat = bot?.chatConversationId ?? null;

  // A chat that already exists (opened from a stale link, or created from the computer) opens instead of starting a second one.
  useEffect(() => {
    if (existingChat && unsent.length === 0) router.replace(routes.conversation(runtimeId, existingChat));
  }, [existingChat, runtimeId, unsent.length]);

  const disabledReason = !gate.enabled || !sendGate.enabled ? gate.reason ?? sendGate.reason
    : bots.state.status === "loading" ? "Loading bots…"
    : !bot ? "This bot isn't available on this computer." : null;

  const submit = async (text: string): Promise<void> => {
    if (disabledReason || !bot) return;
    await start({ bot, instruction: text });
  };
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          {bot ? <BotAvatar avatar={bot.avatar} name={bot.name} size={72} /> : null}
          <Text style={styles.heading} accessibilityRole="header">{bot?.name ?? "Bot"}</Text>
          {bot?.role ? <Text style={styles.role}>{bot.role}</Text> : null}
        </View>
        <View style={styles.notices}>
          {bots.state.status === "error" ? <Inset><Banner tone="danger" title="Couldn't load bots" message={bots.state.message} /></Inset> : null}
          {error ? <Inset><Banner tone="danger" title="Chat hasn't started" message={error} /></Inset> : null}
          {unsent.map((command) => <UnsentConversationRow key={command.key} command={command} sending={runner.inFlight.has(command.key)}
            onRetry={() => void retry(command)} onDiscard={() => void runner.discard(command.key)} />)}
        </View>
      </ScrollView>
      <Composer draft={instruction} onDraftChange={setInstruction} onSend={submit} disabledReason={disabledReason} placeholder={bot ? `Message ${bot.name}` : "Message"} />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) => ({
  fill: { flex: 1 },
  content: { flexGrow: 1, width: "100%" as const, maxWidth: layout.chatColumnWidth, alignSelf: "center" as const, paddingBottom: spacing.md },
  hero: { flexGrow: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl },
  heading: { fontSize: 28, lineHeight: 34, fontWeight: "400" as const, letterSpacing: -0.4, color: theme.colors.text, textAlign: "center" as const },
  role: { ...type.subheadline, color: theme.colors.textMuted, textAlign: "center" as const },
  notices: { gap: spacing.sm }
});
