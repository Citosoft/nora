import type { ComposerAttachment } from "@shared/types/agentInput.types";

export type ComposerFileSource = "photos" | "camera" | "files";
export interface PickedComposerFile { name: string; mimeType: string; uri: string; size: number | null; }
export interface ComposerDraftAttachment { file: ComposerAttachment; uri: string; }
export interface ComposerAttachments {
  files: readonly ComposerDraftAttachment[];
  busy: boolean;
  progress: string | null;
  error: string | null;
  pick(source: ComposerFileSource): Promise<void>;
  remove(id: string): void;
  clear(): void;
}
