---
name: viewing-files
description: Use when viewing source files or documentation with syntax highlighting, previewing files with Git integration, or when enhanced readability would improve code review
---

# bat: Enhanced File Viewer with Syntax Highlighting

**Always invoke viewing-files skill for enhanced file viewing - do not execute bash commands directly.**

Use bat as a modern replacement for cat with beautiful syntax highlighting, Git integration, and smart features.

## When to Use bat vs cat

**Use bat when:**
- Viewing source code or structured text files
- Syntax highlighting improves readability
- Need Git integration or line numbers
- Working with files >50 lines where highlighting helps
- Previewing changes from other tools

**Use cat when:**
- Very small files (<10 lines)
- Non-text/binary files
- Simple concatenation without formatting
- When highlighting would add noise
- Performance-critical operations on many tiny files

**Common workflow**: Any skill → viewing-files skill (preview enhanced output)

## Default Strategy

**Invoke viewing-files skill** for enhanced file viewing with syntax highlighting. Use when viewing source files, documentation, or when syntax highlighting improves readability.

Common workflow: Any discovery skill → viewing-files skill (preview enhanced output).

## Key Options

### Display Control
- `-n/--number` line numbers only
- `-p/--plain` plain output (no decorations)
- `-A/--show-all` show non-printable characters
- `--line-range START:END` view specific lines
- `--wrap never` disable line wrapping
- `--tabs N` set tab width to N spaces

### Language & Themes  
- `-l/--language LANG` force language detection
- `--list-languages` show supported languages
- `--list-themes` show available themes
- `--theme NAME` set color theme (default: Monokai Extended)
- `--theme-dark/--theme-light` auto-switch themes based on terminal
- `BAT_THEME` environment variable for default theme

### Output Styling
- `--style COMPONENTS` control output (numbers,changes,header,grid,snip)
- `--decorations auto|never|always` control decorations
- `--color always|never|auto` control coloring

### Paging
- `--paging auto|never|always` control paging behavior
- `--pager COMMAND` set custom pager
- `BAT_PAGER` environment variable

## Detailed Reference

For comprehensive usage patterns, integration examples, advanced features, and troubleshooting, load [bat guide](./reference/bat-guide.md) when needing:
- Git integration workflows
- Output styling and customization details
- Theme configuration and options
- Performance optimization tips
- Shell integration examples

The guide includes:
- Core usage patterns and language control
- Git integration workflows
- Output styling and customization
- Integration with other tools (fzf, git, ripgrep)
- Advanced features and configuration
- Performance tips and troubleshooting

## Skill Combinations

### For Discovery Phase
- **finding-files → fuzzy-selecting → viewing-files**: Find files, select interactively, view with syntax highlighting
- **searching-text → fuzzy-selecting → viewing-files**: Search content, select matches, view with highlighting
- **querying-json/querying-yaml → fuzzy-selecting → viewing-files**: Extract data, select entries, view formatted output

### For Analysis Phase
- **analyzing-code-structure → viewing-files**: Preview structural changes with syntax highlighting
- **replacing-text → viewing-files**: Preview find-and-replace results before committing
- **extracting-code-structure → viewing-files**: View extracted code structure with formatting

### For Output Preview
- **analyzing-code → viewing-files**: View code statistics with formatted output
- **searching-text → viewing-files**: Preview matched files with context highlighting
- **querying-json/querying-yaml → viewing-files**: View extracted structured data with syntax formatting

### Integration Examples
```bash
# Interactive file viewer
fd --type file | fzf --preview="bat --color=always --style=numbers {}" --bind="enter:execute(bat {})"
