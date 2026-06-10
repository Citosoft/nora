import type {
  BuildLoopRunOutputInput,
  LoopRunOutputSegment,
  LoopRunStage,
  LoopRunStageStatus
} from "@/components/app/types/loopRunPresentation.types";
import type {
  LoopIteration,
  LoopOutputTurnEvent,
  LoopRoleOutcome,
  LoopRun,
  LoopRunEventKind,
  LoopRunRole,
  LoopRunStatus
} from "@shared/appTypes";

const RESULT_OPEN_PATTERN = /<nora-loop-result\s+token="([^"]+)"\s+outcome="(continue|complete|approve|changes_requested)">/g;
const RESULT_CLOSE_TAG = "</nora-loop-result>";
const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
const LEGACY_TURN_PATTERN = /(?:^|\n+)--- ([^\n]+?) · iteration (\d+) ---\n/g;
const LEGACY_HOOK_LINE_PATTERN = /^hook:.*$/gm;
const LEGACY_EXIT_LINE_PATTERN = /^\[[^\]]+ (?:exited with code [^\]]+|stopped)\]$/gm;

function cleanLegacyTurnOutput(roleName: string, iteration: string, output: string): string {
  const firstAgentMessage = output.indexOf("\ncodex\n");
  const withoutLaunchEnvelope = firstAgentMessage >= 0 ? output.slice(firstAgentMessage + "\ncodex\n".length) : output;
  return [
    `### ${roleName} · iteration ${iteration}`,
    withoutLaunchEnvelope
      .replace(LEGACY_HOOK_LINE_PATTERN, "")
      .replace(LEGACY_EXIT_LINE_PATTERN, "")
      .replace(/^codex$/gm, "")
      .replace(/^tokens used\n[\d,]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  ].filter(Boolean).join("\n\n");
}

function cleanLegacyLoopOutput(output: string): string {
  const matches = [...output.matchAll(LEGACY_TURN_PATTERN)];
  if (matches.length === 0) return output;
  const preparation = output.slice(0, matches[0]?.index ?? 0).trim();
  const turns = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? output.length;
    return cleanLegacyTurnOutput(match[1] ?? "Agent", match[2] ?? "?", output.slice(start, end));
  });
  return [preparation, ...turns].filter(Boolean).join("\n\n");
}

function appendMarkdown(segments: LoopRunOutputSegment[], markdown: string): void {
  if (!markdown.trim()) return;
  segments.push({ id: `markdown-${segments.length}`, kind: "markdown", markdown });
}

export function parseLoopRunOutput(output: string): LoopRunOutputSegment[] {
  const normalized = cleanLegacyLoopOutput(output.replace(ANSI_PATTERN, ""));
  const segments: LoopRunOutputSegment[] = [];
  const seenResults = new Set<string>();
  let cursor = 0;
  RESULT_OPEN_PATTERN.lastIndex = 0;

  for (let match = RESULT_OPEN_PATTERN.exec(normalized); match; match = RESULT_OPEN_PATTERN.exec(normalized)) {
    appendMarkdown(segments, normalized.slice(cursor, match.index));
    const contentStart = RESULT_OPEN_PATTERN.lastIndex;
    const closeIndex = normalized.indexOf(RESULT_CLOSE_TAG, contentStart);
    const complete = closeIndex >= 0;
    const contentEnd = complete ? closeIndex : normalized.length;
    const summary = normalized.slice(contentStart, contentEnd).trim();
    const resultKey = `${match[1]}:${match[2]}:${summary}`;
    if (!seenResults.has(resultKey)) {
      seenResults.add(resultKey);
      segments.push({
        id: `result-${segments.length}-${match[1]}`,
        kind: "result",
        token: match[1],
        outcome: match[2] as LoopRoleOutcome,
        summary,
        complete
      });
    }
    cursor = complete ? contentEnd + RESULT_CLOSE_TAG.length : normalized.length;
    RESULT_OPEN_PATTERN.lastIndex = cursor;
    if (!complete) break;
  }

  appendMarkdown(segments, normalized.slice(cursor));
  return segments;
}

