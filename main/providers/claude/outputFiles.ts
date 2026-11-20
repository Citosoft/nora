import path from "node:path";
import { z } from "zod";
import type { JsonValue } from "@main/types/execution/rpc.types";
import type { ToolOutputFile } from "@shared/types/conversation/contracts.types";

const MAX_OUTPUT_FILES = 50;
const writeInputSchema = z.object({ file_path: z.string().min(1) });
/** Claude Code's file delivery tool hands files to the user by path. */
const deliverInputSchema = z.object({ files: z.array(z.string().min(1)) });

function requestedPaths(name: string, input: JsonValue): string[] {
  if (name === "Write") { const parsed = writeInputSchema.safeParse(input); return parsed.success ? [parsed.data.file_path] : []; }
  if (name === "SendUserFile") { const parsed = deliverInputSchema.safeParse(input); return parsed.success ? parsed.data.files : []; }
  return [];
}

/**
 * Files a Claude tool call wrote or delivered. Relative paths resolve against the session's working directory
 * when it is known and are dropped otherwise, so stored outputs are always absolute.
 */
export function claudeToolOutputFiles(name: string, input: JsonValue, cwd?: string): ToolOutputFile[] {
  const paths = new Set<string>();
  for (const requested of requestedPaths(name, input)) {
    const resolved = path.isAbsolute(requested) ? path.normalize(requested) : cwd ? path.resolve(cwd, requested) : null;
    if (resolved) paths.add(resolved);
  }
  return [...paths].slice(0, MAX_OUTPUT_FILES).map((filePath) => ({ path: filePath }));
}
