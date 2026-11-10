# Turn checkpoints and review diffs

Implemented in the isolated v3 host on 2026-11-09. This is not production cutover, automatic restore, authenticated-provider acceptance or final UI acceptance.

## Evidence semantics

A turn review compares actual working-tree bytes captured before native submission with bytes captured after a confirmed native terminal outcome. It therefore excludes edits already present at the baseline, including staged, unstaged and untracked content. Renames are represented as an addition and a deletion. File mode, symlink target and binary-content changes retain their identities.

The scope is **changes observed during the turn**, not proven agent authorship. Manual tools, background processes and other external writers can also change files during this interval. Provider-reported file changes remain separate evidence. No validation or success badge follows from a patch existing.

Capture covers Git-visible tracked and non-ignored untracked files on disk. Ignored files, Git internals and the host's execution database/WAL/SHM are excluded. Missing tracked paths are represented as absent files. Submodule directories, unsupported paths or unsafe parent traversal make the whole capture unavailable; they never produce silently partial turn attribution. Plain folders continue to execute with unsupported Git review.

## Lifecycle and persistence

1. Claim the native start effect and verify the canonical checkout identity/branch.
2. Capture the baseline and commit it against the exact conversation/run/attempt before sending native input. Verify the workspace again; interruption during preparation cannot submit the instruction.
3. Commit the provider's terminal outcome and pending review effect atomically. The native state is already completed/failed/interrupted while review remains pending.
4. Preserve checkout admission while turn evidence is pending. Later Nora starts on the same or overlapping checkout wait; independent checkouts and native approval/interrupt controls continue. Generic workspace-only reviews do not acquire this checkpoint reservation.
5. Capture and commit the final snapshot, compute the diff from the saved pair, then atomically publish review evidence, update review status and retire the effect. Native outcome, usage, completion time and conversation recency stay intact. Failure/interruption still pauses the queue.

Schema v5 adds private checkpoint manifests and SHA-256-addressed blobs in the environment-owned SQLite database. Unchanged bytes are deduplicated across files, before/after states and turns. Blobs and manifests commit together, with integrity verification on hydration. Only normalized review metadata/patches cross IPC; snapshot contents and unchanged files never enter the event journal. Live token/admission paths use small reservation metadata rather than hydrating file contents.

Capture verifies filesystem identity and file size/mode/timestamps around reads, refuses symlinked parents, records link targets without following them, and confirms two matching scans. This detects ordinary concurrent changes; it is not an atomic filesystem snapshot or a filesystem access sandbox.

## Recovery and fallback

- A fully persisted baseline/final pair can rebuild its review after restart without inspecting current files or resubmitting native input.
- If restart happens before final capture is saved, mark the review unavailable. Keep the baseline and record the interrupted evidence boundary; never substitute later files.
- Host/provider loss or an expired native interaction invalidates continuous turn attribution. Reconciliation can confirm the native outcome, but cannot reconstruct the original filesystem boundary. Keep the baseline and use explicit current-workspace scope if available.
- Missing/oversized/failed baseline or final capture falls back to workspace review with a typed attribution-unavailable reason. Saved-pair diff failures remain unavailable and preserve the bytes for inspection; they never become clean evidence.
- Existing v1–v4 execution history and receipts survive schema upgrades. Old runs have no fabricated checkpoints.

## Resource limits

- Up to 5,000 files, 1 MiB per file and 8 MiB of decoded content per snapshot; no partial snapshot on overflow.
- Capture checks a 10-second scan budget; Git subprocesses each have a 10-second timeout and 2 MiB output limit. In-flight filesystem operations are not an atomic or hard real-time boundary.
- Up to 128 textual patches, 128 KiB per patch and 512 KiB total text, with a 10-second patch scheduling budget. Remaining changed paths/modes/hashes stay visible with an explicit omitted-text presentation. Binary files retain before/after hashes and modes without a fabricated text patch.
- Deduplication limits repeated storage, but changed blobs accumulate with history. Retention/garbage collection, on-demand large patches, general-file/artifact capture, SSH adapters and restore/rollback acceptance remain future work.

## Implementation and verification

`main/execution/checkpoints/` separates file capture, bounded diff generation, durable blob/manifest storage, admission, record validation and review orchestration. `main/types/execution/checkpoints.types.ts` defines the injected capability. The shared contract exposes workspace fallback or observed turn scope, without leaking host snapshot data.

Behavioral coverage includes dirty baselines, staged/untracked content, added/deleted files, rename representation, binary/mode changes, applicable text patches, budgets, unsafe paths, deduplication/integrity, transaction rollback, queued starts, cancellation, loss/recovery, local native fixtures and typed IPC/client replay. Runtime smoke uses simulated native outcomes and temporary state; it sends no real model instruction.
