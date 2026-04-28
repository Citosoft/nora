import type {
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRedeployPayload,
  VercelRuntimeLogEntry,
  VercelRuntimeLogStreamRequest
} from "@shared/appTypes";
import { getBoolean, getJsonArray, getJsonObject, getNumber, getString, type JsonObject, type JsonValue } from "../jsonValue";
import type { VercelTeamRecord } from "../types/internal.types";

export function getVercelHeaders(token: string): Record<string, string> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Connect Vercel before loading Vercel projects.");
  }

  return {
    Authorization: `Bearer ${trimmedToken}`,
    "Content-Type": "application/json"
  };
}

export function buildUrlWithQuery(baseUrl: string, query: Record<string, string | number | null | undefined>): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchVercelJson(url: string, token: string, contextLabel: string, timeoutMs: number): Promise<JsonValue | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: getVercelHeaders(token),
      signal: controller.signal
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Vercel ${contextLabel} timed out after ${timeoutMs / 1000}s.`);
    }
    throw error;
  }
  clearTimeout(timeoutId);
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Vercel ${contextLabel} failed (${response.status} ${response.statusText}) at ${url}: ${responseText || "No response body."}`
    );
  }
  try {
    return responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(
      `Vercel ${contextLabel} returned non-JSON data at ${url}: ${responseText.slice(0, 600) || "Empty response body."}`
    );
  }
}

function parseJsonObject(text: string, contextLabel: string): JsonObject | null {
  if (!text) {
    return null;
  }

  const parsed: JsonValue | unknown = JSON.parse(text);
  const parsedObject = getJsonObject(parsed);
  if (!parsedObject) {
    throw new Error(`${contextLabel} returned an unexpected response shape.`);
  }
  return parsedObject;
}

async function listVercelTeams(token: string, timeoutMs: number): Promise<VercelTeamRecord[]> {
  const teams: VercelTeamRecord[] = [];
  let next: number | null = null;

  do {
    const payload = await fetchVercelJson(
      buildUrlWithQuery("https://api.vercel.com/v2/teams", {
        limit: 100,
        until: next
      }),
      token,
      "team listing",
      timeoutMs
    );
    const payloadObject = getJsonObject(payload);
    const batch = getJsonArray(payloadObject?.teams);
    teams.push(
      ...batch
        .map((team) => getJsonObject(team))
        .filter((team): team is JsonObject => !!team)
        .map((team) => ({
          id: getString(team.id) ?? "",
          slug: getString(team.slug),
          name: getString(team.name)
        }))
        .filter((team: VercelTeamRecord) => team.id)
    );
    next = getNumber(getJsonObject(payloadObject?.pagination)?.next);
  } while (next);

  return teams;
}

function normalizeVercelRepoUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().replace(/\.git$/i, "").replace(/\/+$/, "").toLowerCase();
}

function mapVercelProjectSummary(project: JsonObject, teamsById: Map<string, VercelTeamRecord>): VercelProjectSummary | null {
  const id = getString(project.id);
  const name = getString(project.name);
  if (!id || !name) {
    return null;
  }

  const accountId = getString(project.accountId);
  const team = accountId ? teamsById.get(accountId) ?? null : null;
  const teamId = team?.id ?? null;
  const latestDeployment = getJsonObject(getJsonArray(project.latestDeployments)[0]);
  const latestMeta = getJsonObject(latestDeployment?.meta);
  const projectLink = getJsonObject(project.link);
  const accountSlug = getString(latestMeta?.teamSlug) ?? team?.slug ?? null;
  const accountName = team?.name ?? (accountId ? null : "Personal");
  const inferredRepoUrl =
    getString(projectLink?.type) && getString(projectLink?.org) && getString(projectLink?.repo)
      ? normalizeVercelRepoUrl(
          `https://${getString(projectLink?.type) === "gitlab" ? "gitlab.com" : "github.com"}/${getString(projectLink?.org)}/${getString(projectLink?.repo)}`
        )
      : null;
  const link = projectLink
    ? {
        type: getString(projectLink.type),
        org: getString(projectLink.org),
        repo: getString(projectLink.repo),
        repoUrl: normalizeVercelRepoUrl(getString(projectLink.repoUrl)) || inferredRepoUrl,
        productionBranch: getString(projectLink.productionBranch)
      }
    : null;

  return {
    id,
    name,
    accountId,
    teamId,
    accountSlug,
    accountName,
    framework: getString(project.framework),
    rootDirectory: getString(project.rootDirectory),
    createdAt: typeof project.createdAt === "number" ? new Date(project.createdAt).toISOString() : typeof project.createdAt === "string" ? project.createdAt : null,
    updatedAt: typeof project.updatedAt === "number" ? new Date(project.updatedAt).toISOString() : typeof project.updatedAt === "string" ? project.updatedAt : null,
    webUrl: accountSlug ? `https://vercel.com/${accountSlug}/${name}` : null,
    link
  };
}

