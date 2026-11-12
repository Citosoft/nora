import { createClaudeExternalSessions } from "@main/providers/claude/externalSessions";
import { randomUUID } from "node:crypto";
import { AcpAdapter } from "@main/providers/acp/adapter";
import { createClaudeAccount } from "@main/providers/claude/account";
import { ClaudeAdapter } from "@main/providers/claude/adapter";
import { createClaudeDiscovery } from "@main/providers/claude/discovery";
import { createClaudeMcp } from "@main/providers/claude/mcp";
import { createClaudeSkills } from "@main/providers/claude/skills";
import { createClaudeOpener } from "@main/providers/claude/sdkBridge";
import { createClaudeContextReader, createClaudeContextWindowReader } from "@main/providers/claude/contextReader";
import { CodexAdapter } from "@main/providers/codex/adapter";
import type { NativeInstance } from "@main/types/execution/localHost.types";
import type { ExecutionProvider } from "@main/types/execution/provider.types";

/** Builds the adapter for a discovered runtime; constructing one does not start its process. */
export function createExecutionProvider(instance: NativeInstance, now: () => string): ExecutionProvider {
  switch (instance.kind) {
    case "codex": return new CodexAdapter({ ...instance.options, now });
    case "claude": return new ClaudeAdapter({ instanceId: instance.instanceId, policies: instance.policies,
      externalSessions: createClaudeExternalSessions(instance.instanceId), open: createClaudeOpener(instance.runtime), discover: createClaudeDiscovery(instance.runtime), mcp: createClaudeMcp(instance.runtime), skills: createClaudeSkills(instance.runtime),
      account: createClaudeAccount(instance.runtime), readContext: createClaudeContextReader(createClaudeContextWindowReader(instance.runtime)),
      now, nextId: randomUUID });
    case "acp": return new AcpAdapter({ ...instance.options, now });
  }
}
