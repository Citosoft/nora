import type { ForgeOAuthDevicePrompt, ForgeOAuthProviderConfig, ForgeOAuthResult, OAuthProvider } from "@shared/appTypes";
import { shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { ProviderRuntimeConfig } from "./types/internal.types";

const OAUTH_BUILD_CONFIG_PATH = path.resolve(__dirname, "..", "runtime", "oauth-build-config.json");

type OAuthBuildConfig = Partial<Record<
  | "NORA_GITHUB_CLIENT_ID"
  | "NORA_GITHUB_OAUTH_HOST"
  | "NORA_GITLAB_CLIENT_ID"
  | "NORA_GITLAB_OAUTH_HOST",
  string
>>;

let cachedOAuthBuildConfig: OAuthBuildConfig | null = null;

function getOAuthBuildConfig(): OAuthBuildConfig {
  if (cachedOAuthBuildConfig) {
    return cachedOAuthBuildConfig;
  }

  try {
    const raw = fs.readFileSync(OAUTH_BUILD_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as OAuthBuildConfig;
    cachedOAuthBuildConfig = parsed;
    return parsed;
  } catch {
    cachedOAuthBuildConfig = {};
    return cachedOAuthBuildConfig;
  }
}

function readOAuthConfigValue(key: keyof OAuthBuildConfig): string {
  const bakedValue = getOAuthBuildConfig()[key];
  if (bakedValue !== undefined) {
    return bakedValue;
  }
  return process.env[key] || "";
}

function getProviderRuntimeConfig(provider: OAuthProvider): ProviderRuntimeConfig | null {
  if (provider === "github") {
    const host = readOAuthConfigValue("NORA_GITHUB_OAUTH_HOST") || "github.com";
    const clientId = readOAuthConfigValue("NORA_GITHUB_CLIENT_ID");
    return clientId
      ? {
          provider,
          label: "GitHub",
          host,
          clientId,
          tokenUrl: `https://${host}/login/oauth/access_token`,
          scopes: ["repo", "read:user"],
          userUrl: "https://api.github.com/user"
        }
      : null;
  }

  const host = readOAuthConfigValue("NORA_GITLAB_OAUTH_HOST") || "gitlab.com";
  const clientId = readOAuthConfigValue("NORA_GITLAB_CLIENT_ID");
  return clientId
    ? {
        provider,
        label: "GitLab",
        host,
        clientId,
        tokenUrl: `https://${host}/oauth/token`,
        scopes: ["read_api"],
        userUrl: `https://${host}/api/v4/user`
      }
    : null;
}

export function getForgeOAuthProviderConfigs(): ForgeOAuthProviderConfig[] {
  return (["github", "gitlab"] as const).map((provider) => {
    const runtime = getProviderRuntimeConfig(provider);
    return {
      provider,
      label: provider === "github" ? "GitHub" : "GitLab",
      host: runtime?.host || (provider === "github" ? "github.com" : "gitlab.com"),
      clientIdConfigured: !!runtime?.clientId
    };
  });
}

async function startDeviceOAuth(
  runtime: ProviderRuntimeConfig,
  deviceAuthorizeUrl: string,
  providerLabel: "GitHub" | "GitLab",
  onDevicePrompt?: (payload: ForgeOAuthDevicePrompt) => void
): Promise<string> {
  const deviceCodeResponse = await fetch(deviceAuthorizeUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: runtime.clientId,
      scope: runtime.scopes.join(" ")
    })
  });

  const devicePayload = await deviceCodeResponse.json().catch(() => null) as
    | {
        device_code?: string;
        user_code?: string;
        verification_uri?: string;
        verification_uri_complete?: string;
        expires_in?: number;
        interval?: number;
        error?: string;
        error_description?: string;
      }
    | null;

  if (!deviceCodeResponse.ok || !devicePayload?.device_code || !devicePayload.verification_uri || !devicePayload.user_code) {
    throw new Error(devicePayload?.error_description || devicePayload?.error || `${providerLabel} device authorization could not be started.`);
  }

  const openUrl = devicePayload.verification_uri_complete || devicePayload.verification_uri;
  await shell.openExternal(openUrl);
  onDevicePrompt?.({
    provider: runtime.provider,
    providerLabel,
    userCode: devicePayload.user_code,
    verificationUri: devicePayload.verification_uri
  });

  const intervalMs = Math.max((devicePayload.interval || 5) * 1000, 1000);
  const expiresAt = Date.now() + Math.max((devicePayload.expires_in || 900) * 1000, 60_000);
  let currentIntervalMs = intervalMs;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, currentIntervalMs));

    const tokenResponse = await fetch(runtime.tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: runtime.clientId,
        device_code: devicePayload.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });

    const tokenPayload = await tokenResponse.json().catch(() => null) as
      | {
          access_token?: string;
          error?: string;
          error_description?: string;
          interval?: number;
        }
      | null;

    if (tokenPayload?.access_token) {
      return tokenPayload.access_token;
    }

    const oauthError = tokenPayload?.error || "";
    if (oauthError === "authorization_pending") {
      continue;
    }
    if (oauthError === "slow_down") {
      currentIntervalMs = Math.max(
        currentIntervalMs + 5000,
        Math.max((tokenPayload?.interval || 5) * 1000, 1000)
      );
      continue;
    }
    if (oauthError === "expired_token") {
      throw new Error("GitHub device authorization expired. Please try again.");
    }
    if (oauthError === "access_denied") {
      throw new Error(`${providerLabel} authorization was denied.`);
    }
    if (oauthError === "device_flow_disabled") {
      throw new Error(`${providerLabel} device flow is disabled for this OAuth app.`);
    }
    if (oauthError === "unsupported_grant_type" || oauthError === "invalid_grant") {
      throw new Error(`${providerLabel} device flow is not available on this host. Ensure device flow is enabled and supported by your ${providerLabel} instance.`);
    }

    throw new Error(tokenPayload?.error_description || tokenPayload?.error || `OAuth token exchange failed with status ${tokenResponse.status}.`);
  }

  throw new Error(`${providerLabel} device authorization timed out.`);
}

