# Delivery and acceptance

The supplied plan is authoritative. The complete discovery pack was updated and explicitly approved for frontend implementation on 2026-10-21. Final experience sign-off remains pending. The intentional departures are neutral Codex-like styling and retirement of separate API Ask/Plan execution in favor of native conversations with archived history.

## Delivery boundaries

| Deliverable | Completion boundary | Verification |
| --- | --- | --- |
| Durable engine | Shared contracts, pure decisions, environment-owned SQLite, effects, subscriptions/replay and recovery with provider doubles; no production routing during validation. | Idempotency/conflicting reuse, rollback, uncertain submit, request expiry, stream reconciliation, cursors, schema migration and concurrency. Writable SQLite under Electron before production. |
| Native adapters | Claude Agent SDK and supervised Codex stdio; registry separates kind from account/instance. Validate native identity/payloads, authentication, streams, requests, cancellation and failures. | Lifecycle fixtures and explicitly authenticated isolated smoke tests; actual package/runtime compatibility. |
| Approved interface | Complete written UI after explicit approval; each production surface migrates fully. | Owner experience checkpoint; keyboard/IME, queues, view lifecycle, notifications, themes, grids, responsiveness and accessibility. |
| Workflows/hosts | Tasks/goals/loops/handoffs/development entry points use one lifecycle; versioned SSH worker owns remote store/files/processes/credentials. | Dependencies, writer conflicts, concurrent worktrees, version negotiation, reconnect and local/remote parity. |
| Cutover | Restartable migration, every production caller changed together and superseded paths removed. | Full checks plus migration/restart acceptance and preserved manual tools. |

An isolated backend deliverable is not a second supported production runtime. No feature flag should expose it before migration and approved interface integration. Each production refactor finishes contracts, callers, tests and docs together.

## Migration contract

Inventory local/SSH environments, repository/home storage, settings, projects, worktrees, sessions, tasks, workflows/runs, context artifacts, external histories and renderer API chats. Native import/resume is deliberate and capability checked. Preserve provenance; ANSI-only records remain transcripts.

Use versioned restartable manifests, source checksums and protected backups before writes. Record archive/import/error destinations. Unreadable sources remain recoverable. Never copy credential-bearing settings wholesale into archives; credentials stay provider-owned/OS-protected. Replace retired Ask/Plan/spec entry points with native conversation instructions and archive their messages.

At complete cutover remove managed PTY launch/input/resize, output-based busy inference, terminal-derived managed state, loop-specific subprocesses and React AI loops. Preserve manual terminals, reusable shell helpers, history readers, browser/editor/forge and unrelated backend AI helpers.

## Acceptance matrix

1. Atomic receipts/events/projections/outbox, stable IDs/schema versions, rollback without publication, retry idempotency and conflicting command reuse.
2. One root turn per conversation, concurrent conversations/workflow steps, editable unsent queues; writer admission separate from actual sandboxing.
3. Create/resume/send/interrupt, partial/final reconciliation, scoped approval/question choices, request expiry, crashes, auth/usage failures for both native integrations.
4. Reconcile uncertain effects before resubmission; distinguish absence from unreachable state; no completion inferred from disconnect/quiet; gap-free cursor hydration/replay.
5. View/window closure, tray/reopen, explicit Quit, persisted recovery and unconfirmed unreachable remote stop.
6. Queues, IME/keyboard, notifications, long histories, sheets/grids, themes/focus/accessibility, turn/workspace review and evidence.
7. Editor/browser/forge handoffs, independent local/SSH shells, history preservation and restartable migration without secret leakage.

Run `npm run test:unit`, `npm run check:path-hygiene`, `npm run check:shell-assembly-imports`, `npm run check:nora-bridge-usage` and relevant builds with Node 24.16.0 or the supported range. Smoke tests use temporary state and declare authentication, network and possible usage charges. Doubles do not establish real provider/SSH acceptance.
