---
name: typescript-lsp-setup
description: Installs, verifies and troubleshoots the TypeScript & JavaScript language server (TypeScript 7 (serveur LSP natif)) used by the typescript-lsp plugin. Use when TypeScript & JavaScript code intelligence (go-to-definition, references, diagnostics) is missing or the `typescript` LSP server fails to start in Copilot CLI or Claude Code.
---

# TypeScript & JavaScript LSP setup

The `typescript-lsp` plugin registers the `typescript` LSP server (`tsc --lsp --stdio`) for `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.jsx` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/typescript-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+**; **TypeScript 7+** installé globalement (`tsc --version` doit afficher 7.x).

npm:

```bash
npm install -g typescript@latest
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test typescript`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **`error TS5023: Unknown compiler option '--lsp'`**: Un ancien `tsc` (TypeScript 6 ou moins) est prioritaire dans le `PATH` : lancez `npm install -g typescript@latest` et vérifiez avec `which tsc`.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
