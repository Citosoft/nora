import type { ConversationSnapshot } from "@shared/types/conversation/contracts.types";
import type { ThreadReference } from "@shared/types/conversation/references.types";

export type WriteThreadReference = (snapshot: ConversationSnapshot, capturedAt: string) => Promise<ThreadReference>;
export interface ReferenceEntry { title: string; text: string; }
