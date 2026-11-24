import { useEffect, useRef, useState } from "react";
import { Laptop, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopoverMenu, PopoverMenuItem } from "@/components/ui/popover-menu";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
import { validateRuntimeName } from "@/components/app/logic/remote-access/presentation";
import type { RemoteAccessControls } from "@/components/app/types/remoteAccess.types";
import { settingRevealHighlightClassName } from "./settingsUi";
import { RemoteResetDialog } from "./RemoteResetDialog";

/** This computer's runtime name, with rename and reset-connection actions in an overflow menu. */
export function RemoteRuntimeHeader({ controls }: { controls: RemoteAccessControls }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editing && restoreFocus.current) { menuButton.current?.focus(); restoreFocus.current = false; }
  }, [editing]);
  const view = controls.view;
  const runtimeName = view?.runtime?.name ?? "This computer";
  const error = validateRuntimeName(name);
  const finish = () => { restoreFocus.current = true; setEditing(false); };
  return <div {...settingAnchorAttributes("Runtime name")} className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-1 ${settingRevealHighlightClassName}`}>
    {editing ? <form className="flex min-w-0 flex-1 items-start gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (!error) void controls.request({ kind: "rename", name: name.trim() }).then((saved) => { if (saved) finish(); });
    }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); finish(); } }}>
      <div className="min-w-0 flex-1 space-y-1">
        <Input autoFocus aria-label="Runtime name" aria-invalid={!!error} aria-describedby={error ? "runtime-name-error" : undefined} value={name} onChange={(event) => setName(event.target.value)} maxLength={64} disabled={controls.pending} />
        {error ? <p id="runtime-name-error" className="text-sm text-destructive">{error}</p> : null}
      </div>
      <Button size="sm" disabled={!!error || controls.pending}>Save</Button>
      <Button type="button" variant="outline" size="sm" onClick={finish} disabled={controls.pending}>Cancel</Button>
    </form> : <div className="flex min-w-0 items-center gap-3 text-foreground">
      <Laptop className="size-5 shrink-0" aria-hidden="true" />
      <h2 className="truncate text-xl font-semibold" title="The name shown when you choose this computer on another device.">{runtimeName}</h2>
    </div>}
    {view?.runtime || view?.enabled ? <div {...settingAnchorAttributes("Reset connection")}>
      <PopoverMenu label="Remote access actions" trigger={<Button ref={menuButton} variant="ghost" size="icon" aria-label="Remote access actions" disabled={controls.pending}><MoreHorizontal className="size-4" aria-hidden="true" /></Button>}>
        {view.runtime ? <PopoverMenuItem onSelect={() => { setName(view.runtime?.name ?? ""); setEditing(true); }}>Rename computer</PopoverMenuItem> : null}
        {view.enabled ? <PopoverMenuItem destructive onSelect={() => setResetOpen(true)}>Reset connection</PopoverMenuItem> : null}
      </PopoverMenu>
    </div> : null}
    <RemoteResetDialog controls={controls} open={resetOpen} onOpenChange={setResetOpen} />
  </div>;
}
