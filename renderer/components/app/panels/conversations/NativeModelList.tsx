import { Check, LoaderCircle } from "lucide-react";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelListProps } from "@/components/app/types/modelPicker.types";

export function NativeModelList({ provider, state, selectedProviderKey, selectedModelId, locked, onSelect }: ModelListProps) {
  if (!provider) return <p className="px-3 py-5 text-sm text-muted-foreground">No providers are configured. Install and sign in to a supported runtime to choose a model.</p>;
  if (state.status === "idle" || state.status === "loading") return <p role="status" className="flex items-center gap-2 px-3 py-5 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading models…</p>;
  if (state.status === "unavailable") return <p role="alert" className="px-3 py-5 text-sm text-muted-foreground">{state.failure.message}</p>;
  const requiresSignIn = state.catalog.authentication === "required";
  return <div>
    {requiresSignIn && <p role="status" className="mb-2 px-3 text-xs text-muted-foreground">Sign in using this provider's CLI, then refresh. Your draft is preserved.</p>}
    {!state.catalog.models.length && <p className="px-3 py-5 text-sm text-muted-foreground">This runtime has no available models.</p>}
    <div role="group" aria-label={`${provider.label} models`} className="space-y-1">
      {state.catalog.models.map((model) => {
        const selected = nativeProviderKey(provider) === selectedProviderKey && model.id === selectedModelId;
        return <button key={model.id} type="button" aria-pressed={selected} disabled={locked || requiresSignIn}
          onClick={() => onSelect(model)} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed ${selected ? "bg-secondary" : "hover:bg-muted"}`}>
          <span className="min-w-0 flex-1"><span className="block break-words text-[13px] font-medium">{model.name || model.id}</span>
            {model.description && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{model.description}</span>}</span>
          {selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
        </button>;
      })}
    </div>
  </div>;
}
