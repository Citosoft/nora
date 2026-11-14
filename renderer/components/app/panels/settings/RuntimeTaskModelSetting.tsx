import { useMemo } from "react";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { createModelCatalogStore } from "@/components/app/logic/modelCatalogStore";
import { SettingRow } from "@/components/app/panels/settings/settingsUi";
import { Select } from "@/components/ui/select";
import { ProviderOptionLabel } from "./ProviderOptionLabel";
import type { RuntimeTaskModelFieldsProps, RuntimeTaskModelSelectProps, RuntimeTaskModelSettingProps } from "@/components/app/types/modelPicker.types";

const RUNTIME_LABELS: Record<RuntimeTaskModelSettingProps["provider"], string> = { codex: "Codex", claude: "Claude" };
const DEFAULT_OPTION = "Runtime default";

/** Which of the runtime's own models simple tasks use; the list comes from the same catalog as the thread model picker. */
export function RuntimeTaskModelSetting({ title, description, ...props }: RuntimeTaskModelSettingProps) {
  const { boot } = useNativeRuntimePorts();
  const { state } = useThreadCenterPorts();
  const workspace = boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId) ?? boot.workspaces[0] ?? null;
  const native = boot.providers.find((entry) => entry.kind === props.provider) ?? null;
  const label = RUNTIME_LABELS[props.provider];
  const status = !native ? `${label} is not installed or signed in, so its models cannot be listed.`
    : !workspace ? "Add a workspace to list this runtime's models." : null;
  return <SettingRow title={title}
    description={`${description} Uses the installed ${label} runtime and its existing sign-in; no API key is needed in Nora, and requests run separately from your coding threads.`}
    control={native && workspace ? <RuntimeTaskModelFields {...props} native={native} workspace={workspace.workspace} />
      : <div className="space-y-2"><ModelSelect provider={props.provider} value={props.value} onChange={props.onChange} />
        {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}</div>} />;
}

function RuntimeTaskModelFields({ provider, value, onChange, native, workspace }: RuntimeTaskModelFieldsProps) {
  const { store } = useNativeRuntimePorts();
  const catalogs = useMemo(() => createModelCatalogStore({ client: store.client, workspace }), [store.client, workspace]);
  const catalog = useNativeModelCatalog(catalogs, native);
  const models = catalog.status === "available" ? catalog.catalog.models : [];
  const status = catalog.status === "idle" || catalog.status === "loading" ? "Loading models…"
    : catalog.status === "unavailable" ? catalog.failure.message : null;
  return <div className="space-y-2">
    <ModelSelect provider={provider} value={value} onChange={onChange} models={models} />
    {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}
  </div>;
}

function ModelSelect({ provider, value, onChange, models = [] }: RuntimeTaskModelSelectProps) {
  return <Select aria-label={`${RUNTIME_LABELS[provider]} model for simple tasks`} className="w-full" value={value ?? ""}
    onChange={(event) => onChange(event.target.value || null)}>
    <option value=""><ProviderOptionLabel kind={provider} label={DEFAULT_OPTION} /></option>
    {models.map((model) => <option key={model.id} value={model.id}><ProviderOptionLabel kind={provider} label={model.name || model.id} /></option>)}
    {value && !models.some((model) => model.id === value) && <option value={value}><ProviderOptionLabel kind={provider} label={`${value} (not listed)`} /></option>}
  </Select>;
}
