# Nora mobile and web app (`apps/mobile`)

The Nora client for phones and browsers: sign in with the same Clerk account as Nora Desktop, see your linked computers
("runtimes"), chat with agents, follow streamed progress, approve actions and stop tasks. It is one Expo Router codebase
that ships first as a static web app / installable PWA at `https://app.withnora.run`, with iOS and Android builds from the
same code later. Product spec: `docs/v3/Nora_v3_mobile_remote_spec_v1_1.md`.

The app never talks to Nora servers during a conversation. It asks the control-plane Worker (`remote-api.withnora.run`)
only for the list of computers linked to the account, then connects **directly** to each computer's own tunnel hostname
(`https://<id>.withnora.run` in the testing configuration, `wss://…/v1/realtime`) with a fresh Clerk session token on every request.

## Requirements

- Node 24 (`~/.nvm/versions/node/v24.18.0/bin`), npm 11.
- Only this folder needs `npm install`. The shared contracts in the repository's `shared/` folder are compiled in from
  source (see "Shared contracts").

## Configuration

Copy `.env.example` to `.env` (git-ignored):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key of the **same Clerk instance as Nora Desktop**. If unset, the app shows a "Nora isn't set up yet" screen instead of crashing, and `expo export` still succeeds. |
| `EXPO_PUBLIC_REMOTE_API_URL` | Control-plane Worker base URL. Defaults to `https://remote-api.withnora.run`. |

`EXPO_PUBLIC_*` values are inlined at build time; rebuild after changing them.

### Clerk setup

1. Use the Clerk application Nora Desktop already signs in with (runtimes only accept tokens from their owner's account).
2. In the Clerk dashboard, add `https://app.withnora.run` (and `http://localhost:8081` for development) to the allowed
   origins / authorized parties for that instance, and enable the sign-in methods you want on the web.
3. For native builds, enable the Native API and register the app's bundle ID / package (`run.withnora.app`) so the hosted
   sign-in (Account Portal) can redirect back; the `@clerk/expo` config plugin registers the callback scheme.
4. On the web the app loads Clerk's browser SDK from the instance's Frontend API domain; content blockers that block it
   show a "Can't reach the sign-in service" message after 15 seconds.

## Development

```sh
npm install
npx expo start --web        # web on http://localhost:8081
npx expo start              # Expo dev server for a development build on iOS/Android
npm run typecheck           # tsc --noEmit (app, tests and the shared contracts it imports)
npm test                    # vitest: non-UI logic only
```

## Web export and deploy

The Cloudflare Workers Static Assets configuration is in `wrangler.jsonc`, attached to `app.withnora.run`.
Run `npm run deploy:web` to export the configured app and publish it. Wrangler login must have access to the
configured Nora account. Keep the public Clerk key in `.env.local`; never put a Clerk secret in this package.
The testing Worker issues random first-level runtime hostnames under `withnora.run` to use Universal SSL.


```sh
npm run export:web          # expo export --platform web, then stamps dist/sw.js
```

`dist/` is a static single-page app (`web.output: "single"`): every route is served by `index.html`. Deploy it to any
static host, for example Cloudflare Pages (`dist` as the output directory; `public/_headers` is copied into `dist/`):

- **SPA fallback**: unknown paths must serve `/index.html` (Cloudflare Pages does this automatically when there is no
  `404.html`; elsewhere add a rewrite).
- **Service worker**: serve `/sw.js` (and `/index.html`) with `Cache-Control: no-cache` so new deploys are picked up;
  hashed files under `/_expo/static/` can be cached forever.
- HTTPS is required (service worker, Web Crypto IDs, Clerk).

Why `single` and not `static` output: every signed-in route depends on runtime IDs and data that only exist after sign-in
in the browser, so there is nothing useful to pre-render, and Clerk's browser SDK is client-only. A single SPA shell keeps
the build independent of Clerk configuration and avoids rendering Clerk on the server.

### PWA pieces

- `public/manifest.webmanifest` and `public/icons/*` (generated from `renderer/icon.png` with macOS `sips`), linked from
  `public/index.html` (the HTML template Expo uses for single-page output).
- `public/sw.js`: caches only the versioned app shell (HTML entry, manifest, icons, hashed JS/CSS). Navigation is network
  first with the cached shell as an offline fallback; it never touches cross-origin requests, so runtime, Worker and Clerk
  traffic is never cached. `scripts/stampServiceWorker.mjs` writes a content hash build ID and the shell list after
  export; on activation older `nora-shell-*` caches are deleted and the new worker takes over immediately.
  It is registered only on web in production builds.
- Settings → "Add to home screen" and a dismissible hint on the home screen explain installation per browser.

## Native (iOS/Android)

`app.json` carries the native config (bundle ID / package `run.withnora.app`, scheme `nora`, splash, icons). Generate
native projects with `npx expo prebuild` (continuous native generation; `ios/` and `android/` are git-ignored) and build
with `npx expo run:ios|android` or EAS (`npx eas-cli build`). Native-specific pieces live behind platform files:

| Adapter | Native (`*.ts`) | Web (`*.web.ts`) |
|---|---|---|
| `platform/clerkTokenCache` | Clerk's SecureStore token cache | Clerk's own web session |
| `platform/keyValueStorage` | AsyncStorage | `localStorage` (failures ignored) |
| `platform/randomId` | `expo-crypto` UUID | Web Crypto UUID |
| `platform/openExternalUrl` | in-app browser (`expo-web-browser`) | new tab, `noopener` |
| `platform/foregroundSignals` | `AppState` → active | `visibilitychange` + `online` |
| `platform/serviceWorker`, `installContext`, `reloadApp` | no-ops | PWA behaviour |
| `components/auth/SignInPanel` | Clerk hosted sign-in (`useHostedAuth`) | Clerk `<SignIn routing="hash">` |

Preferences use AsyncStorage rather than SecureStore on native because nothing stored there is secret (preferences,
computer names/hostnames, unsent commands) and the cached runtime list can exceed SecureStore's value-size guidance.
Tokens stay in Clerk's storage only.

## Shared contracts

The app imports the repository's `shared/` contracts directly (`@shared/remote-access/*`, `@shared/conversations/*`,
`@shared/types/*`), including the desktop's own conversation reducer (`applyConversationEvent`). Resolution is configured
in three places that must stay in step:

