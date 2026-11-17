import { useState } from "react";
import { Server } from "lucide-react";
import { mcpServerLogoUrls } from "@/components/app/logic/mcpServerLogo";
import type { McpServerLogoProps } from "@/components/app/types/runtimeMcp.types";

const FRAME_CLASS_NAME = "inline-flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-border/50";
const SIZE_CLASS_NAMES = {
  default: { frame: "size-6 rounded-[5px] bg-background/70", image: "size-4", glyph: "size-3.5" },
  // Opaque, since small logos overlap one another in the composer pill.
  small: { frame: "size-4 rounded-[4px] bg-background", image: "size-3", glyph: "size-2.5" }
} as const;

/** The server's own logo when it has one, falling back to a generic server glyph if none is known or it fails to load. */
export function McpServerLogo({ logo, size = "default" }: McpServerLogoProps) {
  const sizes = SIZE_CLASS_NAMES[size];
  const frame = `${FRAME_CLASS_NAME} ${sizes.frame}`;
  const urls = mcpServerLogoUrls(logo);
  const [failed, setFailed] = useState<string | null>(null);
  if (!urls || failed === urls.light) {
    return <span className={frame}><Server className={`${sizes.glyph} text-muted-foreground`} aria-hidden="true" /></span>;
  }
  const onError = () => setFailed(urls.light);
  return <span className={frame}>
    <img src={urls.light} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={onError} className={`${sizes.image} object-contain ${urls.dark === urls.light ? "" : "dark:hidden"}`} />
    {urls.dark === urls.light ? null : <img src={urls.dark} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={onError} className={`hidden ${sizes.image} object-contain dark:block`} />}
  </span>;
}
