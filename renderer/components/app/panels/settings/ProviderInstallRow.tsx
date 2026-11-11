import { LoaderCircle } from "lucide-react";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { ProviderInstallRowProps } from "@/components/app/types/providerList.types";
import { Button } from "@/components/ui/button";

export function ProviderInstallRow({ tool, onInstall }: ProviderInstallRowProps) {
  const installing = tool.installStatus === "running";
  return <li className="flex items-center gap-4 border-b border-border/60 py-4 last:border-0">
    <AgentToolIcon toolId={tool.id} label="" className="size-9 shrink-0" imageClassName="size-6 rounded-[4px]" />
    <div className="min-w-0 flex-1">
      <div className="font-medium text-foreground">{tool.label}</div>
      <div role="status" className="text-sm text-muted-foreground">
        {tool.installStatus === "error" ? <span className="text-destructive">Install failed. Try again or install it manually.</span>
          : tool.installStatus === "installed" ? "Installed. Refresh to start using it." : tool.description}
      </div>
    </div>
    <Button variant="outline" size="sm" className="shrink-0" disabled={installing} onClick={onInstall} aria-label={`Install ${tool.label}`}>
      {installing ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Installing</> : "Install"}
    </Button>
  </li>;
}
