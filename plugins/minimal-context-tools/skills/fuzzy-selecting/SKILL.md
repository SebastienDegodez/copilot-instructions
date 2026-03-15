---
name: fuzzy-selecting
description: Use when choosing interactively from search results, files, processes, or any command output with preview capabilities
---

# fzf: Interactive Fuzzy Finder

**Always invoke fuzzy-selecting skill for interactive fuzzy selection - do not execute bash commands directly.**

Use fzf for interactive fuzzy selection and filtering of any command-line list.

## Default Strategy

**Invoke fuzzy-selecting skill** for interactive fuzzy selection from any list with preview capabilities. Use when choosing from search results, files, processes, or any command output.

Common workflow: Discovery skill (finding-files, searching-text, querying-json, querying-yaml) → fuzzy-selecting skill → other skills (viewing-files, xargs) for interactive selection and action.

## Key Options

### Display Modes
- `--height N[%]` set height (percent or exact lines)
- `--tmux [POS][SIZE][,border]` tmux popup mode
- `--layout default|reverse|reverse-list` layout direction
- `--border [rounded|sharp|thin]` add border
- `--style default|full|minimal` UI preset

### Search & Matching
- `-e/--exact` exact matching instead of fuzzy
- `--scheme default|path|history` input type optimization
- `--delimiter STR` custom field delimiter
- `--nth N..` search specific fields only

### Preview Window
- `--preview "CMD {}"` external command preview
- `--preview-window POSITION[SIZE][,border]` preview configuration
- `--preview-label TEXT` custom preview label

### Selection Options
- `-m/--multi` multi-select mode (TAB to mark)
- `--bind KEY:ACTION` custom key bindings
- `--prompt "TEXT"` custom prompt string
- `--header "TEXT"` custom header text

### Performance Options
- `--tac` reverse input order (top-down)
- `--with-nth N..` display specific fields
- `--ansi` parse ANSI color codes

## Detailed Reference

For comprehensive search patterns, key bindings, preview configurations, and integration examples, load [fzf guide](./reference/fzf-guide.md) when needing:
- Custom key bindings and actions
- Advanced preview window configuration
- Multi-select workflows
- Tmux integration
- Shell setup functions

The guide includes:
- Basic usage and display modes
- Search syntax and matching patterns
- Multi-select operations and key bindings
- Preview window configuration
- Integration examples (git, processes, file systems)
- Performance optimization and troubleshooting
- Shell integration setup and custom functions

## Skill Combinations

### For Discovery Phase
- **finding-files → fuzzy-selecting**: Interactive file selection from search results
- **searching-text → fuzzy-selecting**: Interactive selection from search matches
- **querying-json/querying-yaml → fuzzy-selecting**: Interactive selection from extracted data
- **git log/branch → fuzzy-selecting**: Interactive git history browsing

### For Analysis Phase
- **any_command → fuzzy-selecting → viewing-files**: Select items and preview with syntax highlighting
- **finding-files → fuzzy-selecting --preview="bat {}"**: File browser with syntax preview
- **searching-text → fuzzy-selecting --preview="bat {1} +{2}"**: Search results with file preview

### For Refactoring Phase
- **any_command → fuzzy-selecting -m**: Batch process multiple selected items
- **find | fzf -m | xargs**: Classic multi-select pattern
- **ps | fzf -m | xargs kill**: Multi-process management

### Integration Examples
```bash
# Interactive code search and edit
rg "pattern" | fzf --preview="bat --color=always --highlight-line {2} {1}" | awk '{print $1}' | xargs vim

# Interactive dependency management
jq -r '.dependencies | keys[]' package.json | fzf --multi | xargs npm uninstall
