import { OrcaMark, T3CodeMark } from "@/components/app/shared/BrandMarks";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AppImportSourceIconProps } from "@/components/app/types/appImport.types";
import { appImportSourceDisplayName } from "@shared/app-import/sources";
import { cn } from "@/lib/utils";
import { FileJson } from "lucide-react";

/** OpenBot's app icon (nightly-labs/openbot build/icon-production.png), bundled in brand-icons. */
const OPENBOT_ICON = "./brand-icons/openbot.png";

/** The logo of an app Nora imports from; Claude and Codex reuse the provider marks shown elsewhere. */
export function AppImportSourceIcon({ source, className }: AppImportSourceIconProps) {
  const label = appImportSourceDisplayName(source);
  switch (source) {
    case "claude":
    case "codex":
      return <AgentToolIcon toolId={source} label={label} className={cn("size-5 shrink-0", className)} imageClassName="size-[80%]" />;
    case "t3-code":
      return <T3CodeMark role="img" aria-label={label} className={cn("size-5 shrink-0 rounded-md ring-1 ring-border/70", className)} />;
    case "orca":
      return <OrcaMark role="img" aria-label={label} className={cn("size-5 shrink-0 rounded-md ring-1 ring-border/70", className)} />;
    case "openbot":
      return <img src={OPENBOT_ICON} alt={label} draggable={false} className={cn("size-5 shrink-0 rounded-md", className)} />;
    case "bot-export":
      return <span role="img" aria-label={label} className={cn("grid size-5 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground", className)}><FileJson className="size-[65%]" aria-hidden /></span>;
  }
}
