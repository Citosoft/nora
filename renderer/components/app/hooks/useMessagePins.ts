import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findTranscriptElement, scrollTranscriptTo } from "@/components/app/logic/transcriptScroll";
import { MESSAGE_ID_ATTRIBUTE, revealTranscriptMessage } from "@/components/app/logic/messagePins";
import type { PinnedMessage } from "@shared/types/conversation/contracts.types";
import type { MessagePins, MessagePinsInput } from "@/components/app/types/messagePins.types";

const NO_PINS: readonly PinnedMessage[] = [];

/** A thread's pinned messages: pinning and unpinning through thread commands, and jumping to one in the transcript. */
export function useMessagePins({ conversation, items, execute, scrollRef, hasOlderHistory, loadOlder, onNavigate }: MessagePinsInput): MessagePins {
  const pins = conversation?.pinnedMessages ?? NO_PINS;
  const conversationId = conversation?.id ?? null;
  const [seeking, setSeeking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { setSeeking(null); setNotice(null); }, [conversationId]);
  const pinnedIds = useMemo(() => new Set(pins.map((pin) => pin.itemId)), [pins]);
  const toggle = useCallback((itemId: string): void => {
    if (!conversationId) return;
    void execute({ kind: "set-message-pin", commandId: crypto.randomUUID(), conversationId, itemId, pinned: !pinnedIds.has(itemId) });
  }, [conversationId, execute, pinnedIds]);
  // Held in a ref so `reveal` stays stable and the search below only re-runs when the transcript or search changes.
  const navigate = useRef(onNavigate);
  useEffect(() => { navigate.current = onNavigate; }, [onNavigate]);
  /** Scrolls to the message when it is rendered; reports whether it was. */
  const reveal = useCallback((itemId: string): boolean => {
    const scroller = scrollRef.current;
    const target = scroller && findTranscriptElement(scroller, MESSAGE_ID_ATTRIBUTE, itemId);
    if (!scroller || !target) return false;
    navigate.current();
    scrollTranscriptTo(scroller, target);
    revealTranscriptMessage(target);
    return true;
  }, [scrollRef]);
  const loading = useRef(false);
  const countBeforeLoad = useRef<number | null>(null);
  const [loads, setLoads] = useState(0);
  const jumpTo = useCallback((itemId: string): void => {
    setNotice(null);
    countBeforeLoad.current = null;
    if (!reveal(itemId)) setSeeking(itemId);
  }, [reveal]);
  // Each load of earlier history renders more of the transcript: look again, and keep loading until the message shows or history runs out.
  // A load that adds nothing (it failed, and says so in the thread) ends the search rather than retrying forever.
  useEffect(() => {
    if (!seeking || loading.current) return;
    if (reveal(seeking)) { setSeeking(null); return; }
    if (!hasOlderHistory || countBeforeLoad.current === items.length) {
      setSeeking(null);
      setNotice(hasOlderHistory ? "Earlier messages could not be loaded." : "That message is no longer in this thread's history.");
      return;
    }
    loading.current = true;
    countBeforeLoad.current = items.length;
    // The loaded page lands in a transition, so the retry joins it and looks only once the page has rendered.
    void loadOlder().finally(() => { loading.current = false; startTransition(() => setLoads((count) => count + 1)); });
  }, [seeking, items, hasOlderHistory, loadOlder, reveal, loads]);
  const isPinned = useCallback((itemId: string): boolean => pinnedIds.has(itemId), [pinnedIds]);
  return useMemo(() => ({ pins, isPinned, toggle, jumpTo, seeking, notice }), [pins, isPinned, toggle, jumpTo, seeking, notice]);
}
