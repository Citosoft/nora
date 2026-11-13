import { nativeBootSchema, personalizationChangedChannel, personalizationChannel, personalizationReplySchema } from "@shared/personalization/gateway";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";
import type { PersonalizationBridge } from "@shared/ipc/types/personalizationGateway.types";
import { invokeIpc } from "./invokeIpc";

export function createPersonalizationBridge(): PersonalizationBridge {
  return { async request(input) {
    const raw: unknown = await invokeIpc(personalizationChannel, input);
    const reply = personalizationReplySchema.safeParse(raw);
    if (!reply.success) throw new Error("Nora setup returned an incompatible response");
    if (!reply.data.ok) throw new Error(reply.data.message);
    return reply.data.state;
  },
  onChanged(listener) {
    return subscribeToIpcEvent<unknown>(personalizationChangedChannel, (payload) => {
      const state = nativeBootSchema.safeParse(payload);
      if (state.success) listener(state.data);
    });
  } };
}
