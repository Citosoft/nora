# Apps: generated dashboards and mini apps — implementation plan

Companion to [dynamic-ui.md](./dynamic-ui.md), which states the product vision. This document records the decisions taken on 2026-11-19 and the concrete plan for building the feature on what Nora already has.

To avoid clashing with Nora's existing *workspaces* (a repo or folder), the generated views are called **Apps** throughout.

## Decisions

| Topic | Decision |
|---|---|
| Rendering | Declarative spec rendered by Nora's own React components, using **json-render** (`@json-render/core` + `@json-render/react`, Vercel Labs, Apache-2.0) for the spec format, catalog, validation, expressions and renderer. No agent-written HTML in v1. |
| Placement | App-level, not per workspace. A new **Apps** sidebar mode beside Threads, Bots and Inbox. |
| Data path | New main-side connector tool-call service (MCP client with stored credentials). Apps refresh reads directly with no agent run. |
| Writes | Direct tool binding. Buttons and forms call a connector tool; a confirm sheet shows unless the app is marked trusted. |
| Data shaping | Agent-authored JSONata expressions, written against a sample result at build time, evaluated in main on each refresh. |
| Build flow | Dedicated builder: the app's own thread beside a live preview. The agent gets `create_app` / `update_app` tools. |
| v1 sources | MCP connectors only. Nora's own data, local files/git and Nora Remote are later phases. |

## Why json-render

[json-render](https://json-render.dev/) is exactly the "catalog-constrained declarative UI from an LLM" layer the plan needed, and building it ourselves would have meant re-inventing most of it:

- **Catalog with Zod props** (`defineSchema` / `defineCatalog`), Zod 4 peer — matches Nora's `zod ^4.3.6`. The agent can only emit components and actions Nora registers.
- **Flat spec** (`root` + `elements` map, `children` by id) that is easy to diff and to edit in place, which is what conversational refinement needs.
- **Expressions**: `$state`, `$item` / `$index` inside `repeat`, `$cond`, `$template`, `$computed`, `$bindState` for forms, `visible` conditions and `watch` triggers.
- **`validateSpec`** and a prompt derived from the catalog: validation and the agent's guide come from the same definitions, so they cannot drift. (json-render's own `catalog.prompt()` assumes the model streams JSONL patches with sample data inlined, which does not fit Nora's tool-call flow, so `main/apps/builderGuide.ts` builds the guide from the catalog instead. Its `propsOf` schema also stops checking props once a catalog has more than one component, so `validateAppSpec` checks each element's props against its component itself.)
- **Streaming as RFC 6902 patches** (`createSpecStreamCompiler`): the builder preview can update as the agent writes, and `update_app` can accept patches instead of a whole spec.
- **Renderers** for React Native and PDF/email/image share the spec, which keeps Phase 3 (Nora Remote) cheap, and a **shadcn component kit** matches Nora's existing Radix/shadcn-style primitives.

What it does **not** do, and Nora keeps owning: fetching data from connectors, shaping results, persistence/versions, running actions against connectors, permissions. Its state model is client-side; Nora's runtime feeds shaped rows into it.

Risks and how they are handled:

- **Pre-1.0 (0.23.x) API churn.** Pin the exact version; keep every json-render import behind `renderer/components/app/logic/apps/` (catalog, registry, state bridge) and `shared/apps/` (spec schema) so an upgrade touches a few files.
- **Peer `react ^19.2.3`.** Installed React is 19.2.7; bump `package.json` from `^19.1.0` to `^19.2.3`.
- **Zod schema size in prompts.** Keep the catalog small (below) and use `customRules` for Nora-specific guidance rather than growing component descriptions.

## What exists today that this builds on

- **Connectors** (`main/connectors/*`, `shared/connectors/*`): store, encrypted secrets, OAuth refresh, a loopback proxy that injects credentials, and `probe.ts` which lists tools (name and description only — input schemas are dropped). Main has no MCP client that *calls* tools; only provider runtimes do, through the proxy.
- **MCP Apps** (`renderer/components/app/panels/conversations/mcp-app/*`, `main/helpers/mcpAppFrames.ts`): sandboxed widget hosting bound to a chat item. Not used for rendering in v1, but its `callTool` result shapes (`shared/providers/mcpApp.ts`) are the model for structured tool results.
- **Nora tools** (`shared/nora-tools/catalog.ts`, `main/nora-tools/tools/*`): the pattern for giving an agent `create_app` / `update_app`, with audience control.
- **Stores** (`main/helpers/nativeRuntime.ts`): app-level JSON and SQLite files under the state dir; `bot-routines.sqlite` shows the "validated JSON row beside queryable columns" pattern to copy.
- **Sidebar modes** (`SidebarMode` in `renderer/components/app/types/workspaceNavigation.types.ts`): `threads | bots | inbox`; Apps becomes the fourth.
- **UI**: Radix primitives under `renderer/components/ui`, `recharts` for charts, `DelimitedTableView` as the starting point for a data table.

## Domain model (`shared/apps/`)

