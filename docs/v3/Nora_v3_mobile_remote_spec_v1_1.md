# Nora v3 — Remote Access & Mobile Experience

**Status:** Implementation specification — core product decisions confirmed  
**Priority:** Web-first launch, native-ready foundation  
**Updated:** 15 November 2026  
**Revision:** 1.1 (confirmed lifecycle, mobile access and phased self-hosting)

## 1. Objective

Enable Nora users to access and control the same agents, conversations and tasks from their phone, initially through a mobile-first web app, with native iOS and Android apps following later. Setup must be virtually one click. Users must not configure ports, DNS, tunnels, VPNs or separate cloud accounts.

Nora must not host users' agents or their conversation databases. Agent execution remains on the user's own desktop/laptop or their self-hosted server. A tiny hosted control plane may provision connectivity but must not proxy normal agent traffic.

## 2. Confirmed product decisions and constraints

**Confirmed for implementation:**

- **Background desktop execution:** Closing the Nora Desktop window must leave Nora running in the system tray/menu bar, with agents and remote access remaining operational as long as the host is awake, online and the Nora background runtime is running. A distinct **Quit Nora** action terminates the application/runtime; closing the window must not.
- **Clerk-based mobile access:** Any device authenticated as the **same Clerk user who owns the runtime** may access that runtime without an additional pairing code or desktop approval. Preserve existing per-action/tool approvals and provide a way to revoke remote access.
- **Self-hosted server timing:** Bring-your-own-server/headless runtimes are **Phase 2**, not a Phase 1 launch dependency. Architect the reusable runtime in Phase 1 so Phase 2 does not require a rewrite.

**Other constraints:**

- Use **Clerk**, already part of Nora, for sign-in and user identity across desktop, web and future native apps.
- Use **Cloudflare Tunnel** for managed, outbound-only connectivity from a user-owned runtime.
- Use **one Cloudflare Worker** for tunnel provisioning, deprovisioning, recovery and lightweight runtime discovery.
- Do **not** create a dedicated Nora device database. For automatic discovery, store a **small, non-sensitive runtime directory in Clerk private metadata**. This is centralized metadata, but not a separate database. This decision is required for zero-pairing runtime discovery; do not replace it with QR-only pairing in Phase 1.
- Keep **all conversation data, agent state, integrations, provider secrets, local permissions and project files on the runtime**.
- Build the mobile client with **Expo + Expo Router + React Native Web**, starting as an installable responsive PWA. Reuse the application code for native builds later; allow platform-specific components where needed.
- Support multiple runtimes per account, with an initial conservative limit (suggested: three).
- Remote access is **opt-in** and off by default. Once enabled, Nora stays in the tray/menu bar when its main window closes; a desktop/laptop must still be powered on, awake and connected. Self-hosted server support is Phase 2.
- Avoid assuming a central Nora service is available during an active conversation. Only provisioning/discovery requires the hosted control plane.

## 3. User stories

1. As a desktop user, I can enable remote access without technical configuration.
2. As a phone user, I can sign in with my existing Nora/Clerk account and access my owned runtimes immediately, without QR pairing or desktop approval.
3. As a phone user, I can open a conversation, send messages, follow streamed agent activity, approve or deny actions, and stop a task.
4. As a user with more than one machine, I can choose which runtime runs a task and clearly see its online status.
5. As a user whose laptop is asleep or offline, I see an understandable offline state; the mobile app does not pretend agents are running.
6. In Phase 2, as a server user, I can run the same headless agent engine on my own VPS and control it from mobile.
7. As a privacy-conscious user, I can disable remote access or sign out/revoke account sessions to stop unauthorised future access.
8. As a desktop user, I can close Nora's window and continue running agents remotely while Nora stays in the tray/menu bar, then explicitly Quit Nora when I want the runtime to stop.

## 4. High-level architecture

