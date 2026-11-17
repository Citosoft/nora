import { remoteAccessChangedChannel, remoteAccessChannel, remoteAccessReplySchema, remoteAccessViewSchema } from "@shared/remote-access/gateway";
import type { RemoteAccessBridge } from "@shared/ipc/types/remoteAccessGateway.types";
import type { RemoteAccessReply, RemoteAccessRequest, RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

async function send(input: RemoteAccessRequest): Promise<RemoteAccessReply> {
  const reply = remoteAccessReplySchema.safeParse(await invokeIpc(remoteAccessChannel, input));
  if (!reply.success) throw new Error("Nora returned an incompatible response for remote access");
  if (!reply.data.ok) throw new Error(reply.data.message);
  return reply.data;
}

export function createRemoteAccessBridge(): RemoteAccessBridge {
  return {
    async request(input) {
      const reply = await send(input);
      if (!("view" in reply)) throw new Error("Nora returned an incompatible response for remote access");
      return reply.view;
    },
    async activity(limit) {
      const reply = await send(limit === undefined ? { kind: "activity" } : { kind: "activity", limit });
      if (!("activity" in reply)) throw new Error("Nora returned an incompatible response for remote access");
      return reply.activity;
    },
    onChanged: (listener) => subscribeToIpcEvent<RemoteAccessView>(remoteAccessChangedChannel, (input) => {
      const view = remoteAccessViewSchema.safeParse(input);
      if (view.success) listener(view.data);
    })
  };
}
