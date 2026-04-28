# AGENTS.md

This file defines the engineering rules for working in this repository. Follow these rules for every change unless a task explicitly says otherwise.

## Core Principles

- Keep the codebase DRY. Do not duplicate logic, UI patterns, parsing, data shaping, or API glue when a reusable abstraction is the better fit.
- Prefer small, composable units over monolithic files, components, hooks, utilities, or services.
- Choose the most elegant solution, not the quickest patch. Favor designs that reduce complexity instead of moving it around.
- Future-proof changes when it is reasonable to do so. Use adaptors, interfaces, shared contracts, and provider abstractions where they clarify boundaries and make later extensions cheaper.
- Preserve strong separation of concerns across `main`, `renderer`, and `shared`.

## Refactors

- **Finish refactors in full in the same change.** Do not migrate part of a pattern and defer the rest to a later pass. Partial refactors leave the repo in an inconsistent state (mixed APIs, duplicate sources of truth, and unclear conventions) and make reviews and debugging harder.
- **No “phase 2” split across the codebase.** If the work is too large for one deliverable, split at the *task or PR* level with a clear boundary—not by leaving some modules on the old pattern and some on the new one until someone follows up.
- **Exit criteria:** when you start a structural refactor, complete it through call sites, types, tests, and any related docs in that change. The result should typecheck, tests should pass, and there should be no temporary dual paths or shims you intend to remove “soon.”

## TypeScript Rules

- Use strict types everywhere.
- Never use `any`.
- Only use `unknown` at true untyped external boundaries, and narrow it immediately. Never use it as a shortcut around proper type design.
- Prefer explicit domain types over loosely typed objects.
- Put shared contracts in `shared/` when they cross the Electron boundary.
- Declare named types and interfaces in dedicated `*.types.ts` files under layer- or domain-level `types/` directories. Do not place type files next to implementation files. Implementation files should import types instead of declaring them inline or mid-file.
- Narrow unions intentionally and exhaustively. Prefer discriminated unions for stateful UI and provider-specific data.
- Do not silence type errors with casts unless the cast is truly justified and the boundary is well understood.

## Architecture

- Keep Electron boundaries clean:
  - `main/` owns system access, process orchestration, filesystem, network calls, and provider integrations.
  - `renderer/` owns presentation, local interaction state, and view composition.
  - `shared/` owns stable data contracts and shared domain types.
- Keep IPC APIs narrow, typed, and intention-revealing. Do not leak raw provider payloads into the renderer.
- Normalize external APIs behind adaptors before they reach the UI.
- When integrating third-party systems, design for multiple providers from the start if the domain naturally calls for it.
- Avoid one-off special cases embedded in generic flows. If behavior differs by provider or mode, isolate that behind an abstraction.

### Main process guardrails (`main/`)

- Treat `main/main.ts` as a composition/bootstrap entrypoint, not a long-term home for domain logic.
- New `ipcMain.handle` registrations MUST be added in grouped `main/ipc/register*Ipc.ts` modules by domain; `registerIpc()` should only wire those modules.
- Do not register the same IPC channel in multiple places. Every channel must have one clear owner module.
- Move reusable main-process helper logic into `main/helpers/` (for example startup, window lifecycle, state broadcast, picker/notification flows, validation, runtime assets) instead of expanding `main.ts`.
- Keep mutable runtime state close to the owning helper/service/coordinator. Avoid adding new cross-cutting mutable globals in `main.ts`.
- Keep dependency wiring explicit: helper/controller modules should accept narrow injected deps (callbacks/services/config) rather than importing broad app singletons.
- If touching a large file in `main/`, prefer extraction in the same change when practical rather than adding new inline blocks.

## React and UI