```text
Nora Desktop (Electron + tray runtime)      Nora Mobile (Expo Web PWA)
  UI + persistent background agent runtime   Later: Expo iOS / Android
              |                                       |
              | Clerk login                           | Clerk login
              |                                       |
              +--------------+------------------------+
                             |
                   Cloudflare Worker API
                 provisioning + discovery only
                             |
              Clerk private metadata (small index)
              Cloudflare Tunnel / DNS resources
                             |
 Mobile web/native <-- HTTPS + WebSocket via Cloudflare Tunnel -->
                   User-owned Nora runtime
                   (desktop or headless server)
                   agents, tools, conversations, files
```

**Data path:** After discovery, the mobile app connects to the selected runtime hostname through Cloudflare Tunnel. The Nora Worker is not on the HTTP/WebSocket conversation path. Cloudflare terminates/proxies network traffic; this is **not end-to-end encryption against Cloudflare**. Nora must authenticate at the runtime boundary.

## 5. Runtime design

Extract or expose Nora's existing agent orchestration as a transport-independent, reusable **Nora Runtime** that can be hosted by Electron or run headlessly. Avoid duplicating agent/provider implementations for mobile.

The runtime owns:
- Provider adapters, agent execution, tools, integrations and workspace access.
- Persistent conversations, tasks, events, approvals and outputs.
- A stable local installation identifier and a local owner Clerk user ID.
- HTTPS-facing API functionality behind the Tunnel, with the local origin bound to `127.0.0.1` by default.
- Authentication/authorization using verified Clerk identity and local revocation of remote access; **no per-device pairing or approval step** is required for another device signed into the owning Clerk account.
- Resumable stream/event cursors so clients can reconnect without duplicate messages or jobs.
- Start/stop/reconnect of its `cloudflared` connector and health checks.

**Desktop background/tray behaviour (required for Phase 1):**

- When remote access is enabled, **closing the desktop window must hide it to the tray/menu bar rather than terminate Nora**. Existing agent tasks, API server and `cloudflared` connector remain active.
- The tray/menu bar menu must offer **Open Nora**, **Remote access status**, **Disable remote access**, and **Quit Nora**. Closing the window and explicitly quitting are separate actions.
- **Quit Nora** terminates the desktop runtime and tunnel connector gracefully; warn the user if active tasks would be interrupted. Closing a window must not cancel active tasks or revoke the tunnel.
- When Nora is restarted, restore the previous opted-in remote-access state and reconnect automatically; make **Launch at login** an optional setting rather than a hidden prerequisite.
- If the app is crashed, force-quit, the OS terminates it, or the device sleeps/shuts down, the runtime may become unreachable. Never imply it continues executing in those states.
- Implement and test OS-specific tray/menu bar behaviour for macOS, Windows and supported Linux desktop environments, including a sensible fallback on environments without a usable system tray.
- Do not introduce a privileged, always-on operating-system service as a Phase 1 requirement; a background Electron/runtime process is sufficient so long as closing the UI does not stop it.

When headless mode ships in **Phase 2**, it must expose the **same API and agent functionality**, using an interactive CLI/bootstrap setup for its initial account association. No Nora-hosted compute is required.

## 6. One-click remote access flow

### Enable on desktop
1. User is signed into Nora Desktop with Clerk and clicks **Enable remote access**.
2. Nora creates or loads a stable, random local installation ID and securely stores runtime-specific secrets using the OS credential store or appropriately protected equivalent.
3. Nora requests provisioning from the Worker with a current Clerk token and the installation ID; the Worker independently verifies the Clerk identity.
4. Worker checks account ownership, per-user quota, idempotency and rate limits; creates a remotely managed Cloudflare Tunnel, configures an unguessable `*.remote.withnora.run` hostname and its DNS entry, and registers a minimal directory entry in Clerk private metadata.
5. Worker returns **only that tunnel's connector token** to the authenticated desktop client. Cloudflare account-wide management credentials stay in Worker secrets.
6. Nora launches/manages `cloudflared` and verifies readiness. UI displays **Remote access enabled** and an **Open on phone** shortcut. The window may then be closed; the runtime continues in the tray/menu bar.
7. On restart, Nora reuses its tunnel. If the tunnel was deleted or invalidated, the Worker can securely recreate it and update the directory, preserving the hostname when practical.

