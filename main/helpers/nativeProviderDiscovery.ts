import { AGENT_DEFINITIONS } from "@main/agentCatalog";
import { ACP_AGENT_LAUNCH } from "@main/providers/acp/agents";
import { findExecutableOnPath, findExistingPath, resolveExecutablePathCandidates } from "@main/processLookup";
import { ACP_PROVIDER_KINDS } from "@shared/providers/providerKinds";
import type { NativeInstance } from "@main/types/execution/localHost.types";
import type { NativeProviderDiscovery } from "@main/types/native-runtime/providerDiscovery.types";
import type { AgentExecutablePathCandidate } from "@main/types/internal.types";
import type { AcpProviderKind } from "@shared/types/provider/providerKind.types";

const isWindows = process.platform === "win32";

/** On Windows, CLI shims are usually `.cmd`/`.exe`; try those before the bare name. */
function platformAliases(aliases: readonly string[]): string[] {
  if (!isWindows) return [...aliases];
  return aliases.flatMap((alias) => /\.(exe|cmd|bat)$/i.test(alias) ? [alias] : [`${alias}.exe`, `${alias}.cmd`, alias]);
}

async function findExecutable(aliases: readonly string[], candidates: readonly AgentExecutablePathCandidate[] = []): Promise<string | null> {
  return await findExistingPath(resolveExecutablePathCandidates([...candidates])) ?? await findExecutableOnPath(platformAliases(aliases), isWindows);
}

async function discoverAcpAgent(kind: AcpProviderKind, environment: NodeJS.ProcessEnv): Promise<NativeProviderDiscovery | null> {
  const definition = AGENT_DEFINITIONS.find((entry) => entry.id === kind);
  if (!definition) return null;
  const launch = ACP_AGENT_LAUNCH[kind];
  // Separate ACP adapters (e.g. `pi-acp`) are their own executables; otherwise the agent's CLI serves ACP itself.
  const executable = launch.executables
    ? await findExecutable(launch.executables)
    : await findExecutable(definition.aliases, definition.executablePathCandidates);
  if (!executable) return null;
  return {
    instance: { kind: "acp", options: { kind, instanceId: "local", label: definition.label, executable, args: launch.args,
      environment: { ...environment, ...launch.env } } },
    provider: { kind, instanceId: "local", label: definition.label }
  };
}

/** Finds every installed runtime provider: the native Codex and Claude runtimes plus installed ACP agents. */
export async function discoverNativeProviders(environment: NodeJS.ProcessEnv): Promise<NativeProviderDiscovery[]> {
  const [codex, claude, ...acp] = await Promise.all([
    findExecutable(["codex"]),
    findExecutable(["claude"]),
    ...ACP_PROVIDER_KINDS.map((kind) => discoverAcpAgent(kind, environment))
  ]);
  const discovered: NativeProviderDiscovery[] = [];
  if (codex) {
    const instance: NativeInstance = { kind: "codex", options: { instanceId: "local", executable: codex, arguments: ["app-server", "--listen", "stdio://"], environment,
      policies: { "read-only": { approvalPolicy: "on-request", sandbox: "read-only" }, "workspace-write": { approvalPolicy: "on-request", sandbox: "workspace-write" } } } };
    discovered.push({ instance, provider: { kind: "codex", instanceId: "local", label: "Codex" } });
  }
  if (claude) {
    const instance: NativeInstance = { kind: "claude", instanceId: "local", runtime: { executablePath: claude, environment },
      policies: { default: "default", auto: "auto", "accept-edits": "acceptEdits", plan: "plan" } };
    discovered.push({ instance, provider: { kind: "claude", instanceId: "local", label: "Claude" } });
  }
  return [...discovered, ...acp.filter((entry): entry is NativeProviderDiscovery => entry !== null)];
}
