import { RefreshControl } from "react-native";
import { router } from "expo-router";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import { routes } from "@/navigation/routes";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { useApprovalsInbox } from "@/hooks/useApprovalsInbox";
import { useCommandRunner } from "@/hooks/useCommandRunner";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { RequestCard } from "@/components/approvals/RequestCard";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { NavButton } from "@/components/common/NavButton";
import { StateView } from "@/components/common/StateView";
import { RuntimeScreen } from "@/components/runtimes/RuntimeScreen";

/** Every approval and question waiting on this computer, across conversations. */
export function ApprovalsScreen({ runtimeId }: { runtimeId: string }) {
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const inbox = useApprovalsInbox(session, capabilityGate(info, "tasks.list").enabled);
  const runner = useCommandRunner(session);
  const refreshing = inbox.state.status === "ready" && inbox.state.refreshing;
  return (
    <RuntimeScreen runtimeId={runtimeId} largeTitle title={() => "Approvals"} subtitle={(runtime) => runtime.name}
      back={{ label: "chat", fallbackHref: routes.runtime(runtimeId) }}
      trailing={() => <NavButton icon="refresh" label="Refresh" busy={refreshing} onPress={inbox.refresh} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={inbox.refresh} />}>
      {(runtime: ConnectedRuntime) => {
        const state = inbox.state;
        const requests = state.status === "ready" ? state.value : state.status === "error" ? state.stale : null;
        const gate = capabilityGate(runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null, "actions.decide");
        return (
          <>
            {state.status === "loading" ? <StateView kind="loading" message="Looking for requests…" /> : null}
            {state.status === "error" ? <Inset><Banner tone="danger" title="Couldn't load requests" message={state.message} /></Inset> : null}
            {requests && requests.length === 0 ? (
              <StateView kind="empty" icon="checkmark-done-circle-outline" title="You're all caught up" message="When an agent needs your approval or an answer, it shows up here." />
            ) : null}
            {requests?.length ? (
              <Inset>
                {requests.map((entry) => (
                  <RequestCard key={entry.request.id} runtimeId={runtimeId} conversationId={entry.conversationId} request={entry.request} runner={runner} gate={gate}
                    context={entry.conversationTitle} onOpenConversation={() => router.push(routes.conversation(runtimeId, entry.conversationId))} />
                ))}
              </Inset>
            ) : null}
          </>
        );
      }}
    </RuntimeScreen>
  );
}
