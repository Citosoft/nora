import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appsClient } from "@/components/app/clients/appsClient";
import { appBuildPhase } from "@/components/app/logic/apps/buildSteps";
import type { AppBuildStep } from "@shared/types/apps/apps.types";
import { changeCardPrefix } from "@/components/app/logic/apps/changeRequest";
import type { AppBuilderDraft, AppBuilderPickHandler, AppBuilderState } from "@/components/app/types/appsBuilder.types";
import { useApps } from "./useApps";
import { useThreadCenterPorts } from "./useThreadCenterPorts";

/**
 * The builder view's state for one thread document: which app it builds, whether a turn is running, the step the tools last
 * reported, and the thread drawer. The drawer closes itself when a new turn starts, so every prompt returns to the building scene,
 * and opens itself when the agent is waiting on the user.
 */
export function useAppBuilderState(documentId: string): AppBuilderState {
  const { state, store } = useThreadCenterPorts();
  const { apps } = useApps();
  const [threadOpen, setThreadOpen] = useState(false);
  const [step, setStep] = useState<AppBuildStep | null>(null);
  const document = state.layout.documents.find((entry) => entry.id === documentId);
  const conversationId = document?.target.kind === "thread" ? document.target.conversationId : document?.pending?.submit.conversationId ?? null;
  const boundId = document?.source?.kind === "app" ? document.source.appId : null;
  const app = apps?.find((entry) => entry.id === boundId) ?? apps?.find((entry) => conversationId !== null && entry.threadId === conversationId) ?? null;
  const summary = state.summaries.find((entry) => entry.conversation.id === conversationId);
  const run = summary?.latestRun ?? null;
  const delivering = state.runtime[documentId]?.busy ?? false;
  const phase = useMemo(() => appBuildPhase(run, delivering, !!app), [run, delivering, app]);
  const runId = run?.id ?? null;

  // Each turn narrates from scratch; steps from other builder threads are ignored.
  useEffect(() => { setStep(null); }, [runId]);
  useEffect(() => appsClient.onBuildStep((next) => { if (next.threadId === conversationId) setStep(next); }), [conversationId]);

  const lastPhase = useRef(phase.kind);
  useEffect(() => {
    if (phase.kind === "building" && lastPhase.current !== "building") setThreadOpen(false);
    if (phase.kind === "attention") setThreadOpen(true);
    lastPhase.current = phase.kind;
  }, [phase.kind]);

  const [draft, setDraft] = useState<AppBuilderDraft | null>(null);
  const pick = useCallback<AppBuilderPickHandler>((cardTitle) => { setDraft({ text: changeCardPrefix(cardTitle), at: Date.now() }); }, []);
  const runState = run?.state ?? null;
  const stoppable = !!conversationId && !!runId && (runState === "queued" || runState === "starting" || runState === "running" || runState === "awaiting-approval" || runState === "awaiting-input");
  const stop = useCallback(() => {
    if (!conversationId || !runId) return;
    // The run settles a moment after the interrupt is accepted; read the summaries again then so the scene gives way to the app.
    void store.client.execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId, runId })
      .then(() => store.refresh(), () => undefined)
      .then(() => new Promise((resolve) => setTimeout(resolve, 1500)))
      .then(() => store.refresh(), () => undefined);
  }, [store, conversationId, runId]);
  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    store.setText(documentId, trimmed);
    setThreadOpen(false);
    void store.submit(documentId);
  }, [store, documentId]);

  return useMemo<AppBuilderState>(() => ({ documentId, app, phase, step, startedAt: run?.createdAt ?? null, threadOpen, setThreadOpen, send, draft, pick,
    stop: stoppable ? stop : null, stopping: runState === "stopping" }),
    [documentId, app, phase, step, run?.createdAt, threadOpen, send, draft, pick, stoppable, stop, runState]);
}
