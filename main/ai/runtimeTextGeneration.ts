import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findExecutableOnPath } from "@main/processLookup";
import { buildProcessEnv } from "@main/processEnv";
import { generateCodexText } from "@main/providers/codex/textGeneration";
import { generateClaudeText } from "@main/providers/claude/textGeneration";
import type { GeneratedText, RuntimeTextProvider, TextGenerationRequest } from "@main/types/ai/textGeneration.types";

export async function generateRuntimeText(provider: RuntimeTextProvider, request: TextGenerationRequest, model: string | null): Promise<GeneratedText> {
  const names = process.platform === "win32" ? [`${provider}.exe`, `${provider}.cmd`, provider] : [provider];
  const executable = await findExecutableOnPath(names, process.platform === "win32");
  const label = provider === "codex" ? "Codex" : "Claude";
  if (!executable) throw new Error(`Install and sign in to the ${label} runtime, or choose another source in Settings → AI.`);
  // Never load workspace instructions, hooks or MCP configuration for a naming request.
  const cwd = await mkdtemp(join(tmpdir(), "nora-generation-"));
  try {
    const input = { executable, cwd, environment: buildProcessEnv(process.env), request, model };
    return await (provider === "codex" ? generateCodexText(input) : generateClaudeText(input));
  } catch {
    throw new Error(`${label} text generation failed. Check the runtime is up to date, signed in, and has available usage, or choose another source in Settings → AI.`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}