Provisioning should be idempotent and recover from partial failures. If tunnel creation succeeds but metadata update fails, reconcile or clean up the orphaned resource. Never expose tunnel tokens in logs, URLs or Clerk metadata.

### Connect on mobile
1. User visits `app.withnora.run`, signs in using the same Clerk account, and optionally adds the PWA to the Home Screen.
2. Client asks the Worker for the user's runtime directory (or uses an authorized Clerk metadata read mediated by the Worker).
3. The app displays runtime name, type and **actual reachability**, determined by contacting the runtime, not by treating registration as online presence.
4. User selects a runtime. The client opens an authenticated HTTPS/WebSocket connection to its tunnel hostname.
5. Runtime verifies the Clerk token, confirms the owner user ID and permissions, and serves data directly from the local runtime.
6. Subsequent chat and agent streaming do not pass through the Worker.

**Access decision (confirmed):** Every device signed into the **same owning Clerk account** can access the runtime immediately, without separate pairing, QR codes or desktop approval. A QR/open-on-phone link may be a convenience only, and must never grant access on its own. Retain task/tool approval prompts for sensitive actions as defined by Nora’s agent permissions. A different Clerk account must be rejected, even if it knows the runtime URL.

## 7. Hosted Worker responsibilities

Implement the smallest useful authenticated API; endpoint names are illustrative:

| Operation | Purpose |
|---|---|
| `POST /v1/runtimes/provision` | Create or recover a tunnel for an authenticated user's installation |
| `GET /v1/runtimes` | Read the user's minimal runtime directory from Clerk private metadata |
| `PATCH /v1/runtimes/:id` | Rename or update allowed metadata, subject to ownership checks |
| `DELETE /v1/runtimes/:id` | Unlink, revoke and remove an owned tunnel/DNS mapping |
| `POST /v1/runtimes/:id/rotate` | Replace connector credentials or recover a compromised tunnel |

No application traffic relay, agent execution, conversation history or general purpose events store. Status checks should go **directly from client to runtime** after discovery; don't poll Clerk or Worker continuously.

Suggested private metadata per runtime: opaque installation ID, friendly name, environment type (`desktop`/`server`), public hostname, Cloudflare tunnel ID and registered timestamp. Store no credentials, user files, conversation contents or provider keys. Keep the directory well below Clerk's 8 KB per-user metadata limit. Treat concurrent updates and Clerk API rate limits deliberately; never assume it is a transactional database.

This arrangement provides automatic cross-device discovery **but does store limited runtime references in Clerk**. This is an intentional trade-off to deliver account-based access with no extra pairing and no Nora-hosted database.

## 8. Security requirements

