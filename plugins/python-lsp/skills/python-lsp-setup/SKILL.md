---
name: python-lsp-setup
description: Installs, verifies and troubleshoots the Python language server (Pyright) used by the python-lsp plugin. Use when Python code intelligence (go-to-definition, references, diagnostics) is missing or the `pyright` LSP server fails to start in Copilot CLI or Claude Code.
---

# Python LSP setup

The `python-lsp` plugin registers the `pyright` LSP server (`pyright-langserver --stdio`) for `.py`, `.pyi`, `.pyw` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/python-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+** (Pyright est distribué via npm) **ou** Python 3.8+ avec `pip`.

npm (recommandé):

```bash
npm install -g pyright
```

pip / pipx:

```bash
pipx install pyright   # ou : pip install pyright
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test pyright`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Imports non résolus**: Pyright n'utilise pas votre venv : configurez `venvPath`/`venv` ou activez le venv avant de lancer l'agent.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
