import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { appImportClient } from "@/components/app/clients/appImportClient";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import { appImportBotTabs, appImportSelections, buildAppImportChecklist, groupSelection, toggledRowSelection } from "@/components/app/logic/app-import/appImportChecklist";
import type { AppImportBotExportController, AppImportBotExportEntry, AppImportBotExportTabId, AppImportFlowController, AppImportFlowOptions, AppImportPhase, AppImportRow, AppImportRowGroup } from "@/components/app/types/appImport.types";
import { APP_IMPORT_BOT_SOURCE_IDS, APP_IMPORT_WORK_SOURCE_IDS, appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportRendererChanges, AppImportSourcePreview } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Drives one import checklist: read the apps for its scope, tick rows, apply, then show the per-item report.
 * The bots scope only reads apps that keep bots on disk, and also takes pasted bot exports.
 */
export function useAppImportFlow(options: AppImportFlowOptions): AppImportFlowController {
  const { scope } = options;
  const runtime = useContext(NativeRuntimeContext);
  const [phase, setPhase] = useState<AppImportPhase>({ kind: "idle" });
  const [selected, setSelected] = useState<ReadonlySet<AppImportKey>>(new Set());
  const [previews, setPreviews] = useState<AppImportSourcePreview[]>([]);
  const [botExports, setBotExports] = useState<AppImportBotExportEntry[]>([]);
  const [exportReadingTab, setExportReadingTab] = useState<AppImportBotExportTabId | null>(null);
  const [exportError, setExportError] = useState<AppImportBotExportController["error"]>(null);
  const runId = useRef<string | null>(null);
  const previewRequest = useRef(0);
  const onThemeMode = useRef(options.onThemeMode);
  onThemeMode.current = options.onThemeMode;

  const showChecklist = useCallback((nextPreviews: AppImportSourcePreview[], nextExports: AppImportBotExportEntry[], keep: ReadonlySet<AppImportKey> | null) => {
    const checklist = buildAppImportChecklist(nextPreviews, nextExports, scope);
    setSelected(keep ? new Set([...keep, ...checklist.defaultSelection]) : new Set(checklist.defaultSelection));
    setPhase({ kind: "ready", checklist });
  }, [scope]);

  const reload = useCallback(() => {
    const request = ++previewRequest.current;
    setPhase({ kind: "loading" });
    setBotExports([]);
    appImportClient.preview(scope === "bots" ? [...APP_IMPORT_BOT_SOURCE_IDS] : [...APP_IMPORT_WORK_SOURCE_IDS]).then((preview) => {
      if (request !== previewRequest.current) return;
      setPreviews(preview.sources);
      showChecklist(preview.sources, [], null);
    }, (error: unknown) => {
      if (request === previewRequest.current) setPhase({ kind: "failed", message: errorMessage(error, "Nora couldn't look for other apps.") });
    });
  }, [scope, showChecklist]);

  const started = phase.kind !== "idle";
  useEffect(() => {
    if (options.enabled && !started) reload();
  }, [options.enabled, reload, started]);

  useEffect(() => appImportClient.onProgress((progress) => {
    if (progress.runId !== runId.current) return;
    setPhase((current) => current.kind === "applying" ? { ...current, progress } : current);
  }), []);

  const toggleRow = useCallback((row: AppImportRow) => setSelected((current) => toggledRowSelection(current, row)), []);

  const setGroupSelected = useCallback((group: AppImportRowGroup, on: boolean) => setSelected((current) => groupSelection(current, group, on)), []);

  const botTabs = useMemo(() => scope === "bots" ? appImportBotTabs(previews, botExports) : [], [botExports, previews, scope]);

  const addBotExport = useCallback((tab: AppImportBotExportTabId, document: string) => {
    if (phase.kind !== "ready" || !document.trim()) return;
    setExportReadingTab(tab);
    setExportError(null);
    appImportClient.previewBotExport(document).then((preview) => {
      if (preview.status !== "ready") {
        setExportError({ tab, message: preview.status === "notFound" ? "Nora couldn't read that export." : preview.reason });
        return;
      }
      const nextExports = [...botExports, { tab, document, preview }];
      setBotExports(nextExports);
      showChecklist(previews, nextExports, selected);
    }, (error: unknown) => setExportError({ tab, message: errorMessage(error, "Nora couldn't read that export.") })).finally(() => setExportReadingTab(null));
  }, [botExports, phase.kind, previews, selected, showChecklist]);

  const applyRendererChanges = useCallback(async (changes: AppImportRendererChanges) => {
    if (changes.themeMode) onThemeMode.current(changes.themeMode);
    if (!runtime || !changes.pinnedConversationIds.length) return;
    for (const conversationId of changes.pinnedConversationIds) runtime.store.setPinned(conversationId, true);
    await runtime.store.refresh();
  }, [runtime]);

  const apply = useCallback(() => {
    if (phase.kind !== "ready" || selected.size === 0) return;
    const { checklist } = phase;
    const id = crypto.randomUUID();
    runId.current = id;
    setPhase({ kind: "applying", checklist, progress: null });
    appImportClient.apply({ selections: appImportSelections(selected, checklist.keyTargets), runId: id }).then(async (result) => {
      await applyRendererChanges(result.renderer).catch(() => undefined);
      setPhase({ kind: "done", results: result.items, unavailable: result.unavailable.map((failure) => appImportSourceDisplayName(failure.source)) });
    }, (error: unknown) => {
      setPhase({ kind: "failed", message: errorMessage(error, "The import stopped before it finished.") });
    }).finally(() => { if (runId.current === id) runId.current = null; });
  }, [applyRendererChanges, phase, selected]);

  return { scope, phase, selected, applying: phase.kind === "applying", toggleRow, setGroupSelected, botTabs, apply, reload,
    botExport: { readingTab: exportReadingTab, error: exportError, add: addBotExport } };
}
