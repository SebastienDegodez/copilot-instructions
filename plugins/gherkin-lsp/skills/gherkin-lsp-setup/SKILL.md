---
name: gherkin-lsp-setup
description: Installs, verifies and troubleshoots the Gherkin language server (Cucumber Language Server) used by the gherkin-lsp plugin. Use when Gherkin code intelligence (go-to-definition, references, diagnostics) is missing or the `cucumber` LSP server fails to start in Copilot CLI or Claude Code.
---

# Gherkin LSP setup

The `gherkin-lsp` plugin registers the `cucumber` LSP server (`cucumber-language-server --stdio`) for `.feature` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/gherkin-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+**.

npm:

```bash
npm install -g @cucumber/language-server
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test cucumber`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Étapes marquées « undefined »**: Vos step definitions sont hors des chemins par défaut : rangez-les dans un dossier dont le nom contient `specs` (C#) ou `features/` (JS, Python, Ruby).
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