export function buildLoopRunOutput({ events, legacyOutput }: BuildLoopRunOutputInput): LoopRunOutputSegment[] {
  if (events.length === 0) return parseLoopRunOutput(legacyOutput);
  const finishedTurns = new Map<string, LoopOutputTurnEvent>();
  for (const event of events) {
    if (event.kind === "turn" && event.phase === "finished") finishedTurns.set(event.turnId, event);
  }
  return events.map((event): LoopRunOutputSegment | null => {
    switch (event.kind) {
      case "turn": {
        if (event.phase === "finished") return null;
        const finished = finishedTurns.get(event.turnId);
        return {
          id: event.id,
          kind: "turn",
          roleName: event.roleName,
          roleKind: event.roleKind,
          toolId: event.toolId,
          iteration: event.iteration,
          phase: finished?.phase ?? event.phase,
          exitCode: finished?.exitCode ?? event.exitCode,
          aborted: finished?.aborted ?? event.aborted
        };
      }
      case "message":
        return { id: event.id, kind: "markdown", markdown: event.markdown };
      case "tool":
        return {
          id: event.id,
          kind: "tool",
          command: event.command,
          output: event.output,
          status: event.status
        };
      case "notice":
        return { id: event.id, kind: "notice", message: event.message, tone: event.tone };
      case "result":
        return {
          id: event.id,
          kind: "result",
          token: event.token,
          outcome: event.outcome,
          summary: event.summary,
          complete: true
        };
      case "usage":
        return {
          id: event.id,
          kind: "usage",
          inputTokens: event.inputTokens,
          cachedInputTokens: event.cachedInputTokens,
          outputTokens: event.outputTokens
        };
    }
  }).filter((segment): segment is LoopRunOutputSegment => segment !== null);
}

function resultForRole(iteration: LoopIteration | undefined, role: LoopRunRole): boolean {
  if (!iteration) return false;
  return role.kind === "writer"
    ? iteration.writerResult?.roleId === role.roleId
    : iteration.reviewerResults.some((result) => result.roleId === role.roleId);
}

function roleStageStatus(run: LoopRun, role: LoopRunRole, iteration: LoopIteration | undefined): LoopRunStageStatus {
  if (run.status === "completed") return "complete";
  if (run.status === "cancelled") return resultForRole(iteration, role) ? "complete" : "cancelled";
  const latestEvent = run.events.at(-1);
  if (latestEvent?.kind === "error" && latestEvent.roleId === role.roleId) return "error";
  if (run.activeRoleId === role.roleId) {
    return run.status === "paused" ? "paused" : "active";
  }
  return resultForRole(iteration, role) ? "complete" : "pending";
}

export function buildLoopRunStages(run: LoopRun): LoopRunStage[] {
  const iteration = run.iterations.at(-1);
  const preparationStatus: LoopRunStageStatus = run.worktreePath
    ? "complete"
    : run.status === "cancelled"
      ? "cancelled"
      : run.events.at(-1)?.kind === "error"
        ? "error"
        : "active";
  const roleStages = run.roles.map((role): LoopRunStage => ({
    id: role.roleId,
    title: role.name,
    description: role.kind === "writer" ? "Implementing the workflow goal" : "Reviewing the current implementation",
    status: roleStageStatus(run, role, iteration),
    role
  }));
  const completionStatus: LoopRunStageStatus = run.status === "completed"
    ? "complete"
    : run.status === "cancelled"
      ? "cancelled"
      : "pending";

  return [
    {
      id: "worktree",
      title: "Prepare workspace",
      description: run.worktreePath ? "Managed worktree ready" : "Creating an isolated worktree",
      status: preparationStatus,
      role: null
    },
    ...roleStages,
    {
      id: "complete",
      title: "Finish workflow",
      description: run.stopReason ?? "Waiting for the workflow outcome",
      status: completionStatus,
      role: null
    }
  ];
}

export function loopRunEventStatus(
  kind: LoopRunEventKind,
  isLatest: boolean,
  runStatus: LoopRunStatus
): LoopRunStageStatus {
  switch (kind) {
    case "created":
    case "resumed":
    case "role_started":
      return isLatest && (runStatus === "preparing" || runStatus === "running" || runStatus === "pausing")
        ? "active"
        : "complete";
    case "role_finished":
    case "completed":
      return "complete";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "error":
      return "error";
  }
}

export function loopRunStatusCopy(run: LoopRun): { title: string; description: string } {
  switch (run.status) {
    case "preparing":
      return { title: "Preparing workflow", description: "Nora is creating the managed workspace for this run." };
    case "running": {
      const activeRole = run.roles.find((role) => role.roleId === run.activeRoleId);
      return activeRole
        ? { title: `${activeRole.name} is working`, description: activeRole.kind === "writer" ? "Implementing the current workflow iteration." : "Reviewing the writer's latest result." }
        : { title: "Workflow is running", description: "The next agent is being prepared." };
    }
    case "pausing":
      return { title: "Pausing workflow", description: "Waiting for the active agent to reach a safe stopping point." };
    case "paused":
      return { title: "Workflow paused", description: run.stopReason ?? "Progress is saved and ready to resume." };
    case "completed":
      return { title: "Workflow completed", description: run.stopReason ?? "All workflow stages have finished." };
    case "cancelled":
      return { title: "Workflow cancelled", description: run.stopReason ?? "The run was stopped before completion." };
  }
}
