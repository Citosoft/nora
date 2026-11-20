import type { AppAlert } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppAlertEvaluation } from "@main/types/apps/alerts.types";
import { compileSelect } from "./selectRows";

const TEMPLATE = /\$\{([^}]+)\}/g;
const TEXT_MAX = 300;

/** Compiles every `${…}` in a template once, so a broken expression is reported at save time rather than at 3am. */
export function compileTemplate(template: string): (rows: JsonValue) => Promise<string> {
  const parts: (string | ((rows: JsonValue) => Promise<JsonValue>))[] = [];
  let last = 0;
  for (const match of template.matchAll(TEMPLATE)) {
    parts.push(template.slice(last, match.index));
    parts.push(compileSelect(match[1] ?? "").evaluate);
    last = (match.index ?? 0) + match[0].length;
  }
  parts.push(template.slice(last));
  return async (rows) => {
    const rendered = await Promise.all(parts.map(async (part) => {
      if (typeof part === "string") return part;
      const value = await part(rows);
      return value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    }));
    const text = rendered.join("").replace(/\s+/g, " ").trim();
    return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text;
  };
}

/** Throws with the agent-facing reason when any of the alert's expressions does not parse. */
export function compileAlert(alert: AppAlert): (rows: JsonValue) => Promise<AppAlertEvaluation> {
  const when = compileSelect(alert.when);
  const title = compileTemplate(alert.title);
  const detail = alert.detail ? compileTemplate(alert.detail) : null;
  const key = alert.key ? compileTemplate(alert.key) : null;
  return async (rows) => {
    const condition = await when.evaluate(rows);
    const active = Array.isArray(condition) ? condition.length > 0 : condition !== null && condition !== false && condition !== 0 && condition !== "";
    if (!active) return { active: false };
    const text = await title(rows);
    return { active: true, title: text || alert.title, detail: detail ? (await detail(rows)) || null : null, key: key ? await key(rows) : text };
  };
}
