import type { BotBinding, BotSnapshot } from "@shared/types/bots/bots.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderBindingSeed } from "@/components/app/types/nativePanels.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";
import type { ThreadNavigationStatus } from "@/components/app/types/thread-workspace/ports.types";

export function botBindingSeed(binding: BotBinding): ProviderBindingSeed {
  return { kind: binding.kind, instanceId: binding.instanceId, model: binding.model, reasoning: binding.reasoning, permissionPolicy: binding.permissionPolicy };
}

/** The binding that takes an overridden thread back to its bot's model, keeping the thread's permission policy when the provider is unchanged. */
export function botModelRevertSeed(bot: BotSnapshot, provider: ProviderBinding): ProviderBindingSeed {
  const sameProvider = bot.binding.kind === provider.kind && bot.binding.instanceId === provider.instanceId;
  return { ...botBindingSeed(bot.binding), permissionPolicy: bot.binding.permissionPolicy ?? (sameProvider ? provider.permissionPolicy : null) };
}

/** A bot thread whose provider or model differs from the bot's saved one (B4: explicit, visible overrides). */
export function isBotModelOverride(bot: BotSnapshot, provider: ProviderBinding): boolean {
  return bot.binding.kind !== provider.kind || bot.binding.instanceId !== provider.instanceId || bot.binding.model !== provider.model;
}

const WAITING = new Set<ThreadNavigationStatus>(["Needs approval", "Needs input", "Queue paused", "Delivery unconfirmed", "Outcome unconfirmed"]);
const THINKING = new Set<ThreadNavigationStatus>(["Queued", "Starting", "Working", "Stopping"]);

export function botAvatarStateForStatus(status: ThreadNavigationStatus): BotAvatarState {
  if (status === "Settled") return "settled";
  if (status === "Failed") return "failed";
  if (WAITING.has(status)) return "waiting";
  return THINKING.has(status) ? "thinking" : "idle";
}

/** "Ada", "Ada and Rex", "Ada, Rex and Moss". */
export function memberList(names: readonly string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
