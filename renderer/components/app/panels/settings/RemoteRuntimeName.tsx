import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateRuntimeName } from "@/components/app/logic/remote-access/presentation";
import type { RemoteAccessControls } from "@/components/app/types/remoteAccess.types";

export function RemoteRuntimeName({ controls }: { controls: RemoteAccessControls }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editing && restoreFocus.current) { editButton.current?.focus(); restoreFocus.current = false; }
  }, [editing]);
  const error = validateRuntimeName(name);
  const finish = () => { restoreFocus.current = true; setEditing(false); };
  if (!editing) return <div className="flex items-center gap-3"><span>{controls.view?.runtime?.name}</span>
    <Button ref={editButton} variant="outline" size="sm" disabled={controls.pending} onClick={() => { setName(controls.view?.runtime?.name ?? ""); setEditing(true); }}>Rename</Button></div>;
  return <form className="space-y-2" onSubmit={(event) => {
    event.preventDefault();
    if (!error) void controls.request({ kind: "rename", name: name.trim() }).then((saved) => { if (saved) finish(); });
  }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); finish(); } }}>
    <Input autoFocus aria-label="Runtime name" aria-invalid={!!error} aria-describedby={error ? "runtime-name-error" : undefined} value={name} onChange={(event) => setName(event.target.value)} maxLength={64} disabled={controls.pending} />
    {error ? <p id="runtime-name-error" className="text-sm text-destructive">{error}</p> : null}
    <div className="flex gap-2"><Button size="sm" disabled={!!error || controls.pending}>Save</Button><Button type="button" variant="outline" size="sm" onClick={finish} disabled={controls.pending}>Cancel</Button></div>
  </form>;
}
