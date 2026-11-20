import { useContext } from "react";
import { connectorIdsForBot } from "@shared/bots/connectorSelection";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";

/** The standalone thread simulator has no runtime; it must not imply access for a bot it cannot resolve. */
export function useBotConnectorIds(subject: ConnectorSubject): readonly string[] | undefined {
  const runtime = useContext(NativeRuntimeContext);
  if (!subject.botId) return undefined;
  if (!runtime) return [];
  return connectorIdsForBot(runtime.boot.personalization.bots, runtime.boot.sharedBots, subject);
}
