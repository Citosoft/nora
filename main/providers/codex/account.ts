import { z } from "zod";
import type { ProviderAccount, ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import { providerAccountResultSchema } from "@shared/providers/account";
import type { StdioRpc } from "./stdioRpc";

const accountSchema = z.object({ requiresOpenaiAuth: z.boolean(), account: z.object({ type: z.string(),
  email: z.string().nullish(), planType: z.string().nullish(), workspaceName: z.string().nullish() }).nullish() });
const loginSchema = z.object({ type: z.string(), authUrl: z.string().optional() });
const titleCase = (value: string): string => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

/** Maps the app-server `account/read` reply onto a provider-neutral sign-in state. */
export function normalizeCodexAccount(input: unknown): ProviderAccount {
  const { account, requiresOpenaiAuth } = accountSchema.parse(input);
  if (!account) return requiresOpenaiAuth ? { state: "signed-out" } : { state: "unknown" };
  if (account.type === "apiKey") return { state: "signed-in", method: "API key", label: null };
  if (account.type === "chatgpt") {
    const plan = account.planType && account.planType !== "unknown" ? ` ${titleCase(account.planType)}` : "";
    return { state: "signed-in", method: `ChatGPT${plan}`, label: account.email ?? account.workspaceName ?? null };
  }
  return { state: "signed-in", method: titleCase(account.type), label: account.email ?? null };
}

/** Reads and starts ChatGPT sign-in through the app-server; the client opens the returned URL and re-reads the account. */
export async function codexAccount(rpc: StdioRpc, action: ProviderAccountAction): Promise<ProviderAccountResult> {
  if (action.kind === "login") {
    const result = await rpc.request("account/login/start", { type: "chatgpt" }, loginSchema);
    if (!result.authUrl) return { kind: "unavailable", message: "Codex did not return a sign-in link. Update Codex and try again." };
    return providerAccountResultSchema.parse({ kind: "login", authorizationUrl: result.authUrl });
  }
  return { kind: "account", account: normalizeCodexAccount(await rpc.request("account/read", {}, z.unknown())) };
}
