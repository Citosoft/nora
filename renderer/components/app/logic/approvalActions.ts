import type { ApprovalRequest } from "@shared/types/conversation/contracts.types";
import type { ApprovalAction, ApprovalActionGroups, CompactApprovalActions } from "@/components/app/types/nativeActivity.types";

export function groupApprovalActions(options: ApprovalRequest["options"]): ApprovalActionGroups {
  const actions = options.map((option): ApprovalAction => ({ option, intent: option.intent
    ?? (["allow", "accept", "acceptForSession"].includes(option.id) ? "allow"
      : ["deny", "decline"].includes(option.id) ? "deny" : option.id === "cancel" ? "cancel" : "other") }));
  const allowed = actions.filter((action) => action.intent === "allow");
  // Prefer the narrowest permission for the prominent action.
  const primary = allowed.find(({ option }) => option.scope === "once")
    ?? allowed.find(({ option }) => !option.scope && option.id !== "acceptForSession")
    ?? allowed.find(({ option }) => option.scope === "session" || option.id === "acceptForSession") ?? allowed[0] ?? null;
  return {
    primary,
    secondary: actions.filter((action) => action !== primary && action.intent !== "deny" && action.intent !== "cancel"),
    negative: actions.filter((action) => action.intent === "deny" || action.intent === "cancel")
  };
}

/** For a one-line row: the narrowest Allow, a plain Decline, and every other choice (session or always allow, Stop task) for a menu. */
export function compactApprovalActions(options: ApprovalRequest["options"]): CompactApprovalActions {
  const { primary, secondary, negative } = groupApprovalActions(options);
  const decline = negative.find((action) => action.intent === "deny") ?? null;
  return { allow: primary, decline, more: [...secondary, ...negative.filter((action) => action !== decline)] };
}
