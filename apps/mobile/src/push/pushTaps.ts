import { pushPayloadDataSchema } from "@shared/remote-access/push";
import { routes } from "@/navigation/routes";

/** Where tapping a notification leads: the thread on that computer, or that computer's inbox. Null for anything unrecognised. */
export function pushTapHref(data: unknown): string | null {
  const parsed = pushPayloadDataSchema.safeParse(data);
  if (!parsed.success) return null;
  const { installationId, target } = parsed.data;
  switch (target.kind) {
    case "thread": return routes.conversation(installationId, target.conversationId);
    case "inbox": return routes.inbox(installationId);
  }
}
