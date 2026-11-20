import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { router } from "expo-router";
import type { InboxCommand, InboxItem } from "@shared/types/inbox/inbox.types";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import { routes } from "@/navigation/routes";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { mobileInboxSections } from "@/state/inbox";
import { errorMessage } from "@/api/http/remoteRequestError";
import { useInbox } from "@/hooks/useInbox";
import { useCommandRunner } from "@/hooks/useCommandRunner";
import { useNow } from "@/hooks/useNow";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { RequestCard } from "@/components/approvals/RequestCard";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { ListSection } from "@/components/common/ListSection";
import { NavButton } from "@/components/common/NavButton";
import { StateView } from "@/components/common/StateView";
import { RuntimeScreen } from "@/components/runtimes/RuntimeScreen";
import { InboxEntryRow } from "@/components/inbox/InboxEntryRow";

/** What needs you on this computer (approvals, questions, paused workflows), then what finished while you were away. */
export function InboxScreen({ runtimeId }: { runtimeId: string }) {
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const inbox = useInbox(session, capabilityGate(info, "inbox.read").enabled);
  const marks = capabilityGate(info, "inbox.update").enabled;
  const runner = useCommandRunner(session);
  const now = useNow();
  const [markError, setMarkError] = useState<string | null>(null);
  const refreshing = inbox.state.status === "ready" && inbox.state.refreshing;
  const apply = useCallback((command: InboxCommand) => {
    if (!session) return;
    setMarkError(null);
    session.client.updateInbox(command).then(inbox.refresh, (error: unknown) => setMarkError(errorMessage(error)));
  }, [session, inbox.refresh]);
  const open = useCallback((item: InboxItem) => {
    if (item.kind !== "request" && item.kind !== "outcome") return;
    if (marks && item.kind === "outcome" && !item.readAt) apply({ kind: "mark-read", itemIds: [item.id] });
    router.push(routes.conversation(runtimeId, item.conversation.id));
  }, [marks, apply, runtimeId]);
  return (
    <RuntimeScreen runtimeId={runtimeId} largeTitle title={() => "Inbox"} subtitle={(runtime) => runtime.name}
      back={{ label: "chat", fallbackHref: routes.runtime(runtimeId) }}
      trailing={() => <NavButton icon="refresh" label="Refresh" busy={refreshing} onPress={inbox.refresh} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={inbox.refresh} />}>
      {(runtime: ConnectedRuntime) => {
        const state = inbox.state;
        const value = state.status === "ready" ? state.value : state.status === "error" ? state.stale : null;
        const gate = capabilityGate(runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null, "actions.decide");
        const sections = value ? mobileInboxSections(value.items, now.toISOString()) : [];
        return (
          <>
            {state.status === "loading" ? <StateView kind="loading" message="Checking your inbox…" /> : null}
            {state.status === "error" ? <Inset><Banner tone="danger" title="Couldn't load your inbox" message={state.message} /></Inset> : null}
            {markError ? <Inset><Banner tone="danger" title="Couldn't update your inbox" message={markError} /></Inset> : null}
            {value && !value.full ? <Inset><Banner tone="neutral" title="Approvals and questions only" message="Update Nora Desktop on this computer to see finished work and workflows here too." /></Inset> : null}
            {value && !sections.length ? (
              <StateView kind="empty" icon="checkmark-done-circle-outline" title="You're all caught up"
                message="When an agent needs your approval or an answer, or finishes while you're away, it shows up here." />
            ) : null}
            {sections.map((section) => (
              <ListSection key={section.id} header={section.title}>
                {section.items.map((item) => item.kind === "request"
                  ? <RequestCard key={item.id} runtimeId={runtimeId} conversationId={item.conversation.id} request={item.request} runner={runner} gate={gate}
                      context={item.notice.who} onOpenConversation={() => open(item)} />
                  : <InboxEntryRow key={item.id} item={item} now={now} onOpen={open} onCommand={marks ? apply : undefined} />)}
              </ListSection>
            ))}
          </>
        );
      }}
    </RuntimeScreen>
  );
}
