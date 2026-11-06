---
name: yaml-lsp-setup
description: Installs, verifies and troubleshoots the YAML language server (YAML Language Server (Red Hat)) used by the yaml-lsp plugin. Use when YAML code intelligence (go-to-definition, references, diagnostics) is missing or the `yaml` LSP server fails to start in Copilot CLI or Claude Code.
---

# YAML LSP setup

The `yaml-lsp` plugin registers the `yaml` LSP server (`yaml-language-server --stdio`) for `.yaml`, `.yml` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/yaml-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **Node.js 18+**.

npm:

```bash
npm install -g yaml-language-server
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test yaml`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Schéma non appliqué**: Ajoutez le commentaire `# yaml-language-server: $schema=...` en tête du fichier.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
