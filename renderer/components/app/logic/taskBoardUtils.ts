import type { WorkspaceTaskSectionGroup } from "@/components/app/types/component.types";
import type { WorkspaceTaskAssignment, WorkspaceTaskBoard, WorkspaceTaskBoardSection, WorkspaceTaskSummary } from "@shared/appTypes";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";

export function getTaskBoardSections(board: WorkspaceTaskBoard): WorkspaceTaskBoardSection[] {
  return board.sections.length ? board.sections : createDefaultWorkspaceTaskBoard().sections;
}

export function getDefaultTaskBoardSectionId(board: WorkspaceTaskBoard): string {
  return getTaskBoardSections(board)[0]?.id || "todo";
}

export function getTaskBoardSectionId(taskPath: string, board: WorkspaceTaskBoard): string {
  const sectionId = board.taskPositions[taskPath]?.sectionId;
  const validSectionIds = new Set(getTaskBoardSections(board).map((section) => section.id));
  return sectionId && validSectionIds.has(sectionId) ? sectionId : getDefaultTaskBoardSectionId(board);
}

export function getTaskBoardSectionTitle(taskPath: string, board: WorkspaceTaskBoard): string {
  const sectionId = getTaskBoardSectionId(taskPath, board);
  return getTaskBoardSections(board).find((section) => section.id === sectionId)?.title || sectionId;
}

export function getTaskAssignments(taskPath: string, board: WorkspaceTaskBoard): WorkspaceTaskAssignment[] {
  return board.taskAssignments[taskPath] ?? [];
}

export function sortTasksForBoard(tasks: WorkspaceTaskSummary[], board: WorkspaceTaskBoard): WorkspaceTaskSummary[] {
  const sectionOrder = new Map(getTaskBoardSections(board).map((section, index) => [section.id, index]));

  return [...tasks].sort((left, right) => {
    const leftSectionId = getTaskBoardSectionId(left.path, board);
    const rightSectionId = getTaskBoardSectionId(right.path, board);
    const leftSectionOrder = sectionOrder.get(leftSectionId) ?? Number.MAX_SAFE_INTEGER;
    const rightSectionOrder = sectionOrder.get(rightSectionId) ?? Number.MAX_SAFE_INTEGER;
    if (leftSectionOrder !== rightSectionOrder) {
      return leftSectionOrder - rightSectionOrder;
    }

    const leftOrder = board.taskPositions[left.path]?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = board.taskPositions[right.path]?.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftUpdatedAt = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightUpdatedAt = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return left.title.localeCompare(right.title);
  });
}

export function buildWorkspaceTaskSectionGroups(
  tasks: WorkspaceTaskSummary[],
  board: WorkspaceTaskBoard
): WorkspaceTaskSectionGroup[] {
  const sections = getTaskBoardSections(board);
  const groupedTasks = sortTasksForBoard(tasks, board).reduce<Record<string, WorkspaceTaskSummary[]>>((acc, task) => {
    const sectionId = getTaskBoardSectionId(task.path, board);
    acc[sectionId] = [...(acc[sectionId] ?? []), task];
    return acc;
  }, {});

  return sections.map((section) => ({
    section,
    tasks: groupedTasks[section.id] ?? []
  }));
}

export function moveTaskToBoardSection(
  board: WorkspaceTaskBoard,
  taskPath: string,
  sectionId: string
): WorkspaceTaskBoard {
  const sectionTaskOrders = Object.entries(board.taskPositions)
    .filter(([, position]) => position.sectionId === sectionId)
    .map(([, position]) => position.order);
  const maxOrder = sectionTaskOrders.length ? Math.max(...sectionTaskOrders) : 0;

  return {
    ...board,
    taskPositions: {
      ...board.taskPositions,
      [taskPath]: {
        sectionId,
        order: maxOrder + 1000
      }
    }
  };
}

export function createTaskBoardSection(board: WorkspaceTaskBoard, title: string): WorkspaceTaskBoard {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return board;
  }

  const baseId = slugifyTaskBoardSectionTitle(trimmedTitle) || "section";
  const existingIds = new Set(board.sections.map((section) => section.id));
  let nextId = baseId;
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    ...board,
    sections: [
      ...getTaskBoardSections(board),
      {
        id: nextId,
        title: trimmedTitle
      }
    ]
  };
}

export function renameTaskBoardSection(
  board: WorkspaceTaskBoard,
  sectionId: string,
  title: string
): WorkspaceTaskBoard {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return board;
  }

  return {
    ...board,
    sections: getTaskBoardSections(board).map((section) =>
      section.id === sectionId
        ? {
            ...section,
            title: trimmedTitle
          }
        : section
    )
  };
}

export function deleteTaskBoardSection(board: WorkspaceTaskBoard, sectionId: string): WorkspaceTaskBoard {
  const sections = getTaskBoardSections(board);
  if (sections.length <= 1) {
    return board;
  }

  const nextSections = sections.filter((section) => section.id !== sectionId);
  const fallbackSectionId = nextSections[0]?.id || getDefaultTaskBoardSectionId(board);
  const nextTaskPositions = Object.fromEntries(
    Object.entries(board.taskPositions).map(([taskPath, position]) => [
      taskPath,
      position.sectionId === sectionId
        ? {
            ...position,
            sectionId: fallbackSectionId
          }
        : position
    ])
  );

  return {
    ...board,
    sections: nextSections,
    taskPositions: nextTaskPositions
  };
}

function slugifyTaskBoardSectionTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
