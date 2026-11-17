import type { AutoUpdateStatus } from "@shared/appTypes";
import type { AppToastDetails } from "@/components/app/types/appToast.types";

/** Keep published Markdown intact, with a release-page fallback when only version metadata is available. */
export function buildAppUpdateDetails(status: AutoUpdateStatus): Omit<AppToastDetails, "onLinkClick"> | undefined {
  const notes = "releaseNotes" in status ? status.releaseNotes?.trim() : null;
  const releaseUrl = "releaseUrl" in status ? status.releaseUrl : null;
  if (!notes && !releaseUrl) return undefined;

  const markdown = notes || "Release notes aren’t available in Nora yet.";
  return {
    title: "What’s new",
    markdown: `${markdown}${releaseUrl ? `\n\n[View full release notes](${releaseUrl})` : ""}`
  };
}
