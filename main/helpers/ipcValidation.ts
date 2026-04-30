import type { CreateAgentPayload, ImportBrowserImagePayload, WriteWorkspaceFilePayload } from "@shared/appTypes";

export function parseAllowedExternalUrl(value: string, allowedProtocols: ReadonlySet<string>): URL {
  const candidate = value.trim();
  if (!candidate) {
    throw new Error("URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("URL is invalid.");
  }

  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error("Only HTTPS URLs are allowed.");
  }

  return parsed;
}

function assertWorkspaceRelativePath(value: string, fieldName: string): void {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
    throw new Error(`${fieldName} must stay within the workspace.`);
  }
}

function assertProjectId(value: string): void {
  if (!value.trim()) {
    throw new Error("projectId is required.");
  }
}

export function validateMoveWorkspaceFilePayload(payload: { projectId: string; fromPath: string; toPath: string }): void {
  assertProjectId(payload.projectId);
  assertWorkspaceRelativePath(payload.fromPath, "fromPath");
  assertWorkspaceRelativePath(payload.toPath, "toPath");
}

export function validateWriteWorkspaceFilePayload(payload: WriteWorkspaceFilePayload): void {
  assertProjectId(payload.projectId);
  assertWorkspaceRelativePath(payload.path, "path");
  if (typeof payload.content !== "string") {
    throw new Error("content must be a string.");
  }
}

export function validateImportBrowserImagePayload(payload: ImportBrowserImagePayload, allowedProtocols: ReadonlySet<string>): void {
  assertProjectId(payload.projectId);
  const hasData = payload.data instanceof Uint8Array;
  const sourceUrl = payload.sourceUrl?.trim() || "";
  if (!hasData && !sourceUrl) {
    throw new Error("Dropped image payload must include data or sourceUrl.");
  }
  if (sourceUrl) {
    parseAllowedExternalUrl(sourceUrl, allowedProtocols);
  }
}

/** Coerces IPC-deserialized fields so validation and session code see stable string shapes. */
export function normalizeCreateAgentPayload(payload: CreateAgentPayload): CreateAgentPayload {
  return {
    ...payload,
    toolId: typeof payload.toolId === "string" ? payload.toolId : "",
    name: typeof payload.name === "string" ? payload.name : "",
    task: typeof payload.task === "string" ? payload.task : "",
    commandOverride: typeof payload.commandOverride === "string" ? payload.commandOverride : ""
  };
}

export function validateCreateAgentPayload(payload: CreateAgentPayload): void {
  const toolId = (typeof payload.toolId === "string" ? payload.toolId : "").trim();
  const task = (typeof payload.task === "string" ? payload.task : "").trim();
  if (!toolId) {
    throw new Error("toolId is required.");
  }
  if (!task) {
    throw new Error("task is required.");
  }
}
