# Role-aware onboarding and workspaces

Status: role flow and mappings approved on 2026-11-09; implementation is in progress. D44 retains Nora’s existing UI as the base and supersedes the separate replacement-shell presentation. This extends the [approved development interface](ui-specification.md), using the same native execution engine and shell.

## Confirmed behavior

- First launch asks the user's role. It shapes tools, defaults, assistant guidance and suggested workflows.
- Offer Developer, Designer, Product & project management, Writing & content, Research & analysis, Business & operations, General, and **Describe my role**.
- Use an app default with workspace overrides. When no folder is selected, automatically create a **Personal workspace**.
- Role changes apply to **new conversations only**. Existing conversations retain their role and guidance, including subsequent instructions, queued work and resumed native sessions.
- Roles personalize the experience; they never grant permissions or enable unsupported provider capabilities.

## Approved first-launch behavior

1. Show “What kind of work do you do?” with the eight choices. Single selection; General provides an explicit broad starting point. Custom reveals a labeled role description, limited to 500 characters. No model call is needed to classify it.
2. Selecting a role previews its pinned tools, three starter tasks and a brief explanation of assistant guidance. Continue records the app default and opens Personal. No repository or provider sign-in is required to reach the workspace.
3. Personal opens an empty conversation draft with role-specific starters and the ordinary composer. Show provider setup only when needed; preserve entered text when readiness blocks sending. Starter selection fills a draft rather than sending automatically.

Settings → Personalization changes the app default. Workspace settings → Role offers **Use app default** plus the same presets/custom choice. Changes show “Applies to new conversations”; a visible conversation role indicator explains why an existing conversation keeps its previous role. Changing a setting never silently creates a replacement native session. New conversation is the deliberate way to use the new role.

## Approved mappings

These are initial pins and suggestions, not restrictions. A common Tools entry exposes all available capabilities. Existing user pins and explicit settings take precedence over role defaults. Provider/model, reasoning, permissions and paid services do not change automatically with role.

| Role | Initially prominent tools | Starter tasks | Assistant guidance |
| --- | --- | --- | --- |
| Developer | Files, changes when Git is available, terminal, browser | Inspect a codebase; investigate a bug; plan a change | Establish constraints, inspect relevant code, verify behavior and distinguish observed changes from authorship. |
| Designer | Files, previews, notes, browser | Shape a design brief; compare interaction options; improve interface copy | Clarify audience and constraints, present concrete alternatives, account for accessibility and explain tradeoffs. |
| Product & project management | Tasks, notes, files, workflows | Define scope; plan a milestone; turn notes into requirements | Make outcomes, priorities, dependencies and acceptance criteria explicit. |
| Writing & content | Files, editor, notes | Outline a document; draft from notes; revise for an audience | Clarify audience and voice, preserve factual intent and make revision choices reviewable. |
| Research & analysis | Files, notes, browser when available | Summarize supplied sources; compare options; build an evidence brief | Track sources, separate evidence from inference and communicate uncertainty. |
| Business & operations | Tasks, files, notes, workflows | Document a process; prepare a decision brief; build a checklist | Identify owners, inputs, outputs, exceptions and practical next actions. |
| General | Files, tasks, notes | Understand something; plan work; draft something | Ask for essential context, use plain language and adapt to the task. |
| Describe my role | General defaults plus editable description | General starters initially | Include the user's description as personalization, subordinate to permission and system policies. No inferred tools or privileges. |

Only show tools/starters supported by the installed app and effective provider. Browser tabs do not imply assistant web-search capability. Files do not imply attachment ingestion; native adapters currently do not advertise attachments. Designer and writer roles do not promise image generation or formatted document export. Unsupported functions must not become decorative controls.

## General workspaces and files

Use **Workspaces** as the common sidebar label, retaining project/repository concepts where useful inside development workspaces. All agents, mixed tabs, saved grids and shared execution behavior remain as specified. Role and workspace kind are independent: developers can use Personal; writers can work in repositories.

