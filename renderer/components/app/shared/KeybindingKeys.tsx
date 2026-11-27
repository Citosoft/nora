import { useKeybindings } from "@/components/app/hooks/useKeybindings";
import { formatKeybindingParts } from "@/components/app/logic/keybindings/keybindingMatching";
import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";

/** A command's current chord as key caps (`⌘` `⇧` `K`, or `Ctrl + Shift + K`); renders nothing when unbound. */
export function KeybindingKeys({ commandId }: { commandId: KeybindingCommandId }) {
  const { byId, platform } = useKeybindings();
  const parts = formatKeybindingParts(byId.get(commandId), platform);
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && platform !== "darwin" ? <span className="text-[9px] text-muted-foreground">+</span> : null}
          <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] leading-none text-foreground">
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}
