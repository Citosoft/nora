# Nora v3 implementation handoff

Updated: 2026-10-21. This is the durable handoff for the supplied native-execution plan. Update it at each completed boundary and before stopping. Do not infer production readiness from code existence.

## Authorization and working tree

- The user supplied the complete implementation plan and AGENTS.md rules; both remain authoritative.
- The user explicitly approved the complete written UI specification on 2026-10-21 (“i approve”). See [decision record](ui-discovery.md#approval-checkpoints). Frontend implementation is authorized. Final implemented-experience review is still required.
- The user requested persistent progress tracking so another agent can continue.
- Before this task: `THIRD_PARTY_NOTICES.md` was modified and `docs/` was untracked. Preserve those existing changes. Do not reset the working tree or commit without instruction.
- Supported Node: `/home/daniel/.nvm/versions/node/v24.16.0/bin/node`; default shell Node is 20.19.2. npm lives beside the supported binary. Tests that spawn child processes require sandbox escalation in this environment: sandboxed children can silently exit without running. Do not accept a sandboxed `node --test` file count as proof that test cases executed.

## Completed implementation

- [x] Replaced stale consultation status with 39 traceable decisions from the supplied plan; visually inspected both supplied screenshots.
- [x] Added complete [screen/component/interaction specification](ui-specification.md) and [delivery/acceptance contract](delivery.md), then recorded explicit owner approval.
- [x] Added validated provider-independent conversation/run/item/request/command/event contracts under `shared/conversations/` and `shared/types/conversation/`.
- [x] Added isolated backend modules under `main/execution/`: pure command/update decisions, projection, environment-owned SQLite journal/receipts/projections/outbox, engine, provider registry and effect worker.
- [x] Added command retry idempotency/conflicting reuse checks, single-root admission, writer conflicts, queued edit/remove/pause/continue, typed native outcomes and request validation, cursor replay/subscriptions, rollback and uncertain-start recovery.
- [x] Added Codex stdio RPC transport, schema subset checked against installed `codex-cli 0.132.0`, native lifecycle/approval/question handling and exact-native-turn read reconciliation under `main/providers/codex/`.
- [x] Added Claude SDK bridge and adapter under `main/providers/claude/`, pinned `@anthropic-ai/claude-agent-sdk@0.3.306`, with native session continuation, partial/final normalization, permission/question callbacks and cancellation. Lost-owner reconciliation intentionally stays uncertain; SDK history is not a completion signal.
- [x] Added deterministic SQLite lifecycle and subprocess provider-fixture tests under `tests/unit/main/execution/`.
- [x] Added normalized model/permission catalogs: Codex paginates `model/list` and checks account metadata; Claude uses SDK metadata controls without sending a prompt. Model presence never proves entitlement.
- [x] Added schema v2 execution ownership with atomic compare/claim/release, process-liveness checks outside transactions, and required injected engine mutation guards. Ownership and upgrade behavior is covered by integration tests.
- [x] Added an isolated `ExecutionHost` coordinator owning recovery, summary/history/catalog queries, effect scheduling and explicit shutdown. Control effects have separate capacity from long-running starts; subscription closure does not stop execution. Shutdown preserves scoped unconfirmed execution references. Four host tests cover control/recovery capacity, view closure and shutdown.

These modules are **isolated foundations**. Production bootstrap does not instantiate them; the live preload/`window.nora` does not expose the new bridge, and no active UI uses the new client. Existing managed PTY, loops and API chats remain production paths. This is not a v3 cutover or a supported second production runtime.

## Completed continuation: host admission, scalable projections and client boundary

- Implemented schema-v3 normalized projections, active-state reads and keyset-paginated timeline/run history. Added 5,000-message coverage and transactional v1/v2 migration checks.
- Implemented `LocalWorkspaceAuthority`, real Git checkout inspection and `openLocalHost` composition. Host preparation resolves only registered checkouts; writer admission covers symlink aliases and overlapping folders. Original command fingerprints survive canonicalization and later workspace loss. The worker rechecks identity/branch before sending and cancels a start interrupted during that check.
- Added explicit `reconcile` status-check command; it never resends an instruction. Recovery effects have their own host capacity. Tests added for queue safety and deduplication.
- Added a schema-versioned conversation IPC gateway, preload factory and injected renderer client. They validate both directions, enforce exact environment routing, sanitize failures and separate passive view subscriptions from native execution. Window watches coalesce cursor hints; history uses bounded pulls. Cursor-drain race, late-watch cleanup, origin validation and cross-window watch ownership have regression tests.
- Production bootstrap and `window.nora` remain unchanged. The new gateway/bridge/client are deliberately isolated until cutover; there are no live buttons calling missing handlers.
- Completed regression coverage for historical request identity, requests expiring before delivery, separate recovery-worker capacity, multi-page replay, writes during subscription setup, late-watch cancellation and window navigation cleanup. All final checks pass. No user state or real model instruction was used.

## Current verification

- **640 repository tests pass, 0 failures and 0 skipped** using Node 24.16.0 outside the subprocess-restricted sandbox. This includes 63 native-execution tests: 16 engine, 13 adapter/catalog/registry, 4 ownership/migration, 4 host, 4 SQLite history/migration, 3 workspace authority, 2 local composition/Git, 2 effect worker, 2 IPC, 5 renderer client, and 2 each for command identity, SDK streaming, authentication metadata and conversation summaries. Log: `/tmp/nora-v3-unit-results.txt`.
- `npm run build`, path hygiene, shell assembly imports and Nora bridge usage checks pass. Build log: `/tmp/nora-v3-build-results.txt`. Path hygiene covers tracked files only; new paths also received a manual naming/whitespace check.
- SQLite write/restart/recovery with the actual ownership guard passes under Node 24.16.0 and **bundled Electron 42.3.1 / Node 24.15.0** via `scripts/checkExecutionSqlite.mjs`. Execution database schema is now v3. Atomic upgrades from v1/v2 preserve conversations, native identities, receipts, journal cursors, effects and ownership; malformed sources roll back without deletion. This does not implement the separate legacy Nora data migration.
- Real Codex 0.132.0 stdio initialization, Claude SDK loading, and Claude 2.1.306 SDK model/account metadata controls pass in temporary configuration. Claude returned five catalog entries; normalized authentication was `unknown`. **No model instruction or inference was sent.** This does not prove authenticated model access, full live native lifecycle, packaged application or SSH acceptance.
- Runtime/client identity uses the actual application version from the existing app metadata source, not the conceptual v3 version.
- Regression coverage includes atomic rollback, uncertain submission, replay/idempotency, request expiry/abort, native response confirmation, stable timestamps, multi-block streaming, separate provider instances, host control capacity, view/subscription closure, shutdown recovery, and recency updates that do not reorder on token deltas. A queued instruction cannot hide the previous failed turn in summaries.
- No known failing checks at this checkpoint. Production bootstrap and the live preload/UI still do not use the new runtime. The isolated IPC/preload/renderer-client flow is tested end to end. No user state has been migrated or deleted, and no v3 visual interface has been implemented despite its recorded approval.
- Root version remains `0.2.2`; upcoming `changelogs/v0.2.3.md` contains exactly one Improvements line for native execution groundwork. Documentation has no separate changelog line. Preserve the pre-existing notices timestamp while retaining the added SDK dependency notice.

## Remaining plan deliverables

- [ ] Implement post-turn review/checkpoint finalization and turn/workspace attribution. `review` remains a separate state without a finalizer. Compose the verified host into production only at the complete cutover boundary. Local composition, canonical checkout identity, per-record projections and paginated history are implemented.
- [ ] Complete native lifecycle acceptance beyond fixtures: authenticated isolated start/resume/send/interrupt and error/usage-limit behavior for both providers, account/config separation, compatible CLI versions, native attachment/skill/subagent capabilities, and safe reconnect/resume controls. Catalogs and metadata controls are implemented; unsupported capabilities remain hidden. Disconnect enters recovering. An explicit backend `reconcile` status-check command exists and never resends instructions; automatic reconnect scheduling and recovery controls in the UI remain pending. Claude cannot confirm lost-owner completion through SDK history.
- [ ] Validate packaged application SQLite and remote platform support before production wiring; local writable bundled-Electron support has passed. Extend schema upgrades and ownership/recovery acceptance as versions evolve.
- [ ] Implement approved neutral shell, project conversation list/All agents, mixed tabs/grids/resizing, shared timeline/composer/queues/requests, review scopes, archive/settings and notifications through existing region ports.
- [ ] Register the implemented conversation IPC/preload/client in production with the complete cutover. Supply trusted window/frame authorization and environment routing. Do not expose orphan handlers or a competing runtime before migration. The typed factories, validation and passive view flow are implemented and tested.
- [ ] Integrate workflows, tasks/goals/loops, handoffs and editor/browser/forge; complete every production entry point in the cutover deliverable.
- [ ] Implement versioned SSH worker/host API with remote-owned files/processes/credentials/store, admission and reconnect; never fall back to local execution.
- [ ] Implement restartable local/SSH + home/repository migrations with manifests/checksums/backups/provenance and explicit archive/import failures, including retired API chats.
- [ ] Implement tray/reopen, explicit Quit and shutdown/restart reconciliation.
- [ ] Remove superseded managed execution, busy inference, loop subprocesses and renderer AI loops only with complete migration/cutover; preserve manual shells/history/tools.
- [ ] Run all repository checks/builds and relevant UI/remote/native acceptance matrix; obtain implemented-experience review before final UI sign-off.

## Entry points for continuation

Start with [delivery boundaries](delivery.md) and [architecture](architecture.md). The next coherent deliveries are post-turn review/checkpoint finalization and authenticated native lifecycle acceptance, then the approved interface through the new client and complete workflow/SSH/migration/cutover. Local composition, paginated history and canonical workspace preparation are complete as isolated modules. Review `main/execution/host.ts`, `ownership.ts`, `engine.ts`, `decideCommand.ts`, `decideUpdate.ts`, `sqliteStore.ts`, `effectWorker.ts` and `main/types/execution/`. Native adapters are `main/providers/{codex,claude}/adapter.ts`; SDK wiring is `claude/sdkBridge.ts`, pure stream shaping is `claude/streamNormalizer.ts`.

Continuation entry points:

- `main/execution/localHost.ts` composes native instances, protected storage, workspace authority and ownership-before-recovery. Its registrations callback must come from trusted environment-owned checkout records, never arbitrary renderer paths or local mounts for SSH projects.
- `localWorkspace.ts` canonicalizes real roots and filesystem identity; `workspaceGit.ts` reads Git roots/branches, including unborn/detached worktrees and plain folders. A changed branch or replaced root stops preflight and preserves the queue for explicit review.
- `sqliteSchema.ts`, `sqliteProjection.ts`, `sqliteQueries.ts` own schema upgrades, per-record writes and history. Live engine paths use active/queued state plus a selected run; full `snapshot()`/`snapshots()` are export/debug operations and must not be exposed as UI hydration.
- `shared/conversations/gateway.ts`, `shared/ipc/types/conversationGateway.types.ts`, `main/execution/gateway.ts` and `main/ipc/registerConversationIpc.ts` define and validate the normalized gateway. Routing checks the resolved host's environment ID; there is no local fallback.
- `main/preload/createConversationBridge.ts`, `renderer/components/app/clients/createConversationClient.ts` and `logic/listenToConversation.ts` form the isolated client. Install the local cursor listener before watch registration, pull ordered event pages from the **header's original cursor**, and keep stable IDs when merging history. A later history-page cursor must not silently replace a live replay baseline.
- `viewSubscriptions.ts` owns per-window watch cleanup on navigation/destruction/crash, with one lifecycle listener set per window. Closing a view cancels its watch, never the native turn. Late watch acknowledgements are cleaned up a second time if necessary.

Remaining scale limits: pages are bounded by record count, not byte size. The durable journal retains cumulative item revisions; no compaction/output-blob storage exists. Resuming an active turn still loads that turn's items for timestamp reconciliation. The 5,000-message test establishes paging/selective-read behavior, not production-scale throughput or UI virtualization. Future SSH proxies must supply the same normalized operations through an asynchronous remote transport; the current resolver port is local and does not establish remote support.

Focused validation after compilation and alias rewriting:

```sh
/home/daniel/.nvm/versions/node/v24.16.0/bin/node node_modules/typescript/bin/tsc -p tsconfig.unit.json
/home/daniel/.nvm/versions/node/v24.16.0/bin/node node_modules/tsc-alias/dist/bin/index.js -p tsconfig.unit.json
/home/daniel/.nvm/versions/node/v24.16.0/bin/node dist-tests/tests/unit/main/execution/engine.test.js
/home/daniel/.nvm/versions/node/v24.16.0/bin/node dist-tests/tests/unit/main/execution/adapters.test.js
```

After `npm run build`, use the supported Node binary with `scripts/checkExecutionSqlite.mjs` and `scripts/checkNativeExecution.mjs`. Run the SQLite script with `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron` for the bundled runtime. Native smoke sends no turn, uses temporary state and clears common API-key environment variables. Generated Codex protocol evidence was inspected at `/tmp/nora-v3-discovery.eP0T41/protocol` (CLI 0.132.0); regenerate from the installed CLI if unavailable rather than assuming a different version matches.

Use escalation for subprocess tests as needed. Authentication/cost-bearing inference is separate from fixture/unit tests and must use isolated state with declared requirements. No production user state has been migrated or deleted. No v3 visual frontend has been implemented yet despite the recorded approval. Continue with native discovery/acceptance and the approved interface, then complete workflow/SSH/migration/cutover together at the documented production boundary.
