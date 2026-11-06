---
name: json-lsp-setup
description: Installs, verifies and troubleshoots the JSON language server (VS Code JSON Language Server) used by the json-lsp plugin. Use when JSON code intelligence (go-to-definition, references, diagnostics) is missing or the `json` LSP server fails to start in Copilot CLI or Claude Code.
---

# JSON LSP setup

The `json-lsp` plugin registers the `json` LSP server (`vscode-json-language-server --stdio`) for `.json`, `.jsonc` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/json-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+**.

npm:

```bash
npm install -g vscode-langservers-extracted
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test json`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Pas de validation**: Le fichier ne déclare pas de `$schema` : le serveur ne vérifie alors que la syntaxe.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
