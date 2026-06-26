# Minimal Context Tools Plugin

A curated collection of efficient CLI tools and workflows optimized for **minimal context usage** and **one-shot patterns** with LLMs.

## Philosophy

The context window is a shared resource. These skills are designed to:
- Get files, lines, and context in a **single call** — no iterations
- **Save 90%+ context** vs reading entire files
- Compose tools together: discover → filter → view → transform

## Skills

### Core Skills
- **analyzing-code-structure** — Structural code search and refactoring, formatting-independent (`ast-grep`)
- **viewing-files** — Enhanced file viewer with syntax highlighting (`bat`)
- **extracting-code-structure** — Extract code structure without reading full files (`ast-grep`, `ctags`, language analyzers)
- **finding-files** — Fast file discovery with parallel search (`fd`)
- **fuzzy-selecting** — Interactive fuzzy finder for any list (`fzf`)

### Data Processing Skills
- **querying-json** — JSON data extraction and manipulation (`jq`)
- **querying-yaml** — YAML data extraction and manipulation (`yq`)

### Text Processing Skills
- **searching-text** — Fast text search with one-shot patterns (`rg`)
- **replacing-text** — Intuitive find & replace with JavaScript regex (`sd`)

### Analysis Skills
- **analyzing-code** — Code statistics analysis by language (`tokei`)

### Setup Skills
- install edouard-claude/snip to transparently rewrite commands through snip (Claude Code + Copilot formats)
http://edouard-claude.github.io/snip/

## Common Workflows

```bash
# Code analysis pipeline (minimal context)
extracting-code-structure → searching-text → analyzing-code-structure → viewing-files

# Interactive file search and edit
fd -e py | fzf --preview="bat --color=always {}" | xargs vim

# Configuration management
finding-files → querying-json/querying-yaml → fuzzy-selecting → replacing-text

# Statistics-driven refactoring
analyzing-code → finding-files → searching-text → analyzing-code-structure → analyzing-code
```

## Installation

### macOS (Homebrew)
```bash
brew install ast-grep bat fd fzf jq ripgrep sd tokei yq

# snip — token filter proxy for LLM sessions
brew install edouard-claude/tap/snip
```

### Windows

**Winget**
```powershell
winget install sharkdp.bat sharkdp.fd junegunn.fzf jqlang.jq BurntSushi.ripgrep.MSVC mike-farah.yq
cargo install ast-grep sd tokei
```

**Chocolatey**
```powershell
choco install bat fd fzf jq ripgrep yq
```

**Cargo** (for tools not available in package managers)
```powershell
cargo install ast-grep sd tokei
```

**snip** (token filter proxy)
```powershell
go install github.com/edouard-claude/snip/cmd/snip@latest
```

## Snip Hook

The plugin ships a ready-to-use `preToolUse` hook at `hooks/snip.json` that transparently rewrites supported commands through `snip` before their output reaches the LLM context. The hook script path is resolved through `${CLAUDE_PLUGIN_ROOT}`, so it works as soon as the plugin is installed from the marketplace — no per-project setup required.

### Per-project fallback

For projects that consume the hook **without** installing the plugin, the `setup-snip-hooks` skill scaffolds the same hook into the project's `.github/hooks/` directory (`snip.json` + `snip-rewrite.sh`).

The hook intercepts: `git`, `go`, `cargo`, `dotnet`, `npm`, `npx`, `yarn`, `pnpm`, `docker`, `kubectl`, `make`, `pip`, `pytest`, `jest`, `tsc`, `eslint`, `rustc`.

> On macOS, if Gatekeeper blocks snip after Homebrew install:
> ```bash
> xattr -dr com.apple.quarantine $(which snip)
> ```

## Quick Start

1. Use **extracting-code-structure** (`ast-grep`/`ctags`) to get an overview before reading full files
2. Use **searching-text** (`rg`) for one-shot text search with context lines
3. Use **analyzing-code-structure** (`ast-grep`) for structural refactoring (avoids "old_string not unique")
4. Chain with **fuzzy-selecting** (`fzf`) for interactive selection and **viewing-files** (`bat`) for preview

## Credits

This plugin was inspired by and built upon the excellent work of [@iota9star](https://github.com/iota9star) in [my-skills](https://github.com/iota9star/my-skills).
