import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import {
  createAgentSkillCatalogMap,
  getSharedAgentSkillCatalog
} from "@/components/app/logic/agentSkills";
import type { SkillInstallTranscript } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AgentSkillInstallOutputEvent,
  AgentSkillSearchResult
} from "@shared/appTypes";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function SkillSearchTranscript({ result }: { result: AgentSkillSearchResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-[4px] border border-border/60 bg-card/30 p-3">
      <button
        type="button"
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide raw output" : "Show raw output"}
      </button>
      {open ? (
        <div className="mt-3 rounded-[4px] border border-border/60 bg-black/80 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {result.command}
          </div>
          <pre className="terminal-text whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
            {result.rawOutput || result.lines.join("\n")}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function SkillSearchMatches({
  result,
  onInstallSkill,
  installing
}: {
  result: AgentSkillSearchResult;
  onInstallSkill: (reference: string) => void;
  installing: boolean;
}) {
  if (!result.matches.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {result.matches.map((match) => (
        <div
          key={match.reference}
          className="flex items-start justify-between gap-3 rounded-[4px] border border-border/50 bg-card/40 px-3 py-3"
        >
          <div className="min-w-0">
            <div className="font-medium text-foreground">{match.reference}</div>
            {match.installsLabel ? (
              <div className="mt-1 text-xs text-muted-foreground">{match.installsLabel}</div>
            ) : null}
            {match.url ? (
              <button
                type="button"
                className="mt-1 break-all text-left text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  void noraSystemClient.openExternalUrl(match.url!);
                }}
              >
                {match.url}
              </button>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={installing}
            onClick={() => onInstallSkill(match.reference)}
          >
            {installing ? "Installing..." : "Install"}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function SkillsSettingsSection() {
  const {
    agentSkillCatalogs,
    searchToolSkills,
    installToolSkill,
    removeToolSkill
  } = useSettingsRuntime();
  const skillCatalogByToolId = useMemo(
    () => createAgentSkillCatalogMap(agentSkillCatalogs),
    [agentSkillCatalogs]
  );
  const sharedSkillsCatalog = getSharedAgentSkillCatalog(skillCatalogByToolId);
  const sharedSkillsToolId = sharedSkillsCatalog?.toolId || null;
  const [searchQuery, setSearchQuery] = useState("");
  const [installReference, setInstallReference] = useState("");
  const [searchResult, setSearchResult] = useState<AgentSkillSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [installTranscript, setInstallTranscript] = useState<SkillInstallTranscript | null>(null);

  useEffect(() => {
    return noraToolingClient.onToolSkillInstallOutput((event: AgentSkillInstallOutputEvent) => {
      if (!sharedSkillsToolId || event.toolId !== sharedSkillsToolId) {
        return;
      }

      setInstallTranscript((current) => {
        const previous = current || {
          command: null,
          lines: [],
          success: null
        };

        if (event.type === "start") {
          return {
            command: event.command || previous.command,
            lines: [],
            success: null
          };
        }

        if (event.type === "line") {
          const nextLine = event.line?.trimEnd();
          if (!nextLine) {
            return previous;
          }

          return {
            ...previous,
            command: event.command || previous.command,
            lines: [...previous.lines, nextLine].slice(-160)
          };
        }

        return {
          ...previous,
          command: event.command || previous.command,
          success: event.success ?? previous.success
        };
      });
    });
  }, [sharedSkillsToolId]);

  const startInstall = (skillReference: string): void => {
    if (!sharedSkillsToolId) {
      return;
    }

    setIsInstalling(true);
    setInstallReference(skillReference);
    setInstallStatus(null);
    setInstallTranscript({
      command: null,
      lines: [],
      success: null
    });
    Promise.resolve(installToolSkill(sharedSkillsToolId, skillReference))
      .then(() => {
        setInstallStatus({
          kind: "success",
          message: "Skill installed for the shared agent skill directories."
        });
      })
      .catch((error: unknown) => {
        setInstallStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Unable to install skill."
        });
      })
      .finally(() => {
        setIsInstalling(false);
      });
  };

  return (
    <div className="max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="size-5" aria-hidden="true" />
          <div className="text-xl font-semibold">Skills</div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Search the shared skills registry, install skills globally for supported agents, and review shared installed skills.
        </div>
      </div>

      {sharedSkillsCatalog ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[6px] border border-border/60 bg-card/50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {sharedSkillsCatalog.sourceLabel || "Shared agent skills"}
            </div>
            <div className="mt-1 break-all text-sm text-foreground">
              {sharedSkillsCatalog.rootPath || "No shared skill root configured"}
            </div>
            {sharedSkillsCatalog.installHint ? (
              <div className="mt-1 text-xs text-muted-foreground">{sharedSkillsCatalog.installHint}</div>
            ) : null}
            {sharedSkillsCatalog.errorMessage ? (
              <div className="mt-2 text-xs text-destructive">{sharedSkillsCatalog.errorMessage}</div>
            ) : null}
          </div>

          <section className="rounded-[6px] border border-border/60 bg-background/50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Find</div>
              <div className="mt-1 text-sm font-medium text-foreground">Find skills</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Runs <span className="font-mono">skills find &lt;query&gt;</span> and falls back to <span className="font-mono">npx skills find &lt;query&gt;</span>.
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="react testing, auth, deployment..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!searchQuery.trim() || isSearching || !sharedSkillsToolId}
                  onClick={() => {
                    if (!sharedSkillsToolId) {
                      return;
                    }

                    setIsSearching(true);
                    void searchToolSkills(sharedSkillsToolId, searchQuery).then((nextResult) => {
                      setSearchResult(nextResult);
                    }).finally(() => {
                      setIsSearching(false);
                    });
                  }}
                >
                  {isSearching ? "Searching..." : "Find"}
                </Button>
              </div>

              {searchResult ? (
                <>
                  <SkillSearchMatches
                    result={searchResult}
                    installing={isInstalling}
                    onInstallSkill={(reference) => startInstall(reference)}
                  />
                  <SkillSearchTranscript result={searchResult} />
                </>
              ) : null}
          </section>

          <section className="rounded-[6px] border border-border/60 bg-card/50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Install</div>
              <div className="mt-1 text-sm font-medium text-foreground">Install by reference</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Enter a skill reference such as <span className="font-mono">vercel-labs/agent-skills@vercel-react-best-practices</span>. The app installs with <span className="font-mono">--yes --global</span> to avoid the interactive agent picker.
              </div>
              {installStatus ? (
                <div className={["mt-2 text-xs", installStatus.kind === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"].join(" ")}>
                  {installStatus.message}
                </div>
              ) : null}
              {installTranscript ? (
                <div className="mt-3 rounded-[4px] border border-border/60 bg-black/80 p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {installTranscript.command || "Resolving skills command..."}
                  </div>
                  <pre className="terminal-text max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
                    {installTranscript.lines.length
                      ? installTranscript.lines.join("\n")
                      : "Waiting for command output..."}
                  </pre>
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Input
                  value={installReference}
                  onChange={(event) => setInstallReference(event.target.value)}
                  placeholder="owner/repo@skill"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!installReference.trim() || isInstalling || !sharedSkillsToolId}
                  onClick={() => startInstall(installReference)}
                >
                  {isInstalling ? "Installing..." : "Install"}
                </Button>
              </div>
          </section>

          <div className="rounded-[6px] border border-border/60 bg-card/50 px-4 py-4">
            <div className="text-sm font-medium text-foreground">Installed skills</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Skills currently available from the shared agent directory.
            </div>
            <div className="mt-3">
              {sharedSkillsCatalog.skills.length ? (
                <div className="space-y-2">
                  {sharedSkillsCatalog.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-start justify-between gap-3 rounded-[4px] border border-border/50 bg-card/40 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">{skill.name}</div>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                            Enabled
                          </span>
                        </div>
                        {skill.description ? (
                          <div className="mt-1 text-sm text-muted-foreground">{skill.description}</div>
                        ) : null}
                        <div className="mt-2 break-all text-xs text-muted-foreground">{skill.path}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (sharedSkillsToolId) {
                            removeToolSkill(sharedSkillsToolId, skill.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No shared skills are currently installed.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[6px] border border-border/60 bg-card/50 px-4 py-4 text-sm text-muted-foreground">
          Shared skills are not available for the detected agent setup.
        </div>
      )}
    </div>
  );
}
