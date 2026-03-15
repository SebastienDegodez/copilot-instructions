---
name: analyzing-code-structure
description: Use when editing code structure with text matching ambiguity, handling "old_string not unique" problems, or performing formatting-independent pattern matching across function signatures, method calls, and class structures
---

# ast-grep: Structural Code Search and Editing

**Always invoke the ast-grep skill for structural code search and refactoring - do not execute bash commands directly.**

## Default Strategy

**Invoke analyzing-code-structure skill** for structural code search and refactoring. Use when:
- Text-based Edit tool fails with "old_string not unique"
- Need formatting-independent pattern matching
- Performing structural changes across code

Common workflow: Invoke extracting-code-structure skill first, then analyzing-code-structure skill for structural modifications.

Use ast-grep to solve the "old_string not unique" problem by matching code structure instead of exact text. This enables refactoring across formatting variations and structural patterns.

## When to Use analyzing-code-structure vs Text Tools

### Use analyzing-code-structure when:
- **Structural code changes** - Refactoring function signatures, method calls, class structures
- **Formatting-independent matching** - Need to find code regardless of whitespace/line breaks
- **Pattern variations** - Matching similar structures with different variable names/arguments
- **"old_string not unique" problem** - Edit tool fails because text appears in multiple contexts
- **Complex queries** - Finding nested structures, specific AST patterns

### Use text tools (Edit/Grep) when:
- **Simple, unique string replacement** - The exact text appears once or in consistent format
- **Non-code files** - Markdown, configs, data files
- **Comment/documentation edits** - Content that isn't code structure
- **Very small changes** - Single line, obvious context, no ambiguity

## Key Decision Rule

**If editing code structure and there's any ambiguity in text matching → use analyzing-code-structure.**

ast-grep's primary value: **Solves the "old_string not unique" problem by matching structure instead of exact text.**

## Detailed Reference

For comprehensive patterns, syntax, metavariables, common use cases, language-specific tips, and best practices, load [analyzing-code-structure guide](./reference/ast-grep-guide.md) when needing:
- Complex pattern matching with metavariables
- Language-specific syntax variations
- Advanced refactoring workflows
- Integration with other tools
- Common pitfalls and solutions

The reference includes:
- Pattern syntax and metavariables (`$VAR`, `$$$ARGS`, `$$STMT`)
- Recommended workflow (search, verify, apply, validate)
- Common use cases with examples (function calls, imports, method renames)
- Language-specific tips (JavaScript/TypeScript, Python, Go, Rust)
- Best practices and pitfalls to avoid
- Integration strategies with Edit tool

## Skill Combinations

### For Discovery Phase
- **extracting-code-structure → analyzing-code-structure**: Get code outline first, then perform structural refactoring
- **searching-text → analyzing-code-structure**: Search text patterns to locate areas needing structural changes
- **finding-files → analyzing-code-structure**: Find files of specific type, then apply structural modifications

### For Analysis Phase
- **analyzing-code-structure → viewing-files**: Preview changes with syntax highlighting before committing
- **analyzing-code-structure → searching-text**: Verify no unintended occurrences remain
- **analyzing-code-structure → extracting-code-structure**: Validate structural changes against code outline

### For Refactoring Phase
- **analyzing-code-structure → analyzing-code**: Measure changes impact on code statistics
- **analyzing-code-structure → replacing-text**: Follow structural changes with text-based replacements if needed
- **analyzing-code-structure → querying-json/querying-yaml**: Update configuration files related to code changes
