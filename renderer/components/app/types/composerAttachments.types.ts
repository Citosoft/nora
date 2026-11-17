import type { ReactNode } from "react";
import type { ComposerAttachment } from "@shared/types/agentInput.types";

export interface ComposerAttachmentsInput {
  attachments: readonly ComposerAttachment[];
  disabled: boolean;
  onAdd(attachments: readonly ComposerAttachment[]): void;
}

export interface NativeComposerAttachmentsProps {
  trailingAction?: ReactNode;
  attachments: readonly ComposerAttachment[];
  disabled: boolean;
  saving: boolean;
  error: string | null;
  onFiles(files: readonly File[]): void;
  onRemove(id: string): void;
}

export interface ComposerImageThumbnailProps { attachment: ComposerAttachment; }
