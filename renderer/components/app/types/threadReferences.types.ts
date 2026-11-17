import type { ThreadReference } from "@shared/types/conversation/references.types";

export interface ThreadReferenceChoice { id: string; title: string; workspace: string; settled: boolean; }
export interface NativeThreadReferencesProps {
  references: readonly ThreadReference[];
  choices: readonly ThreadReferenceChoice[];
  disabled: boolean;
  onAttach(conversationId: string): Promise<void>;
}

export interface NativeThreadReferenceChipsProps {
  references: readonly ThreadReference[];
  disabled: boolean;
  onRemove(referenceId: string): void;
}
