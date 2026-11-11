# Developer chat simulator

Run `npm run dev:chat-simulator` to open a separate Nora chat window. Select a scenario in the sidebar, then press Send. Ordinary messages run the full demonstration loop; `/tools`, `/questions`, `/approvals`, `/failure`, `/usage-limit`, `/recovery`, `/expired`, `/long-output` and `/slow` select individual scenarios.

Run `npm run dev:chat-simulator:nogpu` to open it with hardware acceleration disabled. You can also pass `--disable-gpu` to the normal command: `npm run dev:chat-simulator -- --disable-gpu`.

The developer window automatically rebuilds and reloads when UI code, styles, or Tailwind configuration change. Open chats, composer drafts, the selected theme, and running turns survive the reload. Backend and provider code still requires restarting the simulator.

The default pacing includes a short initial thinking delay, text streamed at about 50 characters per second, pauses between actions, and visible running time for every tool before its result appears. Automated acceptance tests accelerate these waits; the expired-request scenario always uses its advertised two-second deadline.

Choose **Markdown gallery** or send `/markdown` to test headings, emphasis, strikethrough, inline code, fenced TypeScript/JSON/plain-text code, nested lists, task lists, quotes, links, tables, horizontal rules and long lines as the response streams.

The simulator uses the production conversation engine, queue, SQLite store, IPC bridge, thread navigation, composer and transcript components. A scripted provider emits local events instead of calling an LLM. Simulated tool calls never execute commands, access project files or send network requests. The window blocks HTTP, HTTPS and WebSocket requests. Its database, workspace and browser profile live in temporary directories and are removed when the window closes. Normal Nora data and provider credentials are not loaded.

Choose **Provider usage limit** or send `/usage-limit` to preview the production error state when the provider runs out of usage. It emits the same typed `usage-limit` failure as a real exhausted Codex account, showing “Codex usage limit reached” and a simulated reset time two hours ahead in the chat and the failed-state icon in the thread list. No real account quota is changed.

Use the question and approval widgets to continue a scenario. `/slow` leaves time to queue another message or interrupt. `/recovery` pauses until **Check native status** is pressed. `/expired` lets an unanswered question expire. The theme button switches between light and dark appearances.

Choose **Stacked approvals** or send `/approval-stack` to raise three approvals together: command execution, file changes, and network access. Approvals open in a floating dialog stack; respond to reveal the next, or close the dialog and use **Review approval** to return later. **Stop task** interrupts the turn and clears the remaining approvals. Restart the simulator after updating its provider code to load this scenario.

Choose **Follow-up suggestion** or send `/suggestions` to finish a turn with ghost text in the empty composer. Press Tab to accept the draft, Escape to dismiss it, or type your own message. Acceptance never sends the message; press Enter or Send separately. Restart the simulator to load this provider scenario.

During `/slow`, queue a message and choose **Steer** to deliver it to the current simulated turn. The simulator acknowledges the input without starting another turn. In real chats this action appears only when the runtime advertises steering support and the turn is running; Claude currently keeps messages queued. Failed or uncertain steering delivery is retained visibly and never automatically submitted again.

Scenarios share a read-only simulated workspace, so you can start another scenario while earlier chats are waiting for answers, approvals or recovery.

The tool gallery includes sample file patches, and scripted checkpoints supply example turn reviews for testing green addition counts, red deletion counts and expandable diffs. This review data is synthetic.

Run `npm run test:ui:chat-loop` for automated Chromium acceptance of the full chat loop, including questions, approvals, tool activity, queuing, interruption and recovery. `npm run test:ui:activity` checks the tool cards and approval controls in isolation. Unit tests also exercise the real Codex and Claude normalization paths using provider event fixtures.

These tests verify event handling and UI behavior without token costs. They cannot establish which tools a real model will choose or verify a provider's live service; those require a separate live integration check.
