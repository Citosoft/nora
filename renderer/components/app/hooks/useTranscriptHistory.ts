import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { buildHistoryPrompts } from "@/components/app/logic/transcript-history/buildHistoryPrompts";
import { visiblePrompts } from "@/components/app/logic/transcript-history/visiblePrompts";
import type { HistoryEntry, HistorySnapshot } from "@/components/app/types/transcript-history/history.types";

export function useTranscriptHistory(scrollRef: RefObject<HTMLDivElement | null>): HistorySnapshot {
  const [snapshot, setSnapshot] = useState<HistorySnapshot>({ prompts: [], visible: [] });
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = scroller?.firstElementChild;
    if (!scroller || !content) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const origin = scroller.getBoundingClientRect().top + scroller.clientTop;
      const entries = Array.from(scroller.querySelectorAll<HTMLElement>("[data-history-prompt], [data-history-output]"))
        .map<HistoryEntry>((element) => element.dataset.historyPrompt !== undefined ? { kind: "prompt", prompt: {
          id: element.dataset.historyPrompt,
          text: element.dataset.historyText || "Attached files or thread references",
          top: element.getBoundingClientRect().top - origin + scroller.scrollTop
        } } : { kind: "output", text: element.dataset.historyOutput ?? "" });
      const prompts = buildHistoryPrompts(entries);
      const visible = visiblePrompts(prompts, scroller.scrollTop, scroller.clientHeight, scroller.scrollHeight);
      setSnapshot((previous) => {
        if (previous.prompts.length === prompts.length && previous.prompts.every((prompt, index) => {
          const next = prompts[index];
          return prompt.id === next.id && prompt.text === next.text && prompt.top === next.top && prompt.output === next.output;
        }) && previous.visible.join("\n") === visible.join("\n")) return previous;
        return { prompts, visible };
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    resize.observe(content);
    const mutation = new MutationObserver(schedule);
    mutation.observe(content, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ["data-history-prompt", "data-history-text", "data-history-output"] });
    scroller.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      scroller.removeEventListener("scroll", schedule);
    };
  }, [scrollRef]);
  return snapshot;
}
