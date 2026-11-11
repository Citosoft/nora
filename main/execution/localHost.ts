import { createClaudeMcpReader } from "@main/providers/claude/mcp";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type { LocalHostOptions } from "@main/types/execution/localHost.types";
import { ClaudeAdapter } from "@main/providers/claude/adapter";
import { createClaudeOpener } from "@main/providers/claude/sdkBridge";
import { createClaudeDiscovery } from "@main/providers/claude/discovery";
import { CodexAdapter } from "@main/providers/codex/adapter";
import { ExecutionHost } from "./host";
import { LocalWorkspaceAuthority } from "./localWorkspace";
import { createCheckoutInspector } from "./workspaceGit";
import { ProviderRegistry } from "./providerRegistry";
import { SqliteExecutionStore } from "./sqliteStore";
import { isProcessAlive } from "./ownership";
import { createGitReviewer } from "./reviewGit";
import { createGitCheckpoints } from "./checkpoints/gitService";

/** Composition for a filesystem owner. Bootstrap wiring belongs to the complete replacement of managed execution. */
export async function openLocalHost(options: LocalHostOptions): Promise<ExecutionHost> {
  if (!isAbsolute(options.databasePath)) throw new Error("Execution storage must have an absolute environment-owned path");
  await mkdir(dirname(options.databasePath), { recursive: true, mode: 0o700 });
  const store = new SqliteExecutionStore(options.databasePath, options.environmentId);
  const providers = new ProviderRegistry();
  const now = (): string => new Date().toISOString();
  try {
    for (const instance of options.instances) {
      switch (instance.kind) {
        case "codex": providers.register(new CodexAdapter({ ...instance.options, now })); break;
        case "claude": providers.register(new ClaudeAdapter({ instanceId: instance.instanceId, policies: instance.policies,
          open: createClaudeOpener(instance.runtime), discover: createClaudeDiscovery(instance.runtime), readMcp: createClaudeMcpReader(instance.runtime), now, nextId: randomUUID })); break;
      }
    }
    const workspaces = new LocalWorkspaceAuthority({ environmentId: options.environmentId, registrations: options.registrations,
      inspectCheckout: createCheckoutInspector(options.gitExecutable) });
    const host = new ExecutionHost({ store, providers, workspaces, reviewer: createGitReviewer(options.gitExecutable, workspaces),
      roleForWorkspace: options.roleForWorkspace, generateThreadName: options.generateThreadName,
      checkpoints: createGitCheckpoints(options.gitExecutable, workspaces, now,
        [options.databasePath, `${options.databasePath}-wal`, `${options.databasePath}-shm`]),
      owner: { id: randomUUID(), processId: process.pid },
      isProcessAlive, now, nextId: randomUUID, onFailure: options.onFailure,
      effectConcurrency: options.effectConcurrency, shutdownGraceMs: options.shutdownGraceMs });
    host.start();
    return host;
  } catch (error) { await providers.close().catch(() => {}); store.close(); throw error; }
}
