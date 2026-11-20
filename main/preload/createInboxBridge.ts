import { inboxChangedChannel, inboxChannel, inboxOpenChannel, inboxOpenSchema, inboxReplySchema } from "@shared/inbox/gateway";
import { inboxSnapshotSchema } from "@shared/inbox/contracts";
import type { InboxBridge, InboxRequest } from "@shared/ipc/types/inboxGateway.types";
import type { InboxSnapshot } from "@shared/types/inbox/inbox.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

async function request(input: InboxRequest): Promise<InboxSnapshot> {
  const reply = inboxReplySchema.safeParse(await invokeIpc(inboxChannel, input));
  if (!reply.success) throw new Error("Nora returned an incompatible response for the inbox");
  if (!reply.data.ok) throw new Error(reply.data.message);
  return reply.data.snapshot;
}

export function createInboxBridge(): InboxBridge {
  return {
    list: () => request({ kind: "list" }),
    execute: (command) => request({ kind: "command", command }),
    onChanged: (listener) => subscribeToIpcEvent<unknown>(inboxChangedChannel, (payload) => {
      const parsed = inboxSnapshotSchema.safeParse(payload);
      if (parsed.success) listener(parsed.data);
    }),
    onOpen: (listener) => subscribeToIpcEvent<unknown>(inboxOpenChannel, (payload) => {
      const parsed = inboxOpenSchema.safeParse(payload);
      if (parsed.success) listener(parsed.data);
    })
  };
}
