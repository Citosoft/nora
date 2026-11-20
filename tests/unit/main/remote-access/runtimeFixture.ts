import type { TestContext } from "node:test";
import { fixture } from "../execution/fixture";
import { ExecutionCommandError } from "@main/execution/errors";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import type { RuntimeApiOptions, RemoteExecutionHost } from "@main/types/remote-access/http/runtime.types";
import type { RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import { createRuntimeApi } from "@main/remote-access/http/handler";

export function runtimeFixture(t: TestContext) {
  const execution = fixture(t);
  let enabled = true;
  let now = Date.parse("2026-11-16T10:00:00Z");
  const audit: RemoteAuditEntry[] = [];
  const workspace = { projectId: "project", environmentId: "local", checkoutId: "checkout", path: "/test/project", branch: "main", access: "write" as const };
  const boot: NativeBoot = { environmentId: "local", cursor: 0, personalization: structuredClone(DEFAULT_APP_SETTINGS.personalization),
    workspaces: [{ id: "project", name: "Project", kind: "repository", workspace }], providers: [{ kind: "codex", instanceId: "account-a", label: "Codex", reportsMcp: true }],
    sharedBots: [], noraTools: { status: "idle", tools: [] } };
  const host: RemoteExecutionHost = {
    environmentId: "local", execute: async (command) => execution.command(command), header: (id) => execution.store.header(id),
    summaries: (projectId) => execution.store.summaries(projectId), conversationHistory: (query) => execution.store.history(query),
    eventCursor: () => execution.store.cursor(), subscribe: (input) => execution.engine.subscribe(input),
    history(conversationId, after, limit = 100) {
      if (after > execution.store.cursor()) throw new ExecutionCommandError("cursor", "Hydrate a new snapshot before replay");
      const events = execution.store.events(after, limit, conversationId);
      return { schemaVersion: 1, after, nextCursor: events.at(-1)?.cursor ?? after, events };
    },
    async catalog() { return { status: "available", catalog: { kind: "codex", instanceId: "account-a", authentication: "present",
      capabilities: { resume: true, interrupt: true, steering: false, approvals: true, questions: true, reasoning: false, attachments: false, turnChanges: false, subagentDetails: false, subagentModel: true },
      models: [{ id: "test-model", name: "Test", description: "", reasoningEfforts: [], defaultReasoningEffort: null }],
      policies: [{ id: "native-default", label: "Default" }, { id: "dangerous", label: "Unrestricted" }] } }; }
  };
  const options: RuntimeApiOptions = { host, inbox: { snapshot: () => ({ items: [] }), execute: () => ({ items: [] }) }, boot: () => boot, name: () => "My Nora", runtimeVersion: "0.2.2", environment: "desktop", origins: ["https://app.withnora.run"],
    verifier: { async verify(token) { if (token === "invalid.token.signature") throw new Error("Bad signature"); return { userId: token === "other.token.signature" ? "other" : "owner", sessionId: "session", expiresAt: now + 60_000 }; } },
    permits: (identity) => enabled && identity.userId === "owner", record: (entry) => audit.push(entry), now: () => now };
  const api = createRuntimeApi(options);
  const request = (path: string, body?: object, headers: Record<string, string> = {}): Promise<Response> => api.handle(new Request(`https://runtime.remote.withnora.run${path}`, {
    method: body ? "POST" : "GET", headers: { Authorization: "Bearer owner.token.signature", Origin: "https://app.withnora.run", ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {})
  }));
  return { execution, api, options, boot, audit, request, disable() { enabled = false; }, setTime(value: number) { now = value; } };
}
