export interface SavePastedImagePayload {
  data: Uint8Array;
  mimeType: string;
}

export interface PastedImageReference {
  path: string;
  mimeType: string;
  placeholder: string;
}