- Keep components focused and small. If a component is doing too much, split view structure, state handling, and data transformation apart.
- Move non-trivial transformation logic out of components into typed helpers or hooks.
- Do not let `renderer/App.tsx` accumulate repeated workflow orchestration. If a launch, handoff, persistence, or coordination sequence is reused across features, extract it into a dedicated helper or hook with a narrow interface.
- Reuse UI primitives and shared patterns instead of re-implementing similar controls.
- Prefer proven UI libraries and primitives where possible, especially Radix-based components, instead of building custom controls from scratch.
- Only build custom UI primitives when the existing library options genuinely do not fit the requirement or would create a worse result.
- Keep props minimal and well named. Prefer passing shaped data rather than many primitive flags.
- Avoid deeply nested conditional rendering. Extract subcomponents when branches become hard to follow.
- Treat side effects carefully. Keep effects small, explicit, and dependency-correct.
- **Custom React hooks** (exported functions whose names start with `use` and that call React hooks) MUST live under **`renderer/components/app/hooks/`** as **`useThing.ts`**. Do not add new `use*.ts` modules directly under `renderer/components/app/`; keep hook entrypoints discoverable in one folder (see **File names and paths**).
- Keep **app-wide logic** (`.ts` helpers, builders, persistence glue) under **`renderer/components/app/logic/`** and **app-level React entry modules** (`.tsx` that used to sit beside them) under **`renderer/components/app/views/`** so the app package root stays organized (see **File names and paths**).
- **Signed-in shell region ports:** new UI in a stable shell region (session center, changes column, modals, workspace sidebar, chrome) should read **`use<Region>Ports()`** from **`renderer/components/app/hooks/`** with types in **`renderer/components/app/types/*Ports.types.ts`**, not deep imports of **`assembleSignedInShellAssembly`** or wide assembly bags. Provider order and memoized port objects live in **`views/signedInShellComposition.tsx`**. Run **`npm run check:shell-assembly-imports`** after adding renderer imports of **`assembleSignedInShellAssembly`** (allowed only under **`renderer/components/app/logic/`** and **`renderer/components/app/views/`**). Signed-in shell **slice assembly** from `AppRoot` wiring belongs in **`logic/buildAppRootSignedInProviderSlicesDeps.ts`** (with wiring types in **`types/appRootSignedInProviderSlicesWiring.types.ts`**), not scattered `buildForge*` / `buildVercel*` calls in **`AppRoot.tsx`**. **`AppRoot`** should memoize **`AppRootSignedInProviderSlicesWiringInput`** and call **`hooks/useAppRootSignedInProviderSlices`**, which delegates to **`logic/assembleSignedInProviderSlicesFromWiringInput.ts`** (hooks before any signed-in-only early return). Flat settings runtime deps are grouped into **`AppShellSettingsRuntimeAssemblyInput`** via **`buildAppShellSettingsRuntimeAssemblyInputFromDeps`** in **`logic/assembleSettingsRuntimeBuildDeps.ts`** (paired with **`assembleSettingsRuntimeBuildDeps`**) and wired through **`logic/buildAppRootSignedInProviderSlicesWiringInput.ts`**.

## Data and State

- Derive state instead of storing duplicate state wherever possible.
- Keep state close to where it is needed, but centralize it when multiple surfaces depend on the same source of truth.
- Do not mix raw transport data, derived UI state, and persistent settings into one unstructured object.
- Prefer pure helpers for mapping, filtering, scoring, parsing, and normalization logic.

## Files and Organization

- Do not create monolithic logic files.
- Do not create catch-all utility modules with unrelated helpers.
- Group code by responsibility and domain, not by vague convenience.
- If a file becomes hard to scan, split it before adding more.
- Keep naming precise. Names should reflect the domain concept, not implementation trivia.

### Name length and folder namespaces

- Keep **file basenames** and **exported identifiers** (classes, React components, and other prominent exported names) at a **reasonable length**. Very long names are hard to scan and usually mean the hierarchy should be expressed in the path instead.
- When the **same words or phrases would repeat** across several related files or types (for example every basename or class name starts with the same multi-word prefix), treat that repeated part as a **folder namespace**: create a `kebab-case` directory for the shared scope and use **shorter basenames and shorter class names inside it**. The path carries the shared context; the basename names the specific unit within that folder.
- Do not encode the full conceptual hierarchy into a single long filename or type name when a parent folder already disambiguates siblings.

