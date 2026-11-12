import { useCallback, useEffect, useMemo, useState } from "react";
import { summarizeThreadSkills } from "@/components/app/logic/thread-workspace/skills";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { ThreadSkillCatalog, ThreadSkillsInput, ThreadSkillsState } from "@/components/app/types/threadSkills.types";

/**
 * Lists the skills the thread's own runtime offers in its checkout and marks the ones the thread used.
 * Discovery is keyed on the runtime and checkout, so streaming updates only re-derive usage.
 */
export function useThreadSkills(client: Pick<ConversationClient, "skills">, input: ThreadSkillsInput | null): ThreadSkillsState | null {
  const provider = input?.conversation.provider;
  const workspace = input?.conversation.workspace;
  const [catalog, setCatalog] = useState<ThreadSkillCatalog>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const selection = useMemo(() => provider && workspace ? { schemaVersion: 1 as const, environmentId: workspace.environmentId,
    providerKind: provider.kind, instanceId: provider.instanceId, workspace } : null,
  [provider?.kind, provider?.instanceId, workspace?.environmentId, workspace?.checkoutId, workspace?.path]);
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setCatalog({ status: "loading" });
    void client.skills({ ...selection, refresh: revision > 0 }).then((result) => {
      if (!cancelled) setCatalog(result.kind === "skills" ? { status: "ready", skills: result.skills } : { status: "unavailable", message: result.message });
    }).catch((cause: unknown) => {
      if (!cancelled) setCatalog({ status: "unavailable", message: cause instanceof Error ? cause.message : "Skills could not be loaded." });
    });
    return () => { cancelled = true; };
  }, [client, selection, revision]);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  const items = input?.items;
  const summary = useMemo(() => summarizeThreadSkills(items ?? [], catalog), [items, catalog]);
  return useMemo(() => selection ? { summary, refresh } : null, [selection, summary, refresh]);
}
