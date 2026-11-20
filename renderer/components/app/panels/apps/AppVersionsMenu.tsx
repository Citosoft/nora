import { useEffect, useState } from "react";
import type { AppVersion } from "@shared/types/apps/apps.types";
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import type { AppVersionsMenuProps } from "@/components/app/types/appsView.types";

const SHOWN = 8;

/** Recent versions of the app; choosing an older one restores it as a new version, so nothing is lost. */
export function AppVersionsMenu({ load, restore, currentVersion }: AppVersionsMenuProps) {
  const [versions, setVersions] = useState<AppVersion[] | null>(null);
  useEffect(() => { let active = true; load().then((list) => { if (active) setVersions(list); }, () => { if (active) setVersions([]); }); return () => { active = false; }; }, [load, currentVersion]);
  return <>
    <DropdownMenuLabel>Versions</DropdownMenuLabel>
    {versions === null ? <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
      : versions.slice(0, SHOWN).map((version) => <DropdownMenuItem key={version.version} disabled={version.version === currentVersion} onSelect={() => { void restore(version.version); }}>
        <span className="flex min-w-0 flex-col"><span className="truncate">v{version.version}{version.version === currentVersion ? " (current)" : ""} · {version.summary}</span>
          <span className="text-[11px] text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</span></span></DropdownMenuItem>)}
  </>;
}
