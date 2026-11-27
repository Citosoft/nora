import { APP_IMPORT_CHANNELS } from "@shared/app-import/gateway";
import type { AppImportBridge } from "@shared/ipc/types/appImportGateway.types";
import type { AppImportProgress } from "@shared/types/app-import/appImportApply.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createAppImportBridge(): AppImportBridge {
  return {
    preview: (sources) => invokeIpc(APP_IMPORT_CHANNELS.preview, sources),
    previewBotExport: (document) => invokeIpc(APP_IMPORT_CHANNELS.previewBotExport, document),
    apply: (request) => invokeIpc(APP_IMPORT_CHANNELS.apply, request),
    onProgress: (listener) => subscribeToIpcEvent<AppImportProgress>(APP_IMPORT_CHANNELS.progress, listener)
  };
}
