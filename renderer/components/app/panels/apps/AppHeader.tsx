import { useState } from "react";
import { MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { AppHeaderProps } from "@/components/app/types/appsView.types";
import { AppActivityDialog } from "./AppActivityDialog";
import { AppIcon } from "./AppIcon";
import { AppVersionsMenu } from "./AppVersionsMenu";
import { AppConnectorBadges } from "./AppConnectorBadges";

/** The app's name and what you can do with it: refresh, edit in its builder thread, trust its writes, rename, roll back or delete. */
export function AppHeader({ runtime, connectors, onEdit, onRename, onTrust, onExport, onDelete }: AppHeaderProps) {
  const { app } = runtime;
  const [renaming, setRenaming] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  if (!app) return null;
  const loading = Object.values(runtime.data?.sourceStates ?? {}).some((state) => state.status === "loading");
  return <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border/60 px-5 py-3">
    <AppIcon icon={app.icon} className="text-muted-foreground" />
    {renaming === null ? <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{app.name}</h1>
      : <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (renaming.trim()) onRename(renaming.trim()); setRenaming(null); }}>
        <Input autoFocus aria-label="App name" value={renaming} onChange={(event) => setRenaming(event.target.value)} onBlur={() => setRenaming(null)}
          onKeyDown={(event) => { if (event.key === "Escape") setRenaming(null); }} className="h-8 max-w-xs text-sm" /></form>}
    <div className="min-w-0 max-w-[45%]"><AppConnectorBadges spec={app.spec} connectors={connectors} /></div>
    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">v{app.version}{app.trusted ? " · trusted" : ""}</span>
    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Refresh" tooltip="Refresh" onClick={() => runtime.refresh()} disabled={loading}>
      <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /></Button>
    {onEdit && <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={onEdit}><Pencil className="size-3.5" aria-hidden="true" />Edit</Button>}
    <DropdownMenu widthClassName="w-56" trigger={<Button type="button" variant="ghost" size="icon" className="size-8" aria-label="App options"><MoreHorizontal className="size-4" aria-hidden="true" /></Button>}>
      <DropdownMenuItem onSelect={() => setRenaming(app.name)}>Rename</DropdownMenuItem>
      <DropdownMenuCheckboxItem checked={app.trusted} onCheckedChange={onTrust}>Run writes without confirming</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <AppVersionsMenu currentVersion={app.version} load={runtime.versions} restore={runtime.restoreVersion} />
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setActivityOpen(true)}>Activity…</DropdownMenuItem>
      <DropdownMenuItem onSelect={onExport}>Export to file…</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem destructive onSelect={onDelete}>Delete app</DropdownMenuItem>
    </DropdownMenu>
    <AppActivityDialog open={activityOpen} onOpenChange={setActivityOpen} load={runtime.activity} />
  </header>;
}
