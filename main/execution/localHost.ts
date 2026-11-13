import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { createThreadReferenceWriter } from "./thread-references/writeSnapshot";
import type { LocalHostOptions } from "@main/types/execution/localHost.types";
import { ExecutionHost } from "./host";
import { createExecutionProvider } from "./providerFactory";
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
    for (const instance of options.instances) providers.register(createExecutionProvider(instance, { now, preferences: options.threadPreferences,
      toolOutputDirectory: join(dirname(options.databasePath), "tool-outputs"), runContext: options.runContext }));
    const workspaces = new LocalWorkspaceAuthority({ environmentId: options.environmentId, registrations: options.registrations,
      inspectCheckout: createCheckoutInspector(options.gitExecutable) });
    const host = new ExecutionHost({ store, providers, workspaces, reviewer: createGitReviewer(options.gitExecutable, workspaces),
      writeThreadReference: createThreadReferenceWriter(join(dirname(options.databasePath), "thread-references")),
      roleForWorkspace: options.roleForWorkspace, botForWorkspace: options.botForWorkspace, generateThreadName: options.generateThreadName, idleCompactionMode: options.idleCompactionMode,
      threadPreferences: options.threadPreferences,
      checkpoints: createGitCheckpoints(options.gitExecutable, workspaces, now,
        [options.databasePath, `${options.databasePath}-wal`, `${options.databasePath}-shm`]),
      owner: { id: randomUUID(), processId: process.pid },
      isProcessAlive, now, nextId: randomUUID, onFailure: options.onFailure,
      effectConcurrency: options.effectConcurrency, shutdownGraceMs: options.shutdownGraceMs });
    host.start();
    return host;
  } catch (error) { await providers.close().catch(() => {}); store.close(); throw error; }
}
