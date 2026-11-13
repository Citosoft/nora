import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import type { ReviewStepProps } from "@/components/app/types/new-project/wizard.types";

export function ReviewStep({ wizard, preferredAgentToolId }: ReviewStepProps) {
  const {
    shouldSaveFavorite,
    setShouldSaveFavorite,
    favoriteName,
    setFavoriteName,
    selectedFramework,
    scaffoldPrompt,
    projectName,
    setProjectName,
    availableTools,
    selectedToolId,
    setSelectedToolId,
  } = wizard;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="space-y-3">
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <label
            className="flex cursor-pointer items-start gap-3"
            htmlFor="save-favorite-stack"
          >
            <input
              id="save-favorite-stack"
              type="checkbox"
              checked={shouldSaveFavorite}
              onChange={(event) => setShouldSaveFavorite(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                Save to favorite stacks
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Keep this framework, components, tests, and agent on this
                device.
              </span>
            </span>
          </label>
          {shouldSaveFavorite ? (
            <Input
              id="favorite-stack-name"
              className="mt-3"
              value={favoriteName}
              onChange={(event) => setFavoriteName(event.target.value)}
              placeholder={
                selectedFramework
                  ? `${selectedFramework.label} stack`
                  : "My stack"
              }
              aria-label="Favorite stack name"
              autoFocus
            />
          ) : null}
        </div>
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <div className="text-sm font-medium">Scaffold request</div>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-sm border border-border/60 bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
            {scaffoldPrompt}
          </pre>
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-md border border-border/70 bg-muted/20 p-4">
          <label className="text-sm font-medium" htmlFor="new-project-name">
            Project folder name
          </label>
          <Input
            id="new-project-name"
            className="mt-2"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder={
              selectedFramework
                ? `${selectedFramework.id}-app`
                : "my-new-project"
            }
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Nora will ask where to create this folder, initialize git, open it
            as a project, then launch the agent.
          </div>
        </div>
        {availableTools.length ? (
          <div className="space-y-2">
            {availableTools.map((tool) => {
              const selected = tool.id === selectedToolId;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedToolId(tool.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30",
                    selected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/70 bg-muted/20",
                  ].join(" ")}
                >
                  <AgentToolIcon
                    toolId={tool.id}
                    label={tool.label}
                    className="size-8 shrink-0"
                    imageClassName="size-5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {tool.label}
                    </div>
                    {tool.id === preferredAgentToolId ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Preferred agent
                      </div>
                    ) : null}
                  </div>
                  {selected ? <Check className="size-4 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            No enabled agent CLIs are available. Enable an agent in Settings or
            onboarding first.
          </div>
        )}
      </div>
    </div>
  );
}
