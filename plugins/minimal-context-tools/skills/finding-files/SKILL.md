---
name: finding-files
description: Use when searching for files by name, pattern, or type in large directories, or building file lists for pipelines with other tools
---

# fd: Intuitive File Search

**Always invoke finding-files skill for fast file discovery - do not execute bash commands directly.**

Use fd for fast file discovery that's 13-23x faster than find.

## Default Strategy

**Invoke finding-files skill** for fast file discovery with parallel search and smart defaults. Use when searching for files by name, pattern, or type, especially when performance matters or when working with large directories.

Common workflow: finding-files skill → other skills (fuzzy-selecting, viewing-files, searching-text, replacing-text) for further processing.

## Key Options

- `-e ext` for extension filtering
- `-t file|dir` for type filtering  
- `-H` include hidden files
- `-I` ignore .gitignore
- `--exclude pattern` exclusions
- `-x` exec per file, `-X` exec batch
- `{}`, `{.}`, `{/}` placeholders

## When to Use

- Quick file searches by pattern
- Filter by type, size, extension
- Search with depth limits
- Batch file operations
- Integration with other tools

### Common Workflows
- `finding-files → fuzzy-selecting → viewing-files`: Search files, select interactively, view with syntax highlighting
- `finding-files → replacing-text`: Find files and perform batch replacements
- `finding-files → xargs tool`: Execute commands on found files
- `finding-files → searching-text`: Search within specific file types

## Core Principle

Smart defaults: ignores hidden/.gitignore files, case-insensitive, parallel search - much faster than find.

## Detailed Reference

For comprehensive search patterns, filtering options, execution examples, and performance tips, load [fd guide](./reference/fd-guide.md) when needing:
- Advanced filtering patterns (size, time, depth)
- Batch execution with placeholders
- Performance optimization techniques
- Integration with shell scripts
- Complex exclusion patterns

The guide includes:
- Core search patterns and file discovery
- Extension and type filtering techniques
- Execution and batch operation examples
- Performance optimization strategies
- Integration with other tools (xargs, ripgrep)
- Advanced filtering and exclusion patterns

## Skill Combinations

### For Discovery Phase
- **finding-files → fuzzy-selecting**: Interactive file selection with preview
- **finding-files → searching-text**: Search within specific file types
- **finding-files → querying-json/querying-yaml**: Extract data from found config files
- **finding-files → extracting-code-structure**: Get structure overview of found files

### For Analysis Phase
- **finding-files → viewing-files**: View found files with syntax highlighting
- **finding-files → analyzing-code**: Get statistics for specific file sets
- **finding-files → querying-json/querying-yaml**: Analyze configuration files in directory

### For Refactoring Phase
- **finding-files → replacing-text**: Perform batch replacements across found files
- **finding-files → analyzing-code-structure**: Apply structural changes to specific file types
- **finding-files → xargs**: Execute commands on found files

### Integration Examples
```bash
# Find and edit source files
fd -e py | fzf --multi --preview="bat --color=always {}" | xargs vim

# Find and replace in JavaScript files
fd -e js -x sd "oldPattern" "newPattern"
```