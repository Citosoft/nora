import { z } from "zod";
import type { ProviderSkill, SkillsResult } from "@shared/types/provider/skills.types";
import type { StdioRpc } from "./stdioRpc";

const skillSchema = z.object({ name: z.string().min(1), description: z.string(), shortDescription: z.string().nullish(),
  interface: z.object({ shortDescription: z.string().nullish() }).nullish(),
  scope: z.string(), enabled: z.boolean(), pluginId: z.string().nullish() });
const responseSchema = z.object({ data: z.array(z.object({ cwd: z.string(), skills: z.array(z.unknown()) })) });

/** Maps Codex's SkillScope onto Nora's; plugin ownership wins over the folder the plugin installed into. */
export function normalizeCodexSkill(value: unknown): ProviderSkill | null {
  const parsed = skillSchema.safeParse(value);
  if (!parsed.success || !parsed.data.enabled) return null;
  const skill = parsed.data;
  const description = skill.interface?.shortDescription ?? skill.shortDescription ?? skill.description;
  if (skill.pluginId) return { name: skill.name, description, scope: "plugin", plugin: skill.pluginId };
  const scope = skill.scope === "repo" ? "workspace" : skill.scope === "user" ? "user" : skill.scope === "system" || skill.scope === "admin" ? "system" : "unknown";
  return { name: skill.name, description, scope };
}

export async function readCodexSkills(rpc: StdioRpc, cwd: string, refresh: boolean): Promise<SkillsResult> {
  const response = await rpc.request("skills/list", { cwds: [cwd], forceReload: refresh }, responseSchema);
  const entry = response.data.find((candidate) => candidate.cwd === cwd) ?? response.data[0];
  return { kind: "skills", skills: (entry?.skills ?? []).flatMap((skill) => normalizeCodexSkill(skill) ?? []) };
}
