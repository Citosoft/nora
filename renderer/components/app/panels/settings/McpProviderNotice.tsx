import type { McpProviderNoticeProps, RuntimeMcpEntry } from "@/components/app/types/runtimeMcp.types";
import { AgentToolIcon } from "@/components/app/shared/Tooling";

type Notice = { text: string; tone: "status" | "warning" | "error" };

function noticeFor({ state }: RuntimeMcpEntry): Notice | null {
  if (state.status === "loading") return { text: "Discovering MCP servers…", tone: "status" };
  if (state.status === "error") return { text: state.message, tone: "error" };
  switch (state.result.kind) {
    case "unavailable": return { text: state.result.message, tone: "warning" };
    case "login": return { text: "Complete sign-in in your browser, then refresh to check its status.", tone: "status" };
    case "servers": return state.result.notice ? { text: state.result.notice, tone: "warning" } : null;
  }
}

const TONE_CLASS_NAMES: Readonly<Record<Notice["tone"], string>> = {
  status: "text-muted-foreground", warning: "text-amber-700 dark:text-amber-300", error: "text-destructive"
};

/** Per-provider discovery status or partial-result explanation, shown above the server table. */
export function McpProviderNotice({ entry }: McpProviderNoticeProps) {
  const notice = noticeFor(entry);
  if (!notice) return null;
  return <p role={notice.tone === "status" ? "status" : "alert"} className={`flex items-start gap-2 text-sm ${TONE_CLASS_NAMES[notice.tone]}`}>
    <AgentToolIcon toolId={entry.source.kind} label="" className="mt-0.5 size-4 shrink-0" imageClassName="size-3.5" />
    <span><span className="font-medium">{entry.source.label}:</span> {notice.text}</span>
  </p>;
}
