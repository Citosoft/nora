import { useId, useRef, useState } from "react";
import { Brain, ChevronDown, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelPopoverProps } from "@/components/app/types/modelPicker.types";
import { NativeModelList } from "./NativeModelList";
import { NativeModelOptions } from "./NativeModelOptions";

export function NativeModelPopover({ providers, store, selectedProvider, selectedModel, selectedModelId, locked, settings, onSelect }: ModelPopoverProps) {
  const [open, setOpen] = useState(false);
  const [browsingKey, setBrowsingKey] = useState<string | null>(null);
  const selectedKey = selectedProvider ? nativeProviderKey(selectedProvider) : null;
  const browsed = providers.find((provider) => nativeProviderKey(provider) === browsingKey) ?? selectedProvider ?? providers[0] ?? null;
  const catalog = useNativeModelCatalog(store, browsed, open);
  const providerFocus = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const browsingSelected = !!browsed && nativeProviderKey(browsed) === selectedKey;
  const modelLabel = selectedModel?.name || selectedModelId || "Choose model";
  const permissionLabel = settings.catalog?.policies.find((policy) => policy.id === settings.policyId)?.label
    ?? (settings.policyId ? "Permissions unavailable" : "Choose permissions");
  const reasoningLabel = settings.reasoning ?? "Provider settings";
  return <Popover open={open} onOpenChange={(value) => { if (value) setBrowsingKey(selectedKey); setOpen(value); }}>
    <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost"
      aria-label={`Choose provider and model: ${modelLabel}; Permissions: ${permissionLabel}; Reasoning: ${reasoningLabel}`}
      className="h-auto min-h-8 max-w-full gap-2 px-2 py-1 font-normal">
      {selectedProvider && <AgentToolIcon toolId={selectedProvider.kind} label="" className="size-4 shrink-0" imageClassName="size-3.5" />}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="min-w-0 truncate" title={modelLabel}>{modelLabel}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1" title={`Permissions: ${permissionLabel}`}>
            <ShieldCheck className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{permissionLabel}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1" title={`Reasoning: ${reasoningLabel}`}>
            <Brain className="size-3 shrink-0" aria-hidden="true" /><span className="truncate capitalize">{reasoningLabel}</span>
          </span>
        </span>
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent side="top" align="start" aria-labelledby={headingId} className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden bg-popover p-0"
      onOpenAutoFocus={(event) => { if (providerFocus.current) { event.preventDefault(); providerFocus.current.focus(); } }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><h2 id={headingId} className="text-[13px] font-medium">Model settings</h2>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Close model picker" onClick={() => setOpen(false)}><X className="size-3.5" /></Button></header>
      <div className="grid h-44 min-h-0 grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        <nav aria-label="Providers" className="scrollbar-none flex max-h-80 flex-col items-center gap-2 overflow-y-auto border-r bg-muted/40 px-2 py-3">
          {providers.map((provider) => {
            const key = nativeProviderKey(provider);
            const active = browsed && key === nativeProviderKey(browsed);
            const sameKind = providers.filter((entry) => entry.kind === provider.kind).length > 1;
            return <Button key={key} ref={active ? providerFocus : undefined} type="button" size="icon" variant="ghost" aria-pressed={!!active}
              aria-label={`${provider.label} (${provider.instanceId})`} tooltip={`${provider.label} · ${provider.instanceId}`}
              className={`relative size-11 shrink-0 rounded-md border ${active ? "border-border bg-background shadow-sm" : "border-transparent"}`}
              onClick={() => setBrowsingKey(key)}>
              <AgentToolIcon toolId={provider.kind} label="" className="size-7 rounded-md" imageClassName="size-6" />
              {sameKind && <span className="absolute -bottom-1 max-w-14 truncate rounded bg-popover px-1 text-[11px] text-popover-foreground">{provider.instanceId}</span>}
            </Button>;
          })}
        </nav>
        <section aria-label="Available models" className="flex min-h-0 min-w-0 flex-col p-2.5">
          <p className="break-words px-3 pb-2 pt-1 text-xs text-muted-foreground" aria-live="polite">{browsed ? `${browsed.label}${providers.filter((entry) => entry.kind === browsed.kind).length > 1 ? ` · ${browsed.instanceId}` : ""}` : "Providers"}</p>
          <div className="scrollbar-none min-h-0 overflow-y-auto"><NativeModelList provider={browsed} state={catalog} selectedProviderKey={selectedKey} selectedModelId={selectedModel?.id ?? selectedModelId}
            locked={locked} onSelect={(model) => { if (!browsed || locked) return; onSelect(browsed, model); }} /></div>
        </section>
      </div>
      <div className="shrink-0 border-t bg-muted/20 px-4 py-3">
        {browsingSelected ? <NativeModelOptions {...settings} model={selectedModel} locked={locked} />
          : <p className="text-xs text-muted-foreground">Select a model to configure its reasoning and permissions.</p>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground"><span>{locked ? "Start a new thread to change these settings." : "Settings apply to this new thread."}</span>
        <div className="flex shrink-0 items-center gap-1">{browsed && <Button size="sm" variant="ghost" disabled={catalog.status === "loading"} onClick={() => void store.load(browsed, true)} aria-label="Refresh provider models"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh</Button>}
          <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button></div></footer>
    </PopoverContent>
  </Popover>;
}
