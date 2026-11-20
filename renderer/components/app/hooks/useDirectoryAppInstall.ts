import { useEffect, useState } from "react";
import { appsClient } from "@/components/app/clients/appsClient";
import type { DirectoryAppDownload } from "@/components/app/types/directoryInstall.types";

/** Main retains the request until dismissed; subscribe before reading so cold-start and live links share one path. */
export function useDirectoryAppInstall() {
  const [id, setId] = useState<string | null>(null);
  const [file, setFile] = useState<DirectoryAppDownload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let received = false;
    const unsubscribe = appsClient.onInstallRequested((next) => { received = true; setId(next); });
    void appsClient.request({ kind: "get-install-request" }).then((reply) => {
      if (active && !received && reply.kind === "install-request") setId(reply.id);
    }, () => undefined);
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    setFile(null); setError(null);
    if (!id) return;
    let active = true;
    void appsClient.request({ kind: "read-directory-app", id }).then((reply) => {
      if (active && reply.kind === "app-file") setFile({ id, picked: { path: reply.path, file: reply.file } });
    }, (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "The app could not be downloaded."); });
    return () => { active = false; };
  }, [id]);
  return { id, file: file?.id === id ? file.picked : null, error, dismiss: () => {
    if (id) void appsClient.request({ kind: "clear-install-request", id }).catch(() => undefined);
    setId(null);
  } };
}
