---
name: csharp-lsp-setup
description: Installs, verifies and troubleshoots the C# language server (csharp-ls) used by the csharp-lsp plugin. Use when C# code intelligence (go-to-definition, references, diagnostics) is missing or the `csharp-ls` LSP server fails to start in Copilot CLI or Claude Code.
---

# C# LSP setup

The `csharp-lsp` plugin registers the `csharp-ls` LSP server (`csharp-ls`) for `.cs` files.
The plugin only ships configuration: the server binary must be installed on the machine.

## 1. Check the installation

Run the bundled script and read its output:

```bash
bash "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/skills/csharp-lsp-setup/scripts/check.sh"
```

- `OK` lines: the binary is on `PATH`.
- `MISSING` lines: install the binary (step 2), then re-run the script.
- `OPTIONAL` lines: recommended companion tools; the server works without them.

## 2. Install the server

Prerequisites: **.NET SDK 10+** (requis par les versions récentes de `csharp-ls`).

Outil .NET global (recommandé):

```bash
dotnet tool install --global csharp-ls
```

Mise à jour:

```bash
dotnet tool update --global csharp-ls
```

Ask the user before running any installation command.

## 3. Verify in the agent

- **Copilot CLI**: run `/lsp reload`, then `/lsp test csharp-ls`.
- **Claude Code**: restart the session; run `claude --debug` to see LSP startup logs if needed.

## Troubleshooting

- **`csharp-ls: command not found`**: Ajoutez `export PATH="$PATH:$HOME/.dotnet/tools"` à votre profil shell.
- **Références NuGet en erreur**: Lancez `dotnet restore` puis redémarrez le serveur (`/lsp reload` dans Copilot CLI).
- **Command not found after install**: the global npm / dotnet / Go bin directory is not on `PATH`.
