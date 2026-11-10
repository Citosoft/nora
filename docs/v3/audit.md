# Current implementation audit

The updated [whole-UI transition map](ui-transition.md) applies the owner’s D44–D45 clarification to this inventory, including all creation/handoff surfaces and the unified thread model.

## Scope and evidence limits

This is a source-level audit of the principal execution and presentation paths, not a completed runtime acceptance audit. It does not establish that every existing feature works, that remote workflows have parity, or that the current UI has been visually reviewed. Those checks remain on the [discovery checklist](README.md#progress).

## Three execution paths

### Managed agents

The current launch path is:

`app:create-agent` → session service → session creation → worktree/context preparation → `spawnAgentPty`.

Follow-up prompts are compiled with selected context in `SessionMainService.sendAgentPrompt`, persisted as context entries, and delivered through `sendAgentInput`, which writes text and a carriage return to the runtime session. This acknowledges submission to a terminal, rather than a provider turn completing.

Evidence:

- [Session IPC](../../main/ipc/registerSessionIpc.ts) owns creation, agent input, terminal input, resizing, restarts and destruction.
- [Session creation](../../main/orchestrator/sessionCreation.ts) combines agent metadata, branch/worktree preparation, context artifacts and PTY startup.
- [Session main service](../../main/orchestrator/domainMainServices/sessionMainService.ts) shapes context handoffs before terminal delivery.
- [Runtime](../../main/orchestrator/runtime.ts) starts local agent PTYs and direct SSH agent processes; it also owns reusable manual-terminal spawning.
- [Terminal actions](../../main/orchestrator/agentTerminalActions.ts) contain both agent-specific and shell-specific input and clearing behavior.

`AgentSession` in [shared session types](../../shared/types/session.types.ts) contains command, PID, terminal buffers, terminal transcript path, resume command, `isBusy` and `busyUntil`. It is a terminal-oriented record, not an adequate v3 conversation contract.

[Busy activity](../../main/orchestrator/agentBusyActivity.ts) uses output keywords; [terminal output detection](../../main/orchestrator/terminalOutputDetect.ts) detects shell prompts and development URLs. Keep useful shell detection for manual terminals; remove it from managed execution state.

### Loop workflows

[LoopRunner](../../main/loops/loopRunner.ts) already owns workflow progression in the main process, persists runs, handles pause/cancel controls and detects orphaned work after restart. It uses a separate [headless executor](../../main/loops/loopHeadlessExecutor.ts) to spawn shell commands and [provider-specific output normalizers](../../main/loops/output/createLoopOutputNormalizer.ts).

This is structured CLI output in some modes, not the same path as interactive managed PTYs. V3 must migrate both paths into one provider-backed lifecycle. Preserve role sequencing, goals, validation, run history and recovery semantics while replacing subprocess command construction and duplicate execution tracking.

### Existing AI chat

[AiChatPanel](../../renderer/components/app/panels/ai-chat-panel/AiChatPanel.tsx) creates an AI SDK `ToolLoopAgent`, `DirectChatTransport` and `useChat` inside React. [Model creation](../../renderer/components/app/logic/aiChatModel.ts) builds API clients from settings in the renderer. [Workspace tools](../../renderer/components/app/ai/workspaceAiChatTools.ts) call narrow workspace clients for file operations and spec creation.

This is a third execution path, distinct from Claude Agent SDK and Codex App Server. Its transcript/composer rendering is useful reference material; its React-owned model/tool loop cannot become the v3 execution foundation. Ask/plan and spec-generation functionality needs an explicit destination rather than silently disappearing or retaining an independent renderer runtime.

## Existing reusable boundaries

| Boundary | Evidence | V3 treatment |
| --- | --- | --- |
| Domain IPC and preload clients | `main/ipc/`, `main/preload/`, `shared/ipc/types/`, renderer `clients/` | Extend through one conversation owner module; keep commands narrow and validated. |
| Shell region ports | [Composition](../../renderer/components/app/views/signedInShellComposition.tsx) and renderer region hooks | Reuse for approved UI; do not feed provider objects or an expanded assembly bag into new views. |
| Workspace selection and worktrees | `main/orchestrator/worktreeSelection.ts`, `workspaceTarget.ts`, `worktrees.ts` | Reuse domain behavior; move any terminal-specific launch assumptions out of shared workspace preparation. |
| Git and forge providers | `main/orchestrator/gitWorkspaceReads.ts`, `forge-remote/`, `main/ipc/registerForgeIpc.ts` | Preserve and associate results with conversation/workspace/run IDs. |
| Context selection and handoff | [Context artifacts](../../main/orchestrator/agentContextArtifacts.ts), session main service | Preserve provenance and portable context; stop depending on terminal output as authoritative conversation history. |
| External history discovery | [Harness adapter registry](../../main/orchestrator/harness-context/adapterRegistry.ts) | Retain as an explicit import/archive boundary. These are history readers, not live provider adapters. |
| Incremental renderer updates | [Domain events](../../main/helpers/deriveAppDomainEvents.ts) | Reuse transport concepts; current events are derived state notifications, not a durable execution journal. |
| Manual terminals | `SessionTerminal`, `LiveTerminal`, `LocalTerminalDock`, runtime shell helpers | Preserve independent shell behavior and local/remote presets. Separate shell presentation from managed conversation presentation. |

## Persistence and migration inputs

[SessionIndexStore](../../main/sessionIndexStore.ts) stores JSON session snapshots and an index. [Persistence helpers](../../main/orchestrator/persistence.ts) clear process IDs, rewrite live statuses for restoration, and reset agent terminal output on restoration. This reconstructs terminal sessions; it is not provider-event replay.

[Nora paths](../../main/noraPaths.ts) define application state under `~/.nora`, including project/session metadata and worktree artifacts. [Workspace state paths](../../main/workspaceStatePaths.ts) also support repository-local or home-owned state and direct SSH path resolution. Migration must inventory both storage modes and every environment; scanning only the local repository would miss user data.

Preserve or explicitly archive:

- Project/session/worktree metadata, settings, terminal presets and split-view definitions.
- Agent resume identifiers, context Markdown/JSONL and terminal artifacts where present.
- `.nora/tasks/board.json`, loop definitions and run history under `.nora/loops/`, and specs/notes.
- Renderer-persisted AI-chat messages and provider selections, after identifying their exact storage ownership.
- Existing external-harness archive records; discovery must not implicitly launch imported/manual sessions.

Do not put settings wholesale into a conversation archive: configuration can contain secrets. Credential migration and redaction require their own inventory and tests.

## Current interface inventory

| Surface | Current behavior from source | Candidate treatment, subject to owner approval |
| --- | --- | --- |
| Project selection and sidebar | Project selector; expandable workspace groups; threads, worktrees, loops, agents, terminals, tasks, specs, notes and AI chats; global agent/thread surfaces | Retain project context and cross-project supervision; consult on consolidation and ordering. |
| Center tabs | [WorkspaceSessionTabs](../../renderer/components/app/panels/WorkspaceSessionTabs.tsx) mixes agent, terminal, browser, file, diff, forge, AI-chat and split-view tabs | Consult on retaining mixed tabs and whether closing a conversation view leaves execution running. |
| Agent surface | [FocusedAgentPanel](../../renderer/components/app/panels/FocusedAgentPanel.tsx) combines live terminal, overlay composer, context modal and agent/terminal toolbar | Replace managed-agent content with structured conversation presentation; keep shell-specific controls on shell surfaces. |
| AI-chat surface | Dedicated transcript, tool groups, ask/plan mode, model and reasoning selectors; bottom composer with Enter/Shift+Enter behavior | Reuse useful presentation patterns after consultation; migrate execution ownership separately. |
| Split views | [WorkspaceSplitViewPanel](../../renderer/components/app/panels/WorkspaceSplitViewPanel.tsx) arranges agents, terminals, browser tabs and files with drag/drop and tile controls | Preserve capability if approved; add conversations/diffs through typed surface references rather than terminal IDs. |
| Changes and review | Changed files, individual/full diff viewers, file editor and forge PR/MR views | Preserve tools; consult on thread-linked review placement and attribution of workspace changes. |
| Browser and context handoff | Preview tabs, browser selections and editor/task/forge handoff entry points | Route supported handoffs through the same typed message command. |
| Settings | Appearance, general, workbench, terminal, browser, agents, usage, skills, integrations, AI, voice, privacy and system groups | Separate provider/account setup, per-conversation execution policy and presentation preferences. |
| Styling | [Styles](../../renderer/styles.css) supply light/dark tokens, green accents and local Inter/Geist fonts | Review branding, density and typography with owner; do not assume a new palette. |

The center [slot builder](../../renderer/components/app/logic/workspaceSessionCenterSlots.ts) ends in an `agent-terminal` slot, rendered by [slot content](../../renderer/components/app/panels/WorkspaceSessionCenterSlotContent.tsx). V3 needs distinct managed-conversation and manual-terminal surfaces; changing only the visible composer would leave execution coupling intact.

## Removal boundary

Remove only after the replacement slice and data migration pass their acceptance tests:

1. Managed-agent PTY launch/input/resize/restart behavior and terminal trust-prompt automation.
2. Managed-agent busy timers, output-keyword inference and CLI screen parsing.
3. Managed terminal transcript fields in shared contracts and derived renderer state.
4. Loop-specific execution shells and live-output normalization superseded by provider adapters.
5. Renderer-owned AI network/tool loops superseded by backend-owned conversations.
6. Duplicate legacy managed-execution IPC, preload methods, renderer clients and tests.

Do not delete shared shell helpers, URL detection, manual CLI launching, usage/history importers, or development tooling merely because they currently share files with agent logic. Extract retained responsibilities as part of the relevant migration.
