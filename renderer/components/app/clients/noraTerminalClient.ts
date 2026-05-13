import type { CreateTerminalPayload } from "@shared/appTypes";
import type { SessionGateway } from "@shared/ipc/types/sessionGateway.types";
import { noraSessionClient } from "./noraSessionClient";

type TerminalGateway = Pick<
  SessionGateway,
  | "renameTerminal"
  | "createTerminal"
  | "focusTerminal"
  | "restartTerminal"
  | "clearTerminal"
  | "destroyTerminal"
  | "openLocalTerminal"
  | "getLocalTerminalState"
  | "onLocalTerminalStateChanged"
  | "onTerminalData"
  | "sendTerminalInput"
  | "getTerminalBuffer"
  | "resizeTerminal"
  | "sendWindowEnter"
  | "restartLocalTerminal"
  | "clearLocalTerminal"
  | "destroyLocalTerminal"
  | "focusWorktree"
>;

export const noraTerminalClient: TerminalGateway = {
  ...noraSessionClient,
  createTerminal: (payload: CreateTerminalPayload) => noraSessionClient.createTerminal(payload)
};
