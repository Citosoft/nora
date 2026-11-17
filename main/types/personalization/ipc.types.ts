import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { NativeBoot, PersonalizationReply } from "@shared/ipc/types/personalizationGateway.types";
import type { PersonalizationService } from "@main/personalization/service";

export interface PersonalizationIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<PersonalizationReply>): void;
    removeHandler(channel: string): void;
  };
  service: PersonalizationService;
  isAllowedSender(event: ConversationInvocation): boolean;
  /** Sends a changed state to the window. */
  notify(state: NativeBoot): void;
}
