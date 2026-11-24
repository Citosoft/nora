import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { InstallationState, LaunchTrackingInput } from "@main/types/analytics/launch.types";

const stateSchema = z.object({ installationId: z.string().uuid(), reported: z.boolean() });

// This ID is deliberately separate from accounts and the opt-in browser SDK.
export async function trackInstallationLaunch(input: LaunchTrackingInput): Promise<void> {
  if (!input.allowed || !input.config.apiKey.trim()) return;

  const endpoint = new URL(input.config.host || "https://us.i.posthog.com");
  if (endpoint.protocol !== "https:") throw new Error("Analytics requires HTTPS.");
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/capture/`;

  let state: InstallationState;
  try {
    const raw: unknown = JSON.parse(await readFile(input.statePath, "utf8"));
    state = stateSchema.parse(raw);
  } catch (error) {
    // Never replace an unreadable or invalid identity and inflate install counts.
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    state = { installationId: randomUUID(), reported: false };
    await mkdir(path.dirname(input.statePath), { recursive: true });
    await writeFile(input.statePath, JSON.stringify(state), { encoding: "utf8", mode: 0o600, flag: "wx" });
  }

  const response = await (input.fetch ?? globalThis.fetch)(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: input.config.apiKey,
      event: "app.launched",
      properties: {
        distinct_id: state.installationId,
        appVersion: input.context.appVersion,
        environment: input.context.environment,
        platform: input.context.platform,
        countryCode: input.context.countryCode,
        isFirstLaunch: !state.reported,
        $process_person_profile: false,
        $geoip_disable: true,
        $ip: null
      }
    }),
    signal: AbortSignal.timeout(5_000),
    redirect: "error"
  });
  if (!response.ok) throw new Error(`Launch analytics failed (${response.status}).`);
  if (!state.reported) {
    await writeFile(input.statePath, JSON.stringify({ ...state, reported: true }), { encoding: "utf8", mode: 0o600 });
  }
}