async function listVercelProjectsForScope(
  token: string,
  teamsById: Map<string, VercelTeamRecord>,
  timeoutMs: number,
  scope?: { teamId?: string | null; slug?: string | null }
): Promise<VercelProjectSummary[]> {
  const projects: VercelProjectSummary[] = [];
  let next: number | null = null;

  do {
    const payload = await fetchVercelJson(
      buildUrlWithQuery("https://api.vercel.com/v10/projects", {
        limit: 100,
        teamId: scope?.teamId,
        slug: scope?.slug,
        until: next
      }),
      token,
      `project listing${scope?.teamId ? ` for team ${scope.teamId}` : scope?.slug ? ` for team slug ${scope.slug}` : " for personal account"}`,
      timeoutMs
    );
    const payloadObject = getJsonObject(payload);
    const batch = getJsonArray(payloadObject?.projects ?? payload);
    for (const project of batch) {
      const summary = mapVercelProjectSummary(getJsonObject(project) ?? {}, teamsById);
      if (summary) {
        projects.push(summary);
      }
    }
    next = getNumber(getJsonObject(payloadObject?.pagination)?.next);
  } while (next);

  return projects;
}

export async function listAccessibleVercelProjects(token: string, timeoutMs: number): Promise<VercelProjectSummary[]> {
  const teams = await listVercelTeams(token, timeoutMs).catch(() => []);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const projects = await listVercelProjectsForScope(token, teamsById, timeoutMs);
  const scopeErrors: string[] = [];

  for (const team of teams) {
    try {
      projects.push(...await listVercelProjectsForScope(token, teamsById, timeoutMs, { teamId: team.id }));
      continue;
    } catch (teamIdError: unknown) {
      if (!team.slug) {
        scopeErrors.push(`${team.name || team.id}: ${teamIdError instanceof Error ? teamIdError.message : "Unknown Vercel API error."}`);
        continue;
      }
    }

    try {
      projects.push(...await listVercelProjectsForScope(token, teamsById, timeoutMs, { slug: team.slug }));
    } catch (slugError: unknown) {
      scopeErrors.push(`${team.name || team.slug || team.id}: ${slugError instanceof Error ? slugError.message : "Unknown Vercel API error."}`);
    }
  }

  const deduped = new Map<string, VercelProjectSummary>();
  for (const project of projects) {
    deduped.set(project.id, project);
  }

  if (!deduped.size && !teams.length) {
    throw new Error(
      "No Vercel projects were returned for the personal account scope. This usually means the connected app token does not have the required project/API permissions in the Vercel app configuration."
    );
  }

  if (!deduped.size && scopeErrors.length) {
    throw new Error(`No Vercel projects could be loaded. Team access failed for: ${scopeErrors.join(" | ")}`);
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const accountNameDelta = (left.accountName || "").localeCompare(right.accountName || "");
    if (accountNameDelta !== 0) {
      return accountNameDelta;
    }
    return left.name.localeCompare(right.name);
  });
}

function mapVercelDeploymentSummary(deployment: JsonObject): VercelDeploymentSummary | null {
  const meta = getJsonObject(deployment.meta);
  const creator = getJsonObject(deployment.creator);
  const id = getString(deployment.uid) ?? getString(deployment.id) ?? null;
  const projectId = getString(deployment.projectId);
  const createdAt = typeof deployment.createdAt === "number"
    ? new Date(deployment.createdAt).toISOString()
    : typeof deployment.createdAt === "string"
      ? deployment.createdAt
      : null;
  if (!id || !projectId || !createdAt) {
    return null;
  }

  const deploymentUrl = getString(deployment.url);
  return {
    id,
    projectId,
    projectName: getString(deployment.name) ?? "",
    teamId: getString(deployment.teamId),
    url: deploymentUrl ? `https://${deploymentUrl.replace(/^https?:\/\//, "")}` : null,
    inspectorUrl: getString(deployment.inspectorUrl),
    createdAt,
    state: getString(deployment.state) ?? "unknown",
    readyState: getString(deployment.readyState),
    target: getString(deployment.target),
    branch: getString(meta?.githubCommitRef) ?? getString(meta?.gitlabCommitRef) ?? null,
    commitSha: getString(meta?.githubCommitSha) ?? getString(meta?.gitlabCommitSha) ?? null,
    creator: getString(creator?.username) ?? getString(creator?.email) ?? null
  };
}

function mapVercelRuntimeLogEntry(entry: JsonObject, index: number): VercelRuntimeLogEntry | null {
  const payload = getJsonObject(entry.payload);
  const info = getJsonObject(payload?.info);
  const proxy = getJsonObject(payload?.proxy);
  const timestampInMs = getNumber(entry.timestampInMs) ?? getNumber(entry.created) ?? getNumber(payload?.created) ?? getNumber(payload?.date) ?? null;
  const message = getString(entry.message) ?? getString(payload?.text) ?? "";
  if (timestampInMs === null || !message) {
    return null;
  }

  return {
    level: getString(entry.level) ?? getString(entry.type) ?? "log",
    message,
    rowId: getString(entry.rowId) ?? getString(payload?.id) ?? `${timestampInMs}-${index}`,
    source: getString(entry.source) ?? getString(info?.type) ?? "runtime",
    timestampInMs,
    deploymentId: getString(entry.deploymentId) ?? getString(payload?.deploymentId) ?? null,
    domain: getString(entry.domain) ?? getString(proxy?.host) ?? null,
    messageTruncated: getBoolean(entry.messageTruncated) === true,
    requestMethod: getString(proxy?.method),
    requestPath: getString(proxy?.path) ?? getString(info?.path) ?? null,
    responseStatusCode: getNumber(entry.responseStatusCode) ?? getNumber(payload?.statusCode) ?? getNumber(proxy?.statusCode) ?? null
  };
}

