export interface SavePastedImagePayload {
  data: Uint8Array;
  mimeType: string;
}

export interface PastedImageReference {
  path: string;
  mimeType: string;
  placeholder: string;
}

/** Files are copied to app-owned storage so drafts and retries keep stable references. */
export interface ComposerAttachment {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface SaveComposerAttachmentPayload {
  name: string;
  mimeType: string;
  data: Uint8Array;
}
