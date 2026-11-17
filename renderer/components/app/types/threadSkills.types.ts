import type { Conversation, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { ProviderSkill } from "@shared/types/provider/skills.types";

/** The skills the thread's runtime offers in its checkout. */
export type ThreadSkillCatalog =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; skills: ProviderSkill[] };
/** A skill the thread used: `loaded` when the runtime reported loading it, otherwise `read` from its SKILL.md. */
export interface ThreadSkillUse {
  name: string;
  evidence: "loaded" | "read";
  /** Absent when the runtime no longer lists the skill. */
  skill?: ProviderSkill;
  /** Labels of subagents that used it; the main thread is not listed. */
  agents: string[];
  calls: ToolActivity[];
}
export interface ThreadSkillsSummary {
  catalog: ThreadSkillCatalog;
  used: ThreadSkillUse[];
  /** Offered but not used in the loaded history. */
  available: ProviderSkill[];
}
export interface ThreadSkillsInput {
  conversation: Pick<Conversation, "provider" | "workspace">;
  items: readonly TimelineItem[];
}
export interface ThreadSkillsState {
  summary: ThreadSkillsSummary;
  refresh(): void;
}
export interface ThreadSkillsProps { skills: ThreadSkillsState; }
export interface ThreadSkillRowProps { use: ThreadSkillUse; }
export interface ThreadAvailableSkillsProps { skills: readonly ProviderSkill[]; }
