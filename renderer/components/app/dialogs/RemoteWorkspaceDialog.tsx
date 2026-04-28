import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { Field } from "@/components/app/shared/Field";
import type {
  ConnectionMode,
  DialogTab,
  RemoteMode,
  RemoteWorkspaceDialogProps
} from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_SHORT_NAME } from "@shared/appMeta";
import type { RemoteConnectionOptions } from "@shared/appTypes";
import { ChevronDown, ChevronRight, HardDrive, LoaderCircle, Server, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const emptyOptions: RemoteConnectionOptions = {
  support: {
    supported: false,
    provider: null,
    reason: null,
    installHint: null,
    canAutoInstall: false,
    bootstrapScript: null
  },
  directSsh: {
    supported: false,
    reason: null
  },
  hosts: [],
  activeMounts: []
};

const isWindows = navigator.platform.toLowerCase().includes("win");

export function RemoteWorkspaceDialog({
  open,
  onOpenChange,
  onConnect
}: RemoteWorkspaceDialogProps) {
  const [options, setOptions] = useState<RemoteConnectionOptions>(emptyOptions);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstallingSupport, setIsInstallingSupport] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DialogTab>("connect");
  const [mode, setMode] = useState<RemoteMode>("saved");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("mount");
  const [selectedAlias, setSelectedAlias] = useState("");
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [port, setPort] = useState("");
  const [remotePath, setRemotePath] = useState("");
  const [mountOutput, setMountOutput] = useState<string[]>([]);
  const [showWindowsSetup, setShowWindowsSetup] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setMountOutput([]);
    setActiveTab("connect");
    setShowWindowsSetup(false);
    noraSystemClient.getRemoteConnectionOptions()
      .then((next) => {
        setOptions(next);
        const defaultAlias = next.hosts[0]?.alias || "";
        setSelectedAlias(defaultAlias);
        setMode(next.hosts.length ? "saved" : "manual");
        setConnectionMode(next.support.supported ? "mount" : "ssh");
        const defaultHost = next.hosts[0];
        setHost(defaultHost?.hostname || defaultHost?.alias || "");
        setUser(defaultHost?.user || "");
        setPort(defaultHost?.port ? String(defaultHost.port) : "");
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to inspect SSH configuration.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const unsubscribe = noraSystemClient.onRemoteMountOutput(({ line }) => {
      setMountOutput((current) => [...current.slice(-39), line]);
    });

    return () => {
      unsubscribe();
    };
  }, [open]);

  const selectedHost = useMemo(
    () => options.hosts.find((entry) => entry.alias === selectedAlias) || null,
    [options.hosts, selectedAlias]
  );

  useEffect(() => {
    if (mode !== "saved" || !selectedHost) {
      return;
    }

    setHost(selectedHost.hostname || selectedHost.alias);
    setUser(selectedHost.user || "");
    setPort(selectedHost.port ? String(selectedHost.port) : "");
  }, [mode, selectedHost]);

  const resolvedHost = mode === "saved"
    ? selectedHost?.hostname || selectedHost?.alias || ""
    : host.trim();
  const resolvedUser = mode === "saved"
    ? (selectedHost?.user || user).trim()
    : user.trim();
  const resolvedPort = mode === "saved"
    ? (selectedHost?.port ? String(selectedHost.port) : port).trim()
    : port.trim();

  const canSubmit =
    ((connectionMode === "mount" && options.support.supported) ||
      (connectionMode === "ssh" && options.directSsh.supported)) &&
    !isLoading &&
    !isConnecting &&
    !!resolvedHost;
  const matchingMount = options.activeMounts.find((mount) =>
    mount.host?.toLowerCase() === resolvedHost.toLowerCase() &&
    (mount.user || "").toLowerCase() === resolvedUser.toLowerCase()
  ) || null;
  const selectedHostLabel = mode === "saved"
    ? selectedHost?.alias || resolvedHost
    : resolvedHost;
  const bootstrapScript = options.support.bootstrapScript;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} headerTitle="Open remote workspace" className="max-w-[760px]">
        <DialogHeader>
          <DialogDescription>
            {connectionMode === "mount"
              ? "Mount an SSH host with your existing key-based SSH setup, then choose a repository folder on it."
              : "Open a repository directly over SSH using your existing key-based SSH setup."}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DialogTab)} className="min-h-0 flex-1">
          <div className="px-5 pb-3">
            <TabsList>
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
          </div>
          <DialogBody className="pt-0">
            <TabsContent value="connect" className="space-y-5">
          <div className="space-y-3 rounded-[4px] border border-border/70 bg-background/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Connection route
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Choose how this workspace should be exposed inside {APP_SHORT_NAME}.
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setConnectionMode("mount")}
                disabled={!options.support.supported}
                className={[
                  "group rounded-[4px] border px-4 py-4 text-left transition",
                  connectionMode === "mount"
                    ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                  !options.support.supported ? "opacity-50" : ""
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/60 bg-background/70 text-primary">
                    <HardDrive className="size-4" />
                  </div>
                  <div className="rounded-[4px] border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {options.support.supported ? "Available" : "Unavailable"}
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium text-foreground">Mounted drive</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Best when you want a local file picker and a mounted path you can browse like any other folder.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConnectionMode("ssh")}
                disabled={!options.directSsh.supported}
                className={[
                  "group rounded-[4px] border px-4 py-4 text-left transition",
                  connectionMode === "ssh"
                    ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                  !options.directSsh.supported ? "opacity-50" : ""
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-border/60 bg-background/70 text-primary">
                    <Server className="size-4" />
                  </div>
                  <div className="rounded-[4px] border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {options.directSsh.supported ? "Available" : "Unavailable"}
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium text-foreground">Direct SSH</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Best when Git, agents, and terminals should stay on the server with no local mount involved.
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[4px] border border-border/70 bg-background/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Host source
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Use an SSH config entry or enter the connection manually.
                </div>
              </div>
              <div className="inline-flex rounded-[4px] border border-border/60 bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => setMode("saved")}
                  disabled={!options.hosts.length}
                  className={[
                    "rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    mode === "saved"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                    !options.hosts.length ? "opacity-50" : ""
                  ].join(" ")}
                >
                  Saved hosts
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={[
                    "rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    mode === "manual"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  ].join(" ")}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="rounded-[4px] border border-border/60 bg-background/40 p-4">
              {mode === "saved" ? (
                <Field label="SSH host">
                  <Select
                    value={selectedAlias}
                    onChange={(event) => setSelectedAlias(event.target.value)}
                    disabled={!options.hosts.length}
                  >
                    {options.hosts.length ? (
                      options.hosts.map((entry) => (
                        <option key={entry.alias} value={entry.alias}>
                          {entry.alias}
                          {entry.hostname ? ` (${entry.user ? `${entry.user}@` : ""}${entry.hostname}${entry.port ? `:${entry.port}` : ""})` : ""}
                        </option>
                      ))
                    ) : (
                      <option value="">No SSH hosts detected</option>
                    )}
                  </Select>
                </Field>
              ) : (
                <>
                  <Field label="Host or alias">
                    <Input
                      value={host}
                      onChange={(event) => setHost(event.target.value)}
                      placeholder="devbox or devbox.example.com"
                    />
                  </Field>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="User">
                      <Input
                        value={user}
                        onChange={(event) => setUser(event.target.value)}
                        placeholder="username"
                      />
                    </Field>
                    <Field label="Port">
                      <Input
                        value={port}
                        onChange={(event) => setPort(event.target.value)}
                        placeholder="22"
                      />
                    </Field>
                  </div>
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-[4px] border border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Reading SSH config and remote mount support...
            </div>
          ) : null}

          <Field label={connectionMode === "mount" ? "Mount from remote path" : "Repository path"}>
            <Input
              value={remotePath}
              onChange={(event) => setRemotePath(event.target.value)}
              placeholder={connectionMode === "mount" ? "Leave blank for the remote home directory" : "/srv/app or ~/src/app"}
            />
          </Field>

          {connectionMode === "mount" && options.activeMounts.length ? (
            <div className="rounded-[4px] border border-border/70 bg-background/20 px-4 py-3 text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Active SSH mounts
              </div>
              <div className="mt-3 space-y-2">
                {options.activeMounts.map((mount) => (
                  <div
                    key={`${mount.remote}:${mount.localMount || "nolocal"}`}
                    className={["flex items-center gap-3 rounded-[4px] border px-3 py-2",
                      matchingMount?.remote === mount.remote
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 bg-background/40"
                    ].join(" ")}
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-border/60 bg-background/60 text-primary">
                      <HardDrive className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {mount.user ? `${mount.user}@` : ""}{mount.host || mount.remote}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {mount.localMount ? `${mount.localMount} -> ` : ""}{mount.remotePath || "/"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {connectionMode === "mount" && matchingMount ? (
            <div className="rounded-[4px] border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              {selectedHostLabel} is already mounted{matchingMount.localMount ? ` at ${matchingMount.localMount}` : ""}. You can use the local folder flow and browse that mounted drive instead of mounting it again.
            </div>
          ) : null}

          {connectionMode === "mount" && (isConnecting || mountOutput.length) ? (
            <div className="rounded-[4px] border border-border/70 bg-background/20 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Mount output
              </div>
              <div className="mt-3 max-h-40 overflow-auto rounded-[4px] border border-border/60 bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground">
                {mountOutput.length ? mountOutput.map((line, index) => (
                  <div key={`${index}:${line}`}>{line}</div>
                )) : (
                  <div>Waiting for mount output...</div>
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[4px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          ) : null}
            </TabsContent>
            <TabsContent value="help" className="space-y-4">
              <div className="rounded-[4px] border border-border/70 bg-background/30 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Availability
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3 rounded-[4px] border border-border/60 bg-background/40 px-3 py-2">
                    <div>
                      <div className="font-medium text-foreground">Mounted drive</div>
                      <div className="mt-1 text-muted-foreground">
                        {options.support.supported
                          ? `Ready${options.support.provider ? ` via ${options.support.provider}` : ""}.`
                          : (options.support.reason || "Remote mounting is not ready on this machine.")}
                      </div>
                    </div>
                    <div className="rounded-[4px] border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {options.support.supported ? "Installed" : "Missing"}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-[4px] border border-border/60 bg-background/40 px-3 py-2">
                    <div>
                      <div className="font-medium text-foreground">Direct SSH</div>
                      <div className="mt-1 text-muted-foreground">
                        {options.directSsh.supported
                          ? "Ready for direct repository access over SSH."
                          : (options.directSsh.reason || "Direct SSH access is not available.")}
                      </div>
                    </div>
                    <div className="rounded-[4px] border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {options.directSsh.supported ? "Installed" : "Missing"}
                    </div>
                  </div>
                </div>
              </div>

              {!options.support.supported ? (
                <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <TriangleAlert className="size-4 text-amber-500" />
                    Remote mounting help
                  </div>
                  {options.support.installHint ? (
                    <div className="mt-2 text-muted-foreground">{options.support.installHint}</div>
                  ) : null}
                  {options.support.reason ? (
                    <div className="mt-2 text-muted-foreground">{options.support.reason}</div>
                  ) : null}
                  {options.support.canAutoInstall ? (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        disabled={isInstallingSupport}
                        onClick={() => {
                          setIsInstallingSupport(true);
                          setError(null);
                          setMountOutput([]);
                          noraSystemClient.installRemoteMountSupport()
                            .then((nextOptions) => {
                              setOptions(nextOptions);
                            })
                            .catch((installError: unknown) => {
                              setError(
                                installError instanceof Error
                                  ? installError.message
                                  : "Failed to install WinFsp and SSHFS-Win."
                              );
                            })
                            .finally(() => {
                              setIsInstallingSupport(false);
                            });
                        }}
                      >
                        {isInstallingSupport ? "Installing Windows SSHFS support..." : "Install WinFsp and SSHFS-Win"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isWindows && bootstrapScript ? (
                <div className="rounded-[4px] border border-border/70 bg-background/20 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Windows SSH setup
                      </div>
                      <div className="mt-2 text-muted-foreground">
                        Run this once in an Administrator PowerShell after installing WinFsp and SSHFS-Win.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setShowWindowsSetup((current) => !current)}
                      >
                        {showWindowsSetup ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {showWindowsSetup ? "Hide setup" : "Show setup"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard.writeText(bootstrapScript);
                        }}
                      >
                        Copy script
                      </Button>
                    </div>
                  </div>
                  {showWindowsSetup ? (
                    <pre className="mt-3 max-h-48 overflow-auto rounded-[4px] border border-border/60 bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                      {bootstrapScript}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {options.support.supported && options.support.provider === "sshfs-win" ? (
                <div className="flex items-center gap-2 rounded-[4px] border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-xs text-muted-foreground">
                  <TriangleAlert className="size-3.5 shrink-0 text-emerald-500" />
                  <span>
                    WinFsp and SSHFS-Win are installed. If mounts still fail, use the Windows SSH setup script above.
                  </span>
                </div>
              ) : null}
            </TabsContent>
          </DialogBody>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={async () => {
              setIsConnecting(true);
              setError(null);
              setMountOutput([]);
              try {
                await Promise.resolve(
                  onConnect({
                  host: resolvedHost,
                  user: resolvedUser || undefined,
                  port: resolvedPort ? Number.parseInt(resolvedPort, 10) || null : null,
                  remotePath: remotePath.trim(),
                  alias: mode === "saved" ? selectedHost?.alias : undefined,
                  connectionMode
                  })
                );
                onOpenChange(false);
              } catch (connectError: unknown) {
                setError(connectError instanceof Error ? connectError.message : "Failed to mount remote host.");
              } finally {
                setIsConnecting(false);
              }
            }}
          >
            {isConnecting
              ? (connectionMode === "mount" ? "Mounting..." : "Opening over SSH...")
              : (connectionMode === "mount" ? "Mount and choose folder" : "Open over SSH")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
