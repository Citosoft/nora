import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { TitleBarControlsProps } from "@/components/app/types/windowChrome.types";
import { Copy, Minus, Square, X } from "lucide-react";

export function TitleBarControls({
  useMacTitleBarChrome,
  isMaximized,
  iconToneClass
}: TitleBarControlsProps) {
  if (useMacTitleBarChrome) {
    return (
      <div className="app-no-drag flex items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => void noraSystemClient.closeWindow()}
          aria-label="Close window"
          className="size-3 rounded-full bg-[#ff5f57] transition hover:brightness-95"
        />
        <button
          type="button"
          onClick={() => void noraSystemClient.minimizeWindow()}
          aria-label="Minimize window"
          className="size-3 rounded-full bg-[#febc2e] transition hover:brightness-95"
        />
        <button
          type="button"
          onClick={() => void noraSystemClient.toggleMaximizeWindow()}
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
          className="size-3 rounded-full bg-[#28c840] transition hover:brightness-95"
        />
      </div>
    );
  }

  return (
    <div className="app-no-drag flex items-center">
      <button
        type="button"
        className={`grid h-8 w-10 shrink-0 place-items-center self-center ${iconToneClass} transition hover:bg-accent hover:text-foreground`}
        onClick={() => void noraSystemClient.minimizeWindow()}
        aria-label="Minimize window"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        type="button"
        className={`grid h-8 w-10 shrink-0 place-items-center self-center ${iconToneClass} transition hover:bg-accent hover:text-foreground`}
        onClick={() => void noraSystemClient.toggleMaximizeWindow()}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
      >
        {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
      </button>
      <button
        type="button"
        className={`grid h-8 w-10 shrink-0 place-items-center self-center ${iconToneClass} transition hover:bg-destructive/80 hover:text-destructive-foreground`}
        onClick={() => void noraSystemClient.closeWindow()}
        aria-label="Close window"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

