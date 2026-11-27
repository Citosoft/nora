import { readFileSync } from "node:fs";
import { z } from "zod";
import type { PostHogConfig } from "@shared/types/analytics.types";

const configSchema = z.object({ apiKey: z.string() });

export function readAnalyticsConfig(configPath: string): PostHogConfig {
  try {
    const input: unknown = JSON.parse(readFileSync(configPath, "utf8"));
    return configSchema.parse(input);
  } catch {
    return { apiKey: "" };
  }
}
