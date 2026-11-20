import { ExternalLink } from "lucide-react";
import type { AddConnectorPresetNoticeProps } from "@/components/app/types/noraConnectors.types";

/** A gallery service that needs the user's own OAuth client: what to create and where, above the sign-in choices. */
export function AddConnectorPresetNotice({ preset }: AddConnectorPresetNoticeProps) {
  if (!preset.setup) return null;
  return <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
    <p className="text-foreground">{preset.setup.note}</p>
    <a href={preset.setup.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-medium text-primary hover:underline">
      {preset.name} setup guide<ExternalLink className="size-3" aria-hidden="true" /></a>
  </div>;
}
