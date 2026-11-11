import { ProviderAccountStatus } from "@/components/app/panels/settings/ProviderAccountStatus";
import { ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { ProviderListRowProps } from "@/components/app/types/providerList.types";

export function ProviderListRow({ tool, accountView, connecting, onToggle, onSignIn }: ProviderListRowProps) {
  return <li className="flex items-center gap-4 border-b border-border/60 py-4 last:border-0">
    <AgentToolIcon toolId={tool.id} label="" className="size-9 shrink-0" imageClassName="size-6 rounded-[4px]" />
    <div className="min-w-0 flex-1">
      <div className="font-medium text-foreground">{tool.label}</div>
      {accountView ? <ProviderAccountStatus providerLabel={tool.label} view={accountView} onSignIn={onSignIn} />
        : <p role="status" className="text-sm text-muted-foreground">{connecting ? `Connecting ${tool.label}…`
          : `Nora couldn't find ${tool.label}'s runtime. If it needs a separate ACP adapter, install that, then refresh.`}</p>}
    </div>
    <div className="w-[124px] shrink-0">
      <ToggleButton checked={tool.enabled} onChange={onToggle} label={tool.enabled ? "Enabled" : "Disabled"} accessibleName={`Enable ${tool.label}`} />
    </div>
  </li>;
}
