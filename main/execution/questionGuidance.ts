import { TOOL_OUTPUT_GUIDANCE } from "./tool-output/guidance";
import type { QuestionTool } from "@main/types/execution/questionGuidance.types";

/** Stable runtime guidance for bounded reads and typed interactive questions. */
export function questionGuidance(tool: QuestionTool, roleGuidance?: string): string {
  return [roleGuidance, TOOL_OUTPUT_GUIDANCE,
    `Nora displays interactive question widgets from the ${tool} tool. When the user asks for question mode, choice mode, or selectable options, use ${tool} rather than writing a question and choices as plain text. Use this tool for clarification questions with predefined choices. Wait for the user's selection before continuing. Never claim to have used question mode unless you called the tool.`
  ].filter(Boolean).join("\n\n");
}

/** The question tool each native runtime exposes, which decides how it wraps a thread's guidance; null for runtimes that add none. */
export function questionToolOf(providerKind: string): QuestionTool | null {
  return providerKind === "claude" ? "AskUserQuestion" : providerKind === "codex" ? "request_user_input" : null;
}
