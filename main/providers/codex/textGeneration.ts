import { execFile } from "node:child_process";
import { z } from "zod";
import type { RuntimeTextInput, GeneratedText } from "@main/types/ai/textGeneration.types";

/** Usage is accounting only: a missing or odd usage block never fails a generation. */
const usageSchema = z.object({ input_tokens: z.number().nonnegative().optional(), output_tokens: z.number().nonnegative().optional() }).optional().catch(undefined);
const eventSchema = z.object({ type: z.string(), item: z.object({ type: z.string(), text: z.string().optional() }).optional(),
  usage: usageSchema.optional() });

/** Isolated, ephemeral CLI invocation. Authentication stays with Codex. */
export function generateCodexText(input: RuntimeTextInput): Promise<GeneratedText> {
  return new Promise((resolve, reject) => {
    const child = execFile(input.executable, [
      "exec", ...(input.model ? ["--model", input.model] : []), "--ignore-user-config", "--ignore-rules", "--ephemeral", "--skip-git-repo-check",
      "--sandbox", "read-only", "--color", "never", "--json",
      "--disable", "shell_tool", "--disable", "unified_exec", "--disable", "apply_patch_freeform",
      "--disable", "apps", "--disable", "multi_agent", "--disable", "hooks",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "remote_plugin",
      "--disable", "image_generation", "--disable", "view_image", "--disable", "skill_mcp_dependency_install",
      "--config", 'web_search="disabled"', "--config", "project_doc_max_bytes=0", "-"
    ], { cwd: input.cwd, env: input.environment, encoding: "utf8", timeout: 90_000,
      signal: input.request.signal, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, windowsHide: true }, (error, stdout) => {
      if (error) { reject(new Error("Codex text generation failed")); return; }
      try { resolve({ ...parseCodexOutput(stdout), model: input.model }); } catch (failure) { reject(failure); }
    });
    child.stdin?.on("error", () => { /* The process callback owns failures, including early exit. */ });
    child.stdin?.end(`${input.request.system}\nDo not use tools. Respond only with the requested text.\n\n${input.request.user}`);
  });
}

/** The final agent message and the turn's token usage (input includes cached tokens) from `codex exec --json`. */
export function parseCodexOutput(stdout: string): Omit<GeneratedText, "model"> {
  let text = "";
  let completed = false;
  let usage: GeneratedText["usage"] = null;
  for (const line of stdout.split(/\r?\n/).filter((entry) => entry.trim())) {
    const event = eventSchema.parse(JSON.parse(line));
    if (event.type === "error" || event.type === "turn.failed") throw new Error("Codex generation failed");
    if (event.type === "turn.completed") {
      completed = true;
      if (event.usage && (event.usage.input_tokens !== undefined || event.usage.output_tokens !== undefined)) {
        usage = { inputTokens: event.usage.input_tokens ?? 0, outputTokens: event.usage.output_tokens ?? 0 };
      }
    }
    if (event.type === "item.completed" && event.item?.type === "agent_message") text = event.item.text?.trim() ?? "";
  }
  if (!completed || !text) throw new Error("Codex returned no completed text");
  return { text, usage };
}
