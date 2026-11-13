import { useOptionalCenterDiffPorts } from "@/components/app/context/centerDiffContext";
import { FullDiffViewer } from "@/components/app/panels/FullDiffViewer";
import { ThreadBranchDiffView } from "@/components/app/panels/ThreadBranchDiffView";
import type { CenterFullDiffProps } from "@/components/app/types/centerDiff.types";

/** The center full-diff slot: a thread's branch when one was opened, otherwise the active workspace's changes. */
export function CenterFullDiff({ snapshotChanges, resolvedTheme }: CenterFullDiffProps) {
  const source = useOptionalCenterDiffPorts()?.source;
  return source?.kind === "branch"
    ? <ThreadBranchDiffView key={`${source.target.projectId}\n${source.target.checkoutPath}`} target={source.target} resolvedTheme={resolvedTheme} />
    : <FullDiffViewer changes={snapshotChanges} resolvedTheme={resolvedTheme} />;
}
