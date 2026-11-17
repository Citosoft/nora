import { X } from "lucide-react";
import type { ChatTabCloseButtonProps } from "@/components/app/types/chatPanels.types";

/** The × beside a chat tab; a sibling of the tab trigger, since a button cannot sit inside another. */
export function ChatTabCloseButton({ label, disabled, onClose }: ChatTabCloseButtonProps) {
  return <button type="button" onClick={onClose} disabled={disabled} aria-label={label} title={label}
    className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">
    <X className="size-3" aria-hidden="true" /></button>;
}