- **Worker:** Verify Clerk-issued tokens (issuer, signature, expiry, expected audience/authorized party as appropriate), derive user ID from verified claims, apply per-account tunnel quotas and abuse/rate limits. Never trust a caller-supplied owner ID or tunnel ID without checking ownership. Restrict Cloudflare API credentials to minimum privileges and keep all secrets in Worker secret bindings.
- **Runtime:** Authenticate **every** remote API request, not just tunnel creation. Validate Clerk tokens and verify they belong to the runtime owner. **Same-account access is automatic**, but enforce existing permissions for reading chats, approving tools, writing files, executing shell commands, etc. Provide explicit remote access disable/revocation and an immediate local kill switch.
- **Browser WebSockets:** Browser clients cannot depend on setting custom `Authorization` headers during the WebSocket handshake. Use a brief, single-use, runtime-issued WebSocket ticket obtained from an authenticated HTTPS endpoint, plus `Origin` validation. Avoid long-lived credentials in URLs.
- **Cross-origin access:** Allowlist only Nora's approved web origins for CORS; don't use wildcard credentialed CORS. Use bearer tokens rather than exposing a broadly scoped cookie across runtime subdomains.
- **Secrets:** Runtime tunnel connector token stays on the host and must not be returned to the phone. Store Clerk/Cloudflare secrets server-side or via OS secure storage as appropriate. Never log session tokens, pairing secrets, provider keys or prompt contents.
- **Provider access:** Agent tools execute under the host's permissions only. Remote control must not silently expand access or bypass approval requirements. Apply sensible rate/size limits and auditable action decisions locally.
- **Session revocation:** Plan for the interval between Clerk JWT expiry and session revocation. Use short-lived tokens and appropriate sensitive-action revalidation rather than assuming signature validation alone provides immediate revocation. Because there is no per-device approval gate, make account security, session revocation and host-side remote-disable controls clearly accessible.
- **Transport:** TLS to Cloudflare, tunnel to loopback-local origin. Test how Cloudflare handles origin traffic, WebSocket upgrades, disconnections and request-size limits. Do not claim that Cloudflare cannot see plaintext unless a separate end-to-end encryption layer is actually implemented.
- **Privacy:** Remote access off by default; clearly explain that enabling it makes a strongly authenticated Nora endpoint internet-reachable through Cloudflare.

## 9. Expo mobile app: web first, native later

Create a mobile-first Expo Router project that supports `web`, `ios` and `android` from one repository. Use React Native Web for shared application screens and theme tokens; allow `.web.tsx`, `.ios.tsx`, `.android.tsx` implementations for platform-specific auth, navigation and capabilities. Do not force desktop Electron components into native layouts.

### MVP screens

1. **Sign in:** Clerk-hosted or supported Expo web sign-in; clear error and session handling.
2. **My Runtimes:** Automatically list runtimes associated with the signed-in Clerk account, with online/offline state, last successful connection (client-observed), reconnect, rename/remove and helpful setup instructions. No mobile pairing flow.
3. **Conversations:** Per-runtime conversation list with titles, timestamps and visible execution state.
4. **Chat:** Send/receive messages, streamed outputs, tool/progress cards, images or attachments where supported, stop/cancel, retry and reconnect.
5. **Action approvals:** Explicit approval/deny controls with clear descriptions of the intended tool/action and a persistent record on the runtime.
6. **Tasks/activity:** View active jobs and results even after leaving and reopening the app, so long as the runtime remained running.
7. **Settings:** Account, default runtime, remote connection help, privacy/security, theme and sign out.

**Design principle:** Nora v3 is for many roles, not just developers. Lead with chat, tasks, results and integrations. Show coding-specific elements such as diffs, terminals or repositories only when relevant and feasible on a mobile screen.

### Web/PWA requirements

- Launch at `app.withnora.run` using a **static Expo web export** where practical; no application server is required for the UI.
- Responsive mobile-first layout with good support for iPhone Safari, Android Chrome and desktop browsers.
- Web app manifest, icons, home-screen installation guidance and minimal, update-safe service-worker caching.
- Browser reloads and background/foreground transitions must reconnect cleanly and restore the latest runtime state.
- Store only minimal client preferences and cached runtime metadata on device. Keep tokens under Clerk's supported storage/session mechanisms, not in custom plain-text client storage.
- Do not promise reliable background execution by the PWA: agents continue on their runtime, not in the browser.
- Notifications are **not required in the MVP**. Web Push and native push can be evaluated later, as they introduce device-token registration and delivery considerations.

### Native readiness

- Share route structure, business logic, contracts, API clients, state models and as much UI as practical with later native apps.
- Isolate platform-specific auth/session storage, deep links, notification handlers, file pickers, share sheets and biometric gates behind adapters.
- Plan native app links to the same Nora account and runtime directory; no server-side migration should be needed.
- Validate Clerk Expo integration on all target platforms early, not just after the web release.

