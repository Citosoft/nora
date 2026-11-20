import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { availableConnectors } from "@shared/connectors/access";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import { buildConnectorAccessChoices } from "@/components/app/logic/connectorAccess";
import type { NewAppDraft } from "@/components/app/types/appsView.types";
import type { BindingOrigin } from "@/components/app/types/modelPicker.types";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useNoraConnectors } from "./useNoraConnectors";
import { useThreadCenterPorts } from "./useThreadCenterPorts";

/**
 * The New app form's state: description, workspace, model and the connectors the builder may use. Every connector available in the
 * workspace starts selected, and one added while the form is open joins the selection, so the common case needs no clicks.
 */
export function useNewAppDraft(): NewAppDraft {
  const native = useNativeRuntimePorts();
  const { state } = useThreadCenterPorts();
  const connectors = useNoraConnectors();
  const [text, setText] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [provider, setProviderState] = useState<ProviderBinding | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { boot } = native;
  const workspace = useMemo(() => boot.workspaces.find((entry) => entry.id === workspaceId)
    ?? boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId) ?? boot.workspaces[0] ?? null, [boot.workspaces, workspaceId, state.layout.focusedWorkspaceId]);
  const available = useMemo(() => workspace ? availableConnectors(connectors.connectors ?? [], { workspaceId: workspace.id, botId: null }) : [],
    [connectors.connectors, workspace]);
  // Selection is kept as exclusions, so connectors that appear later are selected without tracking which ones were seen.
  const selectedConnectorIds = useMemo(() => new Set(available.filter((connector) => !excluded.has(connector.id)).map((connector) => connector.id)), [available, excluded]);
  const accessChoices = useMemo(() => buildConnectorAccessChoices(boot), [boot]);
  const setProvider = useCallback((binding: ProviderBinding | null, origin: BindingOrigin) => { setProviderState(origin === "chosen" ? binding : null); }, []);
  const textRef = useRef(text);
  textRef.current = text;

  const launch = useCallback(async () => {
    const description = textRef.current.trim();
    if (!description || busy) return;
    if (!workspace) throw new Error("Open a workspace first: an app uses the connectors available there.");
    setBusy(true); setError(null);
    try {
      const opened = await native.launch({ source: { kind: "app", appId: null, connectorIds: [...selectedConnectorIds] }, ...(workspace.shellProjectId ? { projectId: workspace.shellProjectId } : {}),
        text: description, submit: true, ...(provider ? { provider } : {}) });
      if (!opened) throw new Error(native.store.snapshot().error ?? "The builder thread could not be started.");
      setText("");
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : "The app could not be started.";
      setError(message);
      throw new Error(message);
    } finally { setBusy(false); }
  }, [busy, workspace, native, selectedConnectorIds, provider]);

  useEffect(() => { setError(null); }, [text]);
  return useMemo<NewAppDraft>(() => ({ boot, client: native.store.client, text, setText, workspace, selectWorkspace: setWorkspaceId, provider, setProvider, connectors, accessChoices, available,
    selectedConnectorIds, toggleConnector: (id) => setExcluded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    busy, error, launch }), [boot, native.store.client, text, workspace, provider, setProvider, connectors, accessChoices, available, selectedConnectorIds, busy, error, launch]);
}
