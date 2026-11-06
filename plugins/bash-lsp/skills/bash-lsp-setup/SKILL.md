---
name: bash-lsp-setup
description: Installs, verifies and troubleshoots the Bash language server (Bash Language Server) used by the bash-lsp plugin. Use when Bash code intelligence (go-to-definition, references, diagnostics) is missing or the `bash` LSP server fails to start in Copilot CLI or Claude Code.
---

# Bash LSP setup

The `bash-lsp` plugin registers the `bash` LSP server (`bash-language-server start`) for `.sh`, `.bash` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/bash-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+**; **ShellCheck** (optionnel mais fortement recommandé pour les diagnostics).

npm:

```bash
npm install -g bash-language-server
```

ShellCheck:

```bash
sudo apt-get install -y shellcheck   # ou : brew install shellcheck
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test bash`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Aucun diagnostic**: Vérifiez que `shellcheck` est dans le `PATH`.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
