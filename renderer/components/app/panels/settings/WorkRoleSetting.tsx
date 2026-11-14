import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { roleProfile } from "@shared/personalization/profiles";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { RolePicker } from "@/components/app/panels/personalization/RolePicker";
import { SettingRow } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";

export function WorkRoleSetting() {
  const { boot, request } = useNativeRuntimePorts();
  const saved = boot.personalization.defaultRole;
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleSelection | null>(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeOpen = (next: boolean): void => {
    if (busy) return;
    if (next) { setRole(saved); setError(null); }
    setOpen(next);
  };
  const save = async (): Promise<void> => {
    if (!role || busy) return;
    setBusy(true); setError(null);
    try {
      await request({ kind: "set-role", workspaceId: null, role });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your work role could not be saved. Try again.");
    } finally { setBusy(false); }
  };
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <SettingRow title="Work role" description="Personalize Nora for the work you do. Applies to new conversations. Existing conversations keep their role."
      control={<div className="space-y-2">
        <p className="text-sm">{saved ? saved.id === "custom" ? "Custom role" : roleProfile(saved).label : "No role selected"}</p>
        {saved?.id === "custom" && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{saved.description}</p>}
        <Dialog.Trigger asChild><Button type="button" variant="outline" size="sm">Change role</Button></Dialog.Trigger>
      </div>} />
    {open && <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex max-h-[calc(100dvh-3rem)] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <div className="px-6 pb-4 pt-6">
          <Dialog.Title className="text-lg font-semibold">What type of work do you do?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">Applies to new conversations. Existing conversations keep their role. Workspace role overrides still apply.</Dialog.Description>
        </div>
        <form className="flex min-h-0 flex-col" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <RolePicker value={role} onChange={setRole} disabled={busy} variant="compact" />
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button type="submit" disabled={!role || busy}>{busy ? "Saving…" : "Save role"}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>}
  </Dialog.Root>;
}
