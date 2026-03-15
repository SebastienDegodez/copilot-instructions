---
name: replacing-text
description: Use when performing text find & replace, batch transformations across files, or when JavaScript-style regex syntax is preferred over sed
---

# sd: Fast Find & Replace

**Always invoke replacing-text skill for find & replace operations - do not execute bash commands directly.**

Use sd for intuitive text replacement that's 2-12x faster than sed.

## When to Use sd vs ripgrep

**Use sd when:**
- Performing replacements on known patterns
- Batch text transformations across files
- Need JavaScript-style regex syntax
- Direct file modifications without search first

**Use ripgrep when:**
- Finding unknown patterns or locations
- Need search results without immediate changes
- Complex file filtering and type matching
- Want to preview before modifying

**Common workflow**: searching-text skill → replacing-text skill (search first, then replace)

## Default Strategy

**Invoke replacing-text skill** for fast find & replace operations. Use when performing replacements on known patterns, batch text transformations across files, or need JavaScript-style regex syntax.

Common workflow: searching-text skill → replacing-text skill (search first, then replace) or finding-files skill → replacing-text skill for batch operations.

## Key Options

- `-F` for string-literal mode (no regex)
- `$1, $2` or `${var}` for capture groups
- `--preview` to preview changes
- `--` before patterns starting with `-`
- `$$` for literal `$` in replacement

## Core Principle

Replace text with familiar JavaScript/Python regex syntax - no sed escape hell.

## Detailed Reference

For comprehensive find & replace patterns, regex syntax examples, and workflow tips, load [sd guide](./reference/sd-guide.md) when needing:
- Advanced regex patterns with capture groups
- Pipeline operations and batch processing
- Escape sequence handling
- Common text transformation recipes
- Integration with other command-line tools

The guide includes:
- String-literal vs regex mode usage
- Capture group patterns and replacements
- Pipeline operations and batch processing
- Advanced regex patterns and edge cases
- Integration with other command-line tools

## Skill Combinations

### For Discovery Phase
- **searching-text → replacing-text**: Search patterns first, then replace across matches
- **finding-files → replacing-text**: Find files and perform batch replacements
- **querying-json/querying-yaml → replacing-text**: Extract data and transform to other formats

### For Analysis Phase
- **replacing-text --preview → viewing-files**: Preview changes with syntax highlighting
- **replacing-text → fuzzy-selecting**: Interactive selection of changes to apply
- **replacing-text → querying-json/querying-yaml**: Transform data back to structured formats

### For Refactoring Phase
- **replacing-text → searching-text**: Verify replacements didn't introduce issues
- **replacing-text → analyzing-code-structure**: Follow up with structural changes if needed
- **replacing-text → analyzing-code**: Measure impact of text-based changes

### Integration Examples
```bash
# Find and replace across project
fd -e js -x sd "oldPattern" "newPattern" --preview

# Chain transformations
cat config.json | jq '.version' | sd '"v' '' | sd '"' '' | xargs git tag

# Interactive replacement with preview
rg "deprecated" -l | fzf --multi | xargs sd "deprecated" "legacy" --preview | bat
```
