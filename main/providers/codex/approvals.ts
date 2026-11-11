import { z } from "zod";
import type { CodexApproval } from "@main/types/execution/codex.types";
import type { JsonValue } from "@main/types/execution/rpc.types";
import type { ApprovalRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import { formatToolInput } from "../toolPresentation";

const decisionSchema = z.union([
  z.enum(["accept", "acceptForSession", "decline", "cancel"]),
  z.object({ acceptWithExecpolicyAmendment: z.object({ execpolicy_amendment: z.array(z.string()) }) }),
  z.object({ applyNetworkPolicyAmendment: z.object({ network_policy_amendment: z.object({ host: z.string(), action: z.enum(["allow", "deny"]) }) }) })
]);
const approvalSchema = z.object({ turnId: z.string(), itemId: z.string(), command: z.string().nullable().optional(),
  reason: z.string().nullable().optional(), cwd: z.string().nullable().optional(), grantRoot: z.string().nullable().optional(),
  networkApprovalContext: z.object({ host: z.string(), protocol: z.string() }).nullable().optional(),
  additionalPermissions: z.json().optional(), availableDecisions: z.array(z.json()).nullable().optional() });

export function normalizeCodexApproval(method: string, params: JsonValue, turnId: string | null, items: ReadonlyMap<string, TimelineItem>, runId: string): CodexApproval {
  const native = approvalSchema.parse(params);
  if (native.turnId !== turnId) throw new Error("Stale approval");
  const item = items.get(JSON.stringify([runId, native.itemId]));
  const fileChange = method === "item/fileChange/requestApproval";
  const network = native.networkApprovalContext;
  const options: ApprovalRequest["options"] = [];
  const decisions: Record<string, JsonValue> = {};
  for (const [index, value] of (native.availableDecisions ?? ["accept", "acceptForSession", "decline", "cancel"]).entries()) {
    const parsed = decisionSchema.safeParse(value);
    if (!parsed.success) continue;
    const decision = parsed.data;
    const id = typeof decision === "string" ? decision : `decision:${index}`;
    decisions[id] = decision;
    if (typeof decision === "string") {
      const intent = decision === "decline" ? "deny" : decision === "cancel" ? "cancel" : "allow";
      options.push({ id, intent, label: decision === "accept" ? "Allow once" : decision === "acceptForSession" ? "Allow for this session" : decision === "decline" ? "Decline" : "Stop task",
        ...(intent === "allow" ? { scope: decision === "acceptForSession" ? "session" : "once" } : {}),
        description: decision === "acceptForSession" ? "Also allow matching requests for the rest of this session."
          : decision === "cancel" ? "Decline this action and interrupt the current task." : decision === "decline" ? "Decline this action; the agent may continue." : "Allow only this action." });
    } else if ("acceptWithExecpolicyAmendment" in decision) {
      options.push({ id, intent: "allow", scope: "persistent", label: "Always allow matching commands",
        description: `Save a rule for: ${decision.acceptWithExecpolicyAmendment.execpolicy_amendment.join(" ")}` });
    } else {
      const amendment = decision.applyNetworkPolicyAmendment.network_policy_amendment;
      options.push({ id, intent: amendment.action === "allow" ? "allow" : "deny", scope: "persistent",
        label: amendment.action === "allow" ? "Always allow this host" : "Always deny this host", description: `Save a network rule for ${amendment.host}.` });
    }
  }
  if (!options.length) throw new Error("Unsupported native approval options");
  const command = native.command ?? (item?.kind === "tool" ? item.details?.input : undefined);
  const workingDirectory = native.cwd ?? (item?.kind === "tool" ? item.details?.detail : undefined);
  return { decisions, request: { title: network ? "Allow network access?" : fileChange ? "Allow file changes?" : "Allow this command?", options,
    details: { kind: network ? "network" : fileChange ? "files" : "command", ...(!network && command ? { command } : {}),
      ...(!network && workingDirectory ? { workingDirectory } : {}), ...(native.reason ? { reason: native.reason } : {}),
      ...(item?.kind === "changes" ? { paths: item.paths } : {}),
      ...(network ? { target: `${network.protocol}://${network.host}` } : native.grantRoot ? { target: native.grantRoot } : {}),
      ...(native.additionalPermissions != null ? { input: formatToolInput(native.additionalPermissions) } : {}) } } };
}
