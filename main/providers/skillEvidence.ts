import type { ToolDetails } from "@shared/types/conversation/contracts.types";

/** Skills live in a folder named after the skill, holding a SKILL.md; reading that file means the skill was read. */
const skillFilePattern = /(?:^|[\s'"=:(])(?:[^\s'"=:()]*[\\/])?([^\s'"=:()\\/]+)[\\/]SKILL\.md(?=$|[\s'"):;|&])/;

/** The skill whose SKILL.md a command or file path reads, as `read` evidence for tool details. */
export function skillReadEvidence(text: string | undefined): Pick<ToolDetails, "skill"> {
  const name = text ? skillFilePattern.exec(text)?.[1] : undefined;
  return name ? { skill: { name, evidence: "read" } } : {};
}