### File names and paths (strict)

These rules apply to **first-party** source under `main/`, `renderer/`, `shared/`, and `tests/`. They keep imports predictable on all platforms (`forceConsistentCasingInFileNames`) and avoid mixing `kebab-case` with `camelCase` in the same layer.

1. **Directory names**  
   Use **`kebab-case`**: only lowercase letters, digits, and hyphens between words (for example `workspace-session/`, `panels/settings/`). No underscores, no `PascalCase` or `camelCase` folder names.

2. **TypeScript modules (`.ts`)**  
   Use **`camelCase`** for the basename, starting with a lowercase letter (for example `buildTitleBarProps.ts`, `noraAppClient.ts`, `orchestratorForge.types.ts`, `mainServices.types.ts`).  
   **Dedicated type files** use a **`camelCase` stem** plus the suffix **`.types.ts`** (for example `appUiLayout.types.ts`, not `app-ui-layout.types.ts`).  
   **Custom React hooks** (`use*.ts` that call React hooks) use the same **`camelCase`** basename but MUST live only under **`renderer/components/app/hooks/`** (not loose under `renderer/components/app/`).

3. **`renderer/components/app` layout (logic vs UI)**  
   Under **`renderer/components/app/`**, keep **non-UI TypeScript** and **React UI entry modules** in separate top-level folders so the app root does not mix `.ts` and `.tsx` arbitrarily:
   - **`logic/`** — implementation modules: `.ts` files that are not hooks (`hooks/`), not shared type barrels (`types/` and root `types.ts`), not narrow clients (`clients/`), and not domain constants (`constants/`). Examples: `appUtils.ts`, `buildTitleBarProps.ts`, `agentHandoff.ts`, `browserTabs.ts`. Prefer **`logic/`** (or **`@/components/app/logic/…`**) for non-React helpers even when the closest feature folder is UI-heavy, so feature folders (`chrome/`, `sidebar/`, `panels/`, …) do not accumulate sibling `.ts` next to `.tsx`.
   - **`context/`** — React context and provider-only modules: **`camelCase.tsx`** files that export `createContext` / `Provider` / `useContext` wiring for the app shell (for example `workspaceSidebarContext.tsx`, `appShellBuildContexts.tsx`). Import them via **`@/components/app/context/…`** (or **`../context/…`** from sibling feature folders).
   - **`views/`** — React modules that belong at the app package root: primary **`PascalCase.tsx`** app shells and **`camelCase.tsx`** view-only helpers that are not hooks and not context (for example `signedInWorkspaceViewMount.tsx` when it returns JSX from a named export other than a single root component).
   - **Existing feature folders** (`panels/`, `dialogs/`, `chrome/`, `sidebar/`, `ai/`, `tasks/`, `notes/`, `specs/`, `screens/`, `shared/`) stay as-is; they group UI by surface. Do not add loose `.ts` next to `.tsx` in the same folder—lift shared helpers into **`logic/`** instead.

4. **React component modules (`.tsx`)**  
   If the file’s **primary export** is a React component, the basename MUST be **`PascalCase`** and match that component name (for example `WorkspaceSidebar.tsx` exports `WorkspaceSidebar`).  
   Modules that are **not** “one main component” (for example context wiring under **`context/`**, or a **`camelCase.tsx`** view helper) use **`camelCase.tsx`** the same as `.ts` naming style (for example `workspaceSidebarContext.tsx` under **`context/`**).

5. **Tests**  
   Mirror the source basename with **`.test.ts`** in **`camelCase`** when the implementation is camelCase (for example `sessionService.test.ts` tests `sessionService.ts`). Prefer the same **`@/`**, **`@shared/`**, and **`@main/`** import aliases as application code; `npm run test:unit` runs **`tsc-alias`** after `tsc` so emitted tests and compiled helpers resolve those paths under Node.

