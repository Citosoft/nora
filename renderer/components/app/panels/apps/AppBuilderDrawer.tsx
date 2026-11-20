import { X } from "lucide-react";
import type { AppBuilderDrawerProps } from "@/components/app/types/appsBuilder.types";
import { Button } from "@/components/ui/button";
import { ThreadViewContent } from "../threads/ThreadViewContent";

/** The builder thread, slid in from the right when wanted. It stays mounted while hidden so the chat keeps its place. */
export function AppBuilderDrawer({ documentId, open, onClose }: AppBuilderDrawerProps) {
  return <aside aria-label="Builder chat" aria-hidden={!open} inert={!open}
    className={`app-builder-drawer absolute inset-y-0 right-0 z-30 flex w-[min(34rem,85%)] flex-col border-l border-border/60 bg-background shadow-panel ${open ? "app-builder-drawer-open" : ""}`}>
    <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
      <span className="text-sm font-medium">Builder chat</span>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Hide chat" onClick={onClose}><X className="size-4" aria-hidden="true" /></Button>
    </div>
    <div className="flex min-h-0 flex-1 flex-col"><ThreadViewContent documentId={documentId} /></div>
  </aside>;
}
