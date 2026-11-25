import { CONNECTOR_OAUTH_CALLBACK_PORT, isAllowedConnectorUrl } from "@shared/connectors/contracts";
import { availableConnectors, CONNECTOR_ACCESS_ALL, connectorSelectedFor } from "@shared/connectors/access";
import type { Connector, ConnectorInput, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { ConnectorRuntimeState, ConnectorService, ConnectorServiceOptions, StoredConnector } from "@main/types/connectors/connectors.types";
import { createConnectorCredentials } from "./credentials";
import { createConnectorGateway } from "./gateway";
import { ConnectorOAuthClient } from "./oauthClient";
import { openOAuthCallback } from "./oauthCallback";
import { probeConnector } from "./probe";
import { createConnectorToolClient } from "./toolClient";
import { ConnectorToolError } from "./toolError";
import { authorizeConnector } from "./authorize";
import { connectorConnectionError } from "./connectionError";
import { createConnectorNetwork } from "./network";
import { uniqueServerName } from "./serverName";

/** Browser sign-in waits on the user; give up after this so an abandoned sign-in releases its callback port. */
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;
const CHECKING: ConnectorRuntimeState = { status: "checking", tools: [] };
const DISABLED: ConnectorRuntimeState = { status: "disabled", tools: [] };
const NEEDS_AUTH: ConnectorRuntimeState = { status: "needs-auth", tools: [], message: "Sign in to let threads use this connector." };
const errorText = (error: unknown): string => error instanceof Error && error.message ? error.message : "Unknown error";

/**
 * Connectors added directly in Nora: remote MCP servers Nora signs in to itself and hands to every provider thread through its
 * gateway. Status comes from Nora connecting to each server, re-checked on change, refresh and when the gateway sees a rejection.
 */
export function createConnectorService(options: ConnectorServiceOptions): ConnectorService {
  const { store } = options;
  const network = options.fetch ? null : createConnectorNetwork();
  const fetchFn = options.fetch ?? network?.fetch;
  const credentials = createConnectorCredentials({ store, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const states = new Map<string, ConnectorRuntimeState>();
  const checks = new Map<string, number>();
  const signIns = new Map<string, AbortController>();

  const view = (connector: StoredConnector): Connector => {
    const state = connector.enabled ? states.get(connector.id) ?? CHECKING : DISABLED;
    return { id: connector.id, name: connector.name, serverName: connector.serverName, url: connector.url, enabled: connector.enabled,
      auth: connector.auth.kind === "header" ? { kind: "header", name: connector.auth.name }
        : { kind: "oauth", customClient: !!connector.auth.clientId, signedIn: !!store.secrets(connector.id).tokens },
      access: connector.access, status: state.status, tools: state.tools, ...(state.logo ? { logo: state.logo } : {}), ...(state.message ? { message: state.message } : {}) };
  };
  const list = (): Connector[] => store.list().map(view);
  const publish = (): void => options.onChanged(list());
  const setState = (id: string, state: ConnectorRuntimeState): void => {
    states.set(id, state);
    if (state.status === "connected") options.authPrompts?.signedIn(id);
    publish();
  };
  const existing = (id: string): StoredConnector => {
    const connector = store.get(id);
    if (!connector) throw new Error("This connector no longer exists.");
    return connector;
  };

  /** Only the latest check of a connector records its result, so a slow earlier one never overwrites a newer status. */
  async function check(id: string): Promise<void> {
    const connector = store.get(id);
    if (!connector?.enabled) return;
    const sequence = (checks.get(id) ?? 0) + 1;
    checks.set(id, sequence);
    setState(id, CHECKING);
    const probe = await probeConnector(connector, credentials, fetchFn).catch((error: unknown): ConnectorRuntimeState => {
      console.error(`Connector ${connector.name} could not be checked`, error);
      return { status: "failed", tools: [], message: "Nora could not check this connector. Refresh to try again." };
    });
    if (checks.get(id) === sequence && store.get(id)?.enabled) setState(id, probe);
  }
  const checkInBackground = (id: string): void => { void check(id); };

  const needsAuth = (id: string): void => { if (states.get(id)?.status !== "needs-auth") setState(id, NEEDS_AUTH); };
  const toolClient = createConnectorToolClient({ store, credentials, onNeedsAuth: needsAuth, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const forgetSession = (id: string): void => { void toolClient.forget(id); };
  const gateway = createConnectorGateway({ store, credentials, ...(fetchFn ? { fetch: fetchFn } : {}),
    onNeedsAuth: needsAuth, logoFor: (id) => states.get(id)?.logo,
    ...(options.authPrompts ? { authPrompts: options.authPrompts } : {}) });
  /**
   * OAuth connectors that still need sign-in stay attachable so a tool call can open the authorize card; header connectors
   * without credentials cannot be fixed interactively mid-turn and stay out.
   */
  const attachable = (connector: StoredConnector): boolean => {
    if (!connector.enabled) return false;
    const status = states.get(connector.id)?.status ?? "checking";
    if (status === "failed" || status === "disabled") return false;
    if (status === "needs-auth") return connector.auth.kind === "oauth";
    return true;
  };
  const selectionFor = (subject: ConnectorSubject): readonly string[] | undefined => subject.botId ? options.connectorIdsForBot?.(subject) : undefined;
  const availableFor = (connector: StoredConnector, subject: ConnectorSubject): boolean => connectorSelectedFor(connector, subject, selectionFor(subject));
  const usableFor = (subject: ConnectorSubject, only?: readonly string[]): StoredConnector[] =>
    store.list().filter((connector) => attachable(connector) && availableFor(connector, subject) && (!only || only.includes(connector.id)));

  for (const connector of store.list()) if (connector.enabled) checkInBackground(connector.id);

  async function runSignIn(connector: StoredConnector, signal: AbortSignal): Promise<void> {
    const callback = await openOAuthCallback(options.callbackPort ?? CONNECTOR_OAUTH_CALLBACK_PORT);
    try {
      const client = new ConnectorOAuthClient(store, connector, { redirectUrl: callback.redirectUrl,
        openAuthorization: async (url) => {
          if (!isAllowedConnectorUrl(url.href)) throw new Error("The server's sign-in page is not a secure address.");
          await options.openExternal(url.href);
        } });
      // Listen before the browser opens: the redirect can return before auth() does.
      const waiting = new AbortController();
      const stop = () => waiting.abort(signal.reason);
      signal.addEventListener("abort", stop, { once: true });
      const code = callback.waitForCode(client.state(), waiting.signal);
      code.catch(() => undefined);
      try {
        await authorizeConnector(connector.url, client, code, signal, fetchFn);
      } finally {
        signal.removeEventListener("abort", stop);
        waiting.abort(new Error("The sign-in finished."));
      }
    } finally {
      await callback.close();
    }
  }

  return {
    list,
    async create(input: ConnectorInput) {
      const connector: StoredConnector = { id: options.nextId(), name: input.name, url: input.url, enabled: true,
        serverName: uniqueServerName(input.name, new Set(store.list().map((entry) => entry.serverName))),
        auth: input.auth.kind === "header" ? { kind: "header", name: input.auth.name }
          : { kind: "oauth", ...(input.auth.clientId ? { clientId: input.auth.clientId } : {}) },
        access: input.access ?? CONNECTOR_ACCESS_ALL };
      store.add(connector, input.auth.kind === "header" ? { headerValue: input.auth.value }
        : input.auth.clientSecret ? { clientSecret: input.auth.clientSecret } : {});
      checkInBackground(connector.id);
      return list();
    },
    async setEnabled(id, enabled) {
      existing(id);
      store.update(id, { enabled });
      if (enabled) checkInBackground(id); else { forgetSession(id); checks.set(id, (checks.get(id) ?? 0) + 1); states.delete(id); publish(); }
      return list();
    },
    async setAccess(id, access) {
      existing(id);
      store.update(id, { access });
      publish();
      return list();
    },
    async remove(id) {
      signIns.get(id)?.abort(new Error("The connector was removed."));
      forgetSession(id);
      store.remove(id);
      states.delete(id); checks.delete(id);
      publish();
      return list();
    },
    async signIn(id) {
      const connector = existing(id);
      if (connector.auth.kind !== "oauth") throw new Error("This connector uses a fixed header and has no sign-in.");
      signIns.get(id)?.abort(new Error("A newer sign-in replaced this one."));
      const controller = new AbortController();
      signIns.set(id, controller);
      const timer = setTimeout(() => controller.abort(new Error("The sign-in timed out.")), SIGN_IN_TIMEOUT_MS);
      // An explicit sign-in always starts fresh, so the browser opens even when old tokens are still stored.
      store.updateSecrets(id, { tokens: undefined, discovery: undefined });
      try {
        await runSignIn(connector, controller.signal);
        store.updateSecrets(id, { requiresSignIn: undefined });
      }
      catch (error) {
        const message = `Sign-in to ${connector.name} did not complete: ${connectorConnectionError(error, connector.url) ?? errorText(error)}`;
        if (store.get(id)) setState(id, { ...NEEDS_AUTH, message });
        throw new Error(message);
      } finally {
        clearTimeout(timer);
        if (signIns.get(id) === controller) signIns.delete(id);
      }
      await check(id);
      options.authPrompts?.signedIn(id);
      return list();
    },
    async signOut(id) {
      const connector = existing(id);
      signIns.get(id)?.abort(new Error("Signed out."));
      credentials.requireSignIn(connector);
      forgetSession(id);
      checks.set(id, (checks.get(id) ?? 0) + 1);
      setState(id, NEEDS_AUTH);
      return list();
    },
    async refresh(id) {
      const targets = id ? [existing(id)] : store.list().filter((connector) => connector.enabled);
      await Promise.all(targets.map((connector) => check(connector.id)));
      return list();
    },
    endpoints: (subject, only, conversationIds) => Promise.all(usableFor(subject, only).map((connector) => gateway.endpoint(connector, conversationIds))),
    activeCount: (subject, only) => usableFor(subject, only).length,
    tools: {
      call(connectorId, tool, args, subject) {
        const connector = store.get(connectorId);
        if (!connector?.enabled || !availableFor(connector, subject)) return Promise.reject(new ConnectorToolError("unavailable", "This connector is not available here."));
        return toolClient.callTool(connectorId, tool, args);
      },
      available: (subject) => availableConnectors(store.list(), subject, selectionFor(subject)).map(view)
    },
    async close() {
      for (const controller of signIns.values()) controller.abort(new Error("Nora is closing."));
      await Promise.all([gateway.close(), toolClient.close()]);
      await network?.close();
    }
  };
}
