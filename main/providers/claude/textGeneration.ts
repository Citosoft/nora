import { query, type ModelUsage } from "@anthropic-ai/claude-agent-sdk";
import type { RuntimeTextInput, GeneratedText } from "@main/types/ai/textGeneration.types";

/** Every model call of the query, cached input included; the model that did most of the work names the result. */
function claudeUsage(modelUsage: Record<string, ModelUsage>): Omit<GeneratedText, "text"> {
  const entries = Object.entries(modelUsage);
  if (!entries.length) return { model: null, usage: null };
  const input = (entry: ModelUsage): number => entry.inputTokens + entry.cacheReadInputTokens + entry.cacheCreationInputTokens;
  const [model] = entries.reduce((best, entry) => input(entry[1]) + entry[1].outputTokens > input(best[1]) + best[1].outputTokens ? entry : best);
  return { model, usage: entries.reduce((total, [, entry]) => ({ inputTokens: total.inputTokens + input(entry), outputTokens: total.outputTokens + entry.outputTokens }),
    { inputTokens: 0, outputTokens: 0 }) };
}

/** A tool-free, non-persistent query using the CLI's own authentication. */
export async function generateClaudeText(input: RuntimeTextInput): Promise<GeneratedText> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  input.request.signal?.throwIfAborted();
  input.request.signal?.addEventListener("abort", abort, { once: true });
  const session = query({ prompt: input.request.user, options: {
    cwd: input.cwd, pathToClaudeCodeExecutable: input.executable, env: input.environment, ...(input.model ? { model: input.model } : {}),
    systemPrompt: input.request.system, tools: [], mcpServers: {}, strictMcpConfig: true,
    settingSources: [], plugins: [], persistSession: false, maxTurns: 1,
    abortController: controller,
    canUseTool: async () => ({ behavior: "deny", message: "Tools are unavailable for text generation." })
  } });
  const timeout = setTimeout(abort, 90_000);
  try {
    for await (const message of session) {
      if (message.type === "result") {
        if (message.subtype === "success" && !message.is_error && message.result.trim()) {
          const { model, usage } = claudeUsage(message.modelUsage);
          return { text: message.result.trim(), model: model ?? input.model, usage };
        }
        throw new Error("Claude did not produce text");
      }
    }
    throw new Error("Claude returned no result");
  } finally {
    clearTimeout(timeout);
    input.request.signal?.removeEventListener("abort", abort);
    session.close();
    await session.return();
  }
}
