import { useId, useRef, useState } from "react";
import { ChevronDown, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelPopoverProps } from "@/components/app/types/modelPicker.types";
import { NativeModelList } from "./NativeModelList";

export function NativeModelPopover({ providers, store, selectedProvider, selectedModel, selectedModelId, locked, onSelect }: ModelPopoverProps) {
  const [open, setOpen] = useState(false);
  const [browsingKey, setBrowsingKey] = useState<string | null>(null);
  const selectedKey = selectedProvider ? nativeProviderKey(selectedProvider) : null;
  const browsed = providers.find((provider) => nativeProviderKey(provider) === browsingKey) ?? selectedProvider ?? providers[0] ?? null;
  const catalog = useNativeModelCatalog(store, browsed, open);
  const providerFocus = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  return <Popover open={open} onOpenChange={(value) => { if (value) setBrowsingKey(selectedKey); setOpen(value); }}>
    <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" aria-label={`Choose provider and model: ${selectedModel?.name || selectedModelId || "Choose model"}`} className="max-w-full gap-2 px-2 font-normal">
      {selectedProvider && <AgentToolIcon toolId={selectedProvider.kind} label="" className="size-4 shrink-0" imageClassName="size-3.5" />}
      <span className="min-w-0 truncate">{selectedModel?.name || selectedModelId || "Choose model"}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent side="top" align="start" aria-labelledby={headingId} className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden bg-popover p-0"
      onOpenAutoFocus={(event) => { if (providerFocus.current) { event.preventDefault(); providerFocus.current.focus(); } }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><h2 id={headingId} className="text-[13px] font-medium">Choose a model</h2>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Close model picker" onClick={() => setOpen(false)}><X className="size-3.5" /></Button></header>
      <div className="grid h-44 min-h-0 grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        <nav aria-label="Providers" className="flex max-h-80 flex-col items-center gap-2 overflow-y-auto border-r bg-muted/40 px-2 py-3">
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
          <div className="min-h-0 overflow-y-auto"><NativeModelList provider={browsed} state={catalog} selectedProviderKey={selectedKey} selectedModelId={selectedModel?.id ?? selectedModelId}
            locked={locked} onSelect={(model) => { if (!browsed || locked) return; onSelect(browsed, model); setOpen(false); }} /></div>
        </section>
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground"><span>{locked ? "Start a new thread to change this model." : "Choose a provider, then a model."}</span>
        {browsed && <Button size="sm" variant="ghost" disabled={catalog.status === "loading"} onClick={() => void store.load(browsed, true)} aria-label="Refresh provider models"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh</Button>}</footer>
    </PopoverContent>
  </Popover>;
}
