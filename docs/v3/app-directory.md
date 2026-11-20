# Shared app directory

The website serves a curated directory at `/apps`. Its reviewed exports live at
`/apps/files/<id>.nora-app.json`. Directory ids use lowercase letters, digits and
hyphen-separated words (at most 100 characters).

Each listing offers a download and an `nora://apps/install?id=<id>` link. The
packaged desktop registers `nora` on macOS, Windows and Linux. It retains the
latest request through startup, onboarding and renderer reloads, and opens a
review dialog after sign-in. Nothing is installed until the user chooses a
workspace and confirms. Nora downloads only from its own website, rejects
redirects, limits app files to 2 MiB and times out after 15 seconds.

Exports describe the servers required by sources and actions. Optional `auth`
hints contain either `{ "kind": "oauth", "customClient": false }`,
`{ "kind": "oauth", "customClient": true }`, or
`{ "kind": "header", "name": "Authorization" }`. Secrets and OAuth client
credentials are never included. Older files without hints remain importable.

Imports reuse connectors available in the destination workspace. Missing
standard OAuth connectors are added with access limited to that workspace;
multiple dependencies pointing to one server share the resulting connector.
Disabled connectors or connectors restricted to another workspace must be
explicitly enabled or granted access instead of being duplicated. API keys and
private OAuth clients require setup through the connector gallery first.
New connectors are removed if saving the app fails. Installed apps offer sign-in
for missing accounts and retry sources when those connectors become connected.

## Adding a listing

In `~/dev/withnora.run`, add the exported JSON under `public/apps/files/` and add
its id, summary, category and author in `src/content/app-directory.ts`. Listing
names and connector requirements are derived from the downloadable file.
Validate exports with Nora's `appFileSchema` and `validateAppSpec`, and check
read and write behavior with the provider before publishing. Community
submissions start as issues and are reviewed before listing.

The initial directory is intentionally unlisted: no navigation or sitemap links,
and `/apps` has `noindex, nofollow` metadata. It is still publicly accessible by
URL. The desktop Browse shared apps entry targets that URL when this desktop
release ships.

On macOS, `npm run dev` prepares and registers an isolated `out/dev/Nora Development.app` bundle with the `nora` scheme before launching. Its entry loads the checkout’s compiled main process, so links can also reopen that development build. Stock Electron and installed Nora are not modified. Restart `npm run dev` after changing development launcher scripts.
