import type { ComponentFn } from "@json-render/react";
import { ExternalLink } from "lucide-react";
import type { AppCatalog } from "@shared/apps/catalog";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { propChoice, propNumber, propText } from "@/components/app/logic/apps/propText";

/** Only web and inline images render; a file path or script URL from a row is ignored rather than fetched. */
const safeImageUrl = (value: string): string | null => /^(https?:\/\/|data:image\/)/i.test(value) ? value : null;
const safeLinkUrl = (value: string): string | null => /^https?:\/\//i.test(value) ? value : null;

export const AppImage: ComponentFn<AppCatalog, "Image"> = ({ props }) => {
  const src = safeImageUrl(propText(props.src));
  const height = propNumber(props.height, 160);
  if (!src) return <div style={{ height }} className="flex items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">{propText(props.alt) || "No image"}</div>;
  return <img src={src} alt={propText(props.alt)} style={{ height, objectFit: propChoice(props.fit, ["cover", "contain"] as const, "cover") }} className="w-full rounded-md bg-muted/30" loading="lazy" />;
};

export const AppLink: ComponentFn<AppCatalog, "Link"> = ({ props }) => {
  const href = safeLinkUrl(propText(props.href));
  const label = propText(props.label) || href || "";
  if (!href) return <span className="text-sm text-muted-foreground">{label}</span>;
  return <button type="button" onClick={() => { void noraSystemClient.openExternalUrl(href); }} title={href}
    className="inline-flex w-fit items-center gap-1 text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    {label}<ExternalLink className="size-3.5" aria-hidden="true" /></button>;
};
