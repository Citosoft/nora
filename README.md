```
 ███╗   ██╗  ██████╗  ██████╗   █████╗
 ██╔██╗ ██║ ██╔═══██╗ ██╔══██╗ ██╔══██╗
 ██║╚██╗██║ ██║   ██║ ██████╔╝ ███████║
 ██║ ╚████║ ██║   ██║ ██╔══██╗ ██╔══██║
 ██║  ╚███║ ╚██████╔╝ ██║  ██║ ██║  ██║
 ╚═╝   ╚══╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝
```

# Nora

Nora is a desktop workspace for running and coordinating coding agents locally with isolated git worktrees, live terminals, and integrated provider workflows.

Built with Electron, React, TypeScript, and Tailwind CSS.

Documentation: [withnora.run/docs](https://withnora.run/docs)

[![CI](https://github.com/Citosoft/nora/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Citosoft/nora/actions/workflows/ci.yml)
[![Release](https://github.com/Citosoft/nora/actions/workflows/release.yml/badge.svg)](https://github.com/Citosoft/nora/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Citosoft/nora?sort=semver&logo=github)](https://github.com/Citosoft/nora/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Citosoft/nora/blob/main/package.json)

## Functionality

Nora provides a full local multi-agent workflow.

### Shell And Navigation

- App chrome with title bar, status bar, auto-update banners, and platform-specific startup messaging
- Workspace quick search, switcher flows, and workspace selection screens
- Workspace sidebar with session grouping, workspace actions, all-agent views, and remote mount visibility
- Split-view workspace layout with adjustable panels and shell-level port wiring
- Modal and dialog system for onboarding, setup, confirmations, errors, and keyboard shortcut help
- Remote workspace visibility and mount handling
- Auto-update support with desktop banners and platform-specific notices

### Workspace And Sessions

- Workspace/session orchestration with per-session git worktrees under `.nora/worktrees/`
- Workspace creation, loading, refresh, reset, and missing-workspace recovery flows
- Remote workspace connection and management
- Workspace resource and port tracking so running services are visible alongside the session
- Session lifecycle controls for creation, launch, focus, close, destroy, resume, and terminal presets
- Session loading overlays, busy indicators, and safe close warnings
- Session tabs, session toolbars, and focused-agent session details
- Terminal preset support and quick-launch terminal creation

### Agent Execution

- PTY-backed agent terminals with live output streaming and stdin input
- Parallel session handling so multiple agents can run simultaneously
- Terminal docks, quick-launch terminal creation, and terminal shell preferences
- Agent creation, launch, attention, and handoff flows
- Agent roles, skills, and launch-context selection
- Agent context cards, imported shared-context bundles, and cross-agent context sharing for multi-agent collaboration
- Voice input support in the focused-agent composer through local transcription
- Browser-driven agent interactions and browser-image/file attachment support

### Chat And AI

- Built-in AI chat surface with transcript, composer, provider/model selection, reasoning controls, and tool-activity summaries
- AI model catalog access and provider options for supported chat backends
- Tool-aware AI chat workflows that surface model activity alongside conversation context

### Changes And Files

- Git-aware workflows with status and diff visibility scoped to the current worktree
- Built-in diff viewers for file-level and full-repository review flows
- File tree browsing, file editor, Monaco-based syntax highlighting, and markdown preview
- Open-file, close-warning, and unsaved-change protection for active edits
- Full diff viewer plus per-file diff panels and GitHub Actions workflow run views in the changes column
- Built-in browser tab panel, cookie import flow, and browser-driven workflow support
- Browser image import and pasted-image handling for agent inputs
- Integrated browser tabs for research and in-workspace workflow execution
- Review workflows for pull requests and workflow runs directly from the app

### Planning And Knowledge

- Notes, tasks, specs, and task board surfaces for session coordination
- Task creation, task boards, and open-task-in-workspace flows
- Notes browser, spec browser, and shared markdown-oriented workflow surfaces
- Context tracking across local and external harness sessions for Claude Code, Codex, Gemini CLI, and Cursor
- Task center, note browser, and spec browser surfaces for planning and knowledge work
- External harness context tracking for Claude Code, Codex, Gemini CLI, and Cursor

### Provider And Integration Surfaces

- Forge workflows for provider-backed coding tasks
- Vercel workflows for deployment-oriented tasks
- Full GitHub integration for PR creation, workflow run review, and repository-facing agent workflows
- GitHub, GitLab, and Vercel integration support through the main process and renderer clients
- OAuth device flow prompts and integration setup dialogs
- System tooling setup, CLI detection, and install flows for supported agent runtimes
- Browser and CLI tooling setup for agent workflows

### Support And Release

- Agent usage analytics with usage charts and worktree attribution
- Linux setup and update notices, plus startup-dependency prompts
- About, privacy consent, error, and onboarding dialogs
- Cross-platform desktop packaging and release flows for macOS, Linux, and Windows

## Project structure

- `main/`: privileged Electron runtime (IPC handlers, orchestration, integrations)
- `renderer/`: React UI and interaction state
- `shared/`: cross-boundary contracts and shared types
- `tests/`: unit and behavior-focused tests

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundary and composition details.

## Development

Requirements:

- Node.js 20+
- npm 10+

Install and run in development:

```bash
npm install
npm run dev
```

Run with production build/start flow:

```bash
npm start
```

## Scripts

- `npm run dev`: development runner
- `npm run dev:nogpu`: development runner with GPU disabled
- `npm run build`: compile and bundle app assets
- `npm run test:unit`: TypeScript unit test pipeline
- `npm run check:path-hygiene`: path/casing hygiene checks
- `npm run check:shell-assembly-imports`: shell assembly import guard
- `npm run check:nora-bridge-usage`: bridge API usage guard
- `npm run package`: package app via Electron Forge
- `npm run make`: create distributables via Electron Forge

## Release builds

Version tags matching `v*` trigger release workflows in `.github/workflows/` to build and publish release artifacts.

## Contributing

- [AGENTS.md](./AGENTS.md): repository engineering rules
- [ARCHITECTURE.md](./ARCHITECTURE.md): runtime architecture and boundaries

## License

MIT (see `package.json`).
