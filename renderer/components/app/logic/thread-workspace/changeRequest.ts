import type { ForgeProvider } from "@shared/appTypes";
import type {
  ThreadChangeRequestCreate,
  ThreadChangeRequestCreateInput,
  ThreadChangeRequestNoun
} from "@/components/app/types/threadForge.types";

const PROVIDER_LABELS: Record<ForgeProvider, string> = { github: "GitHub", gitlab: "GitLab" };

export function changeRequestNoun(provider: ForgeProvider | null): ThreadChangeRequestNoun {
  return provider === "gitlab" ? "MR" : "PR";
}

/** Open or draft requests already cover the branch; closed and merged ones leave room for a new one. */
function hasActiveRequest(input: ThreadChangeRequestCreateInput): boolean {
  return input.request.status === "ready" && !!input.request.value?.pullRequestNumber
    && (input.request.value.state === "open" || input.request.value.state === "draft");
}

export function describeChangeRequestCreate(input: ThreadChangeRequestCreateInput): ThreadChangeRequestCreate {
  if (hasActiveRequest(input) || input.changes.status !== "ready" || !input.changes.value) return { kind: "hidden" };
  const changes = input.changes.value;
  const noun = changeRequestNoun(changes.provider);
  const blocked = (message: string, connect: ForgeProvider | null = null): ThreadChangeRequestCreate => ({ kind: "blocked", message, connect });
  if (!changes.provider) return blocked("No GitHub or GitLab remote is configured for this repository.");
  if (!input.connections[changes.provider]) return blocked(`Connect ${PROVIDER_LABELS[changes.provider]} to create ${noun}s from threads.`, changes.provider);
  if (changes.branch !== input.threadBranch) return blocked(`This checkout moved to ${changes.branch}.`);
  if (!changes.baseBranch) return blocked("No default branch was found to compare with.");
  if (changes.branch === changes.baseBranch) return blocked(`Work on a branch other than ${changes.baseBranch} to open a ${noun}.`);
  if (!changes.commitsAhead) {
    return blocked(changes.uncommittedFiles ? `Commit these changes to open a ${noun}.` : `No commits ahead of ${changes.baseBranch} yet.`);
  }
  return { kind: "ready", provider: changes.provider, noun, branch: changes.branch, baseBranch: changes.baseBranch, branches: changes.branches };
}