## 10. Runtime API and streaming contract

Define stable, versioned contracts independently of the UI. Illustrative surface:

- `GET /v1/runtime/info` — capability set, runtime version, anonymous-safe availability metadata only if needed.
- `GET /v1/projects` and `GET /v1/conversations` — authorized listings scoped to the selected runtime.
- `GET /v1/conversations/:id` — snapshot and timeline.
- `POST /v1/conversations/:id/messages` — idempotent submission of a user message/agent instruction.
- `POST /v1/actions/:id/decision` — approve/deny with validation against current action state.
- `POST /v1/tasks/:id/cancel` — cancel a running task if supported.
- `POST /v1/realtime/ticket` and WebSocket `/v1/realtime` — authenticated event stream plus client commands.

Every command needs unique IDs and clear acknowledgement, error and retry semantics. WebSocket events must include monotonic sequence/cursor information or equivalent recovery mechanism. On reconnect, fetch current state and catch up missed events rather than silently dropping or duplicating actions. Define a capability handshake so older runtimes and newer mobile clients can degrade gracefully.

## 11. Offline, lifecycle and operational behavior

- **Host awake/online:** Remote control and streaming work.
- **Desktop window closed:** This hides Nora to the tray/menu bar; its local runtime, active tasks and remote connectivity **must continue** while the process and host are running.
- **Explicit Quit Nora:** Stop the runtime and tunnel connector gracefully; warn about tasks that will be interrupted. Remote access resumes when Nora is launched again, provided the user has not disabled it.
- **Host asleep/offline:** Client shows offline and may display its locally cached list, but cannot issue new executable commands until reconnection.
- **Mobile browser closed:** Agent continues on runtime; reopening fetches current task state and missed events.
- **Worker/Clerk temporarily unavailable:** Existing authenticated runtime connections may continue until they need token refresh; new discovery/provisioning may fail. Show appropriate status without losing local data.
- **Cloudflare connection drops:** Connector retries with backoff; app reconnects and resynchronizes.
- **User disables remote access:** Stop connector, revoke active remote permissions, remove public routing/tunnel when feasible and update Clerk directory.
- **Uninstall/orphan cleanup:** For MVP, cleanup on explicit disable/unlink plus manual admin cleanup is acceptable. Later add cautious scheduled detection/deletion of long-inactive Cloudflare tunnels and authenticated automatic recovery. Cloudflare tunnels do not expire automatically when offline.
- **Capacity:** Cloudflare currently includes 1,000 existing tunnels per account; inactive tunnels still count. Plan a future cleanup/capacity strategy, but do not design a full fleet-management platform for the initial small user base.

## 12. Phases and release scope

### Phase 1 — Remote desktop + web app (required for launch)
- Shared runtime API attached to desktop Nora.
- Desktop background/tray lifecycle: closing the window keeps agents and remote access running; explicit Quit stops the runtime; offer optional launch at login.
- Clerk-authenticated one-click provisioning through one Worker.
- Cloudflare Tunnel and stable hostname allocation.
- Minimal discovery through Clerk private metadata.
- Expo mobile web app with **automatic same-Clerk-account access and no extra pairing**, runtime list, conversations, chat, streams, task status, existing per-tool approvals and error/reconnection states.
- Secure runtime authentication, audit trail and remote-disable control.
- Test on real iPhone Safari/home-screen PWA and Android Chrome.

### Phase 2 — Bring-your-own-server runtime (**not required for Phase 1 launch**)
- Headless Nora runtime install with supported server OS/architecture.
- CLI/bootstrap authorization to link server to Clerk account.
- Same API, Worker flow, hostname and mobile UX; no hosted compute.
- Optional host-service management, health/restart policies and server-specific runtime labels.

