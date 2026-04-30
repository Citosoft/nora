import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import type { AgentSession, TerminalSession } from "@shared/appTypes";

export function isBusyTerminalAt(
  terminal: Pick<TerminalSession, "status" | "isBusy">,
  _now: number
): boolean {
  return terminal.status === "running" && terminal.isBusy;
}

export function buildDestroyTerminalGuardMessage(
  terminal: Pick<TerminalSession, "name" | "status" | "isBusy">,
  now: number
): string | null {
  if (!isBusyTerminalAt(terminal, now)) {
    return null;
  }

  return `Terminal "${terminal.name}" is still busy. Close it and stop the running process?`;
}

export function buildDestroyAgentDescription(
  agent: Pick<AgentSession, "status" | "isBusy" | "busyUntil">,
  now: number
): string {
  if (isAgentBusyAt(agent, now)) {
    return "This agent is still working. Destroying it now will stop the current task. If no other agents are attached, Nora will also remove the worktree.";
  }

  return "This will stop the agent. If no other agents are attached, Nora will also remove the worktree.";
}
