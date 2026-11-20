import { useCallback, useMemo, useRef, useState } from "react";
import type { AppPanelMove } from "@shared/types/apps/panelLayout.types";
import type { AppRuntime } from "@/components/app/types/apps.types";
import type { AppPanelLayoutState } from "@/components/app/types/appPanelLayout.types";

export function useAppPanelLayoutState(runtime: AppRuntime): AppPanelLayoutState {
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const movePanel = runtime.movePanel;
  const move = useCallback((input: AppPanelMove): void => {
    setDragging(null);
    if (savingRef.current || input.panelId === input.targetId) return;
    savingRef.current = true;
    setSaving(true); setError(null); setMessage("Saving layout…");
    void movePanel(input).then(() => setMessage("Layout saved."), (cause: unknown) => {
      setMessage(null);
      setError(cause instanceof Error ? cause.message : "The layout could not be saved. Try moving the panel again.");
    }).finally(() => { savingRef.current = false; setSaving(false); });
  }, [movePanel]);
  return useMemo(() => ({ ui: runtime.app?.spec.ui ?? null, dragging, saving, message, error, setDragging, move }),
    [runtime.app?.spec.ui, dragging, saving, message, error, move]);
}
