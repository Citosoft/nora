import { query } from "@anthropic-ai/claude-agent-sdk";
import type { RuntimeTextInput } from "@main/types/ai/textGeneration.types";

/** A tool-free, non-persistent query using the CLI's own authentication. */
export async function generateClaudeText(input: RuntimeTextInput): Promise<string> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  input.request.signal?.throwIfAborted();
  input.request.signal?.addEventListener("abort", abort, { once: true });
  const session = query({ prompt: input.request.user, options: {
    cwd: input.cwd, pathToClaudeCodeExecutable: input.executable, env: input.environment,
    systemPrompt: input.request.system, tools: [], mcpServers: {}, strictMcpConfig: true,
    settingSources: [], plugins: [], persistSession: false, maxTurns: 1,
    abortController: controller,
    canUseTool: async () => ({ behavior: "deny", message: "Tools are unavailable for text generation." })
  } });
  const timeout = setTimeout(abort, 90_000);
  try {
    for await (const message of session) {
      if (message.type === "result") {
        if (message.subtype === "success" && !message.is_error && message.result.trim()) return message.result.trim();
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
