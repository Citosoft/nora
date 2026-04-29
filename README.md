```
 ███╗   ██╗  ██████╗  ██████╗   █████╗
 ██╔██╗ ██║ ██╔═══██╗ ██╔══██╗ ██╔══██╗
 ██║╚██╗██║ ██║   ██║ ██████╔╝ ███████║
 ██║ ╚████║ ██║   ██║ ██╔══██╗ ██╔══██║
 ██║  ╚███║ ╚██████╔╝ ██║  ██║ ██║  ██║
 ╚═╝   ╚══╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝
```

**Nora** is a desktop app for orchestrating coding agents on your machine. It gives you PTY-backed terminals, git-aware workspaces with isolated worktrees per session, and integrations for GitHub, GitLab, and Vercel so you can stay in one surface while agents work in parallel.

Built with **Electron**, **React**, **TypeScript**, and **Tailwind CSS**.

[![CI](https://github.com/Citosoft/nora/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Citosoft/nora/actions/workflows/ci.yml)
[![Release](https://github.com/Citosoft/nora/actions/workflows/release.yml/badge.svg)](https://github.com/Citosoft/nora/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Citosoft/nora?sort=semver&logo=github)](https://github.com/Citosoft/nora/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Citosoft/nora/blob/main/package.json)

## Features

- Workspace picker and per-session git worktrees under `.nora/worktrees/`
- Detection and install flows for common agent CLIs (`codex`, `claude`, `gemini`, `cursor-agent`, and more)
- Live terminal streams and stdin for agent sessions
- Git status and diff views scoped to the focused worktree
- OAuth-friendly provider setup (see below)

## Run from source

```bash
npm install
npm start
```

## OAuth / environment

Copy `.env.example` to `.env` and set provider client IDs you want to enable:

```bash
NORA_GITHUB_CLIENT_ID=...
NORA_GITLAB_CLIENT_ID=...
NORA_VERCEL_CLIENT_ID=...
```

Nora uses desktop OAuth patterns and does not ship client secrets in builds. GitHub and GitLab use the OAuth Device Flow; Vercel uses a personal access token.

Optional host overrides for enterprise or self-hosted instances:

```bash
NORA_GITHUB_OAUTH_HOST=github.example.com
NORA_GITLAB_OAUTH_HOST=gitlab.example.com
```

## Release builds (maintainers)

Pushing a version tag matching `v*` runs the release workflows in [`.github/workflows/`](./.github/workflows/), which produce Windows, Linux, and macOS assets and publish a GitHub Release in this repository. Required secrets and steps live in those workflow files.

## Telemetry

Optional **PostHog** analytics: set `NORA_POSTHOG_API_KEY` or `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` in `.env`, and optionally `NORA_POSTHOG_HOST` / `VITE_PUBLIC_POSTHOG_HOST` for self-hosted PostHog. Omit these to disable telemetry.

## Contributing

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for runtime boundaries (main / renderer / shared) and [`AGENTS.md`](./AGENTS.md) for repository conventions.

## License

MIT (see `package.json`).