6. **Exceptions (do not rename to match the rules)**  
   - **`renderer/components/ui/**`**: keep **kebab-case** filenames aligned with upstream shadcn/Radix-style primitives so updates stay diff-friendly.  
   - **Repository root config** (`package.json`, `tsconfig*.json`, etc.): unchanged.  
   - **Third-party or generated files** under other paths: leave upstream naming unless replacing the vendor file entirely.

## Integration and Provider Design

- Wrap external services behind typed client functions or adaptors.
- Parse and validate provider responses into internal shapes before using them elsewhere.
- Keep provider-specific logic isolated so GitHub, GitLab, Vercel, and future providers can evolve independently.
- Prefer capability-based design when multiple backends may support overlapping but not identical actions.

## Error Handling

- Handle expected failures close to where they occur.
- Convert provider and transport errors into user-meaningful messages before they reach the UI.
- Do not rely on global error handling for expected validation or workflow errors.
- Keep failure states typed and explicit.

## Quality Bar

- Verify every non-trivial change. Use builds, tests, and targeted manual validation as appropriate to the scope of the work.
- Write tests for business logic and behavioral flows when practical, then implement or adjust feature code against those tests.
- Do not require unit tests for React component rendering details; prioritize coverage for domain logic, state transitions, parsing, and user-visible behaviors.
- Add regression coverage for bugs where practical, especially when the failure mode is well understood and likely to recur.
- If you touch an area that is already messy, improve it while you are there. Do not layer new complexity onto a weak structure without attempting to simplify it.
- Prefer deleting obsolete code over leaving dead paths, duplicate logic, or outdated branches behind.
- Do not add compatibility hacks, provider quirks, or special cases inline without isolating them and making their purpose clear.
- Maintain a single source of truth for derived state, provider mappings, config, and shared domain logic.
- Never let raw external payloads leak beyond the integration boundary. Normalize them into internal typed models first.
- Keep naming precise and intention-revealing. If a name is vague, overloaded, or misleading, fix it.
- Write comments for intent, constraints, and non-obvious decisions. Do not comment obvious mechanics.
- Be performance-aware by default. Avoid unnecessary re-renders, oversized effects, repeated fetches, and expensive recomputation in render paths.
- Treat accessibility as a baseline requirement. Interactive UI must have proper labels, keyboard support, and predictable focus behavior.
- Preserve styling consistency. Reuse design tokens, shared primitives, and established patterns before introducing new visual variants.
- Judge solutions by readability, correctness, extensibility, and boundary design, not only by whether they appear to work.

## Changelog Process

- Maintain versioned changelog files as a first-class release artifact.
- For every agent-made change, add one concise changelog line describing that specific change.
- When iterating on the same user-visible change within a task, update the existing changelog line for that change instead of adding additional superseded tweak-by-tweak lines.
- Do not batch changelog updates; update the changelog incrementally as changes are made.
- Use one changelog file per version (for example, `changelogs/v1.4.0.md`).
- When creating a new tag for a release version, also create a blank changelog file for the next planned version in the same commit or release workflow step.
- Keep this workflow consistent so automation can reliably read changelog files and publish website updates.
- Dont write changelog info for internal changes such as documentation generaiton. it should only be updated for features and fixes

## Changelog Enforcement

- Update changelog files automatically as part of each agent-made change.
- Add exactly one line per change, with wording that is specific and user-visible.
- If the current version changelog file does not exist, create it before completing the change.
- Before final response, run a completion check:
  1. Confirm the changelog file exists for the current release version.
  2. Confirm each agent-made change in the task has exactly one changelog line.
  3. Confirm changelog lines are concise and map to user-visible behavior.
  4. If releasing or tagging, also create the next-version blank changelog file.

## Implementation Standard

- Before adding code, check whether a reusable abstraction already exists.
- Before adding a new abstraction, make sure it reduces real duplication or clarifies a boundary.
- Every change should leave the surrounding code cleaner, clearer, or more reusable than it was before.
- When there are multiple valid approaches, choose the one that is easiest to extend and hardest to misuse.
