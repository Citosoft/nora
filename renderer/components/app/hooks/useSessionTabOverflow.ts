import { useLayoutEffect, useRef, useState } from "react";
import { partitionSessionTabs } from "@/components/app/logic/sessionTabOverflow";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

export function useSessionTabOverflow(tabs: WorkspaceSessionTab[], activeTabId: string | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setWidth(container.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { containerRef, ...partitionSessionTabs(tabs, activeTabId, width) };
}
