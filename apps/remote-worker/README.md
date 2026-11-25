# Nora remote control-plane Worker

Cloudflare Worker served at `https://remote-api.withnora.run`. It is the small authenticated control plane from
`docs/v3/Nora_v3_mobile_remote_spec_v1_1.md` §7: it provisions one remotely-managed Cloudflare Tunnel per Nora
installation, maps an unguessable hostname to it, and keeps a minimal runtime directory in the user's Clerk **private**
metadata. It never relays application traffic and stores no credentials, conversations or user content. It also
sends phone push notifications on the desktop's behalf (see [Push notifications](#push-notifications)).

> [!WARNING]
> **TLS for `*.remote.withnora.run` is NOT covered by Cloudflare Universal SSL.**
> Universal SSL only covers the apex and first-level subdomains (`withnora.run`, `*.withnora.run`). Runtime hostnames
> such as `<label>.remote.withnora.run` are a **second-level wildcard**, so browsers will get a TLS error unless you
> either:
> - buy **Advanced Certificate Manager** and issue an advanced certificate for `*.remote.withnora.run`
>   (or enable **Total TLS**, which requires ACM), **or**
> - set `RUNTIME_HOSTNAME_SUFFIX` to the zone apex (`withnora.run`) so runtime hostnames become first-level labels
>   (`<label>.withnora.run`). Labels are 32 base32 characters, so they will not collide with real subdomains, but they
>   share the apex's cookie scope — keep the web app cookie-free for auth (it uses bearer tokens).
>
> Changing the suffix changes every runtime hostname; existing runtimes pick up the new hostname on their next
> provision call, and the old DNS records must be deleted manually.

## API

