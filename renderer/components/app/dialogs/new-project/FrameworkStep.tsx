import { PROJECT_SCAFFOLD_FRAMEWORKS } from "@/components/app/constants/projectScaffoldRegistry";
import { FRAMEWORK_CATEGORY_OPTIONS } from "@/components/app/constants/projectScaffoldWizard";
import { resolveProjectScaffoldOptionLogoUrl } from "@/components/app/constants/projectScaffoldOptionLogos";
import { ProductIcon } from "@/components/app/shared/ProductIcon";
import { ProjectScaffoldCompactTile } from "@/components/app/shared/ProjectScaffoldCompactTile";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Search, Star, Trash2 } from "lucide-react";
import type { WizardStepProps } from "@/components/app/types/new-project/wizard.types";

export function FrameworkStep({ wizard }: WizardStepProps) {
  const {
    favoriteStacks,
    applyFavoriteStack,
    removeFavoriteStack,
    frameworkSearch,
    setFrameworkSearch,
    selectedFrameworkCategory,
    setSelectedFrameworkCategory,
    frameworkCategoryCounts,
    filteredFrameworks,
    selectedFramework,
    handleSelectFramework,
  } = wizard;
  return (
    <div className="space-y-3">
      {favoriteStacks.length ? (
        <section
          aria-labelledby="favorite-stacks-heading"
          className="space-y-2 pb-2"
        >
          <div className="flex items-center gap-2">
            <Star className="size-3.5 text-primary" aria-hidden="true" />
            <h3 id="favorite-stacks-heading" className="text-xs font-semibold">
              Favorite stacks
            </h3>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {favoriteStacks.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteStacks.map((favorite) => {
              const framework = PROJECT_SCAFFOLD_FRAMEWORKS.find(
                (entry) => entry.id === favorite.frameworkId,
              );
              const componentOptions =
                framework?.componentOptions.filter((option) =>
                  favorite.componentIds.includes(option.id),
                ) ?? [];
              const componentLabels = componentOptions.map(
                (option) => option.label,
              );
              const visibleComponentOptions = componentOptions.slice(0, 3);
              const hiddenComponentCount =
                componentOptions.length - visibleComponentOptions.length;
              return (
                <div
                  key={favorite.id}
                  className="flex h-16 items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-2"
                >
                  <button
                    type="button"
                    onClick={() => applyFavoriteStack(favorite.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1 text-left hover:bg-accent/30"
                    aria-label={`Apply favorite stack ${favorite.name}. Components: ${componentLabels.join(", ") || "none"}`}
                  >
                    <div
                      className="flex shrink-0 items-center gap-1"
                      title={
                        componentLabels.join(", ") || "No optional components"
                      }
                    >
                      <div className="grid size-8 place-items-center rounded-sm border border-border/70 bg-background/70">
                        {framework ? (
                          <ProductIcon
                            sourceUrl={framework.logoUrl}
                            alt=""
                            className="size-4 object-contain"
                          />
                        ) : (
                          <Star className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      {visibleComponentOptions.map((option) => (
                        <div
                          key={option.id}
                          className="grid size-6 place-items-center rounded-sm border border-border/60 bg-background/60"
                        >
                          <ProductIcon
                            sourceUrl={resolveProjectScaffoldOptionLogoUrl(
                              option.id,
                            )}
                            alt=""
                            className="size-3.5 object-contain"
                            draggable={false}
                          />
                        </div>
                      ))}
                      {hiddenComponentCount > 0 ? (
                        <span className="grid size-6 place-items-center rounded-sm bg-muted text-[9px] font-medium text-muted-foreground">
                          +{hiddenComponentCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">
                        {favorite.name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {framework?.label ?? "Unavailable framework"}
                      </div>
                    </div>
                  </button>
                  <Tooltip
                    content="Delete favorite stack"
                    side="top"
                    className="z-[40000]"
                  >
                    <button
                      type="button"
                      onClick={() => removeFavoriteStack(favorite.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete favorite stack ${favorite.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={frameworkSearch}
            onChange={(event) => setFrameworkSearch(event.target.value)}
            placeholder="Search frameworks, languages, or libraries"
            aria-label="Search frameworks"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FRAMEWORK_CATEGORY_OPTIONS.map((category) => {
            const selected = category.id === selectedFrameworkCategory;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedFrameworkCategory(category.id)}
                className={[
                  "h-8 rounded-[5px] border px-2.5 text-xs font-medium transition hover:border-primary/40 hover:bg-accent/30",
                  selected
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/70 bg-muted/20 text-muted-foreground",
                ].join(" ")}
              >
                {category.label} {frameworkCategoryCounts[category.id]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Showing {filteredFrameworks.length} of{" "}
          {PROJECT_SCAFFOLD_FRAMEWORKS.length}
        </div>
        {frameworkSearch || selectedFrameworkCategory !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setFrameworkSearch("");
              setSelectedFrameworkCategory("all");
            }}
            className="font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {filteredFrameworks.length ? (
          filteredFrameworks.map((framework) => {
            const selected = framework.id === selectedFramework?.id;
            return (
              <ProjectScaffoldCompactTile
                key={framework.id}
                label={framework.label}
                subtitle={framework.language}
                logoUrl={framework.logoUrl}
                selected={selected}
                onClick={() => handleSelectFramework(framework)}
                ariaLabel={`${framework.label}. ${framework.description}`}
                tooltipContent={
                  <div className="space-y-1">
                    <div className="font-medium">{framework.label}</div>
                    <div>{framework.description}</div>
                    {framework.starterCommand ? (
                      <div className="pt-1 font-mono text-[11px]">
                        {framework.starterCommand}
                      </div>
                    ) : null}
                  </div>
                }
              />
            );
          })
        ) : (
          <div className="rounded-md border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
            No frameworks match the current filters.
          </div>
        )}
      </div>
      {selectedFramework ? (
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-[5px] border border-border/70 bg-background/70">
              <ProductIcon
                sourceUrl={selectedFramework.logoUrl}
                alt=""
                className="size-6"
                draggable={false}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {selectedFramework.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedFramework.language}
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {selectedFramework.description}
          </div>
          {selectedFramework.starterCommand ? (
            <div className="mt-3 rounded-sm border border-border/60 bg-muted/35 px-3 py-2 font-mono text-xs text-muted-foreground">
              {selectedFramework.starterCommand}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
