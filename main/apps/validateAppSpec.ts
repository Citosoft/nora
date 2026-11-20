import { validateSpec, type Spec } from "@json-render/core";
import { appCatalog } from "@shared/apps/catalog";
import { APP_FILE_SOURCE_EXTENSIONS, appSpecSchema } from "@shared/apps/contracts";
import type { AppSpecInput } from "@shared/types/apps/apps.types";
import type { AppSpecIssue, AppSpecValidation, AppSpecValidationContext } from "@main/types/apps/apps.types";
import { compileSelect } from "./selectRows";
import { compileAlert } from "./alerts";

const SOURCE_PATH = /^\/sources\/([^/]+)/;
/** Actions json-render runs itself; anything else in `on` must be one of the catalog's. */
const BUILT_IN_ACTIONS = new Set(["setState", "pushState", "removeState", "validateForm"]);

/**
 * json-render's own spec schema accepts any props once a catalog has more than one component, so each element's props are checked
 * against its component here, and each event binding against the actions that exist.
 */
function elementIssues(ui: Spec): AppSpecIssue[] {
  const issues: AppSpecIssue[] = [];
  for (const [key, element] of Object.entries(ui.elements)) {
    const component = appCatalog.data.components[element.type as keyof typeof appCatalog.data.components];
    if (!component) { issues.push({ path: `ui.elements.${key}.type`, message: `${element.type} is not a component. Use one of: ${appCatalog.componentNames.join(", ")}.` }); continue; }
    const props = component.props.safeParse(element.props);
    if (!props.success) for (const issue of props.error.issues) issues.push({ path: `ui.elements.${key}.props${issue.path.length ? `.${issue.path.join(".")}` : ""}`, message: issue.message });
    if (element.children?.length && !component.slots.length) issues.push({ path: `ui.elements.${key}.children`, message: `${element.type} does not take children.` });
    for (const [event, binding] of Object.entries(element.on ?? {})) {
      for (const entry of Array.isArray(binding) ? binding : [binding]) {
        if (!entry || typeof entry.action !== "string") issues.push({ path: `ui.elements.${key}.on.${event}`, message: "Each binding needs an action name." });
        else if (!BUILT_IN_ACTIONS.has(entry.action) && !appCatalog.actionNames.includes(entry.action)) issues.push({ path: `ui.elements.${key}.on.${event}`, message: `${entry.action} is not an action. Use runAction, refresh or setState.` });
        // setState resolves $item to the row's state path, not the row, so a record view built this way never opens.
        else if (entry.action === "setState" && JSON.stringify(entry.params?.value ?? null).includes("\"$item\"")) issues.push({ path: `ui.elements.${key}.on.${event}`, message: "Do not select a row with setState and $item: give the Table or List a selectPath and read the selection from that path (see Showing one record)." });
      }
    }
  }
  return issues;
}

/** Every `$state`, `$bindState` and `repeat.statePath` reference under `/sources/` found anywhere in the UI tree. */
function sourceReferences(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) { for (const entry of value) sourceReferences(entry, found); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if ((key === "$state" || key === "$bindState" || key === "statePath") && typeof entry === "string") {
      const match = SOURCE_PATH.exec(entry);
      if (match?.[1]) found.add(match[1]);
    }
    sourceReferences(entry, found);
  }
}

const ACTION_PROPS = ["rowAction", "editAction", "moveAction"] as const;
/** Action ids named by `runAction` bindings and by the row, edit and move action props of data components. */
function actionReferences(spec: Spec): { path: string; actionId: string }[] {
  const references: { path: string; actionId: string }[] = [];
  for (const [key, element] of Object.entries(spec.elements)) {
    for (const prop of ACTION_PROPS) {
      const actionId = (element.props as Record<string, unknown>)[prop];
      if (typeof actionId === "string") references.push({ path: `ui.elements.${key}.props.${prop}`, actionId });
    }
    for (const [event, binding] of Object.entries(element.on ?? {})) {
      for (const entry of Array.isArray(binding) ? binding : [binding]) {
        const actionId = entry.action === "runAction" ? entry.params?.actionId : undefined;
        if (typeof actionId === "string") references.push({ path: `ui.elements.${key}.on.${event}`, actionId });
      }
    }
  }
  return references;
}

/**
 * Checks a spec the agent sent in one pass: the UI against the catalog and json-render's structural rules, every source and action
 * against the connectors the app can reach, and every `select` against its sample. Issues come back together so one reply fixes them all.
 */
