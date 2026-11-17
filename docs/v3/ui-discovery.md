# UI discovery and decision record

Status: consultation decisions recorded from the supplied implementation plan on 2026-10-21. The owner explicitly approved the complete [interface specification](ui-specification.md) on 2026-10-21 with “i approve” in response to the specification approval request. **Substantial frontend implementation is approved.** Final experience sign-off remains pending.

The supplied plan is the source of owner intent. The IDs below organize its 39 decisions for traceability; they do not reconstruct an unavailable questionnaire transcript. Approval of individual decisions does not approve implementation of the complete interface.

## Additional owner direction — 2026-11-09

D40: Nora should support any kind of work, with development remaining a core strength. Ask the user's role on first launch and use it to shape app behavior. ChatGPT Desktop is an additional experience reference for this broader scope; no new reference research has been completed in this update.

This direction is confirmed by the owner's request. The owner subsequently confirmed that role selection shapes tools, defaults, assistant instructions and suggested workflows, with an app-wide default and per-workspace overrides. The owner also confirmed the following decisions; concrete mappings and layouts remain proposed in [role onboarding](role-onboarding.md). The 2026-10-21 approval covers the existing baseline and does not approve these new interface details.

| ID | Topic | Confirmed decision — 2026-11-09 |
| --- | --- | --- |
| D41 | Role picker | Developer, Designer, Product & project management, Writing & content, Research & analysis, Business & operations, General, plus Describe my role. |
| D42 | No-folder start | Automatically create a Personal workspace. |
| D43 | Role changes | Apply to new conversations only; existing conversations retain their role for later instructions and resumed work. |

The [role proposal](role-onboarding.md) records proposed tool mappings, first-run flow, general workspace storage, inheritance and acceptance. Questionnaire answers confirm D41–D43; they do not approve the complete new interface. Implementation approval for this extension remains pending.

## Role approval and shell correction — 2026-11-09

The owner approved the onboarding flow and role mappings with “looks good”, then authorized implementation with “do everything you need”. The owner also clarified that v3 replaces v2 execution on this branch; there is no requirement for a v2 runtime mode or parallel production system.

**D44: Preserve Nora's existing UI as the implementation base.** After the first implementation attempt replaced the whole shell, the owner said “we seem to have completly abanonded the v2 UI”. Retain its navigation, chrome, mixed tabs, grids, panels and reusable tools. Replace the agent interaction surface with native conversations and integrate onboarding/personalization into that shell. Earlier approval of role behavior does not authorize discarding the existing interface. The detached replacement shell and its premature production wiring were removed; the original app/bootstrap entry points are restored.

## Thread-first adaptation — 2026-11-09

**D45: Adapt the whole UI to v3's unified thread model.** The owner clarified that agents and threads are effectively the same product concept. The existing UI must evolve wherever v3 replaces the underlying behavior. Ordinary creation goes directly to a New thread chat screen with model/branch selection and other relevant inline controls, replacing complicated agent dialogs. New and ongoing thread screens should be polished to the quality of Claude Desktop and ChatGPT Desktop while retaining Nora’s adapted workbench.

The source-backed [transition map](ui-transition.md) identifies affected surfaces and their retain/adapt/replace/add treatment. It includes creation/handoff callers outside the main agent panel. Detailed filter names and final composition are recommendations for screen review, not newly confirmed owner decisions. D44 preserves the UI foundation; it does not freeze v2’s duplicate labels, navigation or execution workflows.

## Component polish and model picker — 2026-11-09

**D46: Provider/model selection uses a two-column popover.** The owner accepted the thread-pane mockup as a good start and specified a provider chooser with icons on the left and the selected provider’s models on the right. All components must receive the same attention to interaction and visual polish. The owner explicitly approved the picker preview with “perfect” and then requested implementation with “carry on”. This is a component-level decision, not approval of a finished integrated app.

