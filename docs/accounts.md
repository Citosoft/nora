# Nora accounts

Nora uses the official Clerk Electron SDK for optional account sign-in. The sidebar avatar opens sign-in or profile management directly in a modal over the workspace. Local work does not require an account.

## Settings sync

After signing in, open the avatar menu and turn on **Sync settings** on each device. The first device saves its current portable settings; a new device with sync enabled restores existing cloud settings. **Sync now** checks immediately. Local edits are automatically uploaded after a short delay, and cloud settings are checked every minute while Nora is running.

Synced settings include appearance (theme, accent, UI and terminal fonts, terminal theme and display name), split-view defaults, session-tab visibility, completion notifications, browser auto-opening, editor contrast, the default work role, default provider/model and subagent model, follow-up behavior, title generation, settling and compaction preferences, and tool-output budgeting. Provider model choices resolve against the receiving device's installed providers; unavailable providers keep their local default.

Credentials, API keys, installed tools, hardware acceleration, IDE selection, terminal commands/presets, workspace paths and roles, open tabs, window sizes, threads, bots, and memories remain local. Enabling sync does not upload these values. Disabling sync stops requests on this device and leaves the account's cloud preferences intact.

Changes are tracked per setting with deterministic revision ordering. Separate immutable revision keys allow Clerk's metadata merge API to retain concurrent edits without replacing other settings. The newest revision wins for the same setting; observed older revisions are pruned on subsequent writes. A persisted journal at `~/.nora/state/settings-sync.json` keeps unsent changes for offline retries and separates accounts. Signing out or switching accounts cancels active sync work.

The main process uses Clerk's native Frontend API with the encrypted client token already managed by the Electron SDK. No Clerk secret key or custom backend is required. Only allowlisted, validated settings go into `unsafeMetadata.noraSettingsSync`; unrelated metadata is preserved. Cloud format 2 stores immutable revisions. Earlier format-1 preferences migrate on the next sync without resetting values or revision timestamps. Sync refuses unknown future versions, invalid values and writes that would exceed a conservative metadata size budget. Failed sync never deletes local settings.

## Development setup

1. Create a Clerk application and enable the Native API under **Configure → Developers → Native applications**.
2. Add `NORA_CLERK_PUBLISHABLE_KEY=pk_test_…` to the ignored root `.env`. `VITE_CLERK_PUBLISHABLE_KEY` is also accepted by the build scripts. Never add a Clerk secret key to the app or its build environment.
3. Add `nora-account://renderer/` to the native SSO redirect allowlist.
4. Allow the renderer origin `nora-account://renderer` on the Clerk instance. Run `node scripts/configure-clerk.mjs ins_…`, using the instance ID shown in Clerk. The script prompts for a secret key without echoing or saving it, verifies the instance, preserves existing origins and adds only Nora's origin. It verifies the saved configuration before reporting success. This is a one-time administration step; the app never needs the secret key.
5. Run `npm run dev`. Email verification codes and passwords work in development. Social sign-in on macOS and Linux requires a packaged app so the operating system can deliver its callback.

The build writes only the public key to `dist/runtime/account-config.json`. Builds with no key retain local functionality and explain that account sign-in is unavailable.

## Desktop boundaries

The workspace runs at the stable `nora-account://renderer/` origin required by Clerk's Electron integration. Existing file-origin local preferences are copied once without overwriting values already saved at the new origin. Migration runs in a temporary invisible window without a preload; the workspace bundle does not run during migration. Original preferences remain intact if migration fails.

Only Nora's trusted main frame may configure or publish account state. Navigation is blocked, external HTTPS links open in the system browser, and the protocol serves an explicit allowlist of built renderer assets. Account UI inherits Nora's active theme and fonts. The main process owns encrypted session storage through Clerk's `safeStorage` adapter, with plaintext fallback disabled. If OS encryption is unavailable, the session stays in memory and the user may need to sign in after restarting. Quitting Nora cleans up the Clerk bridge.

## Production

Use a Clerk production instance and public key with the same origin and redirect allowlists. Package and sign Nora, including the `nora-account` protocol registration for macOS, Windows and Linux. Keep email verification codes enabled: email-link sign-in is not supported by Clerk's Electron SDK. Clerk's Electron SDK is currently beta and is pinned to an exact version.

See [Clerk's Electron SDK](https://clerk.com/docs/reference/electron/overview) and [desktop OAuth configuration](https://clerk.com/docs/guides/configure/auth-strategies/oauth-deep-links).
