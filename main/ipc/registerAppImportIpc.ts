import { APP_IMPORT_CHANNELS, appImportApplyRequestSchema, appImportBotExportDocumentSchema, appImportPreviewRequestSchema } from "@shared/app-import/gateway";
import type { AppImportIpcDeps } from "@main/types/app-import/appImportService.types";

export function registerAppImportIpc(deps: AppImportIpcDeps): () => void {
  deps.ipc.handle(APP_IMPORT_CHANNELS.preview, async (event, input) => {
    if (!deps.isAllowedSender(event)) throw new Error("This window cannot read other apps.");
    const sources = appImportPreviewRequestSchema.safeParse(input);
    if (!sources.success) throw new Error("Nora can't import from that app.");
    return await deps.service.preview(sources.data);
  });
  deps.ipc.handle(APP_IMPORT_CHANNELS.previewBotExport, async (event, input) => {
    if (!deps.isAllowedSender(event)) throw new Error("This window cannot read bot exports.");
    const document = appImportBotExportDocumentSchema.safeParse(input);
    if (!document.success) throw new Error("Paste a bot export of up to 2 MB.");
    return await deps.service.previewBotExport(document.data);
  });
  deps.ipc.handle(APP_IMPORT_CHANNELS.apply, async (event, input) => {
    if (!deps.isAllowedSender(event)) throw new Error("This window cannot import from other apps.");
    const request = appImportApplyRequestSchema.safeParse(input);
    if (!request.success) throw new Error("That import request is not valid.");
    return await deps.service.apply(request.data);
  });
  return () => {
    for (const channel of [APP_IMPORT_CHANNELS.preview, APP_IMPORT_CHANNELS.previewBotExport, APP_IMPORT_CHANNELS.apply]) deps.ipc.removeHandler(channel);
  };
}