- `tsconfig.json` `paths`: `@shared/*` → `../../shared/*`, `zod` → this package's `node_modules/zod`.
- `metro.config.js`: watches `../../shared`, resolves `@shared/*` and `@/*`, and resolves every bare import made from a
  shared file (only `zod` today) as if imported from this package, so the bundle uses `apps/mobile/node_modules/zod`.
- `vitest.config.mts`: the same aliases for tests.

## Code layout

```
src/app/            Expo Router routes (thin: read params, render a screen)
src/components/     UI by surface: screens/, chat/, approvals/, conversations/, runtimes/, settings/, tasks/, auth/,
                    shell/, markdown/, common/ (primitives)
src/api/            HTTP: requestJson (timeouts, bearer, zod), directory client (Worker), runtime client (/v1)
src/commands/       Pending-command store and executor (idempotent retries with saved IDs)
src/realtime/       Realtime connection (tickets, subscribe, auth refresh, backoff, catch-up, dedupe)
src/session/        Per-runtime session (capability handshake + realtime fan-out), registry, service composition
src/state/          Pure helpers: view wiring, execution state, activity, compatibility, chat and question state
src/reachability/   Direct anonymous probe of a runtime
src/preferences/    Device preferences (zod-validated)
src/platform/       Platform adapters (*.ts native, *.web.ts web)
src/context/, src/hooks/, src/theme/, src/types/, src/markdown/, src/navigation/, src/config/
tests/unit/         vitest tests for the non-UI logic
```

## Behaviour notes

- **Reachability** is decided by calling the computer itself (`GET /v1/runtime/info` with a fresh session token, 5 s timeout);
  being listed by the Worker never counts as online. "Last connected" is what this device observed, stored locally.
- **Realtime**: ticket → `wss://…/v1/realtime?ticket=` → `subscribe {after}`; socket auth is refreshed with a new ticket
  before `authExpiresAt`; a 25 s ping with a 60 s silence timeout detects dead sockets; reconnects use capped exponential
  backoff with jitter (1 s → 30 s) and resume from the last applied cursor; `resync`, or a `ready` cursor ahead of ours,
  triggers HTTP catch-up over `GET /v1/events` pages; events at or below the last cursor are dropped. Close `4401` gets a
  new ticket immediately; `4403` stops and shows an error. Returning to the foreground / coming back online reconnects.
  If the runtime no longer has the needed events (`cursor-unavailable`), screens reload from fresh snapshots.
- **Commands** (create, send, decide, cancel) get their IDs generated and saved on the device *before* sending. A lost
  reply leaves the command saved with a Retry button that resends the same IDs (the runtime answers with the original
  receipt). Definitive refusals (4xx other than 401/408/429) discard it. A send whose run shows up in the conversation is
  cleared automatically.
- **Capabilities**: `apiVersion` mismatches disable the runtime with an explanation; each missing capability disables its
  control with a reason (e.g. no `realtime` → refresh on demand and poll while a task runs).

## Known limitations

- Not verified against a real Clerk instance, a real runtime/Worker, or real iPhone/Android devices.
- Attachments and images are not supported (the runtime API has none yet); diffs show changed paths only.
- Connector sign-in requests must be completed on the computer.
- No push notifications (out of MVP scope); the PWA does not run agents in the background — they run on the computer.
- Native sign-in uses Clerk's hosted Account Portal; a native-component sign-in flow is not implemented.
- Bot avatars are a simplified native rendering (palette, rounded shape, eyes), not the desktop SVG artwork.
