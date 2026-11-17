import { snapshotBot } from "@shared/bots/snapshot";
import { assertLoopReviewer } from "@shared/loopStages";
import type { LoopRoleDefinition } from "@shared/appTypes";
import type { LoopRunnerDeps, ResolvedLoopStage } from "@main/types/loopRunner.types";

/** Resolve bots once per run so edits or deletions cannot change a run already in progress. */
export function resolveLoopStages(stages: readonly LoopRoleDefinition[], projectId: string,
  resolveBot: LoopRunnerDeps["resolveBot"]): ResolvedLoopStage[] {
  if (!stages.length) throw new Error("A workflow needs at least one stage.");
  return stages.map((stage) => {
    if (!stage.botId) return stage;
    const definition = resolveBot?.(projectId, stage.botId);
    if (!definition) throw new Error(`Bot "${stage.botId}" is unavailable in this workspace.`);
    const bot = snapshotBot(definition);
    if (stage.kind === "reviewer") assertLoopReviewer(bot.binding.kind, bot.name);
    return { ...stage, toolId: bot.binding.kind,
      model: bot.binding.model, botSnapshot: bot };
  });
}