All endpoints take and return JSON validated against `shared/remote-access/directory.ts`. Every request needs
`Authorization: Bearer <Clerk session JWT>`; the user ID comes only from the verified `sub` claim. `:id` is the
installation ID.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/runtimes/provision` | Create or repair the caller's tunnel, ingress, DNS and directory entry; returns `{ runtime, connectorToken }` |
| `GET` | `/v1/runtimes` | `{ runtimes }` for the caller |
| `PATCH` | `/v1/runtimes/:id` | Rename (`{ name }`) |
| `DELETE` | `/v1/runtimes/:id` | Drop connections, delete tunnel + DNS record, remove the entry |
| `POST` | `/v1/runtimes/:id/rotate` | New tunnel secret, drop connections, return a new `connectorToken` |
| `POST` | `/v1/push/devices` | Phone registers or refreshes its Expo push token (`{ deviceId, token, platform }`); returns `{ device }` without the token |
| `DELETE` | `/v1/push/devices/:deviceId` | Phone stops receiving notifications; 404 if the device is not registered |
| `POST` | `/v1/push/send` | Desktop sends `{ installationId, notifications }` to every phone on the account; returns `{ delivered }` |

Push bodies are validated against `shared/remote-access/push.ts`.

Errors use `{ error: { code, message } }`: `invalid` 400 (405 for a wrong method, with `Allow`), `unauthenticated`
401, `forbidden` 403 (disallowed browser `Origin`), `not-found` 404 (including another account's runtime ID),
`quota`/`conflict` 409, `rate-limited` 429, `upstream` 502 (Clerk/Cloudflare failure), `internal` 500 (including
misconfiguration). Messages are generic; upstream details are never returned or logged.

## Develop and test

Requires Node 20+ (tested with Node 24). Install inside this package only; nothing here depends on the repository
root's `node_modules`.

```sh
cd apps/remote-worker
npm install
npm run typecheck      # tsc --noEmit
npm test               # vitest run (fakes only, no network)
npm run dev            # wrangler dev (local workerd)
```

The shared contract lives in `../../shared`. It is wired three ways, all pinned to this package's own `zod`:
`tsconfig.json` `paths` (typecheck, and esbuild honours it for `@shared/*`), `wrangler.jsonc` `alias` (bundle) and
`vitest.config.ts` `resolve.alias` (tests). `test/moduleResolution.test.ts` fails if the shared files ever bind to a
different zod copy.

For `wrangler dev`, put local secrets in `apps/remote-worker/.dev.vars` (git-ignored), for example:

```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=<32 hex>
CLOUDFLARE_ZONE_ID=<32 hex>
HOSTNAME_SECRET=<at least 32 random characters>
EXPO_ACCESS_TOKEN=<Expo access token; optional, needed only to send pushes>
ALLOWED_ORIGINS=http://localhost:8081
```

`wrangler dev` with real credentials creates real tunnels and DNS records. Use a separate test zone/account.

## Configuration

The checked-in deployment configuration targets the Nora Cloudflare account and the Clerk **production** instance
(`ins_3MFhhZGe1LmR41OjGHvNlQltG2K`, Frontend API `clerk.withnora.run`), the same instance production desktop and web
builds sign in with. `.dev.vars` keeps the development instance (`sk_test_…`/`pk_test_…`) for `wrangler dev`. Its runtime
hostname suffix is `withnora.run`, so random first-level hostnames use Universal SSL without an additional wildcard
certificate; the [runtime edge rules](#runtime-edge-rules) are what keep those hostnames from sharing cookies or
rendering content on the app's domain. Keep `HOSTNAME_SECRET` stable across deployments.

### Runtime edge rules

Runtime hostnames tunnel to machines their users control but share `withnora.run` with the web app and Clerk. Two zone
rules confine them to API traffic, and **must be in place before production users can provision runtimes**:

- **WAF custom rule** `nora_runtime_block_rendering` blocks browser requests whose `Sec-Fetch-Dest` asks to display or
  execute content (`document`, frames, workers, scripts, …). The app only uses `fetch` and WebSocket; native clients
  send no Fetch Metadata and are unaffected.
- **Response header rule** `nora_runtime_sandbox_headers` removes `Set-Cookie` and sends
  `Content-Security-Policy: sandbox; default-src 'none'; frame-ancestors 'none'` plus `X-Content-Type-Options: nosniff`,
  covering browsers without Fetch Metadata.

Runtime hosts are matched as `<32 chars>.<RUNTIME_HOSTNAME_SUFFIX>` without regex, so the rules work on the Free plan.
Apply or re-apply them (idempotent; other zone rules are preserved) with a short-lived token scoped to the zone with
**Zone WAF: Edit** and **Transform Rules: Edit**, which the script reads without echo and never saves:

```sh
node scripts/apply-runtime-edge-rules.mjs            # --dry-run prints the rules; CLOUDFLARE_RULES_TOKEN skips the prompt
```


Secrets (`wrangler secret put <NAME>`):

| Name | Notes |
|---|---|
| `CLERK_SECRET_KEY` | Clerk Backend API key (`sk_live_…`). Used for JWKS lookup and private-metadata reads/writes. |
| `CLOUDFLARE_API_TOKEN` | Scoped API token, permissions below. |
| `HOSTNAME_SECRET` | ≥ 32 random characters (`openssl rand -base64 48`). HMAC key for hostname labels. **Changing it changes every runtime hostname**; treat it as permanent. |

Vars (`wrangler.jsonc` → `vars`; the `REPLACE_WITH_*` placeholders intentionally fail validation so an unconfigured
deploy answers 500 instead of acting on the wrong account):

| Name | Default | Notes |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | — | Used to derive the expected token issuer (`iss`). |
| `CLOUDFLARE_ACCOUNT_ID` | — | 32 hex characters. |
| `CLOUDFLARE_ZONE_ID` | — | Zone ID of `withnora.run`. |
| `RUNTIME_HOSTNAME_SUFFIX` | `remote.withnora.run` | See the TLS warning above. |
| `MAX_RUNTIMES_PER_USER` | `3` | 1–10 (keeps the Clerk directory far below the 8 KB metadata limit). |
| `ALLOWED_ORIGINS` | `https://app.withnora.run` | Comma-separated exact origins. Used for CORS **and** as the allowed `azp` values. No wildcards. |

### Cloudflare API token

Create a **custom** API token (not a Global API Key) with exactly:

- **Account → Cloudflare Tunnel → Edit** (scoped to the Nora account)
- **Zone → DNS → Edit**, with *Zone Resources* = *Include → Specific zone → `withnora.run`*

Nothing else. Optionally add client IP filtering if your Workers egress is predictable (it usually is not). Give the
production token no expiry, or calendar its rotation: when it lapses, provisioning answers `upstream` 502.

### Clerk

- `CLERK_SECRET_KEY` from the production instance; `CLERK_PUBLISHABLE_KEY` from the same instance.
- Session tokens are verified with `@clerk/backend` `verifyToken`: signature via the instance JWKS, `exp`/`nbf`/`iat`,
  and `iss` (derived from the publishable key).
- **Authorized parties:** `azp` is enforced against `ALLOWED_ORIGINS` **only when the token carries an `azp` claim**.
  Desktop tokens obtained without a browser origin may have none. Note that `verifyToken`'s own
  `authorizedParties` option in `@clerk/backend` 3.x rejects tokens *without* `azp`, so the Worker does not pass it and
  checks `azp` itself. If the desktop app's tokens do carry an `azp` (for example an Electron renderer origin), add
  that origin to `ALLOWED_ORIGINS`.
- The production instance's allowed origins are `nora-account://renderer` (desktop) and `https://app.withnora.run`
  (web). Check them with `clerk api /instance --instance prod` (Clerk CLI) after any instance change.
- Production keys only work on `withnora.run` and its subdomains: the Expo web app on `localhost` keeps the
  development instance through `apps/mobile/.env.local`, while `apps/mobile/.env.production.local` supplies `pk_live_…`
  to `npm run export:web`. Users and their runtime directories do not carry over between instances.
- Directory data is stored at `privateMetadata.noraRuntimes[installationId]` with Clerk's merge-patch
  `updateUserMetadata` (deep merge; `null` deletes a key), so concurrent writes to different installations do not
  overwrite each other. Clerk is not transactional; quota is enforced by re-reading after a new entry is written and
  rolling back the caller's own entry if it landed over the limit.

### Push notifications

The phone never hears from the Worker directly about runtimes; it talks to the desktop through its tunnel. So the
desktop starts every push: when a thread finishes or something needs the user, it calls `POST /v1/push/send` with the
same Clerk bearer token it uses for provisioning. The Worker then:

- refuses any request carrying an `Origin` header (`forbidden`), so browsers, including the web app, cannot send;
- requires `installationId` to be one of the caller's own runtimes (`not-found` otherwise);
- sends one Expo message per phone per notification (`sound: "default"`, `priority: "high"`, `channelId: "default"`,
  `data` matching `pushPayloadDataSchema`) to `https://exp.host/--/api/v2/push/send`, at most 100 per request,
  authenticated with the `EXPO_ACCESS_TOKEN` secret;
- removes phones whose ticket comes back `DeviceNotRegistered`.

Phones are kept in Clerk private metadata under `noraPushDevices` (`{ [deviceId]: { deviceId, platform,
registeredAt, token } }`), next to `noraRuntimes`, at most `PUSH_LIMITS.maxDevicesPerUser` (10) per account
(`quota` beyond that). Registering a token that another device ID holds moves it to the new device, so an app
reinstall does not leave a duplicate. Push tokens are never returned or logged, and Expo's error payloads (which can
echo tokens) are dropped. Only Expo push tickets are checked; delivery receipts are not polled.

### Rate limiting

Three [Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) bindings
are declared in `wrangler.jsonc`, all keyed by the verified Clerk user ID:

- `GENERAL_RATE_LIMITER` — every authenticated request (60/min).
- `PROVISION_RATE_LIMITER` — additionally applied to provision and rotate (6/min).
- `PUSH_RATE_LIMITER` — additionally applied to the `/v1/push/*` routes (30/min).

`namespace_id` values must be unique positive integers within the Cloudflare account; change `4101`/`4102`/`4103`
if they collide. The limits are per Cloudflare location and eventually consistent, so they are abuse protection, not exact
counters. Unauthenticated requests are rejected before rate limiting and are not counted.

## Deploy

```sh
cd apps/remote-worker
npx wrangler login
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put HOSTNAME_SECRET
npx wrangler secret put EXPO_ACCESS_TOKEN   # expo.dev → Account settings → Access tokens
# edit wrangler.jsonc vars (publishable key, account ID, zone ID)
npm run deploy
```

`routes` attaches the Worker to the custom domain `remote-api.withnora.run` (Wrangler creates its DNS record and
certificate; the zone must be on the same account). `workers_dev` and preview URLs are disabled.

Check a build without deploying: `npx wrangler deploy --dry-run --outdir dist/dry-run`.

## Operations

- **Tunnel capacity:** a Cloudflare account allows **1,000 tunnels**. Each runtime uses one. Failed provisions clean
  up best-effort, and leftover tunnels are named deterministically (`nora-<clerkUserId>-<installationId>`) so the next
  provision for that installation reuses them. A daily Cron Trigger at **03:17 UTC** cleans up abandoned tunnels.
- **Automatic cleanup:** disconnected orphan tunnels have a **7-day grace period**; registered installations expire
  after **90 days continuously offline**. Cloudflare's connector status and disconnection timestamp act as the
  heartbeat, so a connected computer is preserved even if nobody opens it from a phone. Never-connected tunnels
  age from creation. Missing activity timestamps, malformed directory entries, ambiguous ownership and dependency
  failures fail closed. Each candidate is rechecked before deletion; cleanup never force-drops connections.
  DNS cleanup only removes Nora runtime CNAMEs still pointing to the expired tunnel, and directory cleanup checks
  the tunnel ID again before removing an entry. Soft-deleted tunnels remain in the inventory so partial DNS or
  directory cleanup retries on the next run. The Worker logs aggregate scanned/removed/failed counts and marks
  runs with failures as failed. Returning desktops with registrations at least 90 days old provision before using
  their cached connector token, recreating expired resources at their stable hostname. This recovery behavior
  requires the desktop version containing this change; older versions can use Relay's Retry action.
  Deploy with `npm run deploy` to install the handler and cron together.
- **Push secret:** `EXPO_ACCESS_TOKEN` is optional. Without it the Worker runs normally and phones can still register,
  but `POST /v1/push/send` answers `internal` ("Phone notifications are not configured.") until the secret is set.
- **Manual cleanup:** list tunnels with
  `GET /accounts/{account_id}/cfd_tunnel?is_deleted=false&include_prefix=nora-`, compare against users' Clerk
  `privateMetadata.noraRuntimes`, then for each orphan: `DELETE …/cfd_tunnel/{id}/connections`,
  `DELETE …/cfd_tunnel/{id}`, and delete its `CNAME` in the zone (`<label>.<suffix>` → `<id>.cfargotunnel.com`).
- **Rotation:** `POST /v1/runtimes/:id/rotate` replaces the tunnel secret and drops connections; the desktop must
  restart `cloudflared` with the returned token. If the tunnel no longer exists it answers 409 `conflict` and the
  client should call provision instead.
- **Logging:** the Worker does not log request bodies, tokens or secrets. Workers observability records request
  metadata only.
