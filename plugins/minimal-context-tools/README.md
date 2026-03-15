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
- **setup-snip-hooks** — Scaffolds `snip` preToolUse hooks into a project's `.github/hooks/` directory

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

The `setup-snip-hooks` skill scaffolds a ready-to-use `PreToolUse` hook into a project's `.github/hooks/` directory. It transparently rewrites supported commands through `snip` before they reach the LLM context.

### Why a skill instead of a bundled hook?

Copilot plugins currently **cannot ship functional hooks** directly. Hooks require a **hardcoded `cwd`** in `hooks.json` — there is no dynamic variable (like `${PLUGIN_ROOT}`) to resolve the hook script path at runtime. Because the path must be relative to the project root, the hook files **must live inside each target project**.

This means a plugin cannot register a hook once for all workspaces; it has to be copied into every project that needs it. The `setup-snip-hooks` skill automates this scaffolding step.

> **Future evolution:** If Copilot/VS Code adds support for dynamic path resolution in `hooks.json` (e.g. environment variables or plugin-relative paths), this skill could be replaced by a hook shipped directly within the plugin — no per-project scaffolding needed.

The hook intercepts: `git`, `go`, `cargo`, `npm`, `npx`, `yarn`, `pnpm`, `docker`, `kubectl`, `make`, `pip`, `pytest`, `jest`, `tsc`, `eslint`, `rustc`.

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
