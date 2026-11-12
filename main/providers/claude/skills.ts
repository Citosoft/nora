import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { SlashCommand } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { ProviderSkill, SkillsResult } from "@shared/types/provider/skills.types";
import { withClaudeControlSession } from "./controlSession";

async function exists(file: string): Promise<boolean> {
  return access(file).then(() => true, () => false);
}

/**
 * Claude reports skills by name only. Plugin skills are `plugin:skill`; others are placed by where their
 * folder lives, the checkout's `.claude/skills` taking precedence as Claude Code itself does.
 */
export async function claudeSkillScope(command: Pick<SlashCommand, "name" | "builtin">, cwd: string, home: string): Promise<Pick<ProviderSkill, "scope" | "plugin">> {
  const [plugin, skill] = command.name.split(":", 2);
  if (skill) return { scope: "plugin", plugin };
  if (command.builtin) return { scope: "system" };
  if (await exists(path.join(cwd, ".claude", "skills", command.name, "SKILL.md"))) return { scope: "workspace" };
  if (await exists(path.join(home, ".claude", "skills", command.name, "SKILL.md"))) return { scope: "user" };
  return { scope: "unknown" };
}

/** Reads the skills a session in `cwd` would offer, without sending a prompt; Claude rescans skill folders on every read. */
export function createClaudeSkills(runtime: ClaudeRuntimeOptions, home = homedir()): (cwd: string) => Promise<SkillsResult> {
  return async (cwd) => {
    try {
      const commands = await withClaudeControlSession(runtime, cwd, async (session) => (await session.reloadSkills()).skills);
      const skills = await Promise.all(commands.map(async (command): Promise<ProviderSkill> => ({ name: command.name, description: command.description,
        ...await claudeSkillScope(command, cwd, home) })));
      return { kind: "skills", skills };
    } catch {
      return { kind: "unavailable", message: "Claude skill discovery is unavailable. Check the configured runtime, then refresh." };
    }
  };
}
