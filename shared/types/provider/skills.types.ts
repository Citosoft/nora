import type { z } from "zod";
import type { skillSchema, skillsRequestSchema, skillsResultSchema } from "@shared/providers/skills";

export type SkillsRequest = z.infer<typeof skillsRequestSchema>;
export type SkillsResult = z.infer<typeof skillsResultSchema>;
export type ProviderSkill = z.infer<typeof skillSchema>;
