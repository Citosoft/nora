import { useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { SettingRow } from "@/components/app/panels/settings/settingsUi";
import type { ThreadModelDefaultFieldsProps, ThreadModelDefaultSettingProps } from "@/components/app/types/modelPicker.types";
import { threadPreferences } from "@shared/personalization/threads";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import { ProviderModelFields } from "./ProviderModelFields";

/** The provider and model new threads start with; each thread can still change it before its first message. */
export function ThreadModelDefaultSetting({ target = "thread" }: ThreadModelDefaultSettingProps) {
  const { boot } = useNativeRuntimePorts();
  const { state } = useThreadCenterPorts();
  const workspace = boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId) ?? boot.workspaces[0] ?? null;
  return <SettingRow title={target === "thread" ? "Default model for new threads" : "Default subagent model"}
    description={target === "thread" ? "New threads start with this provider and model. If it is no longer available, they use the first available provider and model."
      : "New threads with the matching provider use this model for subagents when supported. Each new thread can override it in the model picker."}
    control={workspace ? <ThreadModelDefaultFields workspace={workspace.workspace} target={target} />
      : <p className="text-sm text-muted-foreground">Add a workspace to choose a default model.</p>} />;
}

function ThreadModelDefaultFields({ workspace, target = "thread" }: ThreadModelDefaultFieldsProps) {
  const { boot, request } = useNativeRuntimePorts();
  const saved = target === "thread" ? boot.personalization.threadModel ?? null : threadPreferences(boot.personalization).subagentModel;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (model: ThreadModelDefault | null): Promise<void> => {
    setBusy(true); setError(null);
    try { await request(target === "thread" ? { kind: "set-thread-model", model } : { kind: "set-thread-preferences", patch: { subagentModel: model } }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The default model could not be saved. Try again."); }
    finally { setBusy(false); }
  };
  return <ProviderModelFields workspace={workspace} value={saved} onChange={(model) => void save(model)} disabled={busy} error={error}
    labels={target === "thread" ? { provider: "Default provider for new threads", model: "Default model for new threads", clear: "Automatic (first available)" }
      : { provider: "Provider for default subagent model", model: "Default subagent model", clear: "Provider default" }}
    unsupportedReason={target === "subagent" ? (catalog) => catalog.capabilities.subagentModel ? null : "This provider does not support a default subagent model." : undefined} />;
}
