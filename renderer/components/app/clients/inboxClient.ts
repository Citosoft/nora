import type { InboxBridge } from "@shared/ipc/types/inboxGateway.types";

export const inboxClient: InboxBridge = {
  list: () => window.nora.inbox.list(),
  execute: (command) => window.nora.inbox.execute(command),
  onChanged: (listener) => window.nora.inbox.onChanged(listener),
  onOpen: (listener) => window.nora.inbox.onOpen(listener)
};
