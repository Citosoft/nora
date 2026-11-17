import { isAgentBusyAt, nextAgentBusyDelay } from "@/components/app/logic/agentBusy";
import type { AgentAttentionPreviousState, UseAgentAttentionArgs, UseAgentAttentionResult } from "@/components/app/types/attention.types";
import type { AgentSession } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useRef, useState } from "react";

export function useAgentAttention({
  focusedAgentId,
  onAgentCompletion
}: UseAgentAttentionArgs): UseAgentAttentionResult {
  const snapshot = useCanonicalAppSnapshot();
  const [agentsNeedingAttention, setAgentsNeedingAttention] = useState<Record<string, boolean>>({});
  const previousAgentStatesRef = useRef<Record<string, AgentAttentionPreviousState>>({});
  const onAgentCompletionRef = useRef(onAgentCompletion);

  useEffect(() => {
    onAgentCompletionRef.current = onAgentCompletion;
  }, [onAgentCompletion]);

  useEffect(() => {
    if (!snapshot) {
      previousAgentStatesRef.current = {};
      setAgentsNeedingAttention((current) => Object.keys(current).length ? {} : current);
      return;
    }

    let timer: number | undefined;
    const update = (): void => {
      const now = Date.now();
      const completionEvents: AgentSession[] = [];
      const nextAgentStates: Record<string, AgentAttentionPreviousState> = {};

      for (const agent of snapshot.agents) {
        const currentBusy = isAgentBusyAt(agent, now);
        const previous = previousAgentStatesRef.current[agent.id];
        const settledAfterBusy = previous?.isBusy === true && !currentBusy;
        const isMeaningfulCompletion = settledAfterBusy && (previous.status === "running" || agent.status !== "running");

        nextAgentStates[agent.id] = {
          isBusy: currentBusy,
          status: agent.status
        };

        if (isMeaningfulCompletion && agent.id !== focusedAgentId) {
          completionEvents.push(agent);
        }
      }

      setAgentsNeedingAttention((current) => {
        const next: Record<string, boolean> = {};
        const validAgentIds = new Set(snapshot.agents.map((agent) => agent.id));

        for (const [agentId, needsAttention] of Object.entries(current)) {
          if (needsAttention && validAgentIds.has(agentId) && agentId !== focusedAgentId) {
            next[agentId] = true;
          }
        }

        for (const agent of completionEvents) {
          next[agent.id] = true;
        }

        const currentKeys = Object.keys(current);
        const nextKeys = Object.keys(next);
        if (
          currentKeys.length === nextKeys.length &&
          nextKeys.every((agentId) => current[agentId] === next[agentId])
        ) {
          return current;
        }

        return next;
      });

      previousAgentStatesRef.current = nextAgentStates;

      const notifyAgentCompletion = onAgentCompletionRef.current;
      if (notifyAgentCompletion) {
        completionEvents.forEach((agent) => {
          void notifyAgentCompletion(agent);
        });
      }
      const delay = nextAgentBusyDelay(snapshot.agents, now);
      if (delay !== null) timer = window.setTimeout(update, delay);
    };
    update();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [focusedAgentId, snapshot]);

  return { agentsNeedingAttention };
}
