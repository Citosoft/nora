import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { isPathWithinComparableRoot } from "@shared/pathComparison";

export function workspacesOverlap(left: WorkspaceRef, right: WorkspaceRef): boolean {
  if (left.environmentId !== right.environmentId) return false;
  const options = { windows: process.platform === "win32" };
  return left.checkoutId === right.checkoutId || isPathWithinComparableRoot(left.path, right.path, options)
    || isPathWithinComparableRoot(right.path, left.path, options);
}
