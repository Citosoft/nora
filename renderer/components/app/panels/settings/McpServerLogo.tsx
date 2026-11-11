import { useState } from "react";
import { Server } from "lucide-react";
import { mcpServerLogoUrls } from "@/components/app/logic/mcpServerLogo";
import type { McpServerLogoProps } from "@/components/app/types/runtimeMcp.types";

const FRAME_CLASS_NAME = "inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-background/70 ring-1 ring-border/50";

/** The server's own logo when it has one, falling back to a generic server glyph if none is known or it fails to load. */
export function McpServerLogo({ logo }: McpServerLogoProps) {
  const urls = mcpServerLogoUrls(logo);
  const [failed, setFailed] = useState<string | null>(null);
  if (!urls || failed === urls.light) {
    return <span className={FRAME_CLASS_NAME}><Server className="size-3.5 text-muted-foreground" aria-hidden="true" /></span>;
  }
  const onError = () => setFailed(urls.light);
  return <span className={FRAME_CLASS_NAME}>
    <img src={urls.light} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={onError} className={`size-4 object-contain ${urls.dark === urls.light ? "" : "dark:hidden"}`} />
    {urls.dark === urls.light ? null : <img src={urls.dark} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={onError} className="hidden size-4 object-contain dark:block" />}
  </span>;
}
