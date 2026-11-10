import { materializeLegacyContext } from "@/components/app/logic/thread-workspace/legacyContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import { nativeConversationBridge, nativePersonalizationClient } from "@/components/app/clients/nativeRuntimeClient";
import { createConversationClient } from "@/components/app/clients/createConversationClient";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createThreadLayoutPersistence } from "@/components/app/logic/thread-workspace/persistence";
import { RoleOnboarding } from "@/components/app/panels/personalization/RoleOnboarding";
import { ThreadWorkspaceComposition } from "./ThreadWorkspaceComposition";
import { SetupWindowShell } from "./SetupWindowShell";
import type { NativeBoot, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeRuntimeProviderProps, NativeRuntimePorts, ThreadLaunchInput } from "@/components/app/types/thread-workspace/runtime.types";

/** Installs the native owner inside Nora's existing application, without rendering another shell. */
export function NativeRuntimeProvider({ children }: NativeRuntimeProviderProps) {
  const [boot, setBoot] = useState<NativeBoot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useCallback(async (input: PersonalizationRequest): Promise<NativeBoot> => {
    const next = await nativePersonalizationClient.request(input); setBoot(next); return next;
  }, []);
  const reload = useCallback(() => { setError(null); void request({ kind: "boot" }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Nora could not connect to its execution host.")); }, [request]);
  useEffect(reload, [reload]);
  const environmentId = boot?.environmentId;
  const store = useMemo(() => environmentId ? createThreadWorkspaceStore({ boot: { environmentId, cursor: 0, providers: [], workspaces: [],
    personalization: { defaultRole: null, workspaceRoles: {} } }, client: createConversationClient(nativeConversationBridge, environmentId),
    persistence: createThreadLayoutPersistence(localStorage, environmentId), nextId: () => crypto.randomUUID(), now: () => new Date().toISOString() }) : null, [environmentId]);
  useEffect(() => { if (store && boot) store.updateBoot(boot); }, [store, boot]);
  const launch = useCallback(async (input: ThreadLaunchInput = {}): Promise<string | null> => {
    if (!store) return null;
    const next = input.projectId ? await request({ kind: "register-workspace", projectId: input.projectId }) : await request({ kind: "boot" });
    store.updateBoot(next);
    const workspace = input.projectId ? next.workspaces.find((entry) => entry.shellProjectId === input.projectId)
      : next.workspaces.find((entry) => entry.id === store.snapshot().layout.focusedWorkspaceId) ?? next.workspaces.find((entry) => entry.kind === "personal");
    if (!workspace) throw new Error("Choose an available workspace on the owning execution host.");
    const context = input.contextSelections?.length ? await materializeLegacyContext(input.contextSelections) : "";
    const text = [input.text, context].filter(Boolean).join("\n\n");
    return store.openDraft({ source: input.source, workspaceId: workspace.id, ...(text ? { text } : {}) });
  }, [store, request]);
  const ports = useMemo<NativeRuntimePorts | null>(() => store && boot ? { store, boot, request, launch } : null, [store, boot, request, launch]);
  if (!boot || !ports) return <SetupWindowShell><div role={error ? "alert" : "status"} className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-sm"><p>{error ?? "Opening Nora…"}</p>{error && <Button onClick={reload}>Reconnect</Button>}</div></SetupWindowShell>;
  if (!boot.personalization.defaultRole) return <SetupWindowShell><RoleOnboarding busy={busy} error={error} onComplete={async (role) => {
    if (busy) return; setBusy(true); setError(null);
    try { await request({ kind: "onboard", role }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Setup could not be saved. Try again."); }
    finally { setBusy(false); }
  }} /></SetupWindowShell>;
  return <NativeRuntimeContext.Provider value={ports}><ThreadWorkspaceComposition store={ports.store}>{children}</ThreadWorkspaceComposition></NativeRuntimeContext.Provider>;
}