Contracts are Zod schemas in `shared/apps/contracts.ts`, with types in `shared/types/apps/*.types.ts`. The json-render catalog is defined once in `shared/apps/catalog.ts` (schema only, no React) so main can validate specs and build prompts and the renderer can build its registry from the same object.

```
AppDefinition
  id, name, icon?, createdAt, updatedAt
  threadId            // the builder thread that owns it
  trusted: boolean    // skip confirm sheet for writes
  spec: AppSpec       // current version
  versionCount

AppSpec (one version)
  sources:  Record<SourceId, AppSource>
  actions:  Record<ActionId, AppAction>
  ui:       JsonRenderSpec      // { root, elements, state? } validated against the Nora catalog

AppSource
  connectorId, tool, args: JsonValue
  select: string                // JSONata over the raw tool result → rows
  refresh: "open" | "interval"; intervalSeconds?

AppAction
  connectorId, tool
  args: Record<string, ArgBinding>   // literal | state path | $item field
  confirm?: string
  refreshSources?: SourceId[]
```

**How the three parts meet.** The runtime writes each source's shaped rows to json-render state at `/sources/<id>` and its status at `/sourceStatus/<id>`. UI elements read them with `repeat.statePath: "/sources/invoices"`, `$item`, `$state`. Form inputs use `$bindState` under `/form/…`. A `Button` or row emits the catalog action `runAction` with `{ actionId }`; the renderer's handler resolves the `ArgBinding`s from state and the current `$item`, then calls main.

**Nora catalog (v1).** Deliberately small; descriptions are what the agent sees:

- Layout: `Grid` (12 columns), `Stack`, `Card`, `Tabs`
- Data: `Table` (columns, format, align, rowAction), `List`, `Metric`, `Chart` (bar | line | pie via recharts), `Badge`
- Text: `Text` (markdown), `Heading`
- Input: `Form`, `Input`, `Select`, `Textarea`, `Checkbox`, `Button`
- Actions: `runAction { actionId }`, `refresh { sourceIds? }`, plus built-in `setState`

`Table`, `Checkbox` and `Form` need new primitives under `renderer/components/ui` (`data-table.tsx` grown from `DelimitedTableView`, `checkbox.tsx`, `form.tsx`); the rest wrap existing ones.

JSONata (`jsonata` npm dependency) is evaluated only in main. It is chosen over JMESPath for its object-construction syntax, which is what "rows with these columns" needs. Expressions are validated at save time against the cached sample result.

## Main process

### 1. Connector tool client — `main/connectors/toolClient.ts`

A main-side MCP client that calls a connector tool with the stored credentials, reusing `credentials.ts` and the OAuth refresh already used by the gateway proxy. One `Client` per connector, lazily connected, closed on disable/remove. Exposes:

- `callTool(connectorId, tool, args, { subject })` → `{ content, structuredContent, isError }`
- `listTools(connectorId)` → now including `inputSchema` (change `probe.ts` to keep schemas; `Connector.tools` gains `inputSchema`).

Access checks go through `shared/connectors/access.ts` (an app is a Nora-owned subject).

### 2. App store — `main/apps/appStore.ts`

`apps.sqlite` beside the other runtime stores: `apps` (id, name, thread_id, trusted, updated_at, definition_json) and `app_versions` (app_id, version, created_at, summary, spec_json). Every `update_app` writes a new version; restore copies an old version forward as a new one. Sample tool results are cached in `app_samples` (app_id, source_id, sampled_at, result_json, capped at 64 KB like `mcpAppCallSchema`).

### 3. App runtime — `main/apps/appRuntime.ts`

- `load(appId)` → definition + current render data.
- `refresh(appId, sourceIds?)` → tool client → `select` → in-memory per-app data → broadcast `apps:data`.
- `runAction(appId, actionId, resolvedArgs)` → calls the tool, then refreshes `refreshSources`. Returns a typed `AppActionResult` with a user-meaningful message.
- Interval refresh only while an app is watched by the renderer (`watch` / `unwatch`, as `conversation:watch` does).

Errors become `AppSourceError { kind: "needs-auth" | "tool-failed" | "select-failed" | "disabled", message }` so blocks can offer "Sign in" or "Fix in builder".

### 4. Spec validation — `main/apps/validateAppSpec.ts`

Runs on every `create_app` / `update_app`: json-render `validateSpec` against the Nora catalog, every `repeat.statePath` / `$state` under `/sources/` names a declared source, every `runAction` names a declared action, referenced connectors and tools exist, every `select` parses and evaluates against the sample. Errors are returned to the agent in a form it can act on.

### 5. IPC — `main/ipc/registerAppsIpc.ts`

One request channel `apps:request` with a discriminated command union (as `connectors:request`): `list`, `get`, `create`, `rename`, `delete`, `set-trusted`, `refresh`, `run-action`, `list-versions`, `restore-version`, `watch`, `unwatch`. Push channels `apps:changed` (definitions, including spec patches while the agent streams) and `apps:data`. Preload bridge `main/preload/createAppsBridge.ts`; renderer client `renderer/components/app/clients/appsClient.ts`.

### 6. Nora tools (agent side)

