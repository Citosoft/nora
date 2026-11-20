import { APP_DIRECTORY_URL } from "@shared/apps/installLink";
import { appFileConnectorCandidates, canInstallAppConnector } from "@shared/apps/portable";
import { connectorLogoForUrl } from "@shared/connectors/gallery";
import type { AppFile } from "@shared/types/apps/portable.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { AppImportConnectorState, AppImportReview } from "@/components/app/types/appsView.types";

/** What happens to one connector the file names: a local one stands in, Nora adds it on install, or the user must set it up first. */
export const appImportConnectorState = (described: AppFile["connectors"][string], chosenId: string | null): AppImportConnectorState =>
  chosenId ? "reused" : canInstallAppConnector(described) ? "added" : "setup";

/** Where the file came from, short enough for a subtitle: the Nora directory, another website's host, or the local file's name. */
export function appFileSourceLabel(path: string): string {
  if (path.startsWith(`${APP_DIRECTORY_URL}/`)) return "Nora app directory";
  try {
    const url = new URL(path);
    if (url.protocol === "https:" || url.protocol === "http:") return url.host;
  } catch { /* A local path, not a URL. */ }
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** Everything the install review shows about a file, derived once from the file, the workspace's connectors and the current choices. */
export function reviewAppImport(file: AppFile, available: readonly Connector[], choices: Readonly<Record<string, string | null>>): AppImportReview {
  const connectors = Object.entries(file.connectors).map(([fileId, described]) => {
    const candidates = appFileConnectorCandidates(described, available);
    const chosen = candidates.find((connector) => connector.id === choices[fileId]) ?? null;
    return { fileId, described, logo: chosen?.logo ?? connectorLogoForUrl(described.url), candidates, chosen, state: appImportConnectorState(described, chosen?.id ?? null) };
  });
  return {
    connectors,
    actionCount: Object.keys(file.spec.actions).length,
    localFiles: Object.values(file.spec.sources).flatMap((source) => source.kind === "file" ? [source.path] : []),
    needsSetup: connectors.filter((entry) => entry.state === "setup").length
  };
}
