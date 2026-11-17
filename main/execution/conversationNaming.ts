import type { ConversationNamingDeps } from "@main/types/execution/naming.types";

/** Optional enrichment must never delay or fail instruction acceptance. */
export class ConversationNaming {
  private readonly controller = new AbortController();
  constructor(private readonly deps: ConversationNamingDeps) {}

  start(conversationId: string, expectedTitle: string, instruction: string): void {
    // Preserve explicitly supplied titles, including titles on task-created threads.
    if (expectedTitle !== instruction.trim().slice(0, 100)) return;
    void this.generate(conversationId, expectedTitle, instruction);
  }

  private async generate(conversationId: string, expectedTitle: string, instruction: string): Promise<void> {
    try {
      const title = await this.deps.generate(instruction, this.controller.signal);
      if (!this.controller.signal.aborted) this.deps.apply(conversationId, expectedTitle, title);
    } catch {
      // The prompt-based name remains usable when generation or authentication fails.
    }
  }

  close(): void { this.controller.abort(); }
}
