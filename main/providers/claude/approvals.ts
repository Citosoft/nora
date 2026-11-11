import { z } from "zod";
import type { ApprovalDetails } from "@shared/types/conversation/contracts.types";
import type { JsonValue } from "@main/types/execution/rpc.types";
import { formatToolInput } from "../toolPresentation";

const actionInputSchema = z.object({ command: z.string().optional(), file_path: z.string().optional(), path: z.string().optional() });

export function claudeApprovalDetails(name: string, input: JsonValue, cwd: string, reason?: string, blockedPath?: string): ApprovalDetails {
  const parsed = actionInputSchema.safeParse(input);
  const action = parsed.success ? parsed.data : {};
  const paths = [...new Set([action.file_path ?? action.path, blockedPath].filter((path): path is string => !!path))];
  return { kind: name === "Bash" ? "command" : /^(Read|Write|Edit|MultiEdit)$/.test(name) ? "files" : "tool",
    workingDirectory: cwd, ...(reason ? { reason } : {}), ...(paths.length ? { paths } : {}),
    ...(action.command ? { command: action.command } : { input: formatToolInput(input) }) };
}
