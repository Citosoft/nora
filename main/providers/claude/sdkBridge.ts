import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readClaudeStream } from "./readStream";
import { questionGuidance } from "@main/execution/questionGuidance";
import { claudeApprovalDetails } from "./approvals";
import type { ClaudeOpenInput, ClaudeSession, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";

const questionInputSchema = z.object({ questions: z.array(z.object({ question: z.string(), header: z.string(), options: z.array(z.object({ label: z.string() })), multiSelect: z.boolean().optional() })) });

/** SDK payloads, permission input and credentials stay inside this module. */
export function createClaudeOpener(runtime: ClaudeRuntimeOptions): (input: ClaudeOpenInput) => ClaudeSession {
  return (input) => openClaudeSession(input, runtime);
}

function openClaudeSession(input: ClaudeOpenInput, runtime: ClaudeRuntimeOptions): ClaudeSession {
  let releaseInput = (): void => {};
  const keepInputOpen = new Promise<void>((resolve) => { releaseInput = resolve; });
  async function* prompt(): AsyncGenerator<SDKUserMessage> {
    yield { type: "user", uuid: input.nativeTurnId, session_id: input.sessionId,
      message: { role: "user", content: input.instruction }, parent_tool_use_id: null };
    await keepInputOpen;
  }
  const native = query({ prompt: prompt(), options: {
    cwd: input.cwd, model: input.model, permissionMode: input.permissionMode,
    systemPrompt: { type: "preset", preset: "claude_code", append: questionGuidance("AskUserQuestion", input.guidance) },
    ...(input.effort ? { effort: input.effort } : {}),
    pathToClaudeCodeExecutable: runtime.executablePath,
    env: { ...process.env, ...runtime.environment },
    ...(input.resume ? { resume: input.sessionId } : { sessionId: input.sessionId }),
    includePartialMessages: true,
    promptSuggestions: true,
    canUseTool: async (name, toolInput, options) => {
      if (name === "AskUserQuestion") {
        const parsed = questionInputSchema.parse(toolInput);
        const response = await input.onRequest({ kind: "question", nativeId: options.toolUseID, signal: options.signal,
          title: "Claude needs input", questions: parsed.questions.map((question) => ({ id: question.question,
            text: question.question, options: question.options.map((option) => option.label), multiple: question.multiSelect ?? false })) });
        if (response.kind !== "question") return { behavior: "deny", message: "Question was not answered" };
        return { behavior: "allow", updatedInput: { ...toolInput,
          answers: Object.fromEntries(Object.entries(response.answers).map(([question, answers]) => [question, answers.join(", ")])) } };
      }
      const response = await input.onRequest({ kind: "approval", nativeId: options.toolUseID,
        title: options.title ?? `Allow ${name}?`, signal: options.signal,
        details: claudeApprovalDetails(name, z.json().parse(toolInput), input.cwd, options.decisionReason, options.blockedPath) });
      return response.kind === "approval" && response.optionId === "allow"
        ? { behavior: "allow", updatedInput: toolInput }
        : { behavior: "deny", message: "Declined in Nora" };
    }
  } });
  let closing: Promise<void> | null = null;
  return {
    async interrupt() { await native.interrupt(); },
    close() {
      if (!closing) closing = (async () => { releaseInput(); native.close(); await native.return(); })();
      return closing;
    },
    async *[Symbol.asyncIterator]() {
      yield* readClaudeStream(native, releaseInput);
    }
  };
}

