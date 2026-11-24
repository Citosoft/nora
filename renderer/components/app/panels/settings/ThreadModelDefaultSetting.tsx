import { useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { SettingRow } from "@/components/app/panels/settings/settingsUi";
import type { ThreadModelDefaultFieldsProps, ThreadModelDefaultSettingProps, ThreadModelSettingConfig, ThreadModelSettingTarget } from "@/components/app/types/modelPicker.types";
import { threadPreferences } from "@shared/personalization/threads";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import { ProviderModelFields } from "./ProviderModelFields";

/** Copy, storage and save request for each saved model default, so the setting stays one component. */
const TARGETS: Readonly<Record<ThreadModelSettingTarget, ThreadModelSettingConfig>> = {
  thread: {
    title: "Default model for new threads",
    description: "New threads start with this provider and model. If it is no longer available, they use the first available provider and model.",
    labels: { provider: "Default provider for new threads", model: "Default model for new threads", clear: "Automatic (first available)" },
    saved: (boot) => boot.personalization.threadModel ?? null,
    request: (model) => ({ kind: "set-thread-model", model })
  },
  subagent: {
    title: "Default subagent model",
    description: "New threads on the chosen account use this model for their subagents. Each new thread can override it in the model picker.",
    labels: { provider: "Provider for default subagent model", model: "Default subagent model", clear: "Provider default" },
    saved: (boot) => threadPreferences(boot.personalization).subagentModel,
    request: (model) => ({ kind: "set-thread-preferences", patch: { subagentModel: model } }),
    unsupportedReason: (catalog) => catalog.capabilities.subagentModel ? null : "This provider does not support a default subagent model."
  },
  "nora-chat": {
    title: "Nora's chat model",
    description: "Messaging Nora from the Bots sidebar starts its work on this provider and model. Without one, Nora's chat uses the default model for new threads.",
    labels: { provider: "Provider for Nora's chat", model: "Model for Nora's chat", clear: "Same as new threads" },
    saved: (boot) => boot.personalization.noraChatModel ?? null,
    request: (model) => ({ kind: "set-thread-model", target: "nora-chat", model })
  }
};

/** A saved provider and model default; each thread can still change its model before its first message. */
export function ThreadModelDefaultSetting({ target = "thread", providerKinds }: ThreadModelDefaultSettingProps) {
  const { boot } = useNativeRuntimePorts();
  const { state } = useThreadCenterPorts();
  const workspace = boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId) ?? boot.workspaces[0] ?? null;
  const copy = TARGETS[target];
  return <SettingRow title={copy.title} description={copy.description}
    control={workspace ? <ThreadModelDefaultFields workspace={workspace.workspace} target={target} {...(providerKinds ? { providerKinds } : {})} />
      : <p className="text-sm text-muted-foreground">Add a workspace to choose a default model.</p>} />;
}

function ThreadModelDefaultFields({ workspace, target = "thread", providerKinds }: ThreadModelDefaultFieldsProps) {
  const { boot, request } = useNativeRuntimePorts();
  const config = TARGETS[target];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (model: ThreadModelDefault | null): Promise<void> => {
    setBusy(true); setError(null);
    try { await request(config.request(model)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The default model could not be saved. Try again."); }
    finally { setBusy(false); }
  };
  return <ProviderModelFields workspace={workspace} value={config.saved(boot)} onChange={(model) => void save(model)} disabled={busy} error={error} {...(providerKinds ? { providerKinds } : {})}
    labels={config.labels} {...(config.unsupportedReason ? { unsupportedReason: config.unsupportedReason } : {})} />;
}
