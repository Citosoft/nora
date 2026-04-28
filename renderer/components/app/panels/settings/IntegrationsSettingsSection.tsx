import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { IntegrationTitle, SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CircleHelp, ExternalLink, Plug } from "lucide-react";
import { useMemo } from "react";

export function IntegrationsSettingsSection() {
  const {
    forgeOAuthProviders,
    isLoadingForgeOAuthProviders,
    githubToken,
    githubAccountLabel,
    updateGithubToken,
    connectGithubAccount,
    disconnectGithubAccount,
    gitlabToken,
    gitlabHost,
    gitlabAccountLabel,
    updateGitlabToken,
    updateGitlabHost,
    disconnectGitlabAccount,
    vercelToken,
    vercelAccountLabel,
    updateVercelToken,
    disconnectVercelAccount
  } = useSettingsRuntime();
  const githubOAuthProvider = useMemo(
    () => forgeOAuthProviders.find((provider) => provider.provider === "github") ?? null,
    [forgeOAuthProviders]
  );

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Integrations"
        description="Configure forge access for GitHub and GitLab pull requests, merge requests, and issues."
        icon={Plug}
      />

      <SettingRow
        title={<IntegrationTitle provider="github" label="GitHub Token" />}
        description="Optional personal access token used for GitHub repositories. Add one for private repos or to avoid strict anonymous rate limits."
        control={(
          <div className="space-y-3">
            <Input
              type="password"
              value={githubToken}
              onChange={(event) => updateGithubToken(event.target.value)}
              placeholder="ghp_..."
              autoComplete="off"
            />
            {githubToken ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  Connected
                </span>
                <span>{githubAccountLabel ? `GitHub account: ${githubAccountLabel}` : "GitHub token saved"}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={connectGithubAccount}
                disabled={isLoadingForgeOAuthProviders || !githubOAuthProvider?.clientIdConfigured}
              >
                {githubToken ? "Reconnect GitHub" : "Connect GitHub"}
              </Button>
              {githubToken ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGithubAccount}
                >
                  Disconnect
                </Button>
              ) : null}
              {!githubOAuthProvider?.clientIdConfigured && !isLoadingForgeOAuthProviders ? (
                <span className="text-xs text-muted-foreground">Set `NORA_GITHUB_CLIENT_ID` to enable OAuth.</span>
              ) : null}
            </div>
          </div>
        )}
      />
      <SettingRow
        title={<IntegrationTitle provider="gitlab" label="GitLab Token" />}
        description="Optional personal or project access token used for GitLab repositories, including self-hosted GitLab instances whose remote host contains gitlab."
        control={(
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">GitLab host URL</div>
              <Input
                type="text"
                value={gitlabHost}
                onChange={(event) => updateGitlabHost(event.target.value)}
                placeholder="gitlab.com"
                autoComplete="off"
              />
            </div>
            <Input
              type="password"
              value={gitlabToken}
              onChange={(event) => updateGitlabToken(event.target.value)}
              placeholder="glpat-..."
              autoComplete="off"
            />
            {gitlabToken ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  Connected
                </span>
                <span>{gitlabAccountLabel ? `GitLab account: ${gitlabAccountLabel}` : "GitLab token saved"}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CircleHelp className="size-4" />
                    How to get a token
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[22rem] space-y-3">
                  <div className="text-sm font-medium text-foreground">Generate a GitLab personal access token</div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    Open your GitLab user settings and create a personal access token, then paste it into this field.
                  </div>
                  <div className="rounded-[6px] border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Suggested scope: `api` (for merge requests, issues, comments, and workflow metadata).
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      noraSystemClient.openExternalUrl(`https://${gitlabHost.trim() || "gitlab.com"}/-/user_settings/personal_access_tokens`)
                    }
                  >
                    <ExternalLink className="size-4" />
                    Open GitLab Tokens
                  </Button>
                </PopoverContent>
              </Popover>
              {gitlabToken ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGitlabAccount}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        )}
      />
      <SettingRow
        title={<IntegrationTitle provider="vercel" label="Vercel Token" />}
        description="Personal access token used for Vercel account access. This is used for workspace-level Vercel features such as project linking and deployments."
        control={(
          <div className="space-y-3">
            <Input
              type="password"
              value={vercelToken}
              onChange={(event) => updateVercelToken(event.target.value)}
              placeholder="vca_..."
              autoComplete="off"
            />
            {vercelToken ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  Connected
                </span>
                <span>{vercelAccountLabel ? `Vercel account: ${vercelAccountLabel}` : "Vercel token saved"}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CircleHelp className="size-4" />
                    How to get a token
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[22rem] space-y-3">
                  <div className="text-sm font-medium text-foreground">Generate a Vercel personal access token</div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    Open your Vercel account settings, create a personal access token, then paste it into this field.
                  </div>
                  <div className="rounded-[6px] border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Suggested path: Vercel dashboard → Settings → Tokens
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => noraSystemClient.openExternalUrl("https://vercel.com/account/tokens")}
                  >
                    <ExternalLink className="size-4" />
                    Open Vercel Tokens
                  </Button>
                </PopoverContent>
              </Popover>
              {vercelToken ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectVercelAccount}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        )}
      />
    </div>
  );
}
