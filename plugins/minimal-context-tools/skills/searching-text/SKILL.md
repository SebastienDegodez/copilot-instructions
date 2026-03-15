---
name: searching-text
description: Use when searching for text patterns across files, finding specific code locations, or getting lines with surrounding context in a single call
---

# ripgrep: Powerful, one-shot text search

**Always invoke searching-text skill for text search - do not execute bash commands directly.**

## Default Strategy

**Invoke searching-text skill** for fast text search with one-shot patterns. Use `-e 'pattern' -n -C 2` to get files, line numbers, and context in a single call.

This minimizes iterations and context usage. Always prefer getting line numbers and surrounding context over multiple search attempts.

Common workflow: searching-text skill → other skills (fuzzy-selecting, viewing-files, replacing-text, analyzing-code-structure) for interactive selection, preview, or modification.

## Tool Selection

**Grep tool** (built on ripgrep) - Use for structured searches:
- Basic pattern matching with structured output
- File type filtering with `type` parameter
- When special flags like `-F`, `-v`, `-w`, or pipe composition are not needed
- Handles 95% of search needs

**Bash(rg)** - Use for one-shot searches needing special flags or composition:
- Fixed string search (`-F`)
- Invert match (`-v`)
- Word boundaries (`-w`)
- Context lines with patterns (`-n -C 2`)
- Pipe composition (`| head`, `| wc -l`, `| sort`)
- Default choice for efficient one-shot results

**Glob tool** - Use for file name/path matching only (not content search)

## When to Load Detailed Reference

Load [ripgrep guide](./reference/ripgrep-guide.md) when needing:
- One-shot search pattern templates
- Effective flag combinations for complex searches
- Pipe composition patterns
- File type filters reference (`-t` flags)
- Performance optimization for large result sets
- Pattern syntax examples
- Translation between Grep tool and rg commands

The guide focuses on practical patterns for getting targeted results in minimal calls.

### Pipeline Combinations
- **searching-text | fuzzy-selecting**: Interactive selection from search results
- **searching-text | replacing-text**: Batch replacements on search results  
- **searching-text | xargs**: Execute commands on matched files

## Skill Combinations

### For Discovery Phase
- **finding-files → searching-text**: Find files of specific type, then search within them
- **extracting-code-structure → searching-text**: Understand structure, then search for specific patterns
- **querying-json/querying-yaml → searching-text**: Extract field values, then search for their usage

### For Analysis Phase
- **searching-text → fuzzy-selecting**: Interactive selection from search matches
- **searching-text → viewing-files**: View matched files with syntax highlighting
- **searching-text → analyzing-code-structure**: After finding text patterns, apply structural changes

### For Refactoring Phase
- **searching-text → replacing-text**: Replace found patterns with new content
- **searching-text → xargs**: Execute commands on all matching files
- **searching-text → analyzing-code**: Get statistics for files containing specific patterns
- **searching-text → analyzing-code-structure**: After finding text patterns, apply structural changes

### Integration Examples
```bash
# Find and edit all references to a function
rg "functionName" -l | fzf --multi --preview="bat --color=always --highlight-line $(rg -n "functionName" {} | head -1 | cut -d: -f2) {}" | xargs vim

# Find TODOs and create summary
rg "TODO|FIXME" -n | fzf --multi --preview="bat --color=always --highlight-line {2} {1}"
