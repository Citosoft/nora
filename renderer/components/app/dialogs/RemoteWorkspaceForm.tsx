import { HardDrive, Server } from "lucide-react";
import { Field } from "@/components/app/shared/Field";
import type { RemoteWorkspaceFormProps } from "@/components/app/types/remoteWorkspace.types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function RemoteWorkspaceForm({ connection }: RemoteWorkspaceFormProps) {
  const {
    options,
    isLoading,
    isConnecting,
    isInstallingSupport,
    connectionMode,
    setConnectionMode,
    mode,
    setMode,
    selectedAlias,
    setSelectedAlias,
    host,
    setHost,
    user,
    setUser,
    port,
    setPort,
    remotePath,
    setRemotePath,
    matchingMount,
  } = connection;
  const busy = isConnecting || isInstallingSupport;
  return (
    <fieldset disabled={busy || isLoading} className="min-w-0 space-y-5">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-medium">Connection</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                value: "mount",
                label: "Mounted drive",
                detail: "Browse files locally",
                icon: HardDrive,
                supported: options.support.supported,
              },
              {
                value: "ssh",
                label: "Direct SSH",
                detail: "Work on the server",
                icon: Server,
                supported: options.directSsh.supported,
              },
            ] as const
          ).map(({ value, label, detail, icon: Icon, supported }) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
                connectionMode === value
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-muted/50",
                !supported && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                className="sr-only"
                type="radio"
                name="connection-mode"
                value={value}
                checked={connectionMode === value}
                disabled={!supported}
                onChange={() => setConnectionMode(value)}
              />
              <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium">{label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                  {supported || isLoading ? detail : "Setup required"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (value === "saved" || value === "manual") setMode(value);
        }}
      >
        <TabsList
          aria-label="Host source"
          className="mb-4 rounded-md border-0 bg-muted/60 p-0.5"
        >
          <TabsTrigger
            value="saved"
            disabled={!options.hosts.length || busy || isLoading}
            className="rounded-sm px-3 data-[state=active]:bg-card"
          >
            Saved hosts
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            disabled={busy || isLoading}
            className="rounded-sm px-3 data-[state=active]:bg-card"
          >
            Manual connection
          </TabsTrigger>
        </TabsList>
        <TabsContent value="saved">
          <Field label="SSH host">
            <Select
              aria-label="SSH host"
              value={selectedAlias}
              onChange={(event) => setSelectedAlias(event.target.value)}
              disabled={busy || isLoading}
            >
              {options.hosts.map((entry) => (
                <option key={entry.alias} value={entry.alias}>
                  {entry.alias}
                  {entry.hostname
                    ? ` · ${entry.user ? `${entry.user}@` : ""}${entry.hostname}`
                    : ""}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs text-muted-foreground">
            From your SSH config. Uses the host’s saved connection settings.
          </p>
        </TabsContent>
        <TabsContent value="manual" className="space-y-3">
          <Field label="Host or SSH alias">
            <Input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="devbox.example.com"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="User">
              <Input
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="SSH default"
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            <Field label="Port">
              <Input
                value={port}
                onChange={(event) => setPort(event.target.value)}
                placeholder="22"
                inputMode="numeric"
              />
            </Field>
          </div>
        </TabsContent>
      </Tabs>
      <div>
        <Field
          label={
            connectionMode === "mount" ? "Remote folder" : "Repository path"
          }
        >
          <Input
            value={remotePath}
            onChange={(event) => setRemotePath(event.target.value)}
            placeholder={connectionMode === "mount" ? "~" : "~/projects/my-app"}
            spellCheck={false}
            autoCapitalize="none"
          />
        </Field>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {connectionMode === "mount"
            ? "Leave blank for your home directory. Choose a project folder after mounting."
            : "Enter the project folder on your server. Leave blank to use your home directory."}
        </p>
      </div>
      {connectionMode === "mount" && options.activeMounts.length > 0 ? (
        <details className="rounded-md bg-muted/40 px-3 py-2.5 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            {options.activeMounts.length} active{" "}
            {options.activeMounts.length === 1 ? "mount" : "mounts"}
          </summary>
          <ul className="mt-2 space-y-2">
            {options.activeMounts.map((mount) => (
              <li
                key={`${mount.remote}:${mount.localMount}`}
                className="break-all leading-5"
              >
                <span className="font-medium">{mount.remote}</span>
                {mount.localMount ? (
                  <span className="block text-muted-foreground">
                    {mount.localMount}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {connectionMode === "mount" && matchingMount ? (
        <p className="text-xs leading-5 text-muted-foreground">
          This host is already mounted
          {matchingMount.localMount ? ` at ${matchingMount.localMount}` : ""}.
          You can also open it through the local folder picker.
        </p>
      ) : null}
    </fieldset>
  );
}