### Phase 3 — Native apps and enhancements
- Expo iOS/Android binaries based on shared app code.
- Native push notifications, deep links, secure local storage, share sheet and platform integrations.
- Richer action policy, cross-device session management and optional account security enhancements; **do not introduce mandatory new-device pairing** without a new product decision.
- Automated inactive-tunnel cleanup/recovery, if/when justified by actual scale.

## 13. Acceptance criteria

- A non-technical user enables remote access from Nora Desktop without setting up Cloudflare, DNS, ports or VPN.
- The same user opens the mobile web app on a cellular connection, signs in with Clerk and finds/accesses their desktop automatically, without pairing codes or approval from the desktop.
- The mobile user can chat with an existing agent, see streamed progress, approve/deny a tool operation and reconnect after closing/reopening the app.
- Closing the Nora Desktop window hides it in the tray/menu bar; **an existing agent keeps running and remains controllable from mobile** while the host is awake and online.
- Explicitly selecting **Quit Nora** stops its background runtime/tunnel connector, with a warning for running tasks.
- The agent continues running on the host if the phone disconnects; it stops being reachable if the host is off/asleep.
- A different Clerk user cannot discover or access that runtime; malformed, expired or unauthorised credentials fail closed.
- The Worker cannot create unlimited tunnels per account and cannot delete another user's tunnel based solely on a supplied ID.
- No Nora database or hosted agent runtime is deployed. No conversation payloads, project files or provider credentials are sent to Clerk or the Worker.
- Disabling remote access revokes access and cleans up registered resources or marks them for reliable recovery.
- The same codebase builds a usable web experience and has a verified development path to Expo iOS/Android.
- Self-hosted cloud agent deployment is **not required to accept Phase 1**; it is planned for Phase 2 using the already-defined shared runtime interface.

## 14. Development guidance

Before implementing, inspect Nora's existing Electron/runtime boundaries and Clerk integration. Produce a concise architecture plan showing what can be reused, what must be extracted and which platform boundaries need adapters. Implement end-to-end one-runtime remote connection first, with robust auth and reconnection, before polishing multi-runtime UX or pursuing native release. Prefer simple, auditable components over introducing queues, databases, distributed presence services or extra providers unnecessarily.

## 15. Decision record (confirmed)

1. **Desktop lifecycle — CONFIRMED:** Closing the Nora Desktop window keeps the runtime alive in the tray/menu bar; only **Quit Nora** terminates it. Optional launch at login is supported.
2. **Identity and discovery — CONFIRMED:** One Clerk account owns each runtime; automatically discover its small runtime directory via Clerk private metadata.
3. **Mobile access — CONFIRMED:** Any device signed into the same owning Clerk account can connect **without a second pairing or desktop approval step**. Existing agent tool/action approvals still apply.
4. **Release sequencing — CONFIRMED:** Phase 1 delivers desktop remote access and Expo web/PWA; **self-hosted server runtime is Phase 2**; native apps follow in Phase 3.
5. **Mobile MVP scope — SPECIFIED:** Chat, active tasks, progress, approvals and conversation history. Full terminal/diff/file editing are deferred unless needed by a mobile workflow.

These decisions supersede any older provisional language elsewhere in the planning materials.

## Reference documentation

- Cloudflare Tunnel API: https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/
- Cloudflare Tunnels for Platforms limits/pricing: https://developers.cloudflare.com/tunnel/features/tunnels-for-platforms/
- Clerk user metadata: https://clerk.com/docs/guides/users/extending
- Clerk token verification: https://clerk.com/docs/reference/backend/verify-token
- Clerk Expo web support: https://clerk.com/docs/guides/development/web-support/overview
- Expo static web exports: https://docs.expo.dev/router/web/static-rendering/
- Expo PWA guidance: https://docs.expo.dev/guides/progressive-web-apps/
- T3 Connect architecture (reference only): https://github.com/pingdotgg/t3code/blob/main/docs/internals/t3-connect.md
