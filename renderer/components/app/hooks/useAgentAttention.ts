import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import type { UseAgentAttentionArgs, UseAgentAttentionResult } from "@/components/app/types/attention.types";
import type { AgentSession } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useRef, useState } from "react";

const ATTENTION_POLL_INTERVAL_MS = 250;

export function useAgentAttention({
  focusedAgentId,
  onAgentCompletion
}: UseAgentAttentionArgs): UseAgentAttentionResult {
  const snapshot = useCanonicalAppSnapshot();
  const [now, setNow] = useState(() => Date.now());
  const [agentsNeedingAttention, setAgentsNeedingAttention] = useState<Record<string, boolean>>({});
  const previousAgentStatesRef = useRef<Record<string, { isBusy: boolean; status: AgentSession["status"] }>>({});
  const onAgentCompletionRef = useRef(onAgentCompletion);

  useEffect(() => {
    onAgentCompletionRef.current = onAgentCompletion;
  }, [onAgentCompletion]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, ATTENTION_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!snapshot) {
      previousAgentStatesRef.current = {};
      setAgentsNeedingAttention({});
      return;
    }

    const completionEvents: AgentSession[] = [];
    const nextAgentStates: Record<string, { isBusy: boolean; status: AgentSession["status"] }> = {};

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
  }, [focusedAgentId, now, snapshot]);

  return { agentsNeedingAttention };
}
