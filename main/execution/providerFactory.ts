import { randomUUID } from "node:crypto";
import { AcpAdapter } from "@main/providers/acp/adapter";
import { createClaudeAccount } from "@main/providers/claude/account";
import { ClaudeAdapter } from "@main/providers/claude/adapter";
import { createClaudeDiscovery } from "@main/providers/claude/discovery";
import { createClaudeMcpReader } from "@main/providers/claude/mcp";
import { createClaudeOpener } from "@main/providers/claude/sdkBridge";
import { CodexAdapter } from "@main/providers/codex/adapter";
import type { NativeInstance } from "@main/types/execution/localHost.types";
import type { ExecutionProvider } from "@main/types/execution/provider.types";

/** Builds the adapter for a discovered runtime; constructing one does not start its process. */
export function createExecutionProvider(instance: NativeInstance, now: () => string): ExecutionProvider {
  switch (instance.kind) {
    case "codex": return new CodexAdapter({ ...instance.options, now });
    case "claude": return new ClaudeAdapter({ instanceId: instance.instanceId, policies: instance.policies,
      open: createClaudeOpener(instance.runtime), discover: createClaudeDiscovery(instance.runtime), readMcp: createClaudeMcpReader(instance.runtime),
      account: createClaudeAccount(instance.runtime), now, nextId: randomUUID });
    case "acp": return new AcpAdapter({ ...instance.options, now });
  }
}
