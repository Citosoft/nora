import { useMemo } from "react";
import { createOutputHost } from "@/components/app/logic/thread-workspace/openOutput";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { OutputHost } from "@/components/app/types/toolImage.types";

/** One stable output host per thread, so previews reload only when the thread changes. */
export function useOutputHost(client: ConversationClient, conversationId: string | null): OutputHost | null {
  return useMemo(() => conversationId ? createOutputHost(client, conversationId) : null, [client, conversationId]);
}
