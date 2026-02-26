---
name: setup-husky-dotnet
description: Use when configuring Git hooks in .NET projects before team commits occur, to enforce commit message standards and code formatting automatically
---

# Husky Setup for .NET Projects (dotnet tool)

Install and configure Husky Git hooks for .NET projects using **dotnet tool** (not npm). Enforces conventional commit messages and code formatting via git hooks.

## When to Use

- Setting up Git governance in .NET projects (new or existing)
- Enforcing team commit standards before they reach main branch
- Preventing unformatted code or invalid messages in version control
- **REQUIRED BEFORE:** First commits when governance is non-negotiable

**When NOT to use:** If .NET SDK unavailable, manually configure git hooks instead.

## Critical: .NET Tool Only

**Husky (dotnet tool)** is pure .NET. Your environment needs:
- `.NET SDK 6.0+`
- `dotnet` CLI available in PATH
- `git` initialized

**No Node.js, npm, or JavaScript tools required.**

## Core Pattern

```
1. Create tool-manifest.json + install Husky dotnet tool
2. Enable git hook infrastructure with dotnet husky install
3. Create commit-msg hook that validates message format
4. Create pre-commit hook that runs dotnet-format
5. MANDATORY: Test hooks with both valid + invalid commits
6. Commit .husky/ and task-runner.json to git
```

## Quick Reference

| Step | Command | Creates | Purpose |
|------|---------|---------|---------|
| Setup | `dotnet new tool-manifest` | `.config/dotnet-tools.json` |  Tool tracking |
| Install | `dotnet tool install husky` | Adds Husky to tooling | Makes Husky available |
| Enable | `dotnet husky install` | `.husky/` directory | Prepares git hook system |
| Msg Hook | `dotnet husky add commit-msg` | Hook file | Validates commit format |
| Pre-Commit | `dotnet husky add pre-commit` | Hook file | Runs formatting before commit |

## Implementation

### Prerequisites - VERIFY FIRST

**CRITICAL - Run these commands NOW:**
```bash
dotnet --version   # Must return 6.0+
git --version      # Must work
dotnet-format --version  # Must be installed
```
If ANY fails, **STOP** — install missing tools before proceeding.

**Required software:**
- **.NET SDK 6.0+** (download from dotnet.microsoft.com)
- **Git** repository initialized (`git init` if needed)
- **dotnet-format** global: `dotnet tool install -g dotnet.format`

### Installation Steps

**Step 1: Create tool manifest + Install Husky (in project root)**
```bash
cd your-dotnet-project

# Create reproducible tool manifest
dotnet new tool-manifest

# Install Husky as .NET tool
dotnet tool install husky

# Initialize git hook system
dotnet husky install
```
**Verify:** `ls -la .husky/` shows directory with subdirectories.

**Step 2: Setup hooks and config**

Copy the C# validator to your project:
```bash
mkdir -p .husky/csx
cp ./commit-lint.csx .husky/csx/commit-lint.csx
```

Copy `task-runner.json` from skill `assets/` to project root:
```bash
cp ./task-runner.json.example ./task-runner.json
```
**Note:** `task-runner.json.example` contains BOTH commit-msg and pre-commit tasks. Use as-is.

Create both hooks:
```bash
dotnet husky add commit-msg -c "dotnet husky run --name commit-message-linter"
dotnet husky add pre-commit -c "dotnet husky run --name dotnet-format"
```

**Done!** Both hooks are now configured.

**Step 3: MANDATORY - Test hooks**

⚠️ **DON'T SKIP TESTING**

```bash
# Create safe test branch (NEVER test on main)
git checkout -b test-hooks-validation

# Test 1: Invalid message MUST be rejected
echo "dummy" > test.cs
git add test.cs
git commit -m "bad message"  # Should FAIL
echo $?  # Must be 1 (failure)

# Test 2: Valid message MUST be accepted
git commit --amend -m "feat(test): verify hooks working"  # Should SUCCEED
echo $?  # Must be 0 (success)

# Cleanup
git checkout main
git branch -D test-hooks-validation
```

**Both tests must pass before proceeding.**

## Files in Skill Directories

**`scripts/`** — Reusable code:
- `commit-lint.csx` — C# validator for conventional commits (copy to `.husky/csx/`)

**`assets/`** — Configuration examples:
- `task-runner.json.example` — Hook task configuration (copy to project root)

## Common Mistakes

| Mistake | Prevention |
|---------|-----------|
| `dotnet --version` fails | Install .NET 6.0+, verify PATH before setup |
| `.husky/` not created | Run `dotnet husky install` in project root |
| Hooks don't execute | Check: `ls -la .husky/commit-msg` exists |
| Tests show git succeeds with invalid message | Hooks never ran. Check task-runner.json syntax. |
| `dotnet-format` not found during pre-commit | Install: `dotnet tool install -g dotnet.format` |

## What Gets Committed to Git

**MUST commit:**
- `.husky/` directory (all files)
- `task-runner.json` (hook configuration)
- `.config/dotnet-tools.json` (tool version lock)

**DO NOT commit:**
- Nothing else (all tools managed via dotnet-tools.json)

**Result:** Team clones repo → `dotnet tool restore` → hooks active immediately.

## CI/CD Integration

Husky runs on developer machines only, **NOT** in CI/CD (by design).

CI must validate separately:
```bash
dotnet-format --verify-no-changes
```

## Troubleshooting

**See `troubleshooting.md` in this skill for:**
- Full diagnostic checklist if hooks not running
- task-runner.json configuration issues
- Monorepo setup
- Problems after merge conflicts
- Windows/Mac/Linux differences

