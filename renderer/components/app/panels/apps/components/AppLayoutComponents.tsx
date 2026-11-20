import { Children, useState } from "react";
import type { ComponentFn } from "@json-render/react";
import { useStateStore } from "@json-render/react";
import type { AppCatalog } from "@shared/apps/catalog";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { propChoice, propNumber, propText } from "@/components/app/logic/apps/propText";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GAPS = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
const TONES = { neutral: "secondary", info: "default", success: "success", warning: "warning", danger: "destructive" } as const;

/** Columns collapse with the canvas width (see `.app-grid` in styles.css), so the same app reads well beside its builder thread. */
export const AppGrid: ComponentFn<AppCatalog, "Grid"> = ({ props, children }) =>
  <div className="app-grid" data-columns={propNumber(props.columns, 2)}>{children}</div>;

export const AppStack: ComponentFn<AppCatalog, "Stack"> = ({ props, children }) =>
  <div className={cn("flex", propChoice(props.direction, ["column", "row"], "column") === "row" ? "flex-row flex-wrap items-start" : "flex-col", GAPS[propChoice(props.gap, ["sm", "md", "lg"], "md")])}>{children}</div>;

export const AppHeading: ComponentFn<AppCatalog, "Heading"> = ({ props }) => {
  const level = propNumber(props.level, 2);
  const text = propText(props.text);
  if (level === 1) return <h1 className="text-2xl font-semibold tracking-tight">{text}</h1>;
  if (level === 3) return <h3 className="text-sm font-semibold">{text}</h3>;
  return <h2 className="text-lg font-semibold tracking-tight">{text}</h2>;
};

export const AppText: ComponentFn<AppCatalog, "Text"> = ({ props }) =>
  <MarkdownRenderer className={cn("text-sm", props.muted === true && "text-muted-foreground")}>{propText(props.markdown)}</MarkdownRenderer>;

export const AppBadge: ComponentFn<AppCatalog, "Badge"> = ({ props }) =>
  <Badge variant={TONES[propChoice(props.tone, ["neutral", "info", "success", "warning", "danger"], "neutral")]} className="w-fit">{propText(props.text)}</Badge>;

/** The nth child is the nth tab's content; only the chosen one renders, and the choice is written to `selectPath` when given. */
export const AppTabs: ComponentFn<AppCatalog, "Tabs"> = ({ props, children }) => {
  const tabs = Array.isArray(props.tabs) ? props.tabs.flatMap((entry) => entry && typeof entry === "object" && typeof entry.id === "string" ? [{ id: entry.id, label: propText(entry.label) || entry.id }] : []) : [];
  const path = propText(props.selectPath);
  const { get, set } = useStateStore();
  const [local, setLocal] = useState(tabs[0]?.id ?? "");
  const stored = path ? get(path) : undefined;
  const chosen = typeof stored === "string" && tabs.some((tab) => tab.id === stored) ? stored : tabs.some((tab) => tab.id === local) ? local : tabs[0]?.id ?? "";
  const choose = (id: string): void => { setLocal(id); if (path) set(path, id); };
  const panels = Children.toArray(children);
  const index = tabs.findIndex((tab) => tab.id === chosen);
  return <div className="flex min-w-0 flex-col gap-4">
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-border/60">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={tab.id === chosen} onClick={() => choose(tab.id)}
        className={cn("-mb-px border-b-2 px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          tab.id === chosen ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{tab.label}</button>)}
    </div>
    <div role="tabpanel" className="flex min-w-0 flex-col gap-4">{index >= 0 ? panels[index] ?? null : null}</div>
  </div>;
};
