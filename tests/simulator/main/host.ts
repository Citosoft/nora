import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ExecutionHost } from "@main/execution/host";
import { SqliteExecutionStore } from "@main/execution/sqliteStore";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { SimulatorProvider } from "./provider";
import { createSimulatorCheckpoints } from "./checkpoints";
export { registerConversationIpc } from "@main/ipc/registerConversationIpc";

/** Production engine, queue, persistence and IPC; only the provider and workspace are simulated. */
export function createSimulatorHost(directory: string, speed = 1) {
  const environmentId = "chat-simulator";
  // Scripted tools never write a checkout; pending scenarios can safely share this workspace.
  const workspace = { environmentId, projectId: "simulator", checkoutId: "simulator", path: directory, branch: "simulated", access: "read" as const, versionControl: "none" as const };
  const boot: NativeBoot = { environmentId, cursor: 0, personalization: { defaultRole: { id: "general" }, workspaceRoles: {} },
    providers: [{ kind: "codex", instanceId: "simulator", label: "Simulator · no LLM" }],
    workspaces: [{ id: "simulator", name: "Chat simulator", kind: "personal", workspace }] };
  const providers = new ProviderRegistry(); providers.register(new SimulatorProvider(speed));
  const store = new SqliteExecutionStore(join(directory, "simulator.sqlite"), environmentId);
  const verify = async (selection: WorkspaceRef): Promise<void> => {
    if (selection.environmentId !== environmentId || selection.path !== directory) throw new Error("Only the isolated simulator workspace is available");
  };
  const host = new ExecutionHost({ store, providers, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => false,
    now: () => new Date().toISOString(), nextId: randomUUID, shutdownGraceMs: 500,
    workspaces: { async prepare(selection) { await verify(selection); return selection; }, verify },
    reviewer: async () => ({ status: "ready", scope: "workspace", paths: [] }),
    checkpoints: createSimulatorCheckpoints(),
    onFailure: (failure) => { process.stderr.write(`Simulator: ${failure.message}\n`); } });
  host.start();
  return { host, boot };
}
