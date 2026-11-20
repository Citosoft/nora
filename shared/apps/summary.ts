import { appSpecConnectorIds } from "./portable";
import type { AppDefinition, AppSummary } from "@shared/types/apps/apps.types";

/** The list entry for an app: everything but the spec, plus the connectors the spec reaches. */
export function appSummaryOf(app: AppDefinition): AppSummary {
  const { spec, ...rest } = app;
  return { ...rest, connectorIds: appSpecConnectorIds(spec) };
}
