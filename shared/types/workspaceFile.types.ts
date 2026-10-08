export interface WorkspaceImageFileContent {
  dataUrl: string;
  mimeType: string;
}

/**
 * How a workspace file is presented when opened from the file tree:
 * `text` in the code editor, `image` as an inline preview, `external` handed to the OS default app.
 */
export type WorkspaceFileViewKind = "text" | "image" | "external";
