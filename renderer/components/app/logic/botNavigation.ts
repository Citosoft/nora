import { botAvatarStateForStatus } from "./botThreads";
import type { EffectiveBot } from "@shared/types/bots/bots.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";
import type { BotNavigationGroup, BotNavigationItem } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

const URGENCY: readonly BotAvatarState[] = ["waiting", "thinking", "failed", "idle"];
export const NORA_ASSISTANT = { id: "nora", name: "Nora", role: "Your app assistant" } as const;

function aggregateState(threads: readonly ThreadNavigationRow[]): BotAvatarState {
  const states = new Set(threads.filter((row) => row.target.kind === "thread").map((row) => botAvatarStateForStatus(row.status)));
  return URGENCY.find((state) => states.has(state)) ?? "idle";
}

const newestFirst = (rows: readonly ThreadNavigationRow[]): ThreadNavigationRow[] => [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/** Nora first (its threads are every thread without a bot or group), then the workspace's own bots, then global ones. */
export function buildBotNavigation(bots: readonly EffectiveBot[], rows: readonly ThreadNavigationRow[], query: string, workspaceName: string | null): BotNavigationGroup[] {
  const search = query.trim().toLocaleLowerCase();
  const matches = (name: string, role: string): boolean => !search || `${name} ${role}`.toLocaleLowerCase().includes(search);
  const noraThreads = newestFirst(rows.filter((row) => !row.bot && !row.group));
  const nora: BotNavigationItem = { ...NORA_ASSISTANT, avatar: null, model: null, origin: "built-in", threads: noraThreads, state: aggregateState(noraThreads) };
  const items = bots.filter(({ bot }) => matches(bot.name, bot.role)).map(({ bot, origin }): BotNavigationItem => {
    const threads = newestFirst(rows.filter((row) => row.bot?.botId === bot.id));
    return { id: bot.id, name: bot.name, role: bot.role, avatar: bot.avatar, model: bot.binding.model, origin, threads, state: aggregateState(threads) };
  });
  const local = items.filter((item) => item.origin !== "global");
  const global = items.filter((item) => item.origin === "global");
  return [
    ...(matches(nora.name, nora.role) ? [{ id: "built-in" as const, label: null, items: [nora] }] : []),
    ...(local.length ? [{ id: "workspace" as const, label: workspaceName ? `In ${workspaceName}` : "This workspace", items: local }] : []),
    ...(global.length ? [{ id: "global" as const, label: "Everywhere", items: global }] : [])
  ];
}
