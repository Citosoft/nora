import { useCallback, useEffect, useRef, useState } from "react";
import { nativeConversationBridge } from "@/components/app/clients/nativeRuntimeClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { providerAccountViewFromRead } from "@/components/app/logic/providerAccountView";
import type { ProviderAccountView } from "@/components/app/types/providerAccount.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";

const SIGN_IN_POLL_MS = 3_000;
const SIGN_IN_TIMEOUT_MS = 3 * 60_000;
const READ_FAILED: ProviderAccountView = { status: "error", message: "The provider runtime could not be reached. Check its configuration and refresh." };
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/** Reads each native provider's account through its runtime, and drives browser sign-in until the account changes. */
export function useProviderAccounts() {
  const { boot } = useNativeRuntimePorts();
  // Keyed by provider kind, which is also the agent catalog id, so settings can look providers up by tool id.
  const [views, setViews] = useState<ReadonlyMap<string, ProviderAccountView>>(() => new Map());
  const generation = useRef(0);
  const record = useCallback((kind: NativeProvider["kind"], view: ProviderAccountView) =>
    setViews((previous) => new Map(previous).set(kind, view)), []);
  const call = useCallback((provider: NativeProvider, action: ProviderAccountAction): Promise<ProviderAccountResult> =>
    nativeConversationBridge.account({ schemaVersion: 1, environmentId: boot.environmentId, providerKind: provider.kind, instanceId: provider.instanceId, action }),
  [boot.environmentId]);
  const read = useCallback(async (provider: NativeProvider): Promise<ProviderAccountView> => {
    try { return providerAccountViewFromRead(await call(provider, { kind: "read" })); } catch { return READ_FAILED; }
  }, [call]);

  const refresh = useCallback(() => {
    const current = ++generation.current;
    for (const provider of boot.providers) {
      record(provider.kind, { status: "loading" });
      void read(provider).then((view) => { if (generation.current === current) record(provider.kind, view); });
    }
  }, [boot.providers, read, record]);
  useEffect(() => { refresh(); return () => { generation.current++; }; }, [refresh]);

  const signIn = useCallback(async (kind: string): Promise<void> => {
    const provider = boot.providers.find((entry) => entry.kind === kind);
    if (!provider) return;
    const current = generation.current;
    const isCurrent = () => generation.current === current;
    record(provider.kind, { status: "signing-in" });
    try {
      const started = await call(provider, { kind: "login" });
      if (started.kind === "unavailable" || started.kind === "account") {
        if (isCurrent()) record(provider.kind, started.kind === "account" ? { status: "ready", account: started.account } : { status: "error", message: started.message });
        return;
      }
      if (started.kind === "login") await noraSystemClient.openExternalUrl(started.authorizationUrl);
    } catch {
      if (isCurrent()) record(provider.kind, { status: "error", message: "Sign-in could not be started. Check the provider runtime and try again." });
      return;
    }
    // Browser sign-in completes outside Nora, so poll the runtime until it reports an account or the attempt times out.
    const deadline = Date.now() + SIGN_IN_TIMEOUT_MS;
    let latest: ProviderAccountView = READ_FAILED;
    while (isCurrent() && Date.now() < deadline) {
      await wait(SIGN_IN_POLL_MS);
      latest = await read(provider);
      if (latest.status === "ready" && latest.account.state === "signed-in") break;
    }
    if (isCurrent()) record(provider.kind, latest);
  }, [boot.providers, call, read, record]);

  return { views, refresh, signIn };
}
