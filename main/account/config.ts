import { readFileSync } from "node:fs";
import { accountConfigSchema } from "@shared/account/contracts";
import type { AccountConfig } from "@shared/types/account/account.types";

export function readAccountConfig(configPath: string): AccountConfig {
  const override = process.env.NORA_CLERK_PUBLISHABLE_KEY?.trim();
  if (override) return { publishableKey: override };
  try {
    const input: unknown = JSON.parse(readFileSync(configPath, "utf8"));
    return accountConfigSchema.parse(input);
  } catch { return { publishableKey: "" }; }
}

export function clerkFrontendHost(key: string): string | null {
  if (!/^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(key)) return null;
  const host = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64").toString("utf8");
  if (!host.endsWith("$")) return null;
  const hostname = host.slice(0, -1);
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname) ? hostname : null;
}
