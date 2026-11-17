import { useCallback, useEffect, useMemo, useState } from "react";
import { connectorClient } from "@/components/app/clients/connectorClient";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { ConnectorRequest } from "@shared/ipc/types/connectorGateway.types";
import type { NoraConnectorAction, NoraConnectors, NoraConnectorsClient } from "@/components/app/types/noraConnectors.types";

const errorText = (error: unknown, fallback: string): string => error instanceof Error && error.message ? error.message : fallback;
const withEntry = <T,>(map: ReadonlyMap<string, T>, id: string, value: T | undefined): ReadonlyMap<string, T> => {
  const next = new Map(map);
  if (value === undefined) next.delete(id); else next.set(id, value);
  return next;
};

/**
 * Connectors added in Nora: the stored list, kept current by main's change notifications, plus per-connector pending actions and
 * failures. Replies and notifications both carry the whole list, so whichever arrives last is the truth.
 */
export function useNoraConnectors(client: NoraConnectorsClient = connectorClient): NoraConnectors {
  const [connectors, setConnectors] = useState<readonly Connector[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlyMap<string, NoraConnectorAction>>(() => new Map());
  const [failures, setFailures] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    let active = true;
    const unsubscribe = client.onChanged((next) => { if (active) setConnectors(next); });
    client.request({ kind: "list" }).then((next) => { if (active) { setConnectors(next); setLoadError(null); } },
      (error: unknown) => { if (active) setLoadError(errorText(error, "Connectors could not be loaded.")); });
    return () => { active = false; unsubscribe(); };
  }, [client]);

  const run = useCallback((id: string, action: NoraConnectorAction, request: ConnectorRequest) => {
    setPending((map) => withEntry(map, id, action));
    setFailures((map) => withEntry(map, id, undefined));
    client.request(request).then(setConnectors, (error: unknown) => setFailures((map) => withEntry(map, id, errorText(error, "That did not work. Try again."))))
      .finally(() => setPending((map) => withEntry(map, id, undefined)));
  }, [client]);

  const create = useCallback(async (input: Parameters<NoraConnectors["create"]>[0]) => {
    setConnectors(await client.request({ kind: "create", connector: input }));
  }, [client]);

  const setAccess = useCallback(async (id: string, access: Parameters<NoraConnectors["setAccess"]>[1]) => {
    setConnectors(await client.request({ kind: "set-access", id, access }));
  }, [client]);

  return useMemo<NoraConnectors>(() => ({ connectors, loadError, create, setAccess,
    pending: (id) => pending.get(id), failure: (id) => failures.get(id),
    signIn: (id) => run(id, "sign-in", { kind: "sign-in", id }),
    signOut: (id) => run(id, "sign-out", { kind: "sign-out", id }),
    setEnabled: (id, enabled) => run(id, "set-enabled", { kind: "set-enabled", id, enabled }),
    remove: (id) => run(id, "remove", { kind: "remove", id }),
    refresh: (id) => {
      if (id) { run(id, "refresh", { kind: "refresh", id }); return; }
      client.request({ kind: "refresh" }).then(setConnectors, (error: unknown) => setLoadError(errorText(error, "Connectors could not be refreshed.")));
    } }), [client, connectors, create, failures, loadError, pending, run, setAccess]);
}
