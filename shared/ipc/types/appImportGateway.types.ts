import type { AppImportApplyRequest, AppImportApplyResult, AppImportPreview, AppImportProgress, AppImportSourcePreview } from "@shared/types/app-import/appImportApply.types";

import type { AppImportDetectedSourceId } from "@shared/types/app-import/appImportSource.types";

/** "Migrate from another app": preview every app Nora can import from, then apply the ticked items. */
export interface AppImportBridge {
  /** Reads the given apps (all of them when omitted) without importing anything. */
  preview(sources?: AppImportDetectedSourceId[]): Promise<AppImportPreview>;
  /** Reads a pasted or chosen bot export (e.g. one Grok Bot wrote) without importing anything. */
  previewBotExport(document: string): Promise<AppImportSourcePreview>;
  apply(request: AppImportApplyRequest): Promise<AppImportApplyResult>;
  onProgress(listener: (progress: AppImportProgress) => void): () => void;
}
