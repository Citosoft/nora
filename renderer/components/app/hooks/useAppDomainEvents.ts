import { noraAppClient } from "@/components/app/clients/noraAppClient";
import type { AppDomainEvent } from "@shared/appTypes";
import { useEffect } from "react";

/**
 * Subscribe to incremental domain events from the main process (same cadence as snapshot / delta).
 * Fold batches with `applyAppDomainEvents` starting from `useAppDomainState()` when building local stores.
 * Prefer `useCallback` for `handler` to avoid resubscribing every render.
 */
export function useAppDomainEvents(handler: (events: AppDomainEvent[]) => void): void {
  useEffect(() => noraAppClient.onDomainEvents(handler), [handler]);
}
