import { router } from "expo-router";
import { routes } from "@/navigation/routes";
import type { SendMessageRequest } from "@shared/types/remote-access/runtimeApi.types";
import type { ComposerStop } from "@/types/composer.types";
import type { ConversationHandle } from "@/types/conversationHook.types";
import type { CommandRunner } from "@/types/pendingCommand.types";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import { conversationStatus, stoppableRun } from "@/state/chatState";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { useChatActions } from "@/hooks/useChatActions";
import { useCommandRunner } from "@/hooks/useCommandRunner";
import { useConversation } from "@/hooks/useConversation";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { StateView } from "@/components/common/StateView";
import { ChatView } from "@/components/chat/ChatView";
import { ChatTitle } from "@/components/shell/ChatTitle";
import { ConversationShell } from "@/components/shell/ConversationShell";

/** One conversation: streamed timeline, inline approvals, send, stop and retry. */
export function ChatScreen({ runtimeId, conversationId }: { runtimeId: string; conversationId: string }) {
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const liveUpdates = lookup.status === "ready" && lookup.snapshot.liveUpdates;
  const conversation = useConversation(session, conversationId, liveUpdates);
  const runner = useCommandRunner(session);
  const actions = useChatActions(runner, runtimeId, conversationId);
  const view = conversation.state.status === "ready" ? conversation.state.value : conversation.state.status === "error" ? conversation.state.stale : null;
  const activeRun = view ? stoppableRun(view) : null;

  const runtime = lookup.status === "ready" ? { session: lookup.session, snapshot: lookup.snapshot, name: lookup.name } : null;
  const cancelGate = capabilityGate(runtime?.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null, "tasks.cancel");
  const bot = view?.header.conversation.direct;
  const canEditBot = capabilityGate(runtime?.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null, "bots.manage").enabled;
  const stop: ComposerStop | null = activeRun
    ? { onStop: () => void actions.stop(activeRun.id), busy: actions.stopping(activeRun.id), disabled: !cancelGate.enabled }
    : null;
  return (
    <ConversationShell runtimeId={runtimeId} activeConversationId={conversationId}
      center={<ChatTitle title={view?.header.conversation.title ?? "Chat"} status={view ? conversationStatus(view) : null} bot={bot}
        onEditBot={bot && canEditBot ? () => router.push(routes.editBot(runtimeId, bot.botId, bot.scope)) : undefined} />}>
      {runtime ? <ChatBody runtime={runtime} runtimeId={runtimeId} conversation={conversation} runner={runner} onSend={actions.send} stop={stop}
        stopError={actions.stopError} /> : null}
    </ConversationShell>
  );
}

interface ChatBodyProps {
  runtime: ConnectedRuntime;
  runtimeId: string;
  conversation: ConversationHandle;
  runner: CommandRunner;
  onSend: (text: string, providerChange?: SendMessageRequest["providerChange"]) => Promise<void>;
  stop: ComposerStop | null;
  stopError: string | null;
}

function ChatBody({ runtime, runtimeId, conversation, runner, onSend, stop, stopError }: ChatBodyProps) {
  const state = conversation.state;
  if (state.status === "loading") return <StateView kind="loading" message="Loading conversation…" />;
  const view = state.status === "ready" ? state.value : state.stale;
  if (!view) return <StateView kind="error" title="Couldn't open this chat" message={state.status === "error" ? state.message : ""} onRetry={conversation.refresh} />;
  return (
    <>
      {state.status === "error" ? <Inset><Banner tone="danger" title="Showing what was loaded before" message={state.message} /></Inset> : null}
      {stopError ? <Inset><Banner tone="danger" title="Couldn't stop the task" message={stopError} /></Inset> : null}
      <ChatView key={`${runtimeId}/${view.header.conversation.id}`} runtime={runtime} runtimeId={runtimeId} conversation={conversation} view={view} runner={runner} onSend={onSend} stop={stop} />
    </>
  );
}
