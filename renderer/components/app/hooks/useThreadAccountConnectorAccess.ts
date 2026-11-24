import { useContext, useRef } from "react";
import { accountConnectorsForBot } from "@shared/bots/connectorSelection";
import { connectorSubjectOf } from "@shared/connectors/access";
import { threadAccountConnectorAccess } from "@/components/app/logic/threadConnectors";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { AccountConnectorAccess } from "@/components/app/types/threadConnectors.types";

/** The account connectors a thread's runs get, read from the live bot like the run itself; the same object while the choice is unchanged. */
export function useThreadAccountConnectorAccess(conversation: Pick<Conversation, "bot" | "group" | "direct" | "chatBranch" | "workspace"> | null): AccountConnectorAccess {
  const runtime = useContext(NativeRuntimeContext);
  const names = conversation?.bot && runtime
    ? accountConnectorsForBot(runtime.boot.personalization.bots, runtime.boot.sharedBots, connectorSubjectOf(conversation)) : [];
  const access = threadAccountConnectorAccess(conversation, names);
  const key = access.kind === "all" ? "all" : JSON.stringify(access.names);
  const stable = useRef({ key, access });
  if (stable.current.key !== key) stable.current = { key, access };
  return stable.current.access;
}
