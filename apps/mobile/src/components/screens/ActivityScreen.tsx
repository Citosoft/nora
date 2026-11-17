import { useCallback } from "react";
import { RefreshControl } from "react-native";
import { router } from "expo-router";
import { routes } from "@/navigation/routes";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { useActivity } from "@/hooks/useActivity";
import { useNow } from "@/hooks/useNow";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { ListSection } from "@/components/common/ListSection";
import { NavButton } from "@/components/common/NavButton";
import { StateView } from "@/components/common/StateView";
import { RuntimeScreen } from "@/components/runtimes/RuntimeScreen";
import { ActivityRow } from "@/components/tasks/ActivityRow";

/** Active and recent tasks across conversations; results stay here after the app is closed and reopened. */
export function ActivityScreen({ runtimeId }: { runtimeId: string }) {
  const lookup = useRuntimeSession(runtimeId);
  const session = lookup.status === "ready" ? lookup.session : null;
  const info = lookup.status === "ready" && lookup.snapshot.info.status === "ready" ? lookup.snapshot.info.value : null;
  const activity = useActivity(session, capabilityGate(info, "tasks.list").enabled);
  const now = useNow();
  const open = useCallback((conversationId: string) => router.push(routes.conversation(runtimeId, conversationId)), [runtimeId]);
  const state = activity.state;
  const list = state.status === "ready" ? state.value : state.status === "error" ? state.stale : null;
  const refreshing = state.status === "ready" && state.refreshing;
  return (
    <RuntimeScreen runtimeId={runtimeId} largeTitle title={() => "Activity"} subtitle={(runtime) => runtime.name}
      back={{ label: "chat", fallbackHref: routes.runtime(runtimeId) }}
      trailing={() => <NavButton icon="refresh" label="Refresh" busy={refreshing} onPress={activity.refresh} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={activity.refresh} />}>
      {() => (
        <>
          {state.status === "loading" ? <StateView kind="loading" message="Loading activity…" /> : null}
          {state.status === "error" ? <Inset><Banner tone="danger" title="Couldn't load activity" message={state.message} /></Inset> : null}
          {list ? (
            <ListSection header="Running now" separatorInset={58} footer={list.active.length === 0 ? "Nothing is running right now." : undefined}>
              {list.active.map((entry) => <ActivityRow key={entry.run.id} entry={entry} now={now} onOpen={open} />)}
            </ListSection>
          ) : null}
          <ListSection header="Recent" separatorInset={58}>
            {list?.recent.map((entry) => <ActivityRow key={entry.run.id} entry={entry} now={now} onOpen={open} />)}
          </ListSection>
        </>
      )}
    </RuntimeScreen>
  );
}
