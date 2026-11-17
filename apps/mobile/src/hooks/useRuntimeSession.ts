import { useEffect, useSyncExternalStore } from "react";
import type { RuntimeSession, RuntimeSessionLookup, RuntimeSessionSnapshot } from "@/types/runtimeSession.types";
import { useRemoteAccess } from "./useRemoteAccess";
import { useRuntimeDirectory } from "./useRuntimeDirectory";

const idleSnapshot: RuntimeSessionSnapshot = { info: { status: "loading" }, compatibility: null, connection: { kind: "idle" }, liveUpdates: false };
const noSubscription = (): (() => void) => () => undefined;

/** The connected session for a runtime route parameter, started on first use and shared across screens. */
export function useRuntimeSession(runtimeId: string): RuntimeSessionLookup {
  const services = useRemoteAccess();
  const directory = useRuntimeDirectory();
  const entry = directory.find(runtimeId);
  const session: RuntimeSession | null = entry ? services.sessions.get(entry) : null;

  useEffect(() => {
    session?.start();
  }, [session]);

  const snapshot = useSyncExternalStore(session?.subscribe ?? noSubscription, session?.getSnapshot ?? (() => idleSnapshot),
    session?.getSnapshot ?? (() => idleSnapshot));

  if (session && entry) return { status: "ready", session, snapshot, name: entry.name };
  if (directory.state.status === "loading") return { status: "loading" };
  return { status: "not-found", message: directory.state.status === "error" ? directory.state.message : "This computer is no longer linked to your account." };
}