function parseVercelLogPayload(responseText: string): JsonObject[] {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed: JsonValue | unknown = JSON.parse(trimmed);
    const parsedObject = getJsonObject(parsed);
    return getJsonArray(parsedObject?.entries ?? parsed)
      .map((entry) => getJsonObject(entry))
      .filter((entry): entry is JsonObject => !!entry);
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsedLine: JsonValue | unknown = JSON.parse(line);
          const entry = getJsonObject(parsedLine);
          return entry ? [entry] : [];
        } catch {
          return [];
        }
      });
  }
}

export async function listVercelProjectDeployments(
  token: string,
  vercelProjectId: string,
  timeoutMs: number,
  teamId?: string | null
): Promise<VercelDeploymentSummary[]> {
  const payload = await fetchVercelJson(
    buildUrlWithQuery("https://api.vercel.com/v6/deployments", {
      projectId: vercelProjectId,
      teamId,
      limit: 20
    }),
    token,
    `deployment listing for project ${vercelProjectId}`,
    timeoutMs
  );
  const payloadObject = getJsonObject(payload);
  const deployments = getJsonArray(payloadObject?.deployments);
  return deployments
    .map((deployment) => mapVercelDeploymentSummary(getJsonObject(deployment) ?? {}))
    .filter((deployment: VercelDeploymentSummary | null): deployment is VercelDeploymentSummary => !!deployment);
}

export async function redeployVercelDeploymentRequest(
  token: string,
  payload: VercelRedeployPayload
): Promise<VercelDeploymentSummary> {
  if (!payload.deploymentId.trim()) {
    throw new Error("Choose a deployment to redeploy.");
  }
  if (!payload.vercelProjectId.trim()) {
    throw new Error("Choose a Vercel project before redeploying.");
  }

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: getVercelHeaders(token),
    body: JSON.stringify({
      deploymentId: payload.deploymentId,
      project: payload.vercelProjectId,
      target: payload.target || undefined
    })
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Vercel redeploy failed (${response.status} ${response.statusText}): ${responseText || "No response body."}`);
  }

  let json: JsonObject | null;
  try {
    json = parseJsonObject(responseText, "Vercel redeploy");
  } catch {
    throw new Error(`Vercel redeploy returned non-JSON data: ${responseText.slice(0, 600) || "Empty response body."}`);
  }
  if (!json) {
    throw new Error("Vercel redeploy returned an empty response body.");
  }

  const mapped = mapVercelDeploymentSummary(json);
  if (!mapped) {
    throw new Error("Vercel redeploy returned an unexpected deployment payload.");
  }
  return mapped;
}

function getVercelRuntimeLogUrl(vercelProjectId: string, deploymentId: string, teamId?: string | null): string {
  return buildUrlWithQuery(`https://api.vercel.com/v1/projects/${vercelProjectId}/deployments/${deploymentId}/runtime-logs`, {
    teamId
  });
}

async function readVercelRuntimeLogError(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function streamVercelRuntimeLogsForDeployment(
  request: VercelRuntimeLogStreamRequest,
  signal: AbortSignal,
  listener: {
    onConnected?: () => void;
    onEntry: (entry: VercelRuntimeLogEntry) => void;
  }
): Promise<void> {
  const response = await fetch(getVercelRuntimeLogUrl(request.vercelProjectId, request.deploymentId, request.teamId), {
    headers: {
      ...getVercelHeaders(request.token),
      Accept: "application/stream+json"
    },
    signal
  });

  if (!response.ok) {
    const detail = await readVercelRuntimeLogError(response);
    throw new Error(`Vercel runtime log stream failed (${response.status} ${response.statusText}): ${detail || "No response body."}`);
  }

  listener.onConnected?.();

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pendingText = "";
  let entryIndex = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        pendingText += decoder.decode();
        break;
      }

      pendingText += decoder.decode(result.value, { stream: true });
      const lines = pendingText.split(/\r?\n/);
      pendingText = lines.pop() ?? "";
      for (const line of lines) {
        const entries = parseVercelLogPayload(line);
        for (const entry of entries) {
          const mapped = mapVercelRuntimeLogEntry(entry, entryIndex++);
          if (mapped) {
            listener.onEntry(mapped);
          }
        }
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }

  for (const entry of parseVercelLogPayload(pendingText)) {
    const mapped = mapVercelRuntimeLogEntry(entry, entryIndex++);
    if (mapped) {
      listener.onEntry(mapped);
    }
  }
}
