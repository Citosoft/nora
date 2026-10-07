import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useWorkspaceSessionContext } from "@/components/app/context/workspaceSessionContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { getBranchCheckoutBlockedReason, getCheckoutableBranches } from "@/components/app/logic/branchCheckout";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import type { SessionBranchCheckoutState, SessionBranchCheckoutTarget } from "@/components/app/types/branchCheckout.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Branch switching for the checkout a session runs in (project root or a worktree). */
export const useSessionBranchCheckout = ({ projectId, workspace, branch }: SessionBranchCheckoutTarget): SessionBranchCheckoutState => {
  const snapshot = useCanonicalAppSnapshot();
  const statusBar = useStatusBar();
  const { onCheckoutSessionBranch } = useWorkspaceSessionContext();
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const statusRequestRef = useRef(0);
  const activeBranch = branch.trim() || null;

  const refreshStatus = useCallback(() => {
    const requestId = ++statusRequestRef.current;
    void noraWorkspaceClient
      .getWorkspaceGitStatusSummary({ projectId, rootPath: workspace })
      .then((summary) => summary.lines.length > 0)
      .catch(() => false)
      .then((isDirty) => {
        // Ignore answers for a checkout the user has already moved away from.
        if (requestId === statusRequestRef.current) {
          setHasUncommittedChanges(isDirty);
        }
      });
  }, [projectId, workspace]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, activeBranch]);

  const checkoutableBranches = useMemo(
    () => getCheckoutableBranches(snapshot?.projectBranches ?? [], activeBranch),
    [activeBranch, snapshot?.projectBranches]
  );
  const blockedReason = getBranchCheckoutBlockedReason({
    hasUncommittedChanges,
    checkoutableBranchCount: checkoutableBranches.length
  });

  const onCheckout = (nextBranch: string) => {
    if (isCheckingOut || blockedReason) {
      return;
    }
    setIsCheckingOut(true);
    const statusId = statusBar.beginStatus(`Checking out ${nextBranch}`, true);
    void onCheckoutSessionBranch({ projectId, branch: nextBranch, rootPath: workspace }).finally(() => {
      setIsCheckingOut(false);
      statusBar.endStatus(statusId);
    });
  };

  return { activeBranch, checkoutableBranches, blockedReason, isCheckingOut, onCheckout, refreshStatus };
};
