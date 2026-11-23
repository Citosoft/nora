import { changeRequestNoun } from "@/components/app/logic/thread-workspace/changeRequest";
import type { ForgeBranchChanges, ForgeBranchPullRequestStatus, ForgeProvider } from "@shared/appTypes";
import type { HomeBranchFact, HomeChangeRequest } from "@/components/app/types/workspace-home/branch.types";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** The branch's PR or MR, or null when it has none to link to. */
export function describeHomeChangeRequest(request: ForgeBranchPullRequestStatus | null, provider: ForgeProvider | null): HomeChangeRequest | null {
  if (!request?.pullRequestNumber) return null;
  return { label: `${changeRequestNoun(provider)} #${request.pullRequestNumber} · ${request.label}`, webUrl: request.webUrl, state: request.state };
}

/** What the checkout holds beyond its base branch, leaving out anything that is zero. */
export function describeHomeBranchFacts(changes: ForgeBranchChanges): HomeBranchFact[] {
  const facts: HomeBranchFact[] = [];
  const base = changes.baseBranch ?? "the default branch";
  if (changes.files > 0) {
    const lines = `+${changes.additions}${changes.partial ? "+" : ""} −${changes.deletions}`;
    facts.push({ id: "changes", label: `${plural(changes.files, "file")} ${lines}`, title: `${plural(changes.files, "file")} changed against ${base}${changes.partial ? " (some untracked files not counted)" : ""}` });
  }
  if (changes.uncommittedFiles > 0) facts.push({ id: "uncommitted", label: `${changes.uncommittedFiles} uncommitted`, title: `${plural(changes.uncommittedFiles, "file")} not committed yet` });
  if (changes.commitsAhead > 0) facts.push({ id: "ahead", label: `${plural(changes.commitsAhead, "commit")} ahead`, title: `${plural(changes.commitsAhead, "commit")} ahead of ${base}` });
  return facts;
}
