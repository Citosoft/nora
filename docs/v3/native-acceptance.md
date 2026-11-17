# Native lifecycle acceptance

Local acceptance checkpoint: **2026-11-09**, macOS arm64, Node **24.16.0**, Codex CLI **0.167.0**, Claude Code **2.1.302**, pinned Claude Agent SDK **0.3.306**. Sanitized machine-readable evidence is in [the dated report](acceptance/2026-11-09.json). These are isolated local results, not a production cutover or a complete platform/version matrix.

## Verified scope

| Case | Result | Boundary |
| --- | --- | --- |
| Codex native initialization/catalog | Passed | Authenticated temporary profile; dynamic model/effort metadata. |
| Start and streaming | Passed | Native started/completed events and partial assistant items. |
| Follow-up | Passed | Same native session identity and recalled first-turn marker. |
| Real file edit/checkpoints | Passed | Only temporary `note.md`; preserved existing content and confirmed observed-turn patch. |
| Native approval | Passed | Separate restrictive `untrusted`/`read-only` profile; accept once, confirmed response and edit. Default workspace-write did not request approval. |
| Restart/resume | Passed | Reopened Nora host/store and native process; same native identity and recalled first-turn context. |
| Native interruption | Passed | Explicit interrupt followed by native `interrupted` outcome. |
| Usage metadata | Passed | Normalized native token counts observed. |
| Exact native-turn read | Passed | Read a persisted completed turn after transport shutdown; no instruction resubmission. |
| Host crash / uncertain submission | Passed | SIGKILL after native acceptance while turn ID delivery is withheld; dead ownership lease taken over, queue/receipts retained, one total native start. |
| Provider crash / pending approval | Passed | SIGKILL of the owned native process group with unanswered approval; stale response rejected, native identity/queue retained, one total native start. |
| Signed-out Codex | Passed | Separate credential-free profile; actionable authentication failure before native thread creation. |
| Native questions | Passed with explicit experimental input feature | Default configuration did not request input. The separate question scenario enabled installed-runtime flag `default_mode_request_user_input` and confirmed question/answer delivery. Production configuration was not changed. |
| Claude SDK discovery | Passed, authentication unknown | Isolated temporary SDK profile; no inference. |
| Claude authenticated lifecycle | Pending | Owner reports account usage limit; no Claude model request was sent. The isolated SDK profile also has no API key configured; this is distinct from signing in to a personal Claude application. |

Do not infer that a model catalog proves entitlement, that question input is generally available in every runtime/mode, or that read reconciliation establishes reconnecting live requests. Do not mark the full provider acceptance matrix complete from these cases.

## Hard-crash boundaries

The two crash scenarios run the real isolated execution host in a separate Node process and supervise its Codex stdio process. The host-crash proxy withholds the native start reply/events after the native turn is accepted, then the supervisor kills the host. This preserves the real uncertain-submission window: Nora has committed intent and native conversation binding but no native turn ID. The owned local native process group is terminated on stdin loss. Recovery must keep the outcome unconfirmed even when native history contains a latest turn; absence of an exact persisted native turn ID cannot authorize resubmission or fabricated completion.

The provider-crash scenario waits for a durably pending approval, then kills the owned native process group while keeping the Nora host alive long enough to persist disconnection/request expiry. After reopening, only a confirmed native failure/interruption or conservative recovering state is accepted. Queue content, run/attempt/native identity and original retry receipts must remain intact. A stale approval must fail before reaching the native transport.

Both cases audit RPC method names and fixed lifecycle/outcome markers only, never params, replies, prompts or credentials. Assertions require exactly one total `turn/start`, a native-history read attempt after reopening, no stale approval response delivery, retained checkpoint baseline with interrupted attribution, and no checkpoint/native start for the queued instruction. Native CLI launchers and their children run in a separate owned POSIX process group; no unrelated process is targeted.

These are local Node execution-host acceptance tests, not packaged Electron crash acceptance, remote-worker continuity, or successful reconnection to a still-live native approval/turn. Host-crash cleanup terminates its local provider too. Windows crash supervision and other failure injection points remain separate acceptance work. Deterministic process-fixture tests cover the same supervisor/recovery flow without inference.

## Compatibility fixes found

The old Codex schema enumerated reasoning levels and rejected the entire current catalog when new options appeared. The generated 0.167.0 schema defines effort as a non-empty string. Nora now preserves advertised identifiers and validates a requested effort against the chosen model before native submission. Pagination/normalization is shared by discovery and send validation.

Signed-out starts previously could surface an uncertain generic transport failure. Nora now checks native account metadata and emits a typed authentication failure before creating a thread when authentication is required. Readiness RPC failures are also reported as known pre-submission failures rather than uncertain native turns. The queue remains paused with its unsent instructions intact. Regression tests cover future effort identifiers, unadvertised selections, signed-out starts and sanitized readiness errors.

Protocol evidence was regenerated with the installed CLI (`app-server generate-json-schema`, including a separate experimental bundle). Relevant schema hashes are preserved in the dated report. Reference: [official App Server documentation](https://learn.chatgpt.com/docs/app-server). Runtime-generated schemas take precedence over examples from a moving documentation page.

## Re-running

These commands are opt-in, networked and potentially billable. `npm run test:unit` never runs them. Use the supported Node 24 runtime and temporary provider-owned state. The harness copies only an explicitly selected Codex auth file into a protected temporary native home; it does not copy settings/plugins/history, persist credentials in reports, or modify the source profile. Normal completion/error cleanup removes the temporary workspace and credential copy. An externally forced process kill can bypass cleanup; inspect protected temporary artifacts before reusing an interrupted test environment.

```sh
NORA_NATIVE_LIVE=1 NORA_NATIVE_PROVIDER=codex \
NORA_NATIVE_AUTH_FILE="$HOME/.codex/auth.json" \
npm run test:native
```

Set `NORA_CODEX_EXECUTABLE` / `NORA_CLAUDE_EXECUTABLE` when the desired runtime is not on PATH, `NORA_NATIVE_MODEL` to select an advertised model, and `NORA_NATIVE_REPORT` for a sanitized JSON report. The default report is under the OS temporary directory.

`NORA_NATIVE_SCENARIO` selects `lifecycle` (default), `approval`, `question`, `signed-out`, `host-crash`, or `provider-crash`. The approval scenario uses restrictive permissions. The question scenario explicitly enables the experimental default-mode input flag only in that Codex test profile. Signed-out omits both the credential copy and API key. For Claude, use a supported API credential via `ANTHROPIC_API_KEY`; the harness does not collect or copy Claude OAuth tokens. See [Agent SDK authentication guidance](https://code.claude.com/docs/en/agent-sdk/overview).

Reports distinguish `passed`, `partial`, `blocked` and `failed`; exit codes are 0, 2, 2 and 1 respectively. Unverified cases never silently count as passed. Auth credentials and account identifiers are excluded from reports. The observer retains normalized items only in process memory long enough to check behavior; it does not archive transcripts.

## Still required

- Claude authenticated start/follow-up/resume, real edits, streaming, permissions/questions, cancellation and failure handling after credentials/quota are available in the isolated test environment.
- Additional abrupt-failure injection points, packaged/SSH/Windows crash acceptance and reconnection to a still-live native turn/request. The two local Codex hard-crash cases above now have real-runtime evidence; they do not establish every recovery mode.
- Real auth-expiry/usage-limit outcomes for both providers; quotas were not deliberately exhausted.
- Multiple-account/profile isolation, supported-version negotiation and cross-platform packaged/SSH acceptance.
- Capability-aware question/mode setup and remaining attachment/skill/subagent discovery before exposing controls in the production UI.
