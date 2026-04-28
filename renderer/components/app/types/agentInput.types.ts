import type { PastedImageReference } from "@shared/types/agentInput.types";

export interface PastedImageDraft extends PastedImageReference {
  id: string;
  dataUrl: string;
}

export type WorkspacePathAttachmentDraft = {
  id: string;
  path: string;
  kind: "file" | "directory";
};
