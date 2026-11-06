---
name: java-lsp-setup
description: Installs, verifies and troubleshoots the Java language server (Eclipse JDT Language Server) used by the java-lsp plugin. Use when Java code intelligence (go-to-definition, references, diagnostics) is missing or the `jdtls` LSP server fails to start in Copilot CLI or Claude Code.
---

# Java LSP setup

The `java-lsp` plugin registers the `jdtls` LSP server (`jdtls`) for `.java` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/java-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **JDK 21+** pour exécuter le serveur (vos projets peuvent cibler une version plus ancienne); **Python 3** (le lanceur `jdtls` est un script Python).

macOS (Homebrew):

```bash
brew install jdtls
```

Linux / WSL:

```bash
mkdir -p ~/.local/share/jdtls && \
  curl -fsSL https://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz \
  | tar -xz -C ~/.local/share/jdtls && \
  ln -sf ~/.local/share/jdtls/bin/jdtls ~/.local/bin/jdtls
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test jdtls`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **Délai de démarrage dépassé**: Augmentez `startupTimeout` (Claude) ou `initializationTimeoutMs` (Copilot) sur les très gros projets.
- **`Unsupported class file major version`**: Le serveur tourne avec un JDK trop ancien : vérifiez que `java -version` renvoie 21 ou plus.
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
