import { personalizationChannel, personalizationReplySchema, personalizationRequestSchema } from "@shared/personalization/gateway";
import type { PersonalizationIpcDeps } from "@main/types/personalization/ipc.types";

/** Paths are supplied by the native picker, never accepted in renderer requests. */
export function registerPersonalizationIpc(deps: PersonalizationIpcDeps): () => void {
  deps.ipc.handle(personalizationChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot access Nora personalization" };
    const parsed = personalizationRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Choose a valid role or workspace" };
    try { return personalizationReplySchema.parse({ ok: true, state: await deps.service.request(parsed.data) }); }
    catch { return { ok: false, message: "Nora could not save this setup. Check workspace storage and try again; your selection is preserved." }; }
  });
  return () => deps.ipc.removeHandler(personalizationChannel);
}
