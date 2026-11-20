import { appsChannel, appsReplySchema, appsRequestSchema } from "@shared/apps/gateway";
import type { AppsReplyValue, AppsRequest } from "@shared/ipc/types/appsGateway.types";
import { appFileName, appFileSchema, exportAppFile } from "@shared/apps/portable";
import { readDirectoryApp } from "@main/apps/readDirectoryApp";
import { importAppFile } from "@main/apps/importAppFile";
import type { AppsIpcDeps } from "@main/types/apps/apps.types";

/** Reads a chosen file as an app file, turning JSON and shape problems into one plain sentence. */
function parseAppFile(text: string) {
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error("This file is not a Nora app: it is not valid JSON."); }
  const parsed = appFileSchema.safeParse(json);
  if (!parsed.success) throw new Error(`This file is not a Nora app, or was made by a newer Nora: ${parsed.error.issues[0]?.message ?? "its contents are not recognised"}.`);
  return parsed.data;
}

async function apply(deps: AppsIpcDeps, request: AppsRequest): Promise<AppsReplyValue> {
  const { apps } = deps;
  switch (request.kind) {
    case "get-install-request": return { kind: "install-request", id: deps.installRequests.get() };
    case "clear-install-request": deps.installRequests.clear(request.id); return { kind: "done" };
    case "read-directory-app": return { kind: "app-file", ...await readDirectoryApp(request.id) };
    case "list": return { kind: "apps", apps: apps.list() };
    case "get": return { kind: "app", app: apps.get(request.id), data: apps.data(request.id) };
    case "move-panel": { const app = apps.movePanel(request.id, request.version, request); return { kind: "app", app, data: apps.data(app.id) }; }
    case "rename": apps.rename(request.id, request.name); return { kind: "apps", apps: apps.list() };
    case "set-trusted": apps.setTrusted(request.id, request.trusted); return { kind: "apps", apps: apps.list() };
    case "delete": apps.remove(request.id); return { kind: "apps", apps: apps.list() };
    case "refresh": return { kind: "data", data: await apps.refresh(request.id, request.sourceIds, request.inputs) };
    case "run-action": return { kind: "action", result: await apps.runAction(request.run.appId, request.run.actionId, request.run.args, request.run.confirmed) };
    case "load-more": return { kind: "data", data: await apps.loadMore(request.id, request.sourceId) };
    case "list-activity": return { kind: "activity", entries: apps.activity(request.id) };
    case "list-versions": return { kind: "versions", versions: apps.versions(request.id) };
    case "restore-version": { const app = await apps.restoreVersion(request.id, request.version); return { kind: "app", app, data: apps.data(app.id) }; }
    case "watch": apps.watch(request.id); return { kind: "done" };
    case "unwatch": apps.unwatch(request.id); return { kind: "done" };
    case "export": {
      const app = apps.get(request.id);
      const file = exportAppFile(app, apps.connectorsFor(app.workspaceId), deps.now());
      const path = await deps.files.save(appFileName(app.name), JSON.stringify(file, null, 2));
      return path ? { kind: "exported", path } : { kind: "done" };
    }
    case "pick-import": {
      const chosen = await deps.files.open();
      if (!chosen) return { kind: "done" };
      return { kind: "app-file", path: chosen.path, file: parseAppFile(chosen.text) };
    }
    case "import": {
      const app = await importAppFile(deps, request);
      return { kind: "app", app, data: apps.data(app.id) };
    }
  }
}

/** The window lists, opens, refreshes and acts in apps here; the agent's edits arrive through Nora's tools and are pushed separately. */
export function registerAppsIpc(deps: AppsIpcDeps): () => void {
  deps.ipc.handle(appsChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot use apps" };
    const parsed = appsRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This app request is not valid" };
    try { return appsReplySchema.parse({ ok: true, value: await apply(deps, parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error && error.message ? error.message : "The app request failed" }; }
  });
  return () => { deps.ipc.removeHandler(appsChannel); };
}
