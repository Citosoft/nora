import type { AppImportBridge } from "@shared/ipc/types/appImportGateway.types";

export const appImportClient: AppImportBridge = {
  preview: (sources) => window.nora.appImport.preview(sources),
  previewBotExport: (document) => window.nora.appImport.previewBotExport(document),
  apply: (request) => window.nora.appImport.apply(request),
  onProgress: (listener) => window.nora.appImport.onProgress(listener)
};
