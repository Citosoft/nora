import { useId, useRef, useState } from "react";
import { ChevronDown, RefreshCw, Star, Users, X } from "lucide-react";
import { isFavoriteModel } from "@shared/personalization/favoriteModels";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import { useFavoriteModels } from "@/components/app/hooks/useFavoriteModels";
import { useOptionalSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { providerDisplayName } from "@/components/app/logic/favoriteModelRows";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import { bindingChangeHint } from "@/components/app/logic/modelBinding";
import type { ModelPopoverProps } from "@/components/app/types/modelPicker.types";
import { NativeFavoriteModelList } from "./NativeFavoriteModelList";
import { NativeModelList } from "./NativeModelList";
import { NativeSubagentModelOption } from "./NativeSubagentModelOption";

/** Browsing key for the Favourites tab; provider keys are JSON arrays, so it can never collide with one. */
const FAVORITES_VIEW = "favorites";

export function NativeModelPopover({ providers, store, selectedConnection, selectedProvider, selectedModel, selectedModelId, locked, settings, onSelect, continuation }: ModelPopoverProps) {
  const [open, setOpen] = useState(false);
  const [browsingKey, setBrowsingKey] = useState<string | null>(null);
  const selectedKey = selectedProvider ? nativeProviderKey(selectedProvider) : null;
  const favorites = useFavoriteModels();
  // Settings live in the session center; hosts outside it (fixtures, the simulator) offer no sign-in shortcut.
  const openProviderSettings = useOptionalSessionCenterPorts()?.providerSetup.openProviderSettings;
  const showingFavorites = browsingKey === FAVORITES_VIEW;
  const browsed = showingFavorites ? null : providers.find((provider) => nativeProviderKey(provider) === browsingKey) ?? selectedProvider ?? providers[0] ?? null;
  const selectedIsFavorite = !!selectedProvider && !!selectedModelId
    && isFavoriteModel(favorites.models, { kind: selectedProvider.kind, instanceId: selectedProvider.instanceId, model: selectedModelId });
  const catalog = useNativeModelCatalog(store, browsed, open);
  const providerFocus = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const browsingSelected = showingFavorites ? selectedIsFavorite : !!browsed && nativeProviderKey(browsed) === selectedKey;
  const modelLabel = selectedModel?.name || selectedModelId || "Choose model";
  const subagentLabel = settings.subagentModel
    ? settings.catalog?.models.find((model) => model.id === settings.subagentModel)?.name || settings.subagentModel : null;
  return <Popover open={open} onOpenChange={(value) => { if (value) setBrowsingKey(selectedIsFavorite ? FAVORITES_VIEW : selectedKey); setOpen(value); }}>
    <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost"
      aria-label={`Choose provider and model: ${modelLabel}${subagentLabel ? `; Subagents: ${subagentLabel}` : ""}`}
      className="h-auto min-h-8 max-w-full gap-2 px-2 py-1 font-normal">
      {selectedProvider && <AgentToolIcon connection={selectedConnection} toolId={selectedProvider.kind} label="" className="size-4 shrink-0" imageClassName="size-3.5" />}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="min-w-0 truncate" title={modelLabel}>{modelLabel}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          {subagentLabel && <span className="inline-flex min-w-0 items-center gap-1" title={`Subagents: ${subagentLabel}`}>
            <Users className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{subagentLabel}</span>
          </span>}
        </span>
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent side="top" align="start" aria-labelledby={headingId} className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden bg-popover p-0"
      onOpenAutoFocus={(event) => { if (providerFocus.current) { event.preventDefault(); providerFocus.current.focus(); } }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><h2 id={headingId} className="text-[12px] font-medium">Model settings</h2>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Close model picker" onClick={() => setOpen(false)}><X className="size-3.5" /></Button></header>
      <div className="grid h-44 min-h-0 grid-cols-[3.25rem_minmax(0,1fr)]">
        <nav aria-label="Providers" className="scrollbar-none flex max-h-80 flex-col items-center gap-1.5 overflow-y-auto border-r bg-muted/40 px-1.5 py-2.5">
          <Button ref={showingFavorites ? providerFocus : undefined} type="button" size="icon" variant="ghost" aria-pressed={showingFavorites}
            aria-label="Favourite models" tooltip="Favourites"
            className={`size-9 shrink-0 rounded-md border ${showingFavorites ? "border-border bg-background shadow-sm" : "border-transparent"}`}
            onClick={() => setBrowsingKey(FAVORITES_VIEW)}>
            <Star className={`size-4 ${favorites.models.length ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} aria-hidden="true" />
          </Button>
          {providers.map((provider) => {
            const key = nativeProviderKey(provider);
            const cachedCatalog = store.get(key);
            const connection = cachedCatalog.status === "available" ? cachedCatalog.catalog.connection : undefined;
            const active = browsed && key === nativeProviderKey(browsed);
            const sameKind = providers.filter((entry) => entry.kind === provider.kind).length > 1;
            return <Button key={key} ref={active ? providerFocus : undefined} type="button" size="icon" variant="ghost" aria-pressed={!!active}
              aria-label={`${provider.label} (${provider.instanceId})`} tooltip={`${provider.label} · ${provider.instanceId}`}
              className={`relative size-9 shrink-0 rounded-md border ${active ? "border-border bg-background shadow-sm" : "border-transparent"}`}
              onClick={() => setBrowsingKey(key)}>
              <AgentToolIcon connection={connection} toolId={provider.kind} label="" className="size-5 rounded" imageClassName="size-4" />
              {sameKind && <span className="absolute -bottom-1 max-w-14 truncate rounded bg-popover px-1 text-[10px] text-popover-foreground">{provider.instanceId}</span>}
            </Button>;
          })}
        </nav>
        <section aria-label="Available models" className="flex min-h-0 min-w-0 flex-col p-2.5">
          <p className="break-words px-3 pb-2 pt-1 text-xs text-muted-foreground" aria-live="polite">{showingFavorites ? "Favourites" : browsed ? providerDisplayName(browsed, providers) : "Providers"}</p>
          <div className="scrollbar-none min-h-0 overflow-y-auto">{showingFavorites
            ? <NativeFavoriteModelList providers={providers} store={store} selectedProviderKey={selectedKey} selectedModelId={selectedModel?.id ?? selectedModelId}
              locked={locked} favorites={favorites} onSelect={(provider, model) => { if (!locked) onSelect(provider, model); }} />
            : <NativeModelList provider={browsed} state={catalog} selectedProviderKey={selectedKey} selectedModelId={selectedModel?.id ?? selectedModelId}
              locked={locked} favorites={favorites} onSelect={(model) => { if (!browsed || locked) return; onSelect(browsed, model); }}
              onOpenProviderSettings={openProviderSettings ? () => { setOpen(false); openProviderSettings(); } : undefined} />}</div>
          {favorites.error && <p role="alert" className="px-3 pt-2 text-xs text-destructive">{favorites.error}</p>}
        </section>
      </div>
      {browsingSelected && settings.catalog?.capabilities.subagentModel && <div className="shrink-0 border-t bg-muted/20 px-4 py-3">
        <NativeSubagentModelOption models={settings.catalog.models} value={settings.subagentModel}
          disabled={locked || !selectedModel || settings.catalog.authentication === "required"} onChange={settings.onSubagentModel} />
      </div>}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground"><span>{bindingChangeHint(locked, !!continuation)}</span>
        <div className="flex shrink-0 items-center gap-1">{browsed && <Button size="sm" variant="ghost" disabled={catalog.status === "loading"} onClick={() => void store.load(browsed, true)} aria-label="Refresh provider models"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh</Button>}
          <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button></div></footer>
    </PopoverContent>
  </Popover>;
}
