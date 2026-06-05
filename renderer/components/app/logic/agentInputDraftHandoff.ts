import type { AgentInputDraftHandoffPayload } from "@/components/app/types/agentInputDraftHandoff.types";

export const AGENT_INPUT_DRAFT_HANDOFF_EVENT = "nora:agent-input-draft-handoff";

const STORAGE_PREFIX = "nora.agentInputDraftHandoff.";

function getStorageKey(agentId: string): string {
  return `${STORAGE_PREFIX}${agentId}`;
}

function parsePayload(value: string | null): AgentInputDraftHandoffPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AgentInputDraftHandoffPayload>;
    if (
      typeof parsed.agentId === "string" &&
      typeof parsed.text === "string" &&
      typeof parsed.updatedAt === "string"
    ) {
      return {
        agentId: parsed.agentId,
        text: parsed.text,
        updatedAt: parsed.updatedAt
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function queueAgentInputDraftHandoff(agentId: string, text: string): void {
  if (typeof window === "undefined" || !agentId || !text.trim()) {
    return;
  }

  const payload: AgentInputDraftHandoffPayload = {
    agentId,
    text,
    updatedAt: new Date().toISOString()
  };

  window.sessionStorage.setItem(getStorageKey(agentId), JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent<AgentInputDraftHandoffPayload>(AGENT_INPUT_DRAFT_HANDOFF_EVENT, { detail: payload }));
}

export function consumeQueuedAgentInputDraftHandoff(agentId: string): AgentInputDraftHandoffPayload | null {
  if (typeof window === "undefined" || !agentId) {
    return null;
  }

  const key = getStorageKey(agentId);
  const payload = parsePayload(window.sessionStorage.getItem(key));
  window.sessionStorage.removeItem(key);
  return payload?.agentId === agentId ? payload : null;
}

export function getAgentInputDraftHandoffPayloadFromEvent(event: Event): AgentInputDraftHandoffPayload | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail = event.detail as Partial<AgentInputDraftHandoffPayload>;
  if (
    typeof detail.agentId === "string" &&
    typeof detail.text === "string" &&
    typeof detail.updatedAt === "string"
  ) {
    return {
      agentId: detail.agentId,
      text: detail.text,
      updatedAt: detail.updatedAt
    };
  }

  return null;
}
