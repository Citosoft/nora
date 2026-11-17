import { Check, Copy, HardDrive, LoaderCircle, Server } from "lucide-react";
import { useState } from "react";
import type { RemoteWorkspaceSetupProps } from "@/components/app/types/remoteWorkspace.types";
import { Button } from "@/components/ui/button";

export function RemoteWorkspaceSetup({
  options,
  installing,
  onInstall,
}: RemoteWorkspaceSetupProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const bootstrapScript = options.support.bootstrapScript;
  return (
    <div className="space-y-5 text-xs leading-5">
      <p className="text-muted-foreground">
        Use an existing SSH key and make sure you can connect to the host from
        your terminal. Saved hosts are read from your SSH config.
      </p>
      <div className="divide-y divide-border rounded-md border border-border px-3">
        {(
          [
            {
              label: "Mounted drive",
              icon: HardDrive,
              ready: options.support.supported,
              description: options.support.supported
                ? `Ready${options.support.provider ? ` via ${options.support.provider}` : ""}. Browse remote files with a local folder picker.`
                : options.support.reason ||
                  "Remote mounting is not available on this computer.",
            },
            {
              label: "Direct SSH",
              icon: Server,
              ready: options.directSsh.supported,
              description: options.directSsh.supported
                ? "Ready. Git, agents and terminals run on your server."
                : options.directSsh.reason ||
                  "Direct SSH is not available on this computer.",
            },
          ] as const
        ).map(({ label, icon: Icon, ready, description }) => (
          <div key={label} className="flex items-start gap-3 py-3">
            <Icon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {ready ? "Ready" : "Setup required"}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>
      {!options.support.supported && options.support.installHint ? (
        <p className="text-muted-foreground">{options.support.installHint}</p>
      ) : null}
      {!options.support.supported && options.support.canAutoInstall ? (
        <Button
          type="button"
          size="sm"
          disabled={installing}
          onClick={() => void onInstall()}
        >
          {installing ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <HardDrive className="size-3.5" />
          )}
          {installing ? "Installing…" : "Install WinFsp and SSHFS-Win"}
        </Button>
      ) : null}
      {navigator.platform.toLowerCase().includes("win") && bootstrapScript ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Windows SSH setup</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(bootstrapScript);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy script"}
            </Button>
          </div>
          <p className="text-muted-foreground">
            After installing WinFsp and SSHFS-Win, run this once in
            Administrator PowerShell. Use it again if mounts fail.
          </p>
          <details>
            <summary className="cursor-pointer text-muted-foreground">
              View setup script
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono text-[11px]">
              {bootstrapScript}
            </pre>
          </details>
          {copyError ? (
            <p role="alert" className="text-destructive">
              Could not copy the script. Select and copy it from the expanded
              view.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
