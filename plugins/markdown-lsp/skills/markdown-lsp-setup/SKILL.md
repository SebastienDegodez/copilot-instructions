---
name: markdown-lsp-setup
description: Installs, verifies and troubleshoots the Markdown language server (Marksman) used by the markdown-lsp plugin. Use when Markdown code intelligence (go-to-definition, references, diagnostics) is missing or the `marksman` LSP server fails to start in Copilot CLI or Claude Code.
---

# Markdown LSP setup

The `markdown-lsp` plugin registers the `marksman` LSP server (`marksman server`) for `.md`, `.markdown` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/markdown-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: Aucun (binaire autonome).

macOS (Homebrew):

```bash
brew install marksman
```

Linux x64:

```bash
curl -fsSL -o ~/.local/bin/marksman \
  https://github.com/artempyanykh/marksman/releases/latest/download/marksman-linux-x64
chmod +x ~/.local/bin/marksman
```

Windows (Scoop):

```bash
scoop install marksman
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test marksman`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Liens vers d'autres dossiers non résolus**: Créez un `.marksman.toml` à la racine du dépôt.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
