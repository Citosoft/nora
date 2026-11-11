import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";

export interface SimulatorBridge {
  boot(): Promise<NativeBoot>;
  conversations: ConversationBridge;
}

declare global { interface Window { noraChatSimulator: SimulatorBridge; } }
