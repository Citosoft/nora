import type { HookCallback, Options } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { budgetToolOutput, TOOL_OUTPUT_INLINE_BYTES } from "@main/execution/tool-output/budget";
import type { ClaudeToolOutputOptions } from "@main/types/execution/toolOutput.types";

const shellSchema = z.object({ stdout: z.string(), stderr: z.string(), interrupted: z.boolean(), isImage: z.boolean().optional(),
  persistedOutputPath: z.string().optional(), rawOutputPath: z.string().optional(),
  structuredContent: z.array(z.never()).optional() }).passthrough();
const mcpTextSchema = z.object({ content: z.array(z.object({ type: z.literal("text"), text: z.string() }).strict()),
  isError: z.boolean().optional(), structuredContent: z.never().optional() }).passthrough();

/** Only known textual shapes are rewritten; binary, structured, read-state and permission results retain native semantics. */
export function createClaudeOutputHook(directory: string): HookCallback {
  return async (input, _id, { signal }) => {
    if (input.hook_event_name !== "PostToolUse" || signal.aborted) return {};
    try {
      if (input.tool_name === "Bash" || input.tool_name === "PowerShell") {
        const result = shellSchema.safeParse(input.tool_response);
        if (!result.success || result.data.isImage || result.data.interrupted || result.data.persistedOutputPath || result.data.rawOutputPath) return {};
        const original = result.data;
        if (Buffer.byteLength(original.stdout) + Buffer.byteLength(original.stderr) <= TOOL_OUTPUT_INLINE_BYTES) return {};
        const stdout = await budgetToolOutput(original.stdout, directory, original.stderr ? 6_000 : TOOL_OUTPUT_INLINE_BYTES);
        const stderr = await budgetToolOutput(original.stderr, directory, original.stdout ? 2_000 : TOOL_OUTPUT_INLINE_BYTES);
        if (signal.aborted || (!stdout.path && !stderr.path)) return {};
        return { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: { ...original, stdout: stdout.text, stderr: stderr.text } } };
      }
      if (!input.tool_name.startsWith("mcp__")) return {};
      if (typeof input.tool_response === "string") {
        const output = await budgetToolOutput(input.tool_response, directory);
        return output.path && !signal.aborted ? { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: output.text } } : {};
      }
      const result = mcpTextSchema.safeParse(input.tool_response);
      if (!result.success || result.data.isError) return {};
      const text = result.data.content.map((part) => part.text).join("\n\n");
      const output = await budgetToolOutput(text, directory);
      if (!output.path || signal.aborted) return {};
      return { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: { ...result.data, content: [{ type: "text", text: output.text }] } } };
    } catch { return {}; } // Never lose a result when storage is unavailable.
  };
}

export function claudeOutputOptions(options?: ClaudeToolOutputOptions): Pick<Options, "hooks" | "settings"> {
  return options?.enabled() ? { settings: { bashOutputMaxChars: TOOL_OUTPUT_INLINE_BYTES },
    hooks: { PostToolUse: [{ hooks: [createClaudeOutputHook(options.directory)], timeout: 5 }] } } : {};
}