export async function validateAppSpec(input: AppSpecInput, context: AppSpecValidationContext): Promise<AppSpecValidation> {
  const issues: AppSpecIssue[] = [];
  const connector = (id: string) => context.connectors.find((entry) => entry.id === id);
  const checkTool = (path: string, connectorId: string, tool: string): void => {
    const found = connector(connectorId);
    if (!found) { issues.push({ path, message: `No connector with id ${connectorId} is available to this app. Call list_connector_tools for the ids.` }); return; }
    if (found.tools.length && !found.tools.some((entry) => entry.name === tool)) issues.push({ path, message: `${found.name} has no tool named ${tool}.` });
  };
  for (const [id, source] of Object.entries(input.sources)) {
    if (source.kind === "connector") {
      checkTool(`sources.${id}`, source.connectorId, source.tool);
      if (source.page) {
        if (source.page.arg in source.args) issues.push({ path: `sources.${id}.page.arg`, message: `${source.page.arg} is set in args; the page argument is filled in by Nora, so leave it out of args.` });
        if (source.page.kind === "cursor") { try { compileSelect(source.page.next); } catch (error) { issues.push({ path: `sources.${id}.page.next`, message: error instanceof Error ? error.message : "The cursor expression is not valid." }); } }
      }
    }
    else if (!APP_FILE_SOURCE_EXTENSIONS.some((extension) => source.path.toLowerCase().endsWith(`.${extension}`))) issues.push({ path: `sources.${id}.path`, message: `Only ${APP_FILE_SOURCE_EXTENSIONS.join(", ")} files can be sources.` });
    const sample = context.sample(id);
    try {
      const compiled = compileSelect(source.select);
      if (sample !== undefined) await compiled.evaluate(sample);
      else if (!context.allowUnsampled) issues.push({ path: `sources.${id}.select`, message: `No sample exists for source ${id}. Call ${source.kind === "file" ? "sample_file" : "sample_connector_tool"} with source_id "${id}" first so the expression can be checked against real data.` });
    } catch (error) { issues.push({ path: `sources.${id}.select`, message: error instanceof Error ? error.message : "The select expression is not valid." }); }
  }
  for (const [id, action] of Object.entries(input.actions)) {
    checkTool(`actions.${id}`, action.connectorId, action.tool);
    for (const sourceId of action.refreshSources) if (!input.sources[sourceId]) issues.push({ path: `actions.${id}.refreshSources`, message: `Source ${sourceId} is not declared.` });
  }
  for (const [id, alert] of Object.entries(input.alerts)) {
    if (!input.sources[alert.source]) issues.push({ path: `alerts.${id}.source`, message: `Source ${alert.source} is not declared.` });
    try { compileAlert(alert); } catch (error) { issues.push({ path: `alerts.${id}`, message: error instanceof Error ? error.message : "The alert's expressions are not valid." }); }
  }
  const parsedUi = appCatalog.validate(input.ui);
  if (!parsedUi.success || !parsedUi.data) {
    for (const issue of parsedUi.error?.issues ?? []) issues.push({ path: `ui.${issue.path.join(".")}`, message: issue.message });
    return { spec: null, issues };
  }
  const ui = parsedUi.data as Spec;
  issues.push(...elementIssues(ui));
  for (const issue of validateSpec(ui, { checkOrphans: true }).issues) {
    if (issue.severity === "error") issues.push({ path: issue.elementKey ? `ui.elements.${issue.elementKey}` : "ui", message: issue.message });
  }
  const referenced = new Set<string>();
  sourceReferences(ui.elements, referenced);
  for (const sourceId of referenced) if (!input.sources[sourceId]) issues.push({ path: "ui", message: `The UI reads /sources/${sourceId}, but no source with that id is declared.` });
  for (const { path, actionId } of actionReferences(ui)) if (!input.actions[actionId]) issues.push({ path, message: `Action ${actionId} is not declared in actions.` });
  if (issues.length) return { spec: null, issues };
  const spec = appSpecSchema.safeParse({ sources: input.sources, actions: input.actions, alerts: input.alerts, ui });
  if (!spec.success) return { spec: null, issues: spec.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
  return { spec: spec.data, issues: [] };
}

export const describeIssues = (issues: readonly AppSpecIssue[]): string => issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
