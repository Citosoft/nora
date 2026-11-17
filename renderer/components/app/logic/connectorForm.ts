import { connectorInputSchema } from "@shared/connectors/contracts";
import { EVERYWHERE_ACCESS_DRAFT, buildConnectorAccess } from "@/components/app/logic/connectorAccess";
import type { AddConnectorStep, AddConnectorStepTarget, ConnectorAccessChoices, ConnectorFormResult, ConnectorFormState, ConnectorServerResult } from "@/components/app/types/noraConnectors.types";

export const EMPTY_CONNECTOR_FORM: ConnectorFormState = { name: "", url: "", authMode: "oauth", clientId: "", clientSecret: "",
  headerName: "Authorization", headerValue: "", access: EVERYWHERE_ACCESS_DRAFT };

/** A connector name from its URL's host ("mcp.linear.app" → "Linear"), offered until the user types their own. */
export function suggestConnectorName(url: string): string {
  try {
    const labels = new URL(url).hostname.split(".").filter((label) => !["www", "mcp", "api"].includes(label));
    const label = labels.length > 1 ? labels[labels.length - 2] : labels[0];
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
  } catch { return ""; }
}

export const ADD_CONNECTOR_STEPS: readonly AddConnectorStep[] = ["server", "auth", "access"];

/** The server and its authentication, checked against the same contract main enforces, so the dialog can stop before availability. */
export function buildConnectorServer(form: ConnectorFormState): ConnectorServerResult {
  const name = form.name.trim() || suggestConnectorName(form.url.trim());
  const auth = form.authMode === "header"
    ? { kind: "header" as const, name: form.headerName.trim(), value: form.headerValue }
    : { kind: "oauth" as const, ...(form.clientId.trim() ? { clientId: form.clientId.trim() } : {}),
      ...(form.clientId.trim() && form.clientSecret ? { clientSecret: form.clientSecret } : {}) };
  const parsed = connectorInputSchema.safeParse({ name, url: form.url, auth });
  if (parsed.success) return { ok: true, server: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue?.path[0] === "auth" ? (form.authMode === "header" ? "header" : "OAuth client") : issue?.path[0];
  const label = field === "name" ? "Enter a name for the connector" : field === "url" ? issue?.message ?? "Enter the server URL"
    : field === "header" ? (form.headerValue ? "Enter a valid header name" : "Enter the header value") : issue?.message ?? "Check the connector details";
  return { ok: false, message: label, step: issue?.path[0] === "auth" ? "auth" : "server" };
}

/** Moving forward stops at the earliest step before the target that still has a problem; moving back always works. */
export function resolveAddConnectorStep(form: ConnectorFormState, target: AddConnectorStep): AddConnectorStepTarget {
  const server = buildConnectorServer(form);
  if (!server.ok && ADD_CONNECTOR_STEPS.indexOf(server.step) < ADD_CONNECTOR_STEPS.indexOf(target)) return { step: server.step, error: server.message };
  return { step: target, error: null };
}

/** The whole request: the server step, then where the connector is available. */
export function buildConnectorInput(form: ConnectorFormState, choices: ConnectorAccessChoices): ConnectorFormResult {
  const server = buildConnectorServer(form);
  if (!server.ok) return { ok: false, message: server.message };
  const access = buildConnectorAccess(form.access, choices);
  return access.ok ? { ok: true, input: { ...server.server, access: access.access } } : access;
}
