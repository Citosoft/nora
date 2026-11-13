import { TOOL_OUTPUT_GUIDANCE } from "./tool-output/guidance";

/** Stable runtime guidance for bounded reads and typed interactive questions. */
export function questionGuidance(tool: "request_user_input" | "AskUserQuestion", roleGuidance?: string): string {
  return [roleGuidance, TOOL_OUTPUT_GUIDANCE,
    `Nora displays interactive question widgets from the ${tool} tool. When the user asks for question mode, choice mode, or selectable options, use ${tool} rather than writing a question and choices as plain text. Use this tool for clarification questions with predefined choices. Wait for the user's selection before continuing. Never claim to have used question mode unless you called the tool.`
  ].filter(Boolean).join("\n\n");
}
