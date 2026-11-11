import type { ApprovalRequest } from "@shared/types/conversation/contracts.types";
import type { ApprovalAction, ApprovalActionGroups } from "@/components/app/types/nativeActivity.types";

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
