import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RolePicker } from "./RolePicker";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { RoleSettingsProps } from "@/components/app/types/personalization.types";

export function RoleSettings({ state, workspaceId, busy, error, onRequest, onClose }: RoleSettingsProps) {
  const [scope, setScope] = useState<"app" | "workspace">("app");
  const [role, setRole] = useState<RoleSelection | null>(state.personalization.defaultRole);
  const [inherit, setInherit] = useState(false);
  const [revision, setRevision] = useState(0);
  return <main className="mx-auto w-full max-w-2xl overflow-y-auto p-6 sm:p-10">
    <div className="mb-4 flex items-center justify-between gap-4"><h1 className="text-2xl font-medium">Personalization</h1><Button onClick={onClose}>Back to workspace</Button></div>
    <p className="mb-5 text-sm text-muted-foreground">Applies to new conversations. Existing conversations keep their role and assistant guidance.</p>
    <fieldset disabled={busy} className="mb-5 flex gap-4"><legend className="mb-2 text-sm">Change role for</legend>
      {(["app", "workspace"] as const).map((entry) => <label key={entry} className="flex items-center gap-2 text-sm">
        <input type="radio" name="role-scope" checked={scope === entry} onChange={() => {
          setScope(entry); const next = entry === "app" ? state.personalization.defaultRole : state.personalization.workspaceRoles[workspaceId];
          setRole(next ?? state.personalization.defaultRole); setInherit(entry === "workspace" && !next); setRevision((value) => value + 1);
        }} />{entry === "app" ? "App default" : "This workspace"}</label>)}
    </fieldset>
    {scope === "workspace" && <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={inherit} disabled={busy}
      onChange={(event) => setInherit(event.target.checked)} />Use app default</label>}
    <form onSubmit={(event) => { event.preventDefault(); if (busy || (!inherit && !role)) return;
      void onRequest({ kind: "set-role", workspaceId: scope === "workspace" ? workspaceId : null, role: inherit && scope === "workspace" ? null : role }); }}>
      {!(scope === "workspace" && inherit) && <RolePicker key={revision} value={role} onChange={setRole} disabled={busy} />}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="mt-5" disabled={busy || (!inherit && !role)}>{busy ? "Saving…" : "Save role"}</Button>
    </form>
  </main>;
}
