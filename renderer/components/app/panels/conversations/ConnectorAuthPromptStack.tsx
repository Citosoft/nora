import { useMemo } from "react";
import { useConnectorAuthPrompts } from "@/components/app/hooks/useConnectorAuthPrompts";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import type { ConnectorAuthPromptStackProps } from "@/components/app/types/connectorAuthPrompts.types";
import { ConnectorAuthCard } from "./ConnectorAuthCard";

/** Connector authorize prompts waiting on the user for this thread, shown one at a time above the composer. */
export function ConnectorAuthPromptStack({ conversationId }: ConnectorAuthPromptStackProps) {
  const { prompts, answer } = useConnectorAuthPrompts(conversationId);
  const { connectors } = useNoraConnectors();
  const logos = useMemo(() => new Map((connectors ?? []).map((connector) => [connector.id, connector.logo])), [connectors]);
  const prompt = prompts[0];
  if (!prompt) return null;
  return <div className="space-y-2" aria-label="Pending connector authorize requests">
    {prompts.length > 1 && <p role="status" className="text-xs text-muted-foreground">{prompts.length} connector authorize requests pending · Respond one at a time</p>}
    <ConnectorAuthCard key={prompt.id} prompt={prompt} logo={logos.get(prompt.connectorId) ?? prompt.logo} onAnswer={answer} />
  </div>;
}
