# Troubleshooting Husky Setup for .NET Projects

## Quick Diagnostics

**If your setup is broken, run these checks in order:**

```bash
# 1. Is .NET available?
dotnet --version   # Must return 6.0+
git --version      # Must work

# 2. Is Husky installed in this project?
ls -la .husky/
ls -la .config/dotnet-tools.json

# 3. Do hook files exist?
ls -la .husky/commit-msg
ls -la .husky/pre-commit

# 4. Does the C# validator exist?
ls -la .husky/csx/commit-lint.csx

# 5. Is dotnet-format installed?
dotnet-format --version

# 6. Is task-runner.json valid JSON?
cat task-runner.json | dotnet husky run --name dummy-test

# 7. Test a hook manually
.husky/commit-msg /tmp/test-msg.txt
echo $?  # Should be 0 (success) or 1 (validation failed)
```

## Common Issues

### Hooks Not Running at All

**Symptom:** Commit succeeds despite invalid message or unformatted code.

**Checklist:**
1. Check hook files exist: `ls -la .husky/commit-msg .husky/pre-commit`
2. Verify execute permissions: `ls -la .husky/commit-msg` should show `-rwxr-xr-x` (Unix/Mac)
3. Test manually: `./.husky/commit-msg /tmp/test-msg.txt` (see if it validates)
4. Check .husky/scripts/commit-lint.csx exists: `ls -la .husky/scripts/commit-lint.csx`
5. Reinstall if needed: `npx husky install && npm install`

**If hooks are missing:** `npx husky install` creates them.

---

### Node.js/npm Not Found

**Symptom:** `dotnet tool install husky` fails with:
```
ERROR: Unable to resolve Node.js path
```

**Fix:**
```bash
# Verify Node is accessible from terminal
node --version
npm --version

# If missing, install from https://nodejs.org/ (LTS recommended)

# If installed but not in PATH:
# macOS/Linux: add to ~/.zshrc or ~/.bash_profile
export PATH="/usr/local/bin:$PATH"

# Windows: Check System Properties > Environment Variables > PATH
```

---

### Commit Lint Validation Bypassed

**Symptom:** `git commit -m "bad message"` succeeds when it should fail.

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| commit-lint.csx has syntax errors | Copy fresh from skill directory, verify C# syntax |
| Regex pattern too permissive | Check regex in commit-lint.csx matches conventional commits spec |
| Task not registered in task-runner.json | Verify `"name": "commit-message-linter"` is in tasks array |
| Using `git commit --no-verify` | Educate team: hooks are mandatory (remove --no-verify from scripts) |

**Test validation directly:**
```bash
# Create dummy message file
echo "invalid message" > /tmp/test-msg.txt

# Run validator
dotnet husky run --name commit-message-linter --args "/tmp/test-msg.txt"

# Should return exit code 1 (failure)
echo $?
```

---

### Pre-Commit Hook Timeout

**Symptom:** `git commit` hangs for >30 seconds or fails with timeout.

**Diagnosis:**
```bash
# Run dotnet-format manually on staged files
dotnet dotnet-format --dry-run --include ${staged}
```

**Solutions:**

1. **Large repository:** Modify task-runner.json to exclude directories:
```json
{
  "name": "dotnet-format",
  "group": "pre-commit",
  "command": "dotnet",
  "args": ["dotnet-format", "--include", "${staged}"],
  "include": ["**/*.cs"],
  "exclude": ["**/bin/**", "**/obj/**", "**/node_modules/**"]
}
```

2. **Slow disk:** Add timeout to hook:
```bash
dotnet husky update --timeout 60000
```

3. **Network issues:** Ensure no network calls in pre-commit (dependencies already cached).

---

### Windows Path and Shell Issues

**Symptom:** Hooks work on macOS/Linux but fail on Windows.

**Root cause:** Husky abstracts OS differences, but path handling or shell scripts may vary.

**Fixes:**
- Use forward slashes in paths (Husky normalizes)
- Use PowerShell instead of cmd.exe if scripts reference Unix commands
- Verify dotnet-format is installed globally: `dotnet tool list --global | grep format`

---

### Monorepo Setup

**Symptom:** Husky installed but only top-level project's hooks run.

**Setup:**
- Run `dotnet husky install` only in **repo root** (not each project)
- task-runner.json must be in **repo root**
- Hooks in `.husky/` apply to all commits in the repo

**If multiple .NET solutions need different hooks:** Configure conditional logic in task-runner.json:
```json
{
  "name": "dotnet-format",
  "group": "pre-commit",
  "command": "bash",
  "args": ["-c", "if [[ ${staged} == *'Api/'* ]]; then dotnet-format --include ${staged}; fi"]
}
```

---

### CI/CD Environment (GitHub Actions, Azure DevOps)

**Issue:** Hooks don't run in CI pipelines (expected behavior).

**Rationale:** CI uses shallow clones or fresh checkouts; hooks configured for developer machines, not CI.

**Solution:** Don't configure Husky validation in CI. Instead:
- CI runs `dotnet-format --verify-no-changes` to detect formatting drift
- CI lints commits via GitHub Actions workflows, not Husky
- Team members must pass Husky validation before pushing

**Example GitHub Actions:**
```yaml
- name: Check Code Format
  run: dotnet dotnet-format --verify-no-changes
```

---

### After Merge Conflicts

**Symptom:** After resolving merge conflicts, `.husky/` or `task-runner.json` is missing/corrupted.

**Fix:**
```bash
# Restore from git
git checkout --theirs .husky/
git checkout --theirs task-runner.json
git add .husky/ task-runner.json
git commit -m "chore: restore husky configuration after merge"
```

---

## Node.js Compatibility Matrix

| Husky Version | Node.js Min | .NET Min |
|---|---|---|
| 8.x | 14.14.0 | 6.0 |
| Latest | 16+ | 6.0+ |

**Check installed version:**
```bash
dotnet list package husky
node --version
```

---

## Reinstall Cleanly

If all else fails, reset and reinstall:

```bash
# Clean up
rm -rf .husky/
rm -f tool-manifest.json

# Reinstall
dotnet new tool-manifest
dotnet tool install husky
dotnet husky install

# Reconfigure hooks
dotnet husky add commit-msg -c "dotnet husky run --name commit-message-linter --args \"$1\""
dotnet husky add pre-commit -c "dotnet husky run --group pre-commit"

# Re-create task-runner.json from example
cp task-runner.json.example task-runner.json

# No edits needed to commit-lint.csx - Husky auto-discovers it
git add .husky/ task-runner.json
git commit -m "chore: reinitialize husky hooks"
```

