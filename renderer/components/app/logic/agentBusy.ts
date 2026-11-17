import type { AgentSession } from "@shared/appTypes";

export function isAgentBusyAt(
  agent: Pick<AgentSession, "status" | "isBusy" | "busyUntil">,
  now: number
): boolean {
  const busyUntilAt = agent.busyUntil ? new Date(agent.busyUntil).getTime() : 0;
  return agent.status === "starting" || busyUntilAt > now || (agent.isBusy && !agent.busyUntil);
}


/** No clock is needed for agents whose busy state changes only through pushed snapshots. */
export function nextAgentBusyDelay(agents: readonly Pick<AgentSession, "status" | "busyUntil">[], now: number): number | null {
  let earliest = Infinity;
  for (const agent of agents) {
    if (agent.status === "starting" || !agent.busyUntil) continue;
    const deadline = Date.parse(agent.busyUntil);
    if (deadline > now) earliest = Math.min(earliest, deadline);
  }
  return earliest === Infinity ? null : Math.min(earliest - now, 2_147_483_647);
}
