import { isReadOnlyToolScope } from "@main/execution/toolScope";
import { claudeToolAllowed, claudeToolScopeOptions } from "./toolScope";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readClaudeStream } from "./readStream";
import { questionGuidance } from "@main/execution/questionGuidance";
import { claudeApprovalDetails } from "./approvals";
import type { ClaudeInputQueue, ClaudeOpenInput, ClaudeSession, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import { createClaudeLiveSession } from "./liveSession";
import type { ClaudeToolOutputOptions } from "@main/types/execution/toolOutput.types";
import { claudeOutputOptions } from "./outputBudget";
import { claudeSessionSettings } from "./sessionSettings";
import { claudeAccountConnectorOptions } from "./accountConnectors";
import { claudeMcpAppLookup } from "./mcpApps";
import { CLAUDE_ALLOW_AND_AUTO } from "./permissionPolicies";

const questionInputSchema = z.object({ questions: z.array(z.object({ question: z.string(), header: z.string(), options: z.array(z.object({ label: z.string() })), multiSelect: z.boolean().optional() })) });

/** SDK payloads, permission input and credentials stay inside this module. */
export function createClaudeOpener(runtime: ClaudeRuntimeOptions, toolOutput?: ClaudeToolOutputOptions): (input: ClaudeOpenInput) => ClaudeSession {
  return (input) => openClaudeSession(input, runtime, toolOutput);
}

/** Claude Code reads its prompts from here; the input stays open between turns until `end`, which lets the process exit. */
export function createClaudeInputQueue(): ClaudeInputQueue {
  const pending: SDKUserMessage[] = [];
  let wake: (() => void) | null = null;
  let ended = false;
  const signal = (): void => { const resolve = wake; wake = null; resolve?.(); };
  return {
    push(message) { if (!ended) { pending.push(message); signal(); } },
    end() { ended = true; signal(); },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        const next = pending.shift();
        if (next) { yield next; continue; }
        if (ended) return;
        await new Promise<void>((resolve) => { wake = resolve; });
      }
    }
  };
}

function openClaudeSession(input: ClaudeOpenInput, runtime: ClaudeRuntimeOptions, toolOutput?: ClaudeToolOutputOptions): ClaudeSession {
  const prompts = createClaudeInputQueue();
  const { settings: outputSettings, ...outputOptions } = claudeOutputOptions(toolOutput);
  const settings = claudeSessionSettings(input, outputSettings);
  const account = claudeAccountConnectorOptions(input);
  const scope = claudeToolScopeOptions(input.toolScope, input.mcpServers, input.cwd);
  const mcpServers = { ...scope.mcpServers, ...account.mcpServers };
  // The runtime has one MCP call limit, so the longest any server needs applies to all of them.
  const toolTimeoutSeconds = Math.max(0, ...input.mcpServers.map((server) => server.toolTimeoutSeconds ?? 0));
  let permissionMode = input.permissionMode;
  const native = query({ prompt: prompts, options: {
    ...outputOptions,
    cwd: input.cwd, model: input.model, permissionMode: input.permissionMode,
    ...(settings ? { settings } : {}),
    systemPrompt: { type: "preset", preset: "claude_code", append: questionGuidance("AskUserQuestion", input.guidance) },
    ...(input.effort ? { effort: input.effort } : {}),
    pathToClaudeCodeExecutable: runtime.executablePath,
    env: { ...process.env, ...runtime.environment, ...account.env, ...(input.subagentModel ? { CLAUDE_CODE_SUBAGENT_MODEL: input.subagentModel } : {}),
      ...(toolTimeoutSeconds ? { MCP_TOOL_TIMEOUT: String(toolTimeoutSeconds * 1000) } : {}) },
    ...(input.resume ? { resume: input.sessionId } : { sessionId: input.sessionId }),
    ...scope, ...(Object.keys(mcpServers).length ? { mcpServers } : {}),
    includePartialMessages: true,
    promptSuggestions: input.promptSuggestions,
    canUseTool: async (name, toolInput, options) => {
      if (!claudeToolAllowed(input.toolScope, name)) return { behavior: "deny", message: isReadOnlyToolScope(input.toolScope)
        ? "This thread has read-only access. File edits and unsandboxed actions are unavailable."
        : "This thread builds an app: it has Nora's app tools and the app's connectors, nothing else." };
      if (isReadOnlyToolScope(input.toolScope) && name !== "AskUserQuestion") return { behavior: "allow", updatedInput: toolInput };
      if (name === "AskUserQuestion") {
        const parsed = questionInputSchema.parse(toolInput);
        const response = await input.onRequest({ kind: "question", nativeId: options.toolUseID, signal: options.signal,
          title: "Claude needs input", questions: parsed.questions.map((question) => ({ id: question.question,
            text: question.question, options: question.options.map((option) => option.label), multiple: question.multiSelect ?? false,
            allowOther: question.options.length > 0 })) });
        if (response.kind !== "question") return { behavior: "deny", message: "Question was not answered" };
        return { behavior: "allow", updatedInput: { ...toolInput,
          answers: Object.fromEntries(Object.entries(response.answers).map(([question, answers]) => [question, answers.join(", ")])) } };
      }
      const response = await input.onRequest({ kind: "approval", nativeId: options.toolUseID,
        title: options.title ?? `Allow ${name}?`, signal: options.signal, permissionMode,
        details: claudeApprovalDetails(name, z.json().parse(toolInput), input.cwd, options.decisionReason, options.blockedPath) });
      if (response.kind === "approval" && response.optionId === CLAUDE_ALLOW_AND_AUTO) {
        permissionMode = "auto";
        return { behavior: "allow", updatedInput: toolInput, updatedPermissions: [{ type: "setMode", mode: "auto", destination: "session" }] };
      }
      return response.kind === "approval" && response.optionId === "allow"
        ? { behavior: "allow", updatedInput: toolInput }
        : { behavior: "deny", message: "Declined in Nora" };
    }
  } });
  return createClaudeLiveSession({
    sessionId: input.sessionId, input: prompts, onFollowUp: input.onFollowUp,
    onBackgroundTasksChanged: input.onBackgroundTasksChanged,
    opening: { nativeTurnId: input.nativeTurnId, instruction: input.instruction, model: input.model, permissionMode: input.permissionMode },
    native: {
      interrupt: () => native.interrupt(),
      close: () => { native.close(); void native.return(undefined).catch(() => undefined); },
      setModel: (model) => native.setModel(model),
      // Approval choices follow the session's live mode, so a mode set for a later turn applies to its approvals too.
      setPermissionMode: async (mode) => { await native.setPermissionMode(mode); permissionMode = mode; },
      [Symbol.asyncIterator]: () => native[Symbol.asyncIterator]()
    },
    readTurn: (source) => readClaudeStream(source, 5000, async () => {
      const policy = await native.getContextUsage({ detail: "summary" });
      return policy.isAutoCompactEnabled ? policy.autoCompactThreshold : undefined;
    }, async () => claudeMcpAppLookup(await native.mcpServerStatus()))
  });
}