Personal needs a real app-managed local directory registered by the trusted main process, so users can start without choosing a folder while native execution still has an authorized working directory. Workspace creation is idempotent per application profile. If directory creation fails, keep the draft and show a retryable error; never submit against an arbitrary working directory. A user can also add an existing plain folder or repository. Adding one creates/selects another workspace; it does not move Personal files or rebind existing conversations implicitly. Expose Personal's storage location and Open folder in workspace settings.

Show workspace and environment in the conversation header. Show branch and Git review controls only when the workspace has that capability. Plain folders use Files with ordinary file opening/editing and available previews; an empty state says “Files created here will appear in this workspace.” Outputs stay with their owning workspace and execution host. SSH workspaces remain remote-owned with no local execution fallback.

General file/artifact review needs a separate capability from Git inspection. The existing Git checkpoints do not establish general-folder change attribution, document previews, exports or agent authorship. Until general review exists, show file browsing and truthful unavailable review states. Never substitute a fake clean badge or successful validation claim.

## State and inheritance

Store app personalization in the existing local settings system and workspace overrides against stable workspace IDs; this proposal adds no cloud synchronization. One role definition supplies UI defaults and assistant guidance rather than separate competing maps.

Resolve workspace override → app default when a draft is created. Before first submission, show the current effective role; refresh an untouched draft after settings changes, but preserve user-entered text and explicit choices. On durable conversation creation, save the role ID, custom description if present, and guidance revision/content as a conversation snapshot. All future turns use that snapshot. Do not inject changed global guidance into a resumed provider session. UI pins may follow current workspace preferences, but existing conversation guidance remains visible and unchanged.

Forking/new conversations inherit current workspace settings and preview their role before submission. A restored existing conversation uses its saved snapshot. Migrated conversations without a role retain their legacy guidance; do not retroactively assign one. Implement schema upgrades and handoff semantics with the complete migration/cutover, not a second execution path.

## Returning users

Ask once on first v3 launch. Do not infer a role from repository presence. Keep history, provider choices, permissions, pins, saved layouts and workspace preferences. Apply role defaults only to unset preferences and new conversations. The existing migration must complete safely before creating Personal; retries must not produce duplicate workspaces or discard a partially entered selection.

## Acceptance contract

- First-run selection, custom validation, General, reload/restart persistence and provider-unready draft preservation work without a repository.
- Personal creation is idempotent and handles denied/unavailable storage without native submission or lost input.
- Every preset changes supported pins, starters and guidance consistently; all other supported tools remain discoverable.
- App inheritance and workspace overrides are independent of Git capability and environment; role never broadens permissions or silently changes provider/model.
- Changing either default leaves existing conversations, subsequent turns, running/queued work and resumed sessions on their saved guidance; new conversations adopt the new effective role.
- Migrated history and explicit user preferences survive; missing historical role snapshots do not invent past guidance.
- General-folder review remains explicitly unavailable until implemented; Git evidence retains its scope and attribution limitations.
- Keyboard selection, labeled custom input, focus after Continue/back, IME-safe composer, narrow windows, light/dark themes and screen-reader status receive UI acceptance.

## Implementation boundary

The role behavior is approved. Preserve Nora’s current chrome, sidebar, tabs/grids and tools while integrating it; the native interaction surface replaces managed execution, not the whole shell. Implement role contracts, settings persistence, workspace admission, guidance snapshots and migration through the shared native architecture before connecting the affected UI. Keep shell composition on existing region ports. Role contracts, settings persistence, idempotent Personal provisioning, conversation guidance snapshots and initial React feature components now exist. The original renderer/bootstrap remain active; these new components and IPC factories are not mounted/exposed in production yet. Complete integration through existing shell ports and all affected execution callers before the native replacement is activated. Do not add a v2/v3 mode toggle.
