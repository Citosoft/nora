import { useCallback, useEffect, useMemo, useState } from "react";
import { threadRequestTarget } from "@/components/app/logic/thread-workspace/requests";
import { summarizeThreadChanges } from "@/components/app/logic/thread-workspace/insights";
import { summarizeThreadSubagents } from "@/components/app/logic/thread-workspace/subagents";
import { describeChangeRequestCreate } from "@/components/app/logic/thread-workspace/changeRequest";
import { useThreadRead } from "@/components/app/hooks/useThreadRead";
import type { ThreadInsightsInput } from "@/components/app/types/threadInsights.types";
import type { ThreadBranchInsights, ThreadChangeRequestSubmit } from "@/components/app/types/threadForge.types";
import type { ThreadBranchDiffTarget } from "@/components/app/types/centerDiff.types";

const NO_CONNECTIONS = { github: false, gitlab: false } as const;

export function useThreadInsights({ header, items, workspace, hasOlderHistory, forge }: ThreadInsightsInput) {
  const changes = useMemo(() => summarizeThreadChanges(items, hasOlderHistory), [items, hasOlderHistory]);
  const subagents = useMemo(() => summarizeThreadSubagents(items), [items]);
  const [revision, setRevision] = useState(0);
  const [focusRevision, setFocusRevision] = useState(0);
  const target = threadRequestTarget(header?.conversation.workspace, workspace);
  const projectId = target?.projectId ?? null;
  const branch = target?.branch ?? "";
  const checkoutPath = target ? workspace.workspace.path : null;
  const identity = forge && projectId && checkoutPath ? JSON.stringify([projectId, branch, checkoutPath]) : "";
  // Each reviewed turn can change both the branch diff and its change request.
  const reviewKey = items.filter((item) => item.kind === "review").map((item) => item.id).join("\n");
  const requestRevision = `${reviewKey}\n${revision}`;
  const request = useThreadRead(identity && forge && projectId ? () => forge.readBranchRequest(projectId, branch) : null,
    identity, requestRevision, "Change request could not be loaded.");
  // Local Git reads are cheap, so they also follow edits made outside Nora.
  const branchChanges = useThreadRead(identity && forge && projectId && checkoutPath ? () => forge.readBranchChanges(projectId, checkoutPath) : null,
    identity, `${requestRevision}\n${focusRevision}`, "Branch changes could not be loaded.");
  useEffect(() => {
    if (!identity) return;
    const onFocus = () => setFocusRevision((current) => current + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [identity]);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  const createChangeRequest = useCallback(async (payload: ThreadChangeRequestSubmit) => {
    if (!forge || !projectId || !checkoutPath) throw new Error("This thread is not linked to a connected repository.");
    await forge.createChangeRequest(projectId, { ...payload, sourcePath: checkoutPath });
    refresh();
  }, [forge, projectId, checkoutPath, refresh]);
  const create = useMemo(() => describeChangeRequestCreate({ threadBranch: branch, request, changes: branchChanges,
    connections: forge?.connections ?? NO_CONNECTIONS }), [branch, request, branchChanges, forge]);
  const loaded = branchChanges.status === "ready" ? branchChanges.value : null;
  const diffTarget = useMemo<ThreadBranchDiffTarget | null>(() => loaded && projectId && checkoutPath
    ? { projectId, checkoutPath, branch: loaded.branch, baseBranch: loaded.baseBranch } : null,
  [loaded, projectId, checkoutPath]);
  const branchInsights = useMemo<ThreadBranchInsights>(() => ({ request, changes: branchChanges, create, diffTarget, refresh, createChangeRequest }),
    [request, branchChanges, create, diffTarget, refresh, createChangeRequest]);
  return { changes, subagents, branch: branchInsights };
}
