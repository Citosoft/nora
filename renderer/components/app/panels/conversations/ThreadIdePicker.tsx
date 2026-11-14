import { useState } from "react";
import { ChevronDown, Code2 } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useOptionalChromeShellPorts } from "@/components/app/context/chromeShellPortsContext";
import { IdeBadge } from "@/components/app/shared/IdeBadge";
import type { ThreadIdePickerProps } from "@/components/app/types/threadInsights.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ThreadIdePicker({ workspace }: ThreadIdePickerProps) {
  const chrome = useOptionalChromeShellPorts();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ides = chrome?.compose.titleBar;
  if (!ides || workspace.environmentId !== "local") return null;
  const { installedIdes, isLoadingInstalledIdes, preferredIde, defaultIdeId } = ides;
  if (!isLoadingInstalledIdes && !installedIdes.length) return null;
  const sortedIdes = preferredIde
    ? [preferredIde, ...installedIdes.filter((ide) => ide.id !== preferredIde.id)]
    : installedIdes;
  const open = async (ideId: string): Promise<void> => {
    setOpening(true);
    setError(null);
    try {
      await noraSystemClient.openProjectInIde(ideId, workspace.path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this thread in the IDE.");
    } finally {
      setOpening(false);
    }
  };
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex min-w-0 items-center">
      <Button variant="outline" size="sm" className="h-8 min-w-0 flex-1 justify-start rounded-r-none border-r-0 text-xs"
        disabled={isLoadingInstalledIdes || opening || !preferredIde}
        aria-label={preferredIde ? `Open thread in ${preferredIde.name}` : "Open thread in IDE"}
        onClick={() => { if (preferredIde) void open(preferredIde.id); }}>
        {preferredIde ? <IdeBadge ide={preferredIde} /> : <Code2 className="size-3.5 text-primary" aria-hidden="true" />}
        <span className="truncate">{isLoadingInstalledIdes ? "Finding IDEs" : opening ? "Opening…" : `Open in ${preferredIde?.name ?? "IDE"}`}</span>
      </Button>
      <DropdownMenu align="end" widthClassName="w-64" trigger={<Button variant="outline" size="sm" className="h-8 rounded-l-none px-2"
        disabled={isLoadingInstalledIdes || opening} aria-label="Choose IDE"><ChevronDown className="size-3.5" aria-hidden="true" /></Button>}>
        {sortedIdes.map((ide) => <DropdownMenuItem key={ide.id} onSelect={() => { void open(ide.id); }}>
          <IdeBadge ide={ide} /><span className="truncate">{ide.name}</span>
          {defaultIdeId === ide.id && <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Default</span>}
        </DropdownMenuItem>)}
      </DropdownMenu>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
