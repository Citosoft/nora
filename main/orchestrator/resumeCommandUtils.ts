import type { AgentSession } from "@shared/appTypes";
import { normalizeAgentLaunchCommand } from "./agentLaunch";
import { stripAnsi } from "./shell";

export const getCommandExecutable = (command: string): string => command.trim().split(/\s+/)[0] || "";

export const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const startsWithSingle = trimmed.startsWith("'");
    const endsWithSingle = trimmed.endsWith("'");
    if (startsWithSingle && endsWithSingle) {
      return trimmed.slice(1, -1).trim();
    }
    const startsWithDouble = trimmed.startsWith("\"");
    const endsWithDouble = trimmed.endsWith("\"");
    if (startsWithDouble && endsWithDouble) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
};

export const normalizeStoredResumeSessionId = (value: string): string =>
  stripWrappingQuotes(value).match(/[A-Za-z0-9._:-]+/)?.[0] || "";

export const buildResumeCommand = (
  agent: Pick<AgentSession, "toolId" | "command" | "resumeSessionId" | "resumeCommand">
): string | null => {
  if (agent.resumeCommand?.trim()) {
    return normalizeAgentLaunchCommand(agent.toolId, agent.resumeCommand.trim());
  }

  const resumeSessionId = normalizeStoredResumeSessionId(agent.resumeSessionId || "");
  if (!resumeSessionId) {
    return null;
  }

  const executable = getCommandExecutable(agent.command);
  if (!executable) {
    return null;
  }

  if (agent.toolId === "codex") {
    return normalizeAgentLaunchCommand(agent.toolId, `${executable} resume ${resumeSessionId}`);
  }

  if (agent.toolId === "cursor") {
    return normalizeAgentLaunchCommand(agent.toolId, `agent --resume=${resumeSessionId}`);
  }

  if (agent.toolId === "gemini") {
    return normalizeAgentLaunchCommand(agent.toolId, `${executable} --resume ${resumeSessionId}`);
  }

  return null;
};

export const extractResumeDetails = (
  agent: Pick<AgentSession, "toolId" | "command" | "resumeSessionId" | "resumeCommand">,
  chunk: string
): Pick<AgentSession, "resumeSessionId" | "resumeCommand"> | null => {
  const plainChunk = stripAnsi(chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let resumeSessionId = agent.resumeSessionId;
  let resumeCommand = agent.resumeCommand;
  let changed = false;

  const sessionIdMatch = plainChunk.match(/session id:\s*['"]?([A-Za-z0-9._:-]+)['"]?/i);
  if (sessionIdMatch?.[1] && sessionIdMatch[1] !== resumeSessionId) {
    resumeSessionId = sessionIdMatch[1];
    changed = true;
  }

  const explicitResumeLineMatch = plainChunk.match(/to resume this session:\s*([^\n]+)/i);
  if (explicitResumeLineMatch?.[1]) {
    const nextResumeCommand = explicitResumeLineMatch[1].trim();
    if (nextResumeCommand !== resumeCommand) {
      resumeCommand = nextResumeCommand;
      changed = true;
    }
  }

  const executable = getCommandExecutable(agent.command).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (executable) {
    const resumeCommandMatch = plainChunk.match(
      new RegExp(`\\b(${executable}(?:\\s+--?\\w+(?:[= ]\\S+)*)*\\s+(?:resume\\s+\\S+|--resume(?:=|\\s+)\\S+))`, "i")
    );

    if (resumeCommandMatch?.[1]) {
      const nextResumeCommand = resumeCommandMatch[1].trim();
      if (nextResumeCommand !== resumeCommand) {
        resumeCommand = nextResumeCommand;
        changed = true;
      }

      const trailingIdMatch = nextResumeCommand.match(/(?:resume|--resume)\s+['"]?([A-Za-z0-9._:-]+)['"]?$/i);
      if (trailingIdMatch?.[1] && trailingIdMatch[1] !== resumeSessionId) {
        resumeSessionId = trailingIdMatch[1];
        changed = true;
      }
    }
  }

  if (!resumeCommand) {
    const genericResumeCommandMatch = plainChunk.match(/\b((?:agent|cursor-agent|cursor)\s+--resume(?:=|\s+)\S+)/i);
    if (genericResumeCommandMatch?.[1]) {
      const nextResumeCommand = genericResumeCommandMatch[1].trim();
      if (nextResumeCommand !== resumeCommand) {
        resumeCommand = nextResumeCommand;
        changed = true;
      }
    }
  }

  const resumeIdFromCommand = (resumeCommand || "").match(/(?:resume\s+|--resume(?:=|\s+))['"]?([A-Za-z0-9._:-]+)['"]?$/i);
  if (resumeIdFromCommand?.[1] && resumeIdFromCommand[1] !== resumeSessionId) {
    resumeSessionId = resumeIdFromCommand[1];
    changed = true;
  }

  if (!changed) {
    return null;
  }

  return {
    resumeSessionId,
    resumeCommand
  };
};
