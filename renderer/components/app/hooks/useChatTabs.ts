import { useCallback, useEffect, useMemo, useState } from "react";
import { chatBranchClient } from "@/components/app/clients/chatBranchClient";
import { CHAT_TAB, chatTabThreads, resolveChatTab, startedDrafts } from "@/components/app/logic/chatTabs";
import type { ChatBranchOrigin } from "@shared/types/conversation/contracts.types";
import type { ChatBranchComposerState, ChatBranchDraft, ChatWorkThread } from "@/components/app/types/chatPanels.types";

const EMPTY_COMPOSER: ChatBranchComposerState = { text: "", pending: null };

/** The chat's tabs: the chat, its work threads in the open workspace and draft branches, with each branch tab's unsent text kept while you switch tabs. */
export function useChatTabs(workThreads: readonly ChatWorkThread[], workspaceId: string) {
  const [selected, select] = useState(CHAT_TAB);
  const [drafts, setDrafts] = useState<ChatBranchDraft[]>([]);
  const [composers, setComposers] = useState<Readonly<Record<string, ChatBranchComposerState>>>({});
  // A started branch's draft tab hands over to its thread's tab once the thread is listed.
  useEffect(() => {
    const ready = startedDrafts(drafts, workThreads);
    if (!ready.length) return;
    setDrafts((current) => current.filter((draft) => !ready.includes(draft)));
    const shown = ready.find((draft) => draft.key === selected);
    if (shown?.threadId) select(shown.threadId);
  }, [drafts, workThreads, selected]);
  const tab = resolveChatTab(workThreads, drafts, selected);
  const tabs = useMemo(() => chatTabThreads(workThreads, tab, workspaceId), [workThreads, tab, workspaceId]);
  const startDraft = useCallback((botId: string, from: ChatBranchOrigin | null = null) => {
    const key = `branch:${crypto.randomUUID()}`;
    setDrafts((current) => [...current, { key, botId, from, threadId: null, title: null, naming: !!from }]);
    select(key);
    // A branch from a message is named from it straight away; if naming fails the branch is named from its first message instead.
    if (from) void chatBranchClient.name({ message: from.excerpt }).then((title) => title, () => null).then((title) =>
      setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, title, naming: false } : draft)));
  }, []);
  const markStarted = useCallback((key: string, threadId: string) => {
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, threadId } : draft));
  }, []);
  const closeDraft = useCallback((key: string) => {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
    setComposers(({ [key]: _closed, ...rest }) => rest);
    select((current) => current === key ? CHAT_TAB : current);
  }, []);
  const composer = useCallback((key: string) => composers[key] ?? EMPTY_COMPOSER, [composers]);
  const updateComposer = useCallback((key: string, patch: Partial<ChatBranchComposerState>) => {
    setComposers((current) => ({ ...current, [key]: { ...(current[key] ?? EMPTY_COMPOSER), ...patch } }));
  }, []);
  return { tab, select, tabs, drafts, startDraft, markStarted, closeDraft, composer, updateComposer };
}
