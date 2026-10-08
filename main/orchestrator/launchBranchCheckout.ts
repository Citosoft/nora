import type { CreateAgentPayload, ProjectSummary } from "@shared/appTypes";
import { isGitProject } from "@shared/projectVersionControl";

type LaunchBranchCheckout = NonNullable<CreateAgentPayload["branchCheckout"]>;

/** Returns the trimmed branch checkout to run before a launch, or null when there is nothing to check out. */
export function resolveLaunchBranchCheckout(
  project: ProjectSummary,
  branchCheckout: CreateAgentPayload["branchCheckout"]
): LaunchBranchCheckout | null {
  const branchName = branchCheckout?.branchName.trim();
  if (!branchCheckout || !branchName || !isGitProject(project)) {
    return null;
  }
  return { ...branchCheckout, branchName };
}
