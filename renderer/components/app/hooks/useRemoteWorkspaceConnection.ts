import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type {
  ConnectionMode,
  RemoteMode,
  RemoteWorkspaceDialogProps,
} from "@/components/app/types/component.types";
import type { RemoteConnectionOptions } from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

const emptyOptions: RemoteConnectionOptions = {
  support: {
    supported: false,
    provider: null,
    reason: null,
    installHint: null,
    canAutoInstall: false,
    bootstrapScript: null,
  },
  directSsh: {
    supported: false,
    reason: null,
  },
  hosts: [],
  activeMounts: [],
};

export function useRemoteWorkspaceConnection({
  open,
  onOpenChange,
  onConnect,
}: RemoteWorkspaceDialogProps) {
  const [options, setOptions] = useState<RemoteConnectionOptions>(emptyOptions);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstallingSupport, setIsInstallingSupport] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RemoteMode>("saved");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("mount");
  const [selectedAlias, setSelectedAlias] = useState("");
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [port, setPort] = useState("");
  const [remotePath, setRemotePath] = useState("");
  const [mountOutput, setMountOutput] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setMountOutput([]);
    noraSystemClient
      .getRemoteConnectionOptions()
      .then((next) => {
        if (cancelled) return;
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
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to inspect SSH configuration.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    [options.hosts, selectedAlias],
  );

  useEffect(() => {
    if (mode !== "saved" || !selectedHost) {
      return;
    }

    setHost(selectedHost.hostname || selectedHost.alias);
    setUser(selectedHost.user || "");
    setPort(selectedHost.port ? String(selectedHost.port) : "");
  }, [mode, selectedHost]);

  const resolvedHost =
    mode === "saved"
      ? selectedHost?.hostname || selectedHost?.alias || ""
      : host.trim();
  const resolvedUser =
    mode === "saved" ? (selectedHost?.user || user).trim() : user.trim();
  const resolvedPort =
    mode === "saved"
      ? (selectedHost?.port ? String(selectedHost.port) : port).trim()
      : port.trim();

  const canSubmit =
    ((connectionMode === "mount" && options.support.supported) ||
      (connectionMode === "ssh" && options.directSsh.supported)) &&
    !isLoading &&
    !isConnecting &&
    !!resolvedHost;
  const matchingMount =
    options.activeMounts.find(
      (mount) =>
        mount.host?.toLowerCase() === resolvedHost.toLowerCase() &&
        (mount.user || "").toLowerCase() === resolvedUser.toLowerCase(),
    ) || null;

  const installSupport = async (): Promise<void> => {
    setIsInstallingSupport(true);
    setError(null);
    setMountOutput([]);
    try {
      setOptions(await noraSystemClient.installRemoteMountSupport());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to install remote mounting support.",
      );
    } finally {
      setIsInstallingSupport(false);
    }
  };
  const connect = async (): Promise<void> => {
    if (!canSubmit) return;
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
          connectionMode,
        }),
      );
      onOpenChange(false);
    } catch (connectError: unknown) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to open the remote project.",
      );
    } finally {
      setIsConnecting(false);
    }
  };
  return {
    options,
    isLoading,
    isInstallingSupport,
    isConnecting,
    error,
    mode,
    setMode,
    connectionMode,
    setConnectionMode,
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
    mountOutput,
    canSubmit,
    matchingMount,
    connect,
    installSupport,
  };
}
