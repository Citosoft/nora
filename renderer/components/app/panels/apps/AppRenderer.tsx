import { useMemo } from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { JsonValue } from "@main/jsonValue";
import { AppRuntimeContext } from "@/components/app/context/appRuntimeContext";
import { AppPanelLayoutContext } from "@/components/app/context/appPanelLayoutContext";
import { useAppPanelLayoutState } from "@/components/app/hooks/useAppPanelLayoutState";
import { panelLayoutRenderSpec } from "@/components/app/logic/apps/panelLayout";
import { propJson, propText } from "@/components/app/logic/apps/propText";
import type { AppRendererProps } from "@/components/app/types/apps.types";
import { appRegistry } from "./appRegistry";
import { ConfirmActionSheet } from "./ConfirmActionSheet";
import { ActionOutcomeToast } from "./ActionOutcomeToast";

/**
 * Mounts an app's UI over its runtime: the json-render store holds the shaped rows main sends, and the two catalog actions route to
 * the runtime, which confirms writes and refreshes sources.
 */
export function AppRenderer({ runtime }: AppRendererProps) {
  const { store, runAction, refresh } = runtime;
  const layout = useAppPanelLayoutState(runtime);
  const ui = runtime.app?.spec.ui;
  const renderSpec = useMemo(() => ui ? panelLayoutRenderSpec(ui) : null, [ui]);
  const handlers = useMemo(() => ({
    runAction: (params: Record<string, unknown>) => {
      // Inside a repeat, `{ "$item": "" }` resolves to the row's state path; a Table or List passes the row itself.
      const item = typeof params.item === "string" && params.item.startsWith("/") ? store.get(params.item) : params.item;
      runAction(propText(params.actionId), propJson(item) as JsonValue | undefined);
    },
    refresh: (params: Record<string, unknown>) => { refresh(Array.isArray(params.sourceIds) ? params.sourceIds.filter((entry): entry is string => typeof entry === "string") : undefined); }
  }), [store, runAction, refresh]);
  return <AppRuntimeContext.Provider value={runtime}>
    <AppPanelLayoutContext.Provider value={layout}>
      {layout.message && <p role="status" className="mb-2 text-xs text-muted-foreground">{layout.message}</p>}
      {layout.error && <p role="alert" className="mb-2 text-xs text-destructive">{layout.error}</p>}
      <JSONUIProvider registry={appRegistry} store={store} handlers={handlers}>
        <Renderer spec={renderSpec} registry={appRegistry} />
      </JSONUIProvider>
    </AppPanelLayoutContext.Provider>
    {runtime.pending && <ConfirmActionSheet pending={runtime.pending} onConfirm={runtime.confirmPending} onCancel={runtime.cancelPending} />}
    {runtime.outcome && <ActionOutcomeToast outcome={runtime.outcome} onDismiss={runtime.dismissOutcome} />}
  </AppRuntimeContext.Provider>;
}
