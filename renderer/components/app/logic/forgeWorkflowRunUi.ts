/** Shared forge workflow/pipeline status → badge variant (Forge panel + run detail). */
export const resolveForgeWorkflowRunBadgeVariant = (
  conclusion: string | null | undefined,
  status: string
): "success" | "warning" | "destructive" | "outline" => {
  const label = (conclusion ?? status).toLowerCase();
  if (label === "success") {
    return "success";
  }
  if (
    label === "queued" ||
    label === "in_progress" ||
    label === "pending" ||
    label === "requested" ||
    label === "waiting" ||
    label === "running" ||
    label === "created" ||
    label === "preparing" ||
    label === "scheduled"
  ) {
    return "warning";
  }
  if (
    label === "failure" ||
    label === "failed" ||
    label === "cancelled" ||
    label === "canceled" ||
    label === "timed_out" ||
    label === "action_required"
  ) {
    return "destructive";
  }
  return "outline";
};
