import type { ForgeWorkItemDetail, ForgeWorkItemSummary } from "@shared/appTypes";
import type { IssueReference } from "@/components/app/types/forge-items/issue.types";

/** Standard Markdown retains a usable issue URL for providers, exports and copied prompts. */
export function issueReference(item: ForgeWorkItemSummary): IssueReference {
  const url = new URL(item.webUrl);
  return { provider: /\/-\/issues\//.test(url.pathname) || item.id.startsWith("gitlab-") ? "gitlab" : "github", number: item.number, webUrl: url.href };
}

export function formatIssueReference(reference: IssueReference): string {
  const url = new URL(reference.webUrl);
  if (!/^https?:$/.test(url.protocol)) throw new Error("The issue must have an HTTP or HTTPS URL.");
  return `[#${reference.number}](<${url.href.replace(/>/g, "%3E").replace(/</g, "%3C")}> "nora-issue:${reference.provider}")`;
}

export function parseIssueReference(href: string | undefined, title: string | undefined, label: string): IssueReference | null {
  if (!href || (title !== "nora-issue:github" && title !== "nora-issue:gitlab")) return null;
  const match = /^#([1-9]\d*)$/.exec(label);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isSafeInteger(number)) return null;
  try {
    const url = new URL(href);
    if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith(`/issues/${number}`)) return null;
    return { provider: title === "nora-issue:gitlab" ? "gitlab" : "github", number, webUrl: url.href };
  } catch { return null; }
}

export function formatForgeIssueInstruction(detail: ForgeWorkItemDetail): string {
  return `Fix issue ${formatIssueReference(issueReference(detail.item))}. Read the issue and its discussion, inspect the codebase, implement the fix and validate the result.`;
}
