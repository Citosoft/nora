import type { AppImportBotExportGuide, AppImportBotExportTabId } from "@/components/app/types/appImport.types";

export const APP_IMPORT_BOT_EXPORT_GUIDES: Readonly<Record<AppImportBotExportTabId, AppImportBotExportGuide>> = {
  openbot: {
    tab: "openbot", appName: "OpenBot", title: "Import bots from an OpenBot server",
    description: "When OpenBot is connected to a server, its bots live on that server rather than this computer. Ask one of your OpenBot bots to export them, then paste its reply here.",
    sendStep: "Open OpenBot and send it to one of your bots."
  },
  "grok-bot": {
    tab: "grok-bot", appName: "Grok Bot", title: "Import bots from Grok Bot or another app",
    description: "Apps like Grok Bot keep bots on their servers, so ask the app's main bot to export them, then paste its reply here.",
    sendStep: "Open Grok Bot and send it to your main bot."
  }
};
