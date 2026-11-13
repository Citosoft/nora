# Bots

Status: proposal drafted and owner decisions B1–B7 recorded on 2026-11-13 (see [decision record](#decision-record)); the owner approved building it the same day. All five slices are implemented as of 2026-11-13; see the implementation notes under each section and the remaining gaps under [Implementation slices](#implementation-slices).

## Summary

A **bot** is a named teammate the user configures once and then talks to: it has a role, standing instructions, a chosen provider/model, its own memory and an animated blob avatar. Bots can be defined globally or per workspace, can ask each other for help, and can be added to **group chats**.

The central design rule: **a bot is an identity a thread runs as, not a new kind of session.** A conversation with a bot is an ordinary v3 thread with a bot snapshot attached, executed by the same engine, providers, review, checkpoints and sidebar. Bots add a face, standing instructions, a fixed binding and memory; they do not add a second execution path.

## Goals and non-goals

Goals:

- Configure bots globally and per workspace, mirroring the existing role scoping (app default with workspace overrides).
- Give each bot a role, instructions and a selected provider/model that every thread with it uses.
- Give each bot durable, user-visible and editable memory.
- Let bots ask each other questions and take part in group chats.
- Make bots feel personable through procedurally generated, animated blob avatars whose motion carries thread status.
- Avoid confusion with threads, roles and native subagents.

Non-goals:

- A separate execution engine, chat shell or "bot mode".
- Bots running on a schedule or acting without a user-initiated turn. (Loops/workflows may target a bot later; out of scope here.)
- Cloud sync or sharing of bot memory between machines.
- Broadening permissions. Like roles, a bot never grants capabilities, tool access, sandbox policy or credentials beyond the effective workspace/provider policy.

## Vocabulary

Use **bot** everywhere in UI and code. The v3 work deliberately merged "agent" into **thread** (D45); do not reintroduce "agent" for this feature. "Subagent" remains reserved for provider-native delegation shown inside a thread (D21).

| Term | Meaning |
| --- | --- |
| Bot | A saved definition: name, role, instructions, provider binding, avatar, scope. |
| Bot thread | An ordinary conversation bound to one bot. |
| Group chat | A conversation with two or more bot members plus the user. |
| Memory | Durable notes a bot keeps, scoped to the bot and optionally to a workspace. |
| Nora | The default, bot-less assistant. Plain threads stay exactly as they are today. |

## How this builds on existing surfaces

| Need | Existing mechanism | Bot use |
| --- | --- | --- |
| Global + workspace scoping | `Personalization.defaultRole` / `workspaceRoles`, resolved by `effectiveRole()` in `shared/personalization/profiles.ts` | Same resolution order for the bot catalog: workspace definitions override or hide global ones. |
| Standing instructions | `conversation.role` guidance snapshot, appended to the Claude system prompt, Codex `developerInstructions` and ACP guidance | A `conversation.bot` snapshot uses the same guidance channel and replaces role guidance in bot threads (B5). |
| Model selection | `providerBindingSchema` in `shared/conversations/contracts.ts` | A bot stores a binding; selecting the bot fills the draft's binding. |
| Cross-thread context | `threadReferenceSchema` and run `handoff` | Bot-to-bot asks and group-chat context deltas are passed as thread references, not raw transcript copies. |
| Nested activity display | `subagent` timeline item | "Ada asked Rex" renders as a subagent-style card linking to Rex's thread. |
| Parent/child conversations | `conversation.parentId` (D22) | Group-chat member threads are children of the group conversation. |
| Writer conflicts | `main/execution/workspaceConflict.ts` (D10) | Unchanged; bots that write are subject to the same admission. |

## Domain model

All contracts live in `shared/` with zod schemas, and types in `shared/types/bots/*.types.ts`, following the repository rules.

### Bot definition

```ts
interface BotDefinition {
  id: string;               // stable; slug for file-backed workspace bots
  name: string;             // 1–40 chars, unique within effective catalog
  role: string;             // one-line purpose shown under the name, e.g. "Release manager"
  instructions: string;     // standing instructions, bounded (e.g. 8,000 chars)
  binding: BotBinding;      // provider kind, instance, model, reasoning, permission policy
  avatar: BotAvatar;
  memory: { enabled: boolean };
  scope: { kind: "global" }
    | { kind: "workspace"; workspaceId: string; storage: "shared" | "private" }; // B1
  revision: number;         // increments on every instruction/binding change
}

interface BotAvatar {
  seed: number;             // deterministic generation
  palette?: BotAvatarPalette;  // optional pins; unset parts derive from seed
  shape?: BotAvatarShape;      // "circle" | "squircle" | "pill" | … | "hexagon"; see Avatar
  eyes?: BotAvatarEyes;
}
```

### Catalog resolution

The effective catalog for a workspace is: global bots, then shared workspace bots, then private workspace bots, each layer overriding an earlier bot with the same `id`, minus bots the workspace hides. A private bot therefore lets one user customise a shared bot without changing the repository. This is a pure helper beside `effectiveRole()`, with unit tests for override, hide and name-collision cases.

### Thread binding

Add an optional `bot` snapshot to `conversationSchema`, next to `role`:

```ts
interface BotSnapshot {
  botId: string;
  revision: number;
  name: string;
  avatar: BotAvatar;
  guidance: string;         // composed bot instructions, frozen at creation
}
```

Snapshot semantics match roles exactly: editing a bot affects **new** threads only. Existing threads keep their saved instructions and binding, including queued work and resumed native sessions. A visible indicator ("Ada · revision 3 — edited since") explains why an old thread behaves differently, with **New thread with Ada** as the deliberate way to adopt changes. Memory is the exception: it is read live per run (see below), because it is data, not instructions.

Guidance composition order: Nora system guidance → bot instructions → question guidance. Bot threads do **not** include the user's app or workspace role (B5): the conversation's `role` is `null` when `bot` is set, and the schema rejects both being present. The bot block states that it does not change capabilities or permissions, using the same wording pattern as `snapshotRole()`. Group-chat member threads follow the same rule.

The snapshot also records the effective binding. A per-thread model override (B4) is stored on the conversation's `provider` binding as usual and flagged as an override, so the header can show "Ada on Sonnet (override)" and **Use Ada's model** can restore it for later turns.

### Group chat

A group chat is a conversation with a `group` descriptor instead of a single bot:

```ts
interface GroupDescriptor {
  members: GroupMember[];   // 2–6 bots (B6)
  writer: string | null;    // botId allowed write access, or none
  hopLimit: number;         // bot-to-bot replies per user message, default 4
}
interface GroupMember { botId: string; threadId: string; } // hidden child thread per member
```

Each member has its own child conversation (`parentId` = group) with its own native session, bot snapshot and binding, so providers never share a native session and every member keeps model-appropriate context. The group's visible timeline is a projection: user messages plus each member's final reply, attributed with an `author`. A member's tool activity is available by expanding its reply or opening its child thread, consistent with D21/D22.

Timeline change: message items gain an optional `author: { kind: "bot"; botId; name; avatar }`; the name and avatar are kept so history still renders after the bot changes or is deleted. Unattributed assistant messages remain Nora/the thread's single bot.

### Memory

```ts
interface BotMemoryEntry {
  id: string;
  botId: string;
  workspaceId: string | null; // null = applies everywhere this bot runs
  text: string;               // ≤ 1,000 chars
  source: { kind: "bot"; conversationId: string; runId: string } | { kind: "user" };
  createdAt: string;
  updatedAt: string;
}
```

Stored in a dedicated SQLite file (`bot-memory.sqlite` in Nora's state directory, separate from the execution store), owned by `main/bots/memory/store.ts`. Entries are written only when a bot calls `remember` or the user adds one (B2); Nora does not summarise runs into memory automatically. Entries are plain text the user can read, add, edit and delete from the bot's info panel and editor. Memory is **never** instructions: it is delivered inside a delimited block labeled as notes, subordinate to system and user instructions, and is excluded from permission decisions.

Delivery per run:

1. A bounded digest (most recently used + pinned entries, e.g. ≤ 1,500 tokens) is attached to the run's instruction context.
2. The `recall` tool searches the rest.

Because this is per run rather than part of the frozen snapshot, memory stays current in long-lived threads without rewriting guidance.

## Nora tool server

**Implemented 2026-11-13 (owner decisions N1–N2).** Nora itself is the built-in global bot: default (bot-less) threads *are* the Nora assistant, listed first in Bots mode with the app mark rather than a blob (B7 still holds), and the Talk to picker's Nora option is the same thing (N1). Those threads get Nora's app tools; bot threads get a smaller set (see below). `create_bot` saves immediately without an approval prompt, and the bot appears in the window at once through a pushed personalization change (N2). The server is a loopback-only, stateless streamable HTTP MCP endpoint (`main/nora-tools/`) started on first use, with one bearer token per conversation; the token is the only way a call learns its thread and workspace. Claude receives it as an SDK `mcpServers` entry with Nora's tools pre-allowed, Codex as per-thread `mcp_servers.nora.*` config overrides, and ACP agents only when they advertise HTTP MCP support. Implemented tools, all scoped to the calling thread's workspace unless asked otherwise, grouped by domain under `main/nora-tools/tools/` with operations under `main/nora-tools/operations/`, and described once in `shared/nora-tools/catalog.ts`:

| Domain | Tools | Notes |
| --- | --- | --- |
| Bots | `create_bot`, `update_bot`, `list_bots` | Explicit provider/model is checked against the provider's catalog; edits bump the revision and only affect new threads. |
| App | `list_workspaces`, `list_models` | Models come from each provider's catalog for the thread's checkout. |
| Threads | `list_threads`, `read_thread` | Reads final user and assistant messages only, never tool output; bounded per message and per call. |
| Tasks | `list_tasks`, `create_task`, `move_task` | Project workspaces only; `create_task` goes through the workspace service's `createWorkspaceTaskFile`. |

None of the tools delete anything or start model work. Deleting bots or tasks, settling threads and starting threads (`ask_bot`) are deliberately left to the window for now. Settings → MCP Servers lists it first as a built-in row (status, tools, where it applies), because runtimes never report it. Bot threads get `ask_bot`, `list_bots`, `remember` and `recall`, plus `group_history` when they answer in a group chat; Nora threads get the app tools plus `ask_bot`; group chats get none. The catalog marks each tool's audience.

Memory, bot-to-bot asks and group posting need tools the model can call. Nora currently passes user MCP servers to providers but does not host its own. Add one Nora-owned MCP server in `main/bots/`, started on demand and injected into the session configuration by each adapter:

| Tool | Behavior |
| --- | --- |
| `remember(text, scope)` | Adds a memory entry; scope is `bot` or `workspace`. Shown in the timeline as a compact "Remembered" item. |
| `recall(query)` | Searches the bot's memory; returns at most N entries. |
| `ask_bot(bot, message)` | Runs a turn in the caller's thread with the target bot (creating it on first use), passes a thread reference for context and returns the reply. |
| `list_bots()` | Lists the effective catalog for the current workspace (name, role only). |

Only threads bound to a bot receive the server. Tools are capability-gated per provider: Claude and Codex accept MCP configuration natively; ACP agents receive it only where the agent advertises MCP support in `session/new`. Where unsupported, the bot still works with instructions and a read-only memory digest, and the UI says memory writes and asks are unavailable for that model (D17: no decorative controls).

### Bot-to-bot safety

- `ask_bot` calls count against the originating user message's hop limit (default 4, shared across a group chat). Exceeding it returns a tool error the model can explain.
- A bot cannot ask itself, and a chain cannot revisit a bot already waiting on it (no cycles).
- The target runs with its **own** binding and permission policy, never the caller's broader one. Approvals it raises surface in the user's attention flow like any other thread (D19, D36).
- The target thread is a real, navigable conversation (D22), so the user can always inspect what was asked and answered.

## Group chat turn policy

1. **@mentions first.** Mentioned members reply in mention order; `@everyone` asks every member in member order. Neither needs a model call. Members' replies can @mention by name only, never `@everyone`.
2. **No mention → router.** A cheap text-generation call (the existing `textGeneration` path) picks zero to two members from names, roles and the latest message.
3. **Router has nobody → lead.** A group may name one member as its **lead** (chosen in New group; optional). The lead answers anything the router returns no one for or fails on, and its prompt tells it so. Without a lead, the group shows "Nobody picked this up — @mention a member" rather than forcing a reply. Groups created before leads existed parse with `lead: null`.
4. **Bots may @mention each other** in replies; each counts as a hop.
5. **One member runs at a time.** Replies are sequential, with the speaking member's avatar animating. This keeps the transcript readable and avoids concurrent writers.
6. **Access:** members default to read access. At most one member is the group's writer; changing it is an explicit control. Workspace admission and conflict handling (D10) are unchanged.
7. **Stop** in a group stops the active member and clears the pending speaker queue; queued user messages behave as in D18.

Each member receives, per turn, the group messages since its last reply (up to 40,000 characters, oldest cut first), not the full history, keeping native contexts bounded; its own native session already holds what came before. When the catch-up is cut, the prompt says so and the member can page back through the group with the `group_history` Nora tool, which only bot threads whose parent is a group get.

**Member thread visibility.** Each member's child thread holds its tool calls, approvals and questions. A sidebar preference (`memberThreads`; Thread view options, the eye button beside Groups in the Bots sidebar, or the one in a group's composer) lists those threads or hides them. While shown, each member reply in the group links to its thread (**View work**). While hidden, a member thread still appears in lists whenever it needs attention, because a pending approval there blocks the group's reply.

## Scoping and storage

- **Global bots:** stored in app settings via the existing settings store, under a `bots` key validated with the same untyped-boundary pattern as `readPersonalization()`.
- **Workspace bots (B1)** are either shared or private, chosen per bot in the editor:
  - **Shared:** a file at `.nora/bots/<slug>.md` in the workspace (front matter for name, role, binding, avatar; body for instructions), so teams can review and share it in version control. Plain-folder and Personal workspaces use the same path.
  - **Private:** stored in local settings per workspace ID; nothing is written to the workspace.
  - Switching a bot between shared and private moves its definition and keeps its `id`, so threads and memory stay attached. Making a bot shared shows which file will be created; making it private asks whether to delete the repo file, since others may rely on it.
- **Workspace hides of global or shared bots:** stored locally per workspace ID alongside `workspaceRoles`.
- **Memory:** always local to the machine, never written to the repository.
- Invalid bot files surface as a non-blocking error on the bot list with the parse message; they never break the catalog.

Remote (SSH) workspaces read workspace bot files through the owning host, consistent with remote ownership; memory remains on the local machine keyed by workspace ID.

## User experience

### Creating and editing bots

- **Settings → Bots** lists global bots with avatar, name, role and model. **New bot** opens the bot editor.
- **Workspace settings → Bots** shows workspace bots plus inherited global bots with an on/off toggle per workspace.
- **Bot editor** (one dialog for create and edit, in two columns that stack on narrow windows: avatar, name and role, model and availability on the left; instructions and, for existing bots, memory on the right): avatar preview with Reroll and optional shape/colour/eyes pins; name; role line; instructions (multiline, with a starter template); provider/model/reasoning using the existing model picker; memory on/off; scope (global or this workspace) and, for workspace bots, **Shared with the repository** or **Private to you**. Saving shows "Applies to new threads".
- **Bot info panel** (`BotInfoPanel`, opened from a bot's row in the Bots sidebar, by its info button or context menu): a non-modal side panel with the bot's role, model, availability, instructions, memory (add, edit, delete), recent threads and groups, plus New thread, Edit and Delete. It does not yet open from avatars elsewhere, such as thread rows or message authors.

### Talking to a bot

- The **New thread** screen gains a **Talk to** picker beside the model picker, defaulting to **Nora**. Choosing a bot sets the binding from the bot and shows it read-only, with an explicit **Override model** affordance. Starter tasks on the empty state come from the bot's role when set.
- **@mention a bot in an ordinary thread** = a one-off ask via `ask_bot`. The answer renders inline as an attributed card with the bot's avatar. The thread does **not** become a group chat; nothing changes type implicitly.
- **New group** is a separate entry that opens the same New thread screen in group mode with a member picker. Members come from the current workspace's effective catalog only (B3), up to six (B6).

### Bots home

Choosing Bots in the mode strip (or the home button while in Bots mode) shows **Bots home** in the center whenever no thread is open; Threads mode keeps the workspace home. It shows a card per bot (Nora first, then the workspace's bots, then global ones) with its face state, role, model and thread count, and **New thread**, **Continue latest** and **Edit**; then the workspace's group chats with **New group**; then **Start from a template**. With no bots yet, an introduction explains roles and models, memory and bots working together, and points at creating one or asking Nora. Templates (`shared/bots/templates.ts`) open the bot editor prefilled with a name, role, instructions and a pinned face; the model is chosen there before saving. Each template is tagged with the roles it suits; templates for the workspace's effective role are shown first as "Suggested for …" and the rest under "More templates", so none are hidden. A custom role gets General's suggestions. Instructions are the same whichever role picks a template.

### Navigation

- Bot threads use the bot's avatar in place of the status icon in `ThreadRow`; the avatar's animation state carries the same status (with a non-colour, screen-reader label, per D35).
- Group chats show up to three stacked avatars.
- Plain Nora threads keep their existing status icons and Nora branding; Nora has no blob avatar (B7).
- The sidebar has two modes, switched from a narrow vertical strip on the sidebar's outer edge (Threads and Bots icons). The strip stays visible when the sidebar collapses, follows the sidebar when sidebars are swapped, and the chosen mode is remembered across launches. Threads mode is unchanged. Bots mode lists the focused workspace's own bots, then global bots; each shows its aggregate avatar state and expands to its unsettled threads, a bot without threads starts one on click, and + always starts a new thread. In Bots mode the primary button becomes **New bot**.
- The workspace home may show the effective bot roster as quick-start entries.

### Avatar

Procedurally generated from `seed`, with optional user pins:

- **Body:** one of a broad vocabulary of distinct, soft shapes so bots are recognisable by silhouette alone: circle, squircle, pill, pebble, egg, drop, cloud, flower, clover, sparkle, star, heart, ghost, shield, leaf, triangle, pentagon and hexagon. Each shape is defined once as a closed outline (vertices, a polar function or a parametric curve), then rounded with corner-cutting (Chaikin) smoothing and normalised to the avatar box, so every corner is soft and no edge is jagged. Shapes whose visual centre is off-centre (triangle, drop, ghost, shield, star) carry a face offset and scale so the face sits comfortably inside. The shape list is inspired by the wide, playful shape sets in current AI bot products, but Nora's eye styles and expressions are its own, not copied from another product. The body is **static**: its path is computed once from the seed and pins, and never moves, morphs, breathes or bounces. Each bot's silhouette stays a stable, recognisable identity.
- **Face:** two eyes only, no mouth. Eye styles are dot, oval or white-with-pupil. All expression comes from eye position, shape, lids and blinks. **Only the eyes animate.**
- **Palette:** fill from a fixed set of ramps; face ink is that ramp's darkest stop, so it reads on both light and dark themes.
- **States** (mapped from thread/run state):

| Thread state | Avatar behavior |
| --- | --- |
| Idle | Periodic blink, occasional glance |
| Running (thinking/tools) | Eyes look up and drift side to side |
| Streaming reply | Eyes bob and squash in a quick rhythm |
| Awaiting approval/input | Wide eyes looking straight out, occasional double blink |
| Failed | Half-closed lids, eyes looking down |
| Settled/archived | Closed, curved eyes, drifting "z" |

One SVG component (`renderer/components/app/shared/BotAvatar.tsx`) with pure helpers in `logic/`: a body-geometry helper (unit-testable: same seed → same path, memoized per avatar) and a face helper that maps state and time to eye geometry. Only the face layer re-renders on animation frames; the body path is a static element. A single shared animation clock drives all visible avatars to avoid one `requestAnimationFrame` loop per row; off-screen avatars pause. `prefers-reduced-motion` renders a static face per state. Sizes: 20px in rows and mentions, 32px in message attribution, 84px in the editor and profile.

## Implementation slices

Status on 2026-11-13: all five slices are implemented. Deliberate differences from the plan above:

- **Memory has no on/off toggle.** Every bot can keep notes; the bot's settings show them all and let the user add, edit and delete them. Notes live in `bot-memory.sqlite` in Nora's state directory, keyed by bot id; deleting a bot does not delete its notes, so recreating a bot with the same id brings them back.
- **@mentions:** in group chats the composer suggests members as you type `@` (arrow keys, Enter or Tab to insert, Escape to dismiss). In Nora threads the composer suggests the workspace's bots the same way, and Nora is told to pass @mentioned bots' requests on with `ask_bot`. Bot threads get no suggestions; an @mention there is just text.
- **Asked bots run read-only** (`access: "read"`) so an ask never collides with the caller's writes; groups give write access only to the chosen writer.
- **Long tool calls.** `ask_bot` waits up to 15 minutes; Claude gets `MCP_TOOL_TIMEOUT` and Codex `mcp_servers.nora.tool_timeout_sec` raised to match. ACP agents use their own limits.
- **Group chats run on a `nora` coordinator provider** (`main/bots/groups/`), so queueing, Stop, failures and restart recovery come from the normal run lifecycle. A coordinator run interrupted by quitting the app is reconciled as interrupted; finished member replies are kept.
- **Model revert.** A bot thread on another model shows "(model override)" and, while idle, **Use {bot}'s model**, which reopens the model picker set to the bot's saved model (keeping the thread's permission policy on the same provider); the next send switches with the normal handoff.
- **Waiting on the user.** Every native thread, including asked bots' and group members' child threads, raises a desktop notification for a new approval or question while Nora is not focused ("Rex needs your approval · asked by Nora"), controlled by General → Desktop notifications; clicking it opens that thread. The macOS and Linux Dock badge counts waiting requests. A thread whose descendant bot is waiting is marked for attention on its own row, with a chip that opens the waiting thread, so hidden member threads are never silent. Inside the window, requests waiting in any thread other than the one on screen gather in one bottom-right tray ("N waiting for you"), one row each: who and what, the command, files or choices beneath, then **Decline** and **Allow** (the narrowest allow option) for approvals or an **Answer** menu for a single short single-choice question. A ⋯ menu holds the other options (allow for the session, always allow, Stop task), **Open thread** and **Hide**, which leaves the request waiting in its thread. The tray collapses to an "N waiting" pill. The caller of `ask_bot` itself is not told; it keeps waiting until the asked bot finishes.
- **Ask cards.** An `ask_bot` call renders as its own card in the caller's timeline (who was asked, the question, the reply or error, and **Open {bot}'s thread**) instead of inside the turn's tool activity. Replies and errors carry the asked thread as `(thread <id>)`, formatted and parsed in one place (`shared/nora-tools/askBot.ts`).

Each slice is complete through contracts, main, IPC, renderer and tests before the next; no partial migrations.

1. **Contracts and catalog.** Bot, avatar, snapshot, group and memory schemas; catalog resolution helper; settings persistence for global bots; workspace file reader; tests for resolution and parsing.
2. **Bot threads.** `bot` snapshot on conversation creation; guidance composition in all adapters; New thread **Talk to** picker; avatar component and row integration; Settings/Workspace bots surfaces; bot editor and info panel (without memory).
3. **Memory.** SQLite store, Nora tool server with `remember`/`recall`, per-run digest, adapter injection with capability gating, memory list in the info panel and editor.
4. **Bot-to-bot.** `ask_bot`/`list_bots`, hop and cycle limits, attributed inline cards, @mention asks in ordinary threads.
5. **Group chats.** Group descriptor, member child threads, router, sequential speaker queue, writer control, stacked avatars and group timeline projection.

## Acceptance contract

- Global, shared and private workspace bots resolve correctly, including override order, hide, duplicate names, invalid files and moving a bot between shared and private without losing threads or memory.
- Creating a thread with a bot snapshots its instructions and binding; later edits affect only new threads; resumed sessions keep saved guidance.
- Bot threads carry no role guidance; a conversation never has both a role and a bot snapshot.
- A per-thread model override is visible in the header and can be reverted to the bot's model.
- A bot never broadens permissions; its binding's permission policy applies, including when invoked by another bot.
- Memory entries are visible, editable and deletable; deleted entries are not delivered on the next run; memory never appears in the repository.
- Providers without MCP support degrade truthfully: no memory-write or ask controls, read-only digest only.
- `ask_bot` respects hop and cycle limits; every ask produces a navigable thread with its own approvals.
- Group chats reply in mention order, route unmentioned messages to zero–two members, run one member at a time and honour Stop and the writer control.
- Avatar bodies are deterministic per seed and never move; only faces animate. Avatars are readable in light and dark themes, static under reduced motion, labelled for screen readers and do not add per-row animation loops.
- Keyboard access for the Talk to picker, member picker, @mention autocomplete, bot editor and info panel.

## Decision record

Owner answers recorded on 2026-11-13. These settle product direction; they are not approval of the layouts or implementation.

| ID | Question | Decision |
| --- | --- | --- |
| B1 | Where are workspace bots stored? | **Both, chosen per bot.** Shared bots are repo files at `.nora/bots/<slug>.md`; private bots live in local settings. Private overrides shared for the same `id`. |
| B2 | How does memory get written? | **Explicit only.** Bots write through `remember`; users can add, edit and delete entries. No automatic run summaries. |
| B3 | Can group chats span workspaces? | **No, one workspace.** Members come from that workspace's effective catalog. |
| B4 | Can a thread override the bot's model? | **Yes, explicitly**, shown as "Ada on Sonnet (override)" and revertible. |
| B5 | Does the user's role guidance apply in bot threads? | **No.** Bot threads use only the bot's instructions; `role` is null when `bot` is set. |
| B6 | Maximum group size? | **6 bots.** |
| B7 | Does Nora's default assistant get a blob avatar? | **No.** Plain threads keep Nora branding and status icons. |
| N1 | How does the Nora assistant bot relate to default threads? | **They are the same.** Nora is listed first in Bots mode and every bot-less thread gets Nora's tools. |
| N2 | Does `create_bot` ask before saving? | **No, it saves directly.** The result says what was created; the user edits or deletes it in Bots. |
