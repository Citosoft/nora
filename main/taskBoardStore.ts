import type { WorkspaceTaskAssignment, WorkspaceTaskBoard, WorkspaceTaskBoardSection, WorkspaceTaskBoardTaskPosition } from "@shared/appTypes";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import type { NormalizedTaskBoard } from "./types/internal.types";

export const WORKSPACE_TASK_BOARD_PATH = ".nora/tasks/board.json";

export function normalizeWorkspaceTaskBoard(
  value: unknown,
  validTaskPaths?: Set<string>
): NormalizedTaskBoard {
  const fallback = createDefaultWorkspaceTaskBoard();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      board: fallback,
      changed: true
    };
  }

  const candidate = value as Partial<WorkspaceTaskBoard>;
  const sections = Array.isArray(candidate.sections)
    ? candidate.sections.filter(isWorkspaceTaskBoardSection)
    : [];
  const uniqueSections = new Map<string, WorkspaceTaskBoardSection>();
  for (const section of sections) {
    if (!uniqueSections.has(section.id)) {
      uniqueSections.set(section.id, {
        id: section.id,
        title: section.title.trim() || section.id
      });
    }
  }

  const normalizedSections = uniqueSections.size
    ? Array.from(uniqueSections.values())
    : fallback.sections;
  const validSectionIds = new Set(normalizedSections.map((section) => section.id));
  const rawTaskPositions =
    candidate.taskPositions && typeof candidate.taskPositions === "object" && !Array.isArray(candidate.taskPositions)
      ? candidate.taskPositions
      : {};
  const rawTaskAssignments =
    candidate.taskAssignments && typeof candidate.taskAssignments === "object" && !Array.isArray(candidate.taskAssignments)
      ? candidate.taskAssignments
      : {};
  const taskPositions: Record<string, WorkspaceTaskBoardTaskPosition> = {};
  const taskAssignments: Record<string, WorkspaceTaskAssignment[]> = {};

  for (const [taskPath, rawPosition] of Object.entries(rawTaskPositions)) {
    if (!isWorkspaceTaskBoardTaskPosition(rawPosition)) {
      continue;
    }
    if (!validSectionIds.has(rawPosition.sectionId)) {
      continue;
    }
    if (validTaskPaths && !validTaskPaths.has(taskPath)) {
      continue;
    }
    taskPositions[taskPath] = {
      sectionId: rawPosition.sectionId,
      order: rawPosition.order
    };
  }

  for (const [taskPath, rawAssignments] of Object.entries(rawTaskAssignments)) {
    if (validTaskPaths && !validTaskPaths.has(taskPath)) {
      continue;
    }
    if (!Array.isArray(rawAssignments)) {
      continue;
    }
    const normalizedAssignments = rawAssignments.filter(isWorkspaceTaskAssignment);
    if (!normalizedAssignments.length) {
      continue;
    }
    taskAssignments[taskPath] = normalizedAssignments.map((assignment) => ({
      agentId: assignment.agentId,
      sessionId: assignment.sessionId,
      agentName: assignment.agentName,
      toolId: assignment.toolId,
      toolLabel: assignment.toolLabel,
      assignedAt: assignment.assignedAt
    }));
  }

  const normalizedBoard: WorkspaceTaskBoard = {
    version: 1,
    sections: normalizedSections,
    taskPositions,
    taskAssignments
  };

  const changed =
    candidate.version !== 1 ||
    normalizedSections.length !== sections.length ||
    Object.keys(taskPositions).length !== Object.keys(rawTaskPositions).length ||
    Object.keys(taskAssignments).length !== Object.keys(rawTaskAssignments).length;

  return {
    board: normalizedBoard,
    changed
  };
}

function isWorkspaceTaskBoardSection(value: unknown): value is WorkspaceTaskBoardSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceTaskBoardSection>;
  return typeof candidate.id === "string" && typeof candidate.title === "string";
}

function isWorkspaceTaskBoardTaskPosition(value: unknown): value is WorkspaceTaskBoardTaskPosition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceTaskBoardTaskPosition>;
  return typeof candidate.sectionId === "string" && typeof candidate.order === "number" && Number.isFinite(candidate.order);
}

function isWorkspaceTaskAssignment(value: unknown): value is WorkspaceTaskAssignment {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceTaskAssignment>;
  return (
    typeof candidate.agentId === "string" &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.agentName === "string" &&
    typeof candidate.toolId === "string" &&
    typeof candidate.toolLabel === "string" &&
    typeof candidate.assignedAt === "string"
  );
}
