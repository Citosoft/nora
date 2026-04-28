import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { StatusBarEntry } from "@/components/app/types";
import type { AppToast } from "@/components/app/types/appToast.types";
import { useCallback, useMemo, useRef, useState } from "react";

export function useAppRootShellFrame(): {
  statusBar: StatusBarContextValue;
  statusEntries: StatusBarEntry[];
  flashStatus: (message: string, durationMs?: number) => void;
  toasts: AppToast[];
  showToast: (toast: Omit<AppToast, "id">) => void;
  dismissToast: (toastId: number) => void;
} {
  const [statusEntries, setStatusEntries] = useState<StatusBarEntry[]>([]);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const statusIdRef = useRef(0);
  const toastIdRef = useRef(0);

  const statusBar = useMemo<StatusBarContextValue>(() => ({
    beginStatus: (message: string, loading = false) => {
      const id = ++statusIdRef.current;
      setStatusEntries((current) => [...current, { id, message, loading }]);
      return id;
    },
    endStatus: (id: number) => {
      setStatusEntries((current) => current.filter((entry) => entry.id !== id));
    }
  }), []);

  const flashStatus = useCallback((message: string, durationMs = 2_500): void => {
    const statusId = statusBar.beginStatus(message, false);
    window.setTimeout(() => {
      statusBar.endStatus(statusId);
    }, durationMs);
  }, [statusBar]);

  const showToast = useCallback((toast: Omit<AppToast, "id">): void => {
    const nextId = ++toastIdRef.current;
    console.log("[nora renderer] toast show", {
      id: nextId,
      title: toast.title,
      description: toast.description ?? null,
      variant: toast.variant
    });
    setToasts((current) => [...current, { ...toast, id: nextId }]);
  }, []);

  const dismissToast = useCallback((toastId: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  return {
    statusBar,
    statusEntries,
    flashStatus,
    toasts,
    showToast,
    dismissToast
  };
}
