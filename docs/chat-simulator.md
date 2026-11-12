# Developer chat simulator

Run `npm run dev:chat-simulator` to open a separate Nora chat window. Select a scenario in the sidebar, then press Send. Ordinary messages run the full demonstration loop; `/tools`, `/questions`, `/approvals`, `/failure`, `/usage-limit`, `/recovery`, `/expired`, `/long-output`, `/slow`, `/subagents` and `/skills` select individual scenarios.

Run `npm run dev:chat-simulator:nogpu` to open it with hardware acceleration disabled. You can also pass `--disable-gpu` to the normal command: `npm run dev:chat-simulator -- --disable-gpu`.

The developer window automatically rebuilds and reloads when UI code, styles, or Tailwind configuration change. Open chats, composer drafts, the selected theme, and running turns survive the reload. Backend and provider code still requires restarting the simulator.

The default pacing includes a short initial thinking delay, text streamed at about 50 characters per second, pauses between actions, and visible running time for every tool before its result appears. Automated acceptance tests accelerate these waits; the expired-request scenario always uses its advertised two-second deadline.

Choose **Markdown gallery** or send `/markdown` to test headings, emphasis, strikethrough, inline code, fenced TypeScript/JSON/plain-text code, nested lists, task lists, quotes, links, tables, horizontal rules and long lines as the response streams.

The simulator uses the production conversation engine, queue, SQLite store, IPC bridge, thread navigation, composer and transcript components. A scripted provider emits local events instead of calling an LLM. Simulated tool calls never execute commands, access project files or send network requests. The window blocks HTTP, HTTPS and WebSocket requests. Its database, workspace and browser profile live in temporary directories and are removed when the window closes. Normal Nora data and provider credentials are not loaded.

Choose **Provider usage limit** or send `/usage-limit` to preview the production error state when the provider runs out of usage. It emits the same typed `usage-limit` failure as a real exhausted Codex account, showing “Codex usage limit reached” and a simulated reset time two hours ahead in the chat and the failed-state icon in the thread list. No real account quota is changed.

Use the question and approval widgets to continue a scenario. `/slow` leaves time to queue another message or interrupt. `/recovery` pauses until **Check native status** is pressed. `/expired` lets an unanswered question expire. The theme button switches between light and dark appearances.

Choose **Stacked approvals** or send `/approval-stack` to raise three approvals together: command execution, file changes, and network access. Approvals open in a floating dialog stack; respond to reveal the next, or close the dialog and use **Review approval** to return later. **Stop task** interrupts the turn and clears the remaining approvals. Restart the simulator after updating its provider code to load this scenario.

Choose **Connector sign-in** or send `/connector-sign-in` to have the model ask you to sign in to a connector. A sign-in card appears in the transcript for the simulated **Issue tracker** connector; press **Sign in** to watch it wait, then flip to connected with its tools listed, and the same connector updates in thread details. Sign-in is simulated locally and never opens a browser or contacts a server. Each run of the scenario signs the connector out again so it can be repeated.

Choose **Subagents** or send `/subagents` to watch three simulated agents work in parallel. Thread details lists them under **Subagents**, running ones first, with a running count in the collapsed header. Expand an agent to see its task, its latest progress, its result and the tool calls it made. One agent finishes early, one fails and one finishes last. Each agent shows the model and effort it ran on. The reviewer requests its own model; the other two follow the **Subagents** setting in the model picker (try **Simulated small model** before sending), or the thread's model when it is left on the provider default. Interrupting the turn marks any agents still running as stopped. Restart the simulator to load this provider scenario.

Choose **Skills** or send `/skills` to see how thread details reports skills. The model loads **code-review**, reads the **release-notes** SKILL.md directly, and a subagent loads **pdf**. Under **Skills**, used skills are marked **Loaded** or **Read** and expand to the agent and calls that used them; the simulated runtime's remaining skills are listed as available. No skill files exist or are read. Restart the simulator to load this provider scenario.

Choose **Follow-up suggestion** or send `/suggestions` to finish a turn with ghost text in the empty composer. Press Tab to accept the draft, Escape to dismiss it, or type your own message. Acceptance never sends the message; press Enter or Send separately. Restart the simulator to load this provider scenario.

During `/slow`, queue a message and choose **Steer** to deliver it to the current simulated turn. The simulator acknowledges the input without starting another turn. In real chats this action appears only when the runtime advertises steering support and the turn is running; Claude currently keeps messages queued. Failed or uncertain steering delivery is retained visibly and never automatically submitted again.

Scenarios share a read-only simulated workspace, so you can start another scenario while earlier chats are waiting for answers, approvals or recovery.

The tool gallery includes sample file patches, and scripted checkpoints supply example turn reviews for testing green addition counts, red deletion counts and expandable diffs. This review data is synthetic.

Run `npm run test:ui:chat-loop` for automated Chromium acceptance of the full chat loop, including questions, approvals, tool activity, queuing, interruption and recovery. `npm run test:ui:activity` checks the tool cards and approval controls in isolation. Unit tests also exercise the real Codex and Claude normalization paths using provider event fixtures.

These tests verify event handling and UI behavior without token costs. They cannot establish which tools a real model will choose or verify a provider's live service; those require a separate live integration check.
