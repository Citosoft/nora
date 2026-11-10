# Nora v3 implementation handoff

Updated: 2026-11-09. This is the durable handoff for the supplied native-execution plan. Update it at each completed boundary and before stopping. Do not infer production readiness from code existence.

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

## Previous checkpoint verification — 2026-10-21

- **640 repository tests pass, 0 failures and 0 skipped** using Node 24.16.0 outside the subprocess-restricted sandbox. This includes 63 native-execution tests: 16 engine, 13 adapter/catalog/registry, 4 ownership/migration, 4 host, 4 SQLite history/migration, 3 workspace authority, 2 local composition/Git, 2 effect worker, 2 IPC, 5 renderer client, and 2 each for command identity, SDK streaming, authentication metadata and conversation summaries. Log: `/tmp/nora-v3-unit-results.txt`.
- `npm run build`, path hygiene, shell assembly imports and Nora bridge usage checks pass. Build log: `/tmp/nora-v3-build-results.txt`. Path hygiene covers tracked files only; new paths also received a manual naming/whitespace check.
- SQLite write/restart/recovery with the actual ownership guard passes under Node 24.16.0 and **bundled Electron 42.3.1 / Node 24.15.0** via `scripts/checkExecutionSqlite.mjs`. At that checkpoint the execution database schema was v3; the review continuation below upgrades it to v4. Atomic upgrades from v1/v2 preserve conversations, native identities, receipts, journal cursors, effects and ownership; malformed sources roll back without deletion. This does not implement the separate legacy Nora data migration.
- Real Codex 0.132.0 stdio initialization, Claude SDK loading, and Claude 2.1.306 SDK model/account metadata controls pass in temporary configuration. Claude returned five catalog entries; normalized authentication was `unknown`. **No model instruction or inference was sent.** This does not prove authenticated model access, full live native lifecycle, packaged application or SSH acceptance.
- Runtime/client identity uses the actual application version from the existing app metadata source, not the conceptual v3 version.
- Regression coverage includes atomic rollback, uncertain submission, replay/idempotency, request expiry/abort, native response confirmation, stable timestamps, multi-block streaming, separate provider instances, host control capacity, view/subscription closure, shutdown recovery, and recency updates that do not reorder on token deltas. A queued instruction cannot hide the previous failed turn in summaries.
- No known failing checks at this checkpoint. Production bootstrap and the live preload/UI still do not use the new runtime. The isolated IPC/preload/renderer-client flow is tested end to end. No user state has been migrated or deleted, and no v3 visual interface has been implemented despite its recorded approval.
- Root version remains `0.2.2`; upcoming `changelogs/v0.2.3.md` contains an Improvements line for native execution groundwork; the review continuation adds one distinct line for review finalization. Documentation has no separate changelog line. Preserve the pre-existing notices timestamp while retaining the added SDK dependency notice.

## Product scope extension — 2026-11-09

