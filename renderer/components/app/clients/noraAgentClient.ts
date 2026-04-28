import type { CreateAgentPayload } from "@shared/appTypes";
import type { SessionGateway } from "@shared/ipc/types/sessionGateway.types";
import { noraSessionClient } from "./noraSessionClient";

type AgentGateway = Pick<
  SessionGateway,
  | "createAgent"
  | "focusAgent"
  | "restartAgent"
  | "destroyAgent"
  | "sendAgentInput"
  | "sendAgentTerminalInput"
  | "getAgentTerminalBuffer"
  | "getAgentContextPreview"
  | "clearAgentContext"
  | "clearAgentTerminal"
  | "resizeAgentTerminal"
>;

export const noraAgentClient: AgentGateway = {
  ...noraSessionClient,
  createAgent: (payload: CreateAgentPayload) => noraSessionClient.createAgent(payload)
};
