import { useRef, useState } from "react";
import type { RemoteSettings } from "@shared/types/remote-access/management.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { useSessionResource } from "@/hooks/useSessionResource";
import { errorMessage } from "@/api/http/remoteRequestError";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { StateView } from "@/components/common/StateView";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";

export function ThreadPreferences({ session }: { session: RuntimeSession }) {
  const { state, refresh } = useSessionResource(session, (client) => client.settings(), { key: "settings", isAffectedBy: () => false });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const value = state.status === "ready" ? state.value : state.status === "error" ? state.stale : null;
  const disabled = saving || (state.status === "ready" && state.refreshing);
  const change = async (patch: Partial<RemoteSettings>): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try { await session.client.updateSettings(patch); refresh(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { pending.current = false; setSaving(false); }
  };
  return <>
    {state.status === "loading" ? <StateView kind="loading" message="Loading preferences…" /> : null}
    {state.status === "error" ? <StateView kind="error" title="Couldn’t load preferences" message={state.message} onRetry={refresh} /> : null}
    {error ? <Inset><Banner tone="danger" title="Couldn’t save" message={error} /></Inset> : null}
    {value ? <ListSection header="Thread preferences" footer="These preferences apply on this computer, including threads started from your phone.">
      <ListRow title="Automatic titles" subtitle="Name threads from their first message" value={value.automaticTitles ? "On" : "Off"} disabled={disabled}
        onPress={() => void change({ automaticTitles: !value.automaticTitles })} />
      <ListRow title="Automatic memory" subtitle="Review finished threads for useful memories" value={value.automaticMemory ? "On" : "Off"} disabled={disabled}
        onPress={() => void change({ automaticMemory: !value.automaticMemory })} />
      <ListRow title="Follow-up messages" value={value.followUp === "queue" ? "Queue" : "Steer"} disabled={disabled}
        onPress={() => void change({ followUp: value.followUp === "queue" ? "steer" : "queue" })} />
      <ListRow title="Tool output" value={value.toolOutputBudget === "compact" ? "Compact" : "Provider default"} disabled={disabled}
        onPress={() => void change({ toolOutputBudget: value.toolOutputBudget === "compact" ? "provider-default" : "compact" })} />
    </ListSection> : null}
  </>;
}
