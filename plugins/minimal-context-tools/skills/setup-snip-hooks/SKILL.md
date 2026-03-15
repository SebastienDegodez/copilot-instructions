---
name: setup-snip-hooks
description: Use when setting up snip CLI token reduction hooks in a project, before first terminal commands are run
argument-hint: "Run this skill to scaffold snip preToolUse hooks for CLI token reduction in a project. Follow the instructions in the generated SKILL.md file to complete setup."
compatibility: copilot
user-invocable: true
disable-model-invocation: false
---

# Setup snip Hooks

Scaffolds `snip` preToolUse hook into a project's `.github/hooks/` directory. The hook automatically rewrites supported CLI commands through `snip` to reduce output tokens.

## Why per-project hooks?

Copilot/VS Code hooks require a **hardcoded `cwd`** in `hooks.json` — there is no environment variable (like `${CLAUDE_PLUGIN_ROOT}`) to resolve the hook script path dynamically. The hook must live inside the project so the relative path works.

## When to Use

- New project needs snip token reduction
- Project has no `.github/hooks/snip-rewrite.sh` yet
- `snip` and `jq` are available on the machine

## Prerequisites

```bash
command -v snip   # must exist
command -v jq     # must exist
```

If either is missing, **STOP** — install before proceeding.

## Setup Steps

1. Create `.github/hooks/` in project root if it doesn't exist
2. Copy the 2 template files from this skill's `templates/` directory:

```bash
mkdir -p .github/hooks
cp templates/snip-rewrite.sh .github/hooks/snip-rewrite.sh
cp templates/hooks.json      .github/hooks/hooks.json
```

3. Make the hook script executable:

```bash
chmod +x .github/hooks/snip-rewrite.sh
```

4. If `.github/hooks/hooks.json` already exists, **merge** the `preToolUse` entry instead of overwriting.

## What Gets Created

| File | Purpose |
|------|---------|
| `snip-rewrite.sh` | preToolUse hook — rewrites commands through snip (Claude Code + Copilot formats) |
| `hooks.json` | Hook registration for Claude Code plugin system |

## Supported Commands

`git`, `go`, `cargo`, `dotnet`, `npm`, `npx`, `yarn`, `pnpm`, `docker`, `kubectl`, `make`, `pip`, `pytest`, `jest`, `tsc`, `eslint`, `rustc`

## .NET Filters (dotnet build / dotnet test)

Custom snip filters for `dotnet build` and `dotnet test` are available in `filters/`:

```bash
mkdir -p ~/.config/snip/filters
cp <skill-dir>/filters/dotnet-build.yaml ~/.config/snip/filters/dotnet-build.yaml
cp <skill-dir>/filters/dotnet-test.yaml  ~/.config/snip/filters/dotnet-test.yaml
```

> Replace `<skill-dir>` with the path to this skill folder (e.g. `plugins/minimal-context-tools/skills/setup-snip-hooks`).

**dotnet-build** keeps: compiler errors/warnings + `Build succeeded.` / `Build FAILED.` summary.
**dotnet-test** keeps: test failure details (name, error message, stack trace) + `Passed!` / `Failed!` summary.

## Verify

```bash
echo '{"tool_input":{"command":"git status"}}' | .github/hooks/snip-rewrite.sh
# Should output JSON with "snip git status" in updatedInput
```

## Commit

```bash
git add .github/hooks/
git commit -m "chore: add snip preToolUse hooks for token reduction"
```
