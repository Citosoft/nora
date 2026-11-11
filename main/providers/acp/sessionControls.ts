import type { SessionConfigOption, SessionConfigSelectOption } from "@agentclientprotocol/sdk";
import type { AcpControlChange, AcpControlPlan, AcpControlResolution, AcpSessionSetup } from "@main/types/execution/acp.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

/** Used when an agent exposes no model or mode choice: the session keeps whatever the agent is configured with. */
export const ACP_AGENT_DEFAULT = "agent-default";

type SelectOption = Extract<SessionConfigOption, { type: "select" }>;

function selectOption(setup: AcpSessionSetup, category: string): SelectOption | null {
  return setup.configOptions?.find((option): option is SelectOption => option.type === "select" && option.category === category) ?? null;
}

function choices(option: SelectOption): SessionConfigSelectOption[] {
  return option.options.flatMap((entry) => "group" in entry ? entry.options : [entry]);
}

/** Models come from the `model` config option, reasoning from `thought_level`, policies from session modes. */
export function acpControlPlan(setup: AcpSessionSetup, label: string): AcpControlPlan {
  const model = selectOption(setup, "model");
  const thought = selectOption(setup, "thought_level");
  const reasoningEfforts = thought ? choices(thought).map((choice) => choice.value) : [];
  const defaultReasoningEffort = thought?.currentValue ?? null;
  const models = model
    ? choices(model).map((choice) => ({ id: choice.value, name: choice.name, description: choice.description ?? "", reasoningEfforts, defaultReasoningEffort }))
    : [{ id: ACP_AGENT_DEFAULT, name: `${label} default`, description: `The model configured in ${label}`, reasoningEfforts, defaultReasoningEffort }];
  const modeOption = selectOption(setup, "mode");
  const policies = setup.modes?.availableModes.length ? setup.modes.availableModes.map((mode) => ({ id: mode.id, label: mode.name }))
    : modeOption ? choices(modeOption).map((choice) => ({ id: choice.value, label: choice.name }))
    : [{ id: ACP_AGENT_DEFAULT, label: "Agent default" }];
  return { models, policies };
}

function configChange(option: SelectOption | null, value: string): AcpControlChange | "unsupported" | null {
  if (!option || !choices(option).some((choice) => choice.value === value)) return "unsupported";
  return option.currentValue === value ? null : { kind: "config", configId: option.id, value };
}

/** The calls needed to apply a conversation's binding to a fresh or resumed session, or why it cannot be applied. */
export function acpControlChanges(setup: AcpSessionSetup, binding: Pick<ProviderBinding, "model" | "reasoning" | "permissionPolicy">): AcpControlResolution {
  const changes: AcpControlChange[] = [];
  if (binding.permissionPolicy !== ACP_AGENT_DEFAULT) {
    if (setup.modes?.availableModes.some((mode) => mode.id === binding.permissionPolicy)) {
      if (setup.modes.currentModeId !== binding.permissionPolicy) changes.push({ kind: "mode", modeId: binding.permissionPolicy });
    } else {
      const change = configChange(selectOption(setup, "mode"), binding.permissionPolicy);
      if (change === "unsupported") return { ok: false, message: "Select a permission mode this agent offers before sending" };
      if (change) changes.push(change);
    }
  }
  if (binding.model !== ACP_AGENT_DEFAULT) {
    const change = configChange(selectOption(setup, "model"), binding.model);
    if (change === "unsupported") return { ok: false, message: "Select a model this agent offers before sending" };
    if (change) changes.push(change);
  }
  if (binding.reasoning) {
    const change = configChange(selectOption(setup, "thought_level"), binding.reasoning);
    if (change === "unsupported") return { ok: false, message: "Select a reasoning level this agent offers before sending" };
    if (change) changes.push(change);
  }
  return { ok: true, changes };
}
