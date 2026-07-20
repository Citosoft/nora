import type { ExternalHarnessSessionSummary } from "@shared/appTypes";

export const getExternalHarnessThreadDisplayTitle = (session: ExternalHarnessSessionSummary): string =>
  session.threadTitle?.trim() || session.sessionLabel;

