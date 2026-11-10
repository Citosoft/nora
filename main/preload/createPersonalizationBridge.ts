import { personalizationChannel, personalizationReplySchema } from "@shared/personalization/gateway";
import type { PersonalizationBridge } from "@shared/ipc/types/personalizationGateway.types";
import { invokeIpc } from "./invokeIpc";

export function createPersonalizationBridge(): PersonalizationBridge {
  return { async request(input) {
    const raw: unknown = await invokeIpc(personalizationChannel, input);
    const reply = personalizationReplySchema.safeParse(raw);
    if (!reply.success) throw new Error("Nora setup returned an incompatible response");
    if (!reply.data.ok) throw new Error(reply.data.message);
    return reply.data.state;
  } };
}