Provider browsing should not commit a new binding. Selecting a model commits the provider/model choice and closes the popover; Escape/outside dismiss preserves the previous selection. Use real installed-runtime catalogs, explicit selected/loading/empty/error/auth states, keyboard/focus support and existing local product icons. Reuse the Radix popover in implementation. No live catalog entitlement is established by representative models in the design preview.

## Reference evidence

The [current UI audit](audit.md#current-interface-inventory) identifies actual Nora components and wiring. Prior discovery inspected T3's [ChatView](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/ChatView.tsx), [composer](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/ChatComposer.tsx), [footer](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/ComposerFooterControls.tsx), [approval panel](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/ComposerPendingApprovalPanel.tsx), [changed files](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/ChangedFilesTree.tsx) and [right panel](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/chat/ChatRightPanel.tsx). These are moving source links, not pinned dependencies.

Both supplied visual references were downloaded and visually inspected on 2026-10-21:

- [Official Codex screenshot](https://developers.openai.com/images/blog/long-horizon-4.jpeg): pale neutral sidebar, quiet controls, project/thread navigation, broad reading space and compact bottom composer. It depicts a new-thread screen, so it cannot establish running-state, approval or review behavior.
- [T3 desktop screenshot](https://t3.codes/_astro/app-desktop.BOCg1ktw.webp): dark conversation workspace, compact activity summary, final-response validation evidence, right-aligned user content and substantial right-hand diff with a turn selector. It establishes visual relationships, not live keyboard, resizing or persistence behavior.

The decision is a neutral Codex-like shell with conversation-linked review informed by T3, preserving Nora's mixed tabs and saved grids. Neither screenshot establishes Nora's exact dimensions or interaction behavior. Current Nora was audited from source; live visual acceptance remains required.

## Reference comparison

| Area | Current Nora | Reviewed reference | Agreed Nora direction |
| --- | --- | --- | --- |
| Navigation | Separate threads, agents and API chats | Codex project/thread sidebar; T3 conversation list | One project conversation list and All agents |
| Identity | Nora tokens and green accents | Codex neutral light surfaces; T3 dark workspace | Neutral surfaces, restrained accents, Nora branding and semantic colors |
| Reading | Managed terminal plus API transcript | T3 assistant prose, right-aligned user content and folded activity | Shared centered timeline and compact tools; expand failures |
| Composer | Separate input/execution patterns | Both show bottom input and compact controls | Sticky composer with provider/model/reasoning/permissions row |
| Context | Attachments and handoffs | T3 contextual composer/source; Codex mentions affordance | Capability-aware mentions, commands and removable chips |
| Review | Changes column and diff/file tabs | T3 right diff and turn selector | Changes/Files panel; selected turn, explicit workspace fallback |
| Parallel work | Mixed tabs and saved grids | Screenshots do not establish grids | Preserve mixed tabs, 1–4 by 1–2 grids; persistent resizing |
| Requests | Terminal prompts and API tools | T3 structured request source | Active request above input; durable resolved timeline record |
| Execution | PTYs, loop processes and React AI loops | Native structured lifecycle | One durable provider-independent engine |

## Owner decision record

All rows are settled product directions from the supplied plan. Implementation approval remains separate.

| ID | Area | Recorded decision |
| --- | --- | --- |
| D1 | Navigation | Project-first conversations plus All agents for global supervision. |
| D2 | Grouping | One list per project; workspace, branch and environment badges. |
| D3 | Ordering | Pinned first, then meaningful recent activity; streaming attention does not continually reorder. |
| D4 | Completion | Completed conversations remain until explicitly archived. |
| D5 | Supporting navigation | Collapsible project tools for tasks, specs, notes, workflows, history and integrations; Settings at sidebar bottom. |
| D6 | Tabs | Retain mixed conversation, terminal, browser, file and diff tabs. |
| D7 | Splits | Preserve saved 1–4 column, 1–2 row grids; add adjustable, persisted row/column sizes. |
| D8 | View lifecycle | Closing a conversation view leaves execution running. |
| D9 | New conversation | Draft inherits provider/model, exposes workspace/environment, and creates native execution on first message. |
| D10 | Admission | Default to selected checkout; resolve writer conflicts before admission and offer an isolated worktree. |
| D11 | Messages | Centered reading column; user bubbles right, assistant prose left. |
| D12 | Tools | Compact related activity, inline expansion and larger output viewer; failures expand automatically. |
| D13 | Reasoning | Only provider-supplied reasoning; collapsed initially. |
| D14 | Composer | Sticky input and compact provider/model/reasoning/permissions row; workspace/branch/environment in header. |
| D15 | Keyboard | Enter sends or queues, Shift+Enter inserts a newline, IME composition never sends. |
| D16 | Context | @ file/context mentions, / supported skills/commands; add/paste/drop and removable chips. |
| D17 | Capabilities | Hide unsupported capabilities and show actual provider-native options. |
| D18 | Busy input | Drafting enabled; queue by default with edit/remove; explicit steering only where supported. |
| D19 | Requests | Active approval/question above composer; resolved record stays in timeline. |
| D20 | Progress | Compact activity, elapsed time and available plan steps; preserve meaningful milestones. |
| D21 | Native subagents | Expandable parent activity with supported detail views. |
| D22 | Nora relationships | Independently navigable conversations with parent links. |
| D23 | Workflows | Dedicated tool tab with linked conversation progress. |
| D24 | Review | One Changes/Files panel; selected-turn default, Workspace switch and explicit attribution fallback label. |
| D25 | Development tools | Diffs, PR/MR review, editing, previews and manual terminals remain ordinary tabs/panes. |
| D26 | Terminal context | Terminal from conversation inherits host and workspace. |
| D27 | Results | Final response central; compact result bar links available changes and validation evidence. |
| D28 | Failures | Inline failure/interruption with supported Retry/Resume; preserve drafts and queues. |
| D29 | History | Explicit project archive for v2, external CLI and retired API chats; deliberate capability-checked native import/resume. |
| D30 | Identity | Neutral Codex-like direction, restrained accents, Nora branding and semantic status/diff colors. |
| D31 | Theme/type | Compact controls, readable chat spacing; retain fonts and light/dark/system preferences. |
| D32 | Sizing | Initial 260px sidebar, 800px transcript maximum, 15px text and approximately 38% review width; persist resizing. |
| D33 | Responsive | Supporting sheets on narrow windows; usable pane minima and focused-pane mode retaining saved layout. |
| D34 | Streaming | Live text, follow near bottom only, new-activity indicator and Jump to latest otherwise. |
| D35 | Accessibility | Quiet transitions, no typewriter, reduced motion; keyboard, labels, focus restoration and non-color status. |
| D36 | Notifications | Badges and desktop notifications for background requests/failures; configurable completion notifications. |
| D37 | Policy/handoff | Inherit effective provider/project permissions; explicit broadening; provider switch previews context, never transfers native session. |
| D38 | App lifecycle | Last-window close keeps Nora in tray; explicit Quit confirms interruption, persists recovery and reports unreachable remote stop unconfirmed. |
| D39 | API retirement | Replace separate API Ask/Plan/spec execution with native conversations; archive existing chat history. |

## Approval checkpoints

The [screen specification](ui-specification.md), [architecture](architecture.md), [audit](audit.md) and [delivery plan](delivery.md) complete the review pack.

Explicit implementation approval was granted on **2026-10-21**, covering the complete written UI specification and D1–D39 decision record. This satisfies the gate from [V3.md sections 2 and 13](../V3.md#2-mandatory-requirement-ui-discovery-and-consultation) and the supplied plan.

After implementation, review the actual experience before final UI sign-off. Record both approvals here with scope and date; neither questionnaire answers, elapsed time nor backend authorization satisfies them.
