import type { ConversationCommand } from "@shared/types/conversation/contracts.types";

export function crashCommands(providerFault: boolean): Extract<ConversationCommand, { kind: "submit" }>[] {
  return [
    { kind: "submit", commandId: "crash-active-submit", conversationId: "acceptance", runId: "crash-active",
      instruction: providerFault ? "Append NORA_CRASH_TEST to note.md in this temporary workspace. Request approval for the edit; do not touch other files or run unrelated commands."
        : "Produce a numbered list of 1000 different words, one per line. Do not use any tools." },
    { kind: "submit", commandId: "crash-queued-submit", conversationId: "acceptance", runId: "crash-queued",
      instruction: "Reply only NORA_CRASH_QUEUE_SHOULD_NOT_RUN. Do not use tools." }
  ];
}
