import { directContextChannel, directContextReplySchema } from "@shared/bots/direct/contextGateway";
import type { DirectContextBridge } from "@shared/ipc/types/directContextGateway.types";
import { invokeIpc } from "./invokeIpc";

export function createDirectContextBridge(): DirectContextBridge {
  return {
    async preview(input) {
      const reply = directContextReplySchema.safeParse(await invokeIpc(directContextChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for the context preview");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.preview;
    }
  };
}
