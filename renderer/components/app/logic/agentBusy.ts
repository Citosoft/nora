import type { AgentSession } from "@shared/appTypes";

export function isAgentBusyAt(
  agent: Pick<AgentSession, "status" | "isBusy" | "busyUntil">,
  now: number
): boolean {
  const busyUntilAt = agent.busyUntil ? new Date(agent.busyUntil).getTime() : 0;
  return agent.status === "starting" || busyUntilAt > now || (agent.isBusy && !agent.busyUntil);
}

