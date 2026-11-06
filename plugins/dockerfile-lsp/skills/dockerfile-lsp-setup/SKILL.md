---
name: dockerfile-lsp-setup
description: Installs, verifies and troubleshoots the Dockerfile language server (Docker Language Server) used by the dockerfile-lsp plugin. Use when Dockerfile code intelligence (go-to-definition, references, diagnostics) is missing or the `docker` LSP server fails to start in Copilot CLI or Claude Code.
---

# Dockerfile LSP setup

The `dockerfile-lsp` plugin registers the `docker` LSP server (`docker-language-server start --stdio`) for `.dockerfile`, `.containerfile` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/dockerfile-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: Aucun pour les binaires précompilés, ou **Go 1.24+** pour une installation via `go install`.

Go:

```bash
go install github.com/docker/docker-language-server/cmd/docker-language-server@latest
```

Binaire précompilé (Linux x64):

```bash
VERSION=$(curl -fsSL https://api.github.com/repos/docker/docker-language-server/releases/latest | grep -oP '"tag_name": "\K[^"]+')
curl -fsSL -o ~/.local/bin/docker-language-server \
  "https://github.com/docker/docker-language-server/releases/download/${VERSION}/docker-language-server-linux-amd64-${VERSION}"
chmod +x ~/.local/bin/docker-language-server
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test docker`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Aucun diagnostic sur `Dockerfile`**: Normal : sans extension, le fichier n'est pas routé. Renommez-le avec l'extension `.dockerfile`.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
