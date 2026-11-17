import { useEffect, useRef, useState } from "react";
import type { TranscriptFollow } from "@/components/app/types/transcriptFollow.types";

/**
 * Keeps a transcript pinned to its newest entry while the reader is at the bottom; scrolling up stops following and
 * new activity offers "Jump to latest" instead of pulling the reader away from what they are reading.
 */
export function useTranscriptFollow(changeKey: unknown): TranscriptFollow {
  const ref = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [newActivity, setNewActivity] = useState(false);
  useEffect(() => {
    if (follow.current) ref.current?.scrollTo({ top: ref.current.scrollHeight });
    else setNewActivity(true);
  }, [changeKey]);
  return { ref, newActivity,
    onWheel: (event) => { if (event.deltaY < 0) follow.current = false; },
    onScroll: () => { const element = ref.current; if (element) follow.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 1; },
    jumpToLatest: () => { follow.current = true; setNewActivity(false); ref.current?.scrollTo({ top: ref.current.scrollHeight }); } };
}