Added to `shared/nora-tools/catalog.ts` with audience `["nora"]`, implemented in `main/nora-tools/tools/apps.ts`:

- `list_connector_tools(connectorId?)` — tools with input schemas.
- `sample_connector_tool(connectorId, tool, args)` — calls the tool once, returns a truncated result; main caches it as the sample.
- `create_app({ name, spec })` — validates and stores version 1.
- `update_app({ appId, patches | spec, summary })` — accepts RFC 6902 patches against the current `ui` (json-render's native edit unit) or a full spec; validates; stores a version labelled by `summary`.
- `read_app(appId)` — current spec.

The builder guidance is generated by `main/apps/builderGuide.ts` from `shared/apps/catalog.ts` plus Nora rules (discover tools, sample before binding, keep `select` small, 12-column grid, edit with patches on refinement). Builder threads carry an `app` binding in their run context, as workflow stages carry their attempt, so `update_app` targets that app.

## Renderer

### Navigation

- `SidebarMode` gains `"apps"`. `SidebarApps.tsx` lists apps (name, icon, last refreshed) with **New app**.
- Center: `panels/apps/AppView.tsx` renders the app; `panels/apps/AppBuilderView.tsx` is the split view (preview left, the app's thread right) for creation and **Edit**.
- Creating an app starts a Nora thread with the builder guidance and the first prompt; the app row appears when the agent calls `create_app`, and the preview follows `apps:changed` patches as it streams.

### Rendering — `logic/apps/` and `panels/apps/`

- `logic/apps/catalog.ts` re-exports the shared catalog; `logic/apps/registry.tsx` is `defineRegistry(catalog, { components })` mapping each entry to a component under `panels/apps/components/` (one file each, PascalCase).
- `hooks/useAppRuntime.ts` subscribes to `apps:data` and `apps:changed`, owns a json-render `StateStore` via `createStateStore`, and writes `/sources/*` and `/sourceStatus/*` into it. Exposes `{ spec, store, refresh, runAction }`.
- `panels/apps/AppRenderer.tsx` mounts `<Renderer spec registry>` inside `StateProvider store` and `ActionProvider handlers={{ runAction, refresh }}`.
- `runAction` handler resolves the action's `ArgBinding`s, opens `ConfirmActionSheet` (Radix dialog showing connector, tool and resolved arguments) unless `trusted`, then calls `apps:request run-action`.
- A shared `SourceState` wrapper gives every data component identical loading / error / "needs sign-in" states, driven by `/sourceStatus/<id>`.

## Security and permissions

- Only catalog components and actions can appear in a spec; props are Zod-validated; no agent code runs in the renderer. `$computed` functions are limited to a fixed set Nora registers (formatting helpers).
- JSONata runs in main with a timeout and no custom functions.
- Writes need the confirm sheet unless `trusted` is set per app; the sheet shows the exact tool and arguments.
- Connector access rules are unchanged; apps never see secrets. Raw tool results stay in main; the renderer receives shaped rows only, capped per source.

## Phases

**Phase 1 — foundation**
1. Add `@json-render/core`, `@json-render/react` (pinned) and `jsonata`; bump React peer range. `shared/apps` contracts, catalog and types.
2. Connector tool client; keep `inputSchema` in probe.
3. App store (SQLite) with versions and samples.
4. Spec validation, app runtime (refresh, actions, watch) and IPC.
5. Nora tools and generated builder guidance.
6. Apps sidebar mode, `AppView`, catalog components and registry, state bridge, confirm sheet.
7. Builder split view with streaming preview.
8. Unit tests: spec validation (catalog + source/action references), JSONata binding against fixtures, `ArgBinding` resolution, store versions/restore, access checks, patch application.

**Phase 2 — more sources**: Nora's own data (tasks, threads, inbox, workflow runs) as a built-in "nora" connector; local CSV/JSON files; git.

**Phase 3 — reach**: Nora Remote read-only apps using json-render's React Native renderer against the same spec; drag-and-drop editing; sharing.

## Status

Phase 1 landed on 2026-11-19: `shared/apps/*`, `main/connectors/toolClient.ts`, `main/apps/*`, `main/ipc/registerAppsIpc.ts`, the `app_builder_guide` / `list_connector_tools` / `sample_connector_tool` / `create_app` / `update_app` / `read_app` tools, the Apps sidebar mode with `panels/apps/*`, and unit tests under `tests/unit/main/apps/`. Builder threads carry `source: { kind: "app" }`; the center shows them as the app beside its chat. Not yet done from the original list: patch-based `update_app` (specs are replaced whole) and streaming preview while the agent writes.

## Open points to settle during implementation

- Whether the builder thread uses the default bot or a dedicated "App builder" bot with the guidance baked in.
- Row limits per source (proposal: 500 rows shaped, 64 KB sample) and whether `Table` pages or virtualises.
- How a deleted or disabled connector degrades an app (proposal: blocks show "connector unavailable", app stays).
- Whether to adopt json-render's shadcn kit components directly or wrap Nora's existing `ui/` primitives (proposal: wrap Nora's, so styling stays consistent with the rest of the shell).