The owner expanded Nora beyond developer-only work and requested first-launch role selection that shapes app behavior. Recorded the confirmed direction and unresolved design decisions in [the brief](../V3.md#product-scope-extension-role-aware-workspaces), with implications in the interface specification and decision record (D40). No role taxonomy, adaptation mapping or onboarding layout is approved yet; no application behavior changed.

The owner confirmed tools, defaults, assistant instructions and suggested workflows should adapt, using an app default with workspace overrides. Before continuing affected UI implementation, consult on role choices, concrete role-to-behavior mappings, general workspaces without repositories, and returning-user behavior. Update the screen specification and acceptance contract with the resulting decisions. Existing backend progress remains unchanged; do not assume its mandatory checkout binding already supports general workspaces.

## Completed continuation: workspace review finalization — 2026-11-09

- Native terminal outcomes now atomically schedule a durable host-owned review effect. Finalization commits the review item, run review status and effect retirement together, without changing provider outcome, usage, completion timestamps, conversation recency or queue behavior.
- Review runs in its own worker group. Workspace-only review cannot block a queued native start, approval or interrupt. The checkpoint continuation below adds checkout reservations for turn evidence. The reviewer is an injected environment-owned capability; no renderer/production wiring was introduced.
- Local composition supplies read-only Git workspace inspection with bounded output/time, canonical identity/branch verification, NUL-safe filenames, staged/unstaged/untracked paths and both sides of renames. Git inspection shares one process helper with checkout admission and does not refresh the user's index. Plain folders remain valid execution workspaces; Git review reports unsupported instead of claiming clean evidence.
- Evidence is explicitly **workspace scope at the review item's capture time**, potentially including pre-existing or subsequent edits. It is not a checkpoint, patch, validation result or claim of turn authorship. Existing provider-reported turn changes remain separate. The continuation below adds persisted turn checkpoints and observed diffs; general-file/artifact review remains pending.
- Missing/failed review returns a typed unavailable reason without replacing native failure or unpausing its queue. Restart marks pending/claimed review unavailable instead of inspecting later files. Schema v4 gates the new stored variants and schedules historical terminal pending reviews for this conservative recovery; prior history, receipts and native identities are preserved.
- Added ten behavioral tests covering atomic rollback/idempotency, sanitized failure, persistence/recovery/upgrades, provider evidence isolation, slow-review scheduling and real Git filenames/index preservation. Existing adapter fixtures now drain review explicitly; workspace tests canonicalize temporary roots for macOS.

## Completed continuation: turn checkpoints and observed diffs — 2026-11-09

- Added injected checkpoint capture/compare capability and local Git implementation. Baselines commit before native submission; final captures commit after confirmed native outcomes. Later Nora starts on overlapping checkouts wait until review finalizes, preserving the previous turn's boundary. Independent workspaces and native control capacity remain available.
- Added schema-v5 private manifests and content-addressed blobs. Bytes deduplicate across turns/files and are integrity checked on hydration. Baseline/final/blob writes are transactional; live token/admission paths never load snapshots. Normalized diff metadata/patches cross the existing IPC/client boundary, with unchanged file contents kept private.
- Comparisons use saved working-tree bytes, excluding pre-existing edits and supporting additions/deletions, rename-as-add/delete, modes, symlink targets and binary identity. Scope is explicitly observed during the turn; it does not prove agent authorship or validation.
- Saved pairs rebuild after restart without recapture or resend. Missing final capture becomes unavailable. Host/provider loss and uncertain native interactions invalidate continuous attribution while retaining the baseline; workspace fallback explains why turn evidence is unavailable.
- Capture/diff limits are explicit, with no partial baseline on overflow and no fabricated text for binary/omitted patches. Git state/index and user files remain unchanged. See [checkpoint details](checkpoints.md), including unsupported directories/submodules and pending retention/restore/SSH/general-artifact work.
- Added 21 behavioral tests plus local-host native-fixture assertions. Coverage includes queues, cancellation, rollback, identity, dirty files, budgets, persistence, blob integrity/deduplication, recovery and typed client delivery. No authenticated inference or user-state migration was used.

## Completed continuation: local native acceptance — 2026-11-09

- Added opt-in `npm run test:native`, with separate compilation, temporary workspace/store/native homes and sanitized reports. No live calls run through unit/release checks. The runner reports partial/blocked evidence explicitly and cleans up normal completion/errors.
- Real Codex 0.167.0 / model `gpt-6.1-sol` passed start, streamed items, same-session follow-up, temporary file editing with observed checkpoint diff, host/process restart and recalled context, native interruption, usage metadata and exact persisted-turn read without resubmission.
- A separate restrictive-policy run passed native approval/accept-once confirmation. Questions were unobserved with default settings, then passed with the installed runtime's experimental default-mode input flag in the isolated test profile only. Production runtime settings are unchanged.
- Fixed catalog rejection of newly advertised reasoning identifiers; validate selections against the chosen model and reuse one paginated catalog reader. Fixed signed-out Codex starts to report authentication failure before thread creation, and readiness RPC failures to remain known unsent failures rather than uncertain turns; a credential-free real-runtime scenario and regression fixtures pass.
- Claude 2.1.302 / SDK 0.3.306 loads and supplies five catalog entries in isolated configuration, with authentication unknown. No Claude inference was attempted. The owner reports usage exhaustion; this test process also lacks a Claude API credential. Personal sign-in is not evidence that the isolated SDK profile is authenticated.
- Preserved [sanitized dated evidence](acceptance/2026-11-09.json), generated Codex protocol schema hashes and [re-run/acceptance guidance](native-acceptance.md). Hard crashes, live auth expiry/usage-limit events, multiple accounts, supported-version matrix, Claude and packaged/SSH acceptance are still open.

## Completed continuation: local hard-crash acceptance — 2026-11-09

- Added opt-in `host-crash` and `provider-crash` scenarios. A forked Node host owns actual SQLite/lease/checkpoint state; a supervised stdio proxy records method names/fixed lifecycle markers without logging native content or credentials. Only processes/groups created by the test are terminated.
- Real Codex 0.167.0 / `gpt-6.1-sol` passed SIGKILL after native acceptance but before turn ID delivery. Recovery claimed the dead host's ownership, retained original command receipts and queued intent, preserved the native conversation binding, kept the outcome unconfirmed and issued no second `turn/start`.
- Real Codex passed provider-group SIGKILL during an unanswered native approval. Recovery preserved run/attempt/native identity, expired the old request, rejected a stale response without native delivery, retained the queue and issued no second `turn/start`.
- Both cases completed a native-history read attempt after reopening, retained baseline checkpoint bytes with interrupted attribution, and proved the queued run never started/captured a checkpoint. The host-gap case cleans up the local provider on stdin loss; this does not prove continuity of a remote/still-live provider.
- Added two deterministic process-level fixture tests for the same paths. No production runtime behavior changed in this continuation, so no additional user-facing changelog entry was added. Updated [acceptance guidance](native-acceptance.md) and [dated machine-readable evidence](acceptance/2026-11-09.json).
- Claude calls remain deferred per the owner's reported usage limit. Remaining cases include other crash windows, still-live native request/turn reconnection, packaged/SSH/Windows behavior, live auth expiry/usage failures and the supported-version/account matrix.

## Current verification — 2026-11-09

- Node 24.16.0: **676 tests pass, 0 failures; 1 Linux-only test skipped on macOS** (677 total). Log: `/tmp/nora-v3-crash-unit-results.txt`.
- `npm run build`, path hygiene, shell assembly imports and Nora bridge usage checks pass. Build log: `/tmp/nora-v3-crash-build-results.txt`. New first-party paths were also manually checked because path hygiene only enumerates tracked files.
- SQLite write/restart/recovery passes under Node 24.16.0 and bundled Electron 42.3.1 / Node 24.15.0. The runtime smoke also exercises private checkpoint persistence, saved-pair recovery and final review publication using simulated native outcomes, with no provider invocation.
- Production bootstrap remains on the legacy runtime. Authenticated Codex acceptance was performed only in temporary state. No Claude inference, production user-state migration, SSH acceptance or v3 visual acceptance was performed. Role-based onboarding remains design work, with the two confirmed personalization decisions recorded above.
- Root version is `0.2.2`; `changelogs/v0.2.3.md` has one distinct Improvements line each for workspace review finalization and turn checkpoints. Two Fixes lines cover native reasoning compatibility and authentication/runtime-readiness submission behavior. Documentation/test tooling changes do not add separate user-facing entries.

## Remaining plan deliverables

- [x] Implement bounded local turn checkpoints and observed diffs, preserving workspace fallback and recovery. This is isolated backend work, not agent-authorship proof, restore support or production cutover.
- [ ] Complete the remaining native acceptance matrix. Codex local lifecycle, restrictive approvals, scoped experimental questions, exact-turn reads and the two local hard-crash cases now pass; Claude authenticated lifecycle, other crash/reconnection windows, live auth/usage failures, multiple accounts, compatible-version/platform coverage, attachment/skill/subagent capabilities and safe reconnect/resume controls remain pending. Catalogs and metadata controls are implemented; unsupported capabilities remain hidden. Disconnect enters recovering. An explicit backend `reconcile` status-check command exists and never resends instructions; automatic reconnect scheduling and recovery controls in the UI remain pending. Claude cannot confirm lost-owner completion through SDK history.
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

Start with [delivery boundaries](delivery.md) and [architecture](architecture.md). The next coherent deliveries are authenticated native lifecycle acceptance, role-aware UI specification completion and the approved interface through the new client and complete workflow/SSH/migration/cutover. Local composition, paginated history and canonical workspace preparation are complete as isolated modules. Review `main/execution/host.ts`, `ownership.ts`, `engine.ts`, `decideCommand.ts`, `decideUpdate.ts`, `sqliteStore.ts`, `effectWorker.ts` and `main/types/execution/`. Checkpoint internals are `main/execution/checkpoints/`; see [semantics and limits](checkpoints.md). Native adapters are `main/providers/{codex,claude}/adapter.ts`; SDK wiring is `claude/sdkBridge.ts`, pure stream shaping is `claude/streamNormalizer.ts`.

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

## Role onboarding design continuation — 2026-11-09

- Recorded D41–D43: seven presets plus custom; automatic Personal workspace; role changes affect new conversations only, preserving existing conversation guidance on future turns and resume.
- Added [the reviewable proposal](role-onboarding.md) covering first run, role mappings, general folders, capability-based tools, inheritance/snapshots, returning users and acceptance. Concrete layouts/mappings remain pending owner review; no application behavior changed.
- The next affected UI work follows this review. General workspace admission and persisted conversation role snapshots must join the existing execution/migration architecture, not introduce another runtime. Documentation-only work adds no user-visible changelog entry.

## Role implementation and UI correction — 2026-11-09

- The owner approved role onboarding/mappings and implementation, then clarified that replacing v2 execution must preserve Nora’s existing UI as the base (D44). Removed the separate replacement shell and backed out premature main/preload/renderer cutover. Original entry points, existing chrome/sidebar/tabs/grids/editor/browser/manual terminals and launch behavior are restored. No v2/v3 switch or second production runtime was introduced.
- Added one shared role profile source, strict selection/settings/snapshot contracts, capability-filtered tool defaults and custom-role validation. Existing application settings load/save personalization while preserving other settings; old settings have no inferred role.
- Added a host-owned catalog with idempotent, folder-backed Personal creation, canonical filesystem identities, protected registry writes and refusal of replaced/symlinked Personal directories. Typed personalization service/IPC/preload factories handle onboarding, app/workspace role settings and trusted existing-project binding. These factories are not registered in production.
- Native conversations save immutable guidance on creation. Codex thread start/resume and Claude SDK prompt composition use the stored guidance separately from user instructions. Schema v6 preserves historical native guidance as unassigned, without changing journal events or receipts. Git capability is explicit even for detached checkouts.
- Prepared small onboarding/settings and native conversation React components with injected clients/region ports, bounded history, queues/requests/review and saved command identities for retry. They are not mounted in the current shell. Do not describe this as an implemented production UI or claim Electron visual acceptance.
- Next: integrate these features through the **existing** shell region ports and migrate affected launch/handoff/workflow callers together; preserve their working tools and historical data. The previous generic-shell cutover is not a template to recreate. Final visual acceptance and the full rebuild remain unfinished.

### Verification after restoring the shell

- Node 24.16.0: **686 tests pass, 0 failures; 1 Linux-only skip** (687 total). Build, path hygiene, shell-assembly imports, bridge policy and whitespace checks pass. Logs: `/tmp/nora-role-unit-results.txt`, `/tmp/nora-role-build-results.txt`.
- Tests cover role/custom validation, capability filtering and explicit pins, app/workspace inheritance, failed/retried onboarding, settings preservation, concurrent updates, Personal persistence/replacement/symlink rejection, immutable conversation guidance and schema-v5→v6 migration, structured Codex start/resume and Claude guidance, and instruction retry identity.
- The detached shell was not visually accepted in Electron. Its attempted cutover has been removed. Production shell/entry/bootstrap files match their starting versions. No Claude inference or additional authenticated native inference was performed in this continuation.

## Whole-UI thread adaptation audit — 2026-11-09

- D45 clarifies that existing UI is adapted across every replaced domain. Agents and threads become one user-facing thread; complicated agent dialogs give way to the direct New thread composer with model/workspace/branch selection. Claude Desktop/ChatGPT Desktop set the requested chat interaction quality.
- Added [the source-backed transition map](ui-transition.md): 23 areas spanning chrome/sidebar/global lists, creation, agent/API chat surfaces, center routing, tabs/grids, tasks/specs/notes, workflows, context/handoffs, browser/editor/forge, Changes/Files, manual terminals, onboarding/settings, search/shortcuts, lifecycle/history and shell contracts. Each has a target behavior and a retain/adapt/replace/add treatment.
- The map explicitly rejects both a detached generic shell and a new chat pane left inside unchanged v2 workflows. It defines complete caller/type/persistence migration and removal gates. No additional runtime or production UI changes were made during this audit; documentation-only work has no changelog entry.

- Prepared a contained interactive thread-pane design for discussion, showing a direct draft, inline model/workspace/branch controls, a sample response and Personal hiding Git controls. This is a design preview only, not another app shell or production implementation. Its primary local interactions/IME handling and documentation links were checked; no new provider calls or app tests were required for this documentation/design-only continuation.

## Model picker design refinement — 2026-11-09

- Recorded D46: all components need polished design, with provider icons in a left-hand chooser and models in the right-hand pane of a popover. Specified browsing versus committing selection, dismissal/focus, real catalogs/account instances, state handling and Radix/icon reuse.
- Prepared a focused interactive picker preview using Nora’s existing local provider icon images. It exercises provider browsing, model commit, dismissal and representative loading/empty/unavailable states. Preview model names are illustrative, not an entitlement or fresh catalog check. No production component or runtime behavior changed; no changelog entry is needed for this design-only update.

## Approved model picker implementation

- Implemented the D46 two-column provider-icon/model popover in the prepared v3 thread components, reusing Radix popovers, Nora tokens and existing product logos. Browsing/cancel is separate from committing a model; native catalogs remain authoritative. Added explicit loading/empty/unavailable/sign-in states, refresh, selected model/account identity and keyboard/focus behavior.
- Replaced the preliminary separate provider/model dropdowns completely within that component. Moved reasoning/permissions into Thread options while retaining the visible effective policy. New provider selection requires an explicit supported permission choice; existing thread bindings are locked. Inherited model/policy defaults resolve once and do not change when the catalog is reordered; removed explicit models block sending instead of silently substituting another.
- Added one workspace-scoped catalog source shared by the committed selection and browsing pane. It deduplicates concurrent reads, keeps provider kinds/accounts separate, ignores stale refresh responses and sanitizes failures/mismatched catalog identity. React review covered stable store snapshots, effect dependencies, draft preservation and accessible popover controls.
- Verification: **691 unit tests pass, 0 failures, 1 Linux-only skip** (692 total); build, UI fixture typecheck, path hygiene, shell assembly imports, bridge policy and whitespace checks pass. Added five behavioral tests for catalog concurrency/identity/recovery and binding validation. Logs: `/tmp/nora-model-picker-unit-results.txt`, `/tmp/nora-model-picker-build-results.txt`.
- `scripts/checkModelPickerUi.cjs` passed actual Chromium/Radix component acceptance for browse vs commit, Escape/focus return, explicit permissions after provider change, refresh/default reorder, errors/empty/auth, saved/locked settings, draft preservation and narrow viewport fit. Light/dark and narrow screenshots were visually inspected under `/tmp/nora-model-picker-evidence/`. The test runs with fixture catalogs and temporary state; no native inference or user-state change. Re-run after build with `npm run test:ui:models`.
- This completes the picker component boundary, not the full New thread screen or application cutover. Existing `renderer/App.tsx`, `main/main.ts`, preload exposure and Nora shell remain unchanged. Continue by adapting the shared thread screen and unified thread navigation through the existing region ports, then migrate launch/handoff/workflow callers with the production replacement. No detached shell or v2/v3 mode was introduced.

## Thread workspace components — 2026-11-10

- Prepared a unified native thread presentation store and narrow navigation, tab and center region ports. `ThreadWorkspaceComposition` supplies providers without rendering app chrome or replacing Nora's shell. Native summaries drive filters, pins, queued/attention states and selection; token events do not re-sort the sidebar. The earlier unused summary hook has been removed.
- Completed the prepared conversation panel's move to controlled per-document drafts. Each view retains its own text, model preferences and exact pending command identities in versioned, host-scoped storage. Closing a view preserves drafts and never sends/interrupts work; malformed state is preserved and storage failure prevents delivery. Lost-reply retries retain IDs across restart. An accepted first send keeps the same document identity.
- Added focused sidebar, tab, center and reusable pane components using the existing center stack, UI primitives and tokens. The direct New thread screen has role starters, the approved provider/model popover, workspace and registered Git checkout selection. Existing conversation bindings/guidance stay fixed. Historical unassigned guidance is not silently replaced by the current role. Existing inactive center panes are now inert as well as visually hidden.
- Workspace/checkout controls select only host-admitted registry entries. Creating or provisioning another branch/checkout remains part of the complete launch integration; these components do not mutate a bound thread's branch or pretend a new checkout exists.
- Production activation is still outstanding: replace the existing managed-agent/API-chat launch, handoff, workflow, tabs/grids and saved-reference consumers together, using these components through the shell's composition boundary. No legacy `AgentSession` adapter, second execution runtime, v2/v3 switch, bootstrap/preload cutover or detached production shell was introduced. Current application entry points remain unchanged.
- Chromium acceptance passed for connected sidebar/tabs/composer, independent drafts, role starters, inert focus, close/reopen, stable first-send identity, lost-reply retry and retained follow-up drafts. The model-picker suite also passes after extracting the shared isolated fixture host. Screenshots were inspected in light and dark themes under `/tmp/nora-thread-evidence/`; both suites use temporary state and fixture catalogs, without native inference or user-state changes. Run after build with `npm run test:ui:threads` and `npm run test:ui:models`.
- Verification: **701 unit tests pass, 0 failures, 1 Linux-only skip** (702 total), including ten new thread-state/recovery/navigation tests. Production build, UI fixture typecheck, path hygiene, shell-assembly imports, bridge policy and whitespace checks pass. Logs: `/tmp/nora-thread-unit-results.txt`, `/tmp/nora-thread-build-results.txt`, `/tmp/nora-thread-ui-results.txt`. Changelog entries are in the upcoming `v0.2.3` file; generated-notice timestamp noise was removed.