async function resolveAccountLabel(runtime: ProviderRuntimeConfig, accessToken: string): Promise<string | null> {
  const response = await fetch(runtime.userUrl, {
    headers: runtime.provider === "github"
      ? {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`
        }
      : {
          Authorization: `Bearer ${accessToken}`
        }
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) {
    return null;
  }

  return typeof payload.login === "string"
    ? payload.login
    : typeof payload.username === "string"
      ? payload.username
      : typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : typeof payload.email === "string"
          ? payload.email
      : typeof payload.name === "string"
        ? payload.name
        : null;
}

export async function startForgeOAuth(
  provider: OAuthProvider,
  onDevicePrompt?: (payload: ForgeOAuthDevicePrompt) => void
): Promise<ForgeOAuthResult> {
  if (provider === "vercel") {
    throw new Error("Vercel does not use OAuth in this app. Paste a personal access token in Settings → Integrations.");
  }

  const runtime = getProviderRuntimeConfig(provider);
  if (!runtime) {
    throw new Error(`${provider === "github" ? "GitHub" : "GitLab"} OAuth is not configured. Set the client ID env var first.`);
  }

  if (provider === "github") {
    const accessToken = await startDeviceOAuth(runtime, `https://${runtime.host}/login/device/code`, "GitHub", onDevicePrompt);
    const accountLabel = await resolveAccountLabel(runtime, accessToken);
    return {
      provider,
      accessToken,
      accountLabel
    };
  }

  const accessToken = await startDeviceOAuth(runtime, `https://${runtime.host}/oauth/authorize_device`, "GitLab", onDevicePrompt);
  const accountLabel = await resolveAccountLabel(runtime, accessToken);
  return {
    provider,
    accessToken,
    accountLabel
  };
}
