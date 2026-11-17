import { useLayoutEffect, useRef } from "react";
import type { ThreadTitleProps } from "@/components/app/types/thread-workspace/threadTitle.types";

export function ThreadTitle({ title, unread }: ThreadTitleProps) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const text = textRef.current;
    if (!viewport || !text) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const distance = Math.max(0, text.scrollWidth - viewport.clientWidth);
      viewport.dataset.overflow = String(distance > 0);
      text.style.setProperty("--thread-title-distance", `${-distance}px`);
      text.style.setProperty("--thread-title-duration", `${Math.max(2, distance / 30 + 1)}s`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    // Font changes can alter overflow without changing the available row width.
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [title, unread]);

  return <span ref={viewportRef} className={`thread-title min-w-0 flex-1 overflow-hidden text-sm ${unread ? "font-medium" : ""}`}>
    <span ref={textRef} className="thread-title-text block truncate">{title}</span>
  </span>;
}
