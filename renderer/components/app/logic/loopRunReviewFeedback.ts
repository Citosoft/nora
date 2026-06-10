import type { ForgeOverview, ForgeWorkItemSummary } from "@shared/appTypes";

function isOpenForgeWorkItem(item: ForgeWorkItemSummary): boolean {
  const state = item.state.trim().toLowerCase();
  return state === "open" || state === "opened";
}

export function listLoopRunReviewFeedbackWorkItems(overview: ForgeOverview | null): ForgeWorkItemSummary[] {
  if (!overview) {
    return [];
  }

  return [...overview.pullRequests, ...overview.gitlabUserMergeRequests]
    .filter(isOpenForgeWorkItem)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function formatLoopRunReviewWorkItemLabel(item: ForgeWorkItemSummary): string {
  const prefix = item.webUrl.includes("gitlab") || item.sourceRepository ? "MR" : "PR";
  return `${prefix} #${item.number} · ${item.title}`;
}

export function resolveGitlabForgeRepoOverride(
  item: ForgeWorkItemSummary,
  gitlabHost: string
): { host: string; fullName: string } | null {
  const fullName = item.sourceRepository?.trim();
  if (!fullName) {
    return null;
  }

  const configuredHost = gitlabHost.trim();
  if (configuredHost) {
    return {
      host: configuredHost.replace(/^https?:\/\//i, "").split("/")[0] ?? configuredHost,
      fullName
    };
  }

  try {
    const host = new URL(item.webUrl).host;
    if (host) {
      return { host, fullName };
    }
  } catch {
    // Fall through to default host when URL parsing fails.
  }

  return { host: "gitlab.com", fullName };
}
