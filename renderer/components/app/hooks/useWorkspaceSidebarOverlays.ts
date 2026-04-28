import type { NoteListEntry, SpecListEntry, TaskListEntry } from "@/components/app/types/component.types";
import type { WorkspaceSidebarAgentContextMenuState } from "@/components/app/types/workspaceSidebarAgentContextMenu.types";
import type { UseWorkspaceSidebarOverlaysResult } from "@/components/app/types/useWorkspaceSidebarOverlays.types";
import type { AgentSession } from "@shared/appTypes";
import { useEffect, useRef, useState, type MouseEvent } from "react";

export const useWorkspaceSidebarOverlays = (): UseWorkspaceSidebarOverlaysResult => {
  const [now, setNow] = useState(() => Date.now());
  const [activeSessionPopoverId, setActiveSessionPopoverId] = useState<string | null>(null);
  const [activeTaskMenu, setActiveTaskMenu] = useState<{
    task: TaskListEntry;
    top: number;
    left: number;
  } | null>(null);
  const [activeSpecMenu, setActiveSpecMenu] = useState<{
    spec: SpecListEntry;
    top: number;
    left: number;
  } | null>(null);
  const [activeNoteMenu, setActiveNoteMenu] = useState<{
    note: NoteListEntry;
    top: number;
    left: number;
  } | null>(null);
  const [activeWorkspaceMenu, setActiveWorkspaceMenu] = useState<{
    workspaceId: string;
    top: number;
    left: number;
  } | null>(null);
  const [activeAgentMenu, setActiveAgentMenu] = useState<WorkspaceSidebarAgentContextMenuState | null>(null);
  const taskMenuRef = useRef<HTMLDivElement | null>(null);
  const specMenuRef = useRef<HTMLDivElement | null>(null);
  const noteMenuRef = useRef<HTMLDivElement | null>(null);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const sessionPopoverCloseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 300);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTaskMenu(null);
        setActiveSpecMenu(null);
        setActiveNoteMenu(null);
        setActiveWorkspaceMenu(null);
        setActiveAgentMenu(null);
        setActiveSessionPopoverId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!activeTaskMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!taskMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !taskMenuRef.current.contains(target)) {
        setActiveTaskMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeTaskMenu]);

  useEffect(() => {
    if (!activeSpecMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!specMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !specMenuRef.current.contains(target)) {
        setActiveSpecMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeSpecMenu]);

  useEffect(() => {
    if (!activeNoteMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!noteMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !noteMenuRef.current.contains(target)) {
        setActiveNoteMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeNoteMenu]);

  useEffect(() => {
    if (!activeWorkspaceMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!workspaceMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !workspaceMenuRef.current.contains(target)) {
        setActiveWorkspaceMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeWorkspaceMenu]);

  useEffect(() => {
    if (!activeAgentMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!agentMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !agentMenuRef.current.contains(target)) {
        setActiveAgentMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeAgentMenu]);

  useEffect(
    () => () => {
      if (sessionPopoverCloseTimeoutRef.current !== null) {
        window.clearTimeout(sessionPopoverCloseTimeoutRef.current);
      }
    },
    []
  );

  const openTaskMenu = (task: TaskListEntry, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    setActiveTaskMenu({
      task,
      top: Math.min(event.clientY, window.innerHeight - 140),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 16)
    });
  };

  const openSpecMenu = (spec: SpecListEntry, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    setActiveSpecMenu({
      spec,
      top: Math.min(event.clientY, window.innerHeight - 100),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 16)
    });
  };

  const openNoteMenu = (note: NoteListEntry, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    setActiveNoteMenu({
      note,
      top: Math.min(event.clientY, window.innerHeight - 100),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 16)
    });
  };

  const openWorkspaceMenu = (workspaceId: string, event: MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 280;
    const minInset = 8;
    const maxLeft = Math.max(minInset, window.innerWidth - menuWidth - minInset);
    const maxTop = Math.max(minInset, window.innerHeight - 360);
    setActiveWorkspaceMenu({
      workspaceId,
      top: Math.max(minInset, Math.min(event.clientY, maxTop)),
      left: Math.max(minInset, Math.min(event.clientX, maxLeft))
    });
  };

  const openAgentSessionMenu = (
    workspaceId: string,
    agent: AgentSession,
    pullRequestWebUrl: string | null,
    event: MouseEvent<Element>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveSessionPopoverId(null);
    const menuWidth = 220;
    const menuHeightEstimate = 168;
    setActiveAgentMenu({
      workspaceId,
      agentId: agent.id,
      showRestart: agent.status !== "running",
      prWebUrl: pullRequestWebUrl && pullRequestWebUrl.length > 0 ? pullRequestWebUrl : null,
      top: Math.min(event.clientY, window.innerHeight - menuHeightEstimate),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 16)
    });
  };

  const openSessionPopover = (sessionId: string) => {
    if (sessionPopoverCloseTimeoutRef.current !== null) {
      window.clearTimeout(sessionPopoverCloseTimeoutRef.current);
      sessionPopoverCloseTimeoutRef.current = null;
    }
    setActiveSessionPopoverId(sessionId);
  };

  const scheduleSessionPopoverClose = () => {
    if (sessionPopoverCloseTimeoutRef.current !== null) {
      window.clearTimeout(sessionPopoverCloseTimeoutRef.current);
    }
    sessionPopoverCloseTimeoutRef.current = window.setTimeout(() => {
      setActiveSessionPopoverId(null);
      sessionPopoverCloseTimeoutRef.current = null;
    }, 120);
  };

  return {
    now,
    activeSessionPopoverId,
    setActiveSessionPopoverId,
    activeTaskMenu,
    activeSpecMenu,
    activeNoteMenu,
    activeWorkspaceMenu,
    activeAgentMenu,
    taskMenuRef,
    specMenuRef,
    noteMenuRef,
    workspaceMenuRef,
    agentMenuRef,
    openTaskMenu,
    openSpecMenu,
    openNoteMenu,
    openWorkspaceMenu,
    openAgentSessionMenu,
    openSessionPopover,
    scheduleSessionPopoverClose,
    setActiveTaskMenu,
    setActiveSpecMenu,
    setActiveNoteMenu,
    setActiveWorkspaceMenu,
    setActiveAgentMenu
  };
};
