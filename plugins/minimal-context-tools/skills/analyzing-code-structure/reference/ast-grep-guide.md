# ast-grep Comprehensive Reference Guide

**Goal: Structural code search and refactoring that solves "old_string not unique" problems.**

# Core ast-grep Concepts

## Pattern Syntax
- Use **actual code syntax** for the target language
- Use **metavariables** to capture patterns:
  - `$VAR` - matches any single AST node (expression, identifier, etc.)
  - `$$$ARGS` - matches multiple nodes (zero or more)
  - `$$STMT` - matches multiple statements

## Basic Commands
```bash
# Search for pattern
ast-grep -p 'PATTERN'

# Specify language (always prefer explicit language)
ast-grep -l typescript -p 'PATTERN'

# Search and replace (preview)
ast-grep -p 'OLD_PATTERN' -r 'NEW_PATTERN'

# Apply changes (after verification)
ast-grep -p 'OLD_PATTERN' -r 'NEW_PATTERN' --update-all

# JSON output (for parsing)
ast-grep -p 'PATTERN' --json
```

**CRITICAL CONSTRAINT**: You cannot use interactive mode (`-i`) - you cannot respond to interactive prompts.

---

# Recommended Workflow

## 1. Search Phase (Discovery)
```bash
# First, find matches to understand scope
ast-grep -l LANG -p 'PATTERN' [file_or_dir]

# Count matches to verify expectations
ast-grep -p 'PATTERN' | wc -l
```

## 2. Verification Phase (Before Changes)
- **Always** run search first to see what will match
- Review matches to ensure pattern is correct
- Verify no false positives

## 3. Application Phase (Making Changes)
Two viable strategies:

**Strategy A: Direct Application** (for high confidence scenarios)
```bash
ast-grep -p 'OLD' -r 'NEW'  # Preview first
ast-grep -p 'OLD' -r 'NEW' --update-all  # Apply after thorough review
```

**Strategy B: Hybrid Approach** (RECOMMENDED for maximum control)
1. Use ast-grep to find matches: `ast-grep -l LANG -p 'PATTERN'`
2. Read the files to see actual context
3. Use Edit tool to apply changes with precise control

This combines ast-grep's structural search with Edit's precision.

## 4. Validation Phase
```bash
# After changes, verify the new pattern exists
ast-grep -p 'NEW_PATTERN' [file_or_dir]
```

---

# Common Use Cases with Examples

## 1. Function Call Refactoring
```bash
# Find all calls to a function
ast-grep -l typescript -p 'oldFunction($$$ARGS)'

# Replace with new function
ast-grep -l typescript -p 'oldFunction($$$ARGS)' -r 'newFunction($$$ARGS)'
```

## 2. Method Rename
```bash
# Find method calls on any object
ast-grep -l javascript -p '$OBJ.oldMethod($$$ARGS)' -r '$OBJ.newMethod($$$ARGS)'
```

## 3. Import Statement Changes
```bash
# TypeScript/JavaScript: change import source
ast-grep -l typescript -p 'import $WHAT from "old-package"' -r 'import $WHAT from "new-package"'
```

## 4. Adding Parameters to Function Calls
```bash
# Add a new parameter to all calls
ast-grep -l javascript -p 'doThing($ARG1, $ARG2)' -r 'doThing($ARG1, $ARG2, { new: true })'
```

## 5. Find Complex Patterns
```bash
# Find try-catch blocks with specific pattern
ast-grep -l javascript -p 'try { $$$BODY } catch ($ERR) { console.error($$$) }'

# Find async functions
ast-grep -l typescript -p 'async function $NAME($$$ARGS) { $$$BODY }'
```

## 6. Class Method Changes
```bash
# Find all methods in classes
ast-grep -l typescript -p 'class $CLASS { $$$A $METHOD($$$PARAMS) { $$$BODY } $$$B }'
```

---

# Language-Specific Tips

## JavaScript/TypeScript (`-l typescript` or `-l javascript`)
- Works for: .js, .jsx, .ts, .tsx
- Patterns use JS/TS syntax exactly as written
- Arrow functions: `($$$ARGS) => $BODY`
- Always use `-l typescript` for TypeScript files

## Python (`-l python`)
- Indentation in pattern matters less than structure
- Use Python syntax: `def $NAME($$$ARGS):`

## Go (`-l go`)
- Use Go syntax: `func $NAME($$$ARGS) $RET { $$$ }`
- Package/import matching: `import "$PKG"`

## Rust (`-l rust`)
- Use Rust syntax: `fn $NAME($$$ARGS) -> $RET { $$$ }`
- Match macros: `println!($$$ARGS)`

---

# Best Practices

## 1. Always Verify Before Applying
```bash
# NEVER apply changes without seeing matches first
# BAD: ast-grep -p 'pattern' -r 'replacement' --update-all
# GOOD:
ast-grep -p 'pattern'  # Review matches
ast-grep -p 'pattern' -r 'replacement'  # Preview changes
ast-grep -p 'pattern' -r 'replacement' --update-all  # Apply only after review
```

## 2. Always Use Explicit Language Flag
```bash
# BAD: ast-grep -p 'pattern'  # May auto-detect incorrectly
# GOOD: ast-grep -l typescript -p 'pattern'  # Explicit and reliable
```

## 3. Start Specific, Broaden if Needed
- Begin with very specific patterns
- If no matches, gradually make pattern more general
- Use metavariables for parts that vary, keep fixed parts specific

## 4. Use Metavariables Appropriately
- `$VAR` - single expression (e.g., `$X + $Y`)
- `$$$ARGS` - multiple items in lists (e.g., function arguments)
- `$$STMT` - multiple statements (e.g., function body)

## 5. Combine with Other Tools
```bash
# Use ast-grep to find, pipe to other tools
ast-grep -p 'pattern' | rg -e 'additional-filter'

# Use ast-grep to find locations, then Edit to apply
ast-grep -l typescript -p 'pattern'  # Find matches
# Then use Edit tool with precise context
```

---

# Common Pitfalls to Avoid

## 1. Overly Broad Patterns
❌ `ast-grep -p '$X'` - matches everything
✓ `ast-grep -l typescript -p 'specificFunction($X)'` - targeted

## 2. Forgetting Language Flag
❌ `ast-grep -p 'pattern'` - may misdetect language
✓ `ast-grep -l typescript -p 'pattern'` - explicit

## 3. Not Verifying Before --update-all
❌ `ast-grep -p 'old' -r 'new' --update-all` - blind changes
✓ Preview first, verify matches, then apply

## 4. Expecting Exact Text Matching
ast-grep matches **structure**, not text:
- `foo( x )` and `foo(x)` are the same structurally
- Line breaks don't matter in most cases
- Comments are typically ignored

## 5. Using for Non-Code Files
ast-grep won't help with:
- Markdown content
- JSON/YAML values (not code structure)
- Plain text files
- Comments (usually)

---

# Error Handling

## If ast-grep fails or is unavailable:
1. Fall back to text-based tools immediately
2. Don't apologize excessively - just use the alternative approach

## If pattern doesn't match:
1. Verify language detection: ensure `-l LANG` is used
2. Simplify pattern - start with minimal matching case
3. Check syntax - ensure pattern is valid code for target language
4. Fall back to Grep for discovery, then use Edit

## If too many matches:
1. Make pattern more specific
2. Add context to pattern (surrounding code)
3. Use directory/file path to narrow scope
4. Consider using ast-grep for finding, Edit for selective changes

---

# Integration with Edit Tool

## Hybrid Strategy (Recommended for Precision)

When maximum control is needed:

1. **Use ast-grep to identify locations:**
```bash
ast-grep -l typescript -p 'pattern'
```

2. **Read the matched files** to see actual context

3. **Use Edit tool** with precise old_string/new_string based on actual file content

This combines ast-grep's structural search with Edit's precise control. This is often the best approach because:
- ast-grep finds the right locations structurally
- Edit gives precise control over the exact changes
- Each match can be handled differently if needed
- Lower risk of unintended changes

---

# Summary: Key Principles

1. **ast-grep solves the "not unique" problem** by matching code structure instead of text
2. **Always verify before applying** - search first, review matches, then apply
3. **Always use explicit language flag** (`-l typescript`, `-l python`, etc.)
4. **Use metavariables correctly** - `$VAR` for single nodes, `$$$ARGS` for multiple
5. **Consider hybrid approach** - ast-grep for finding, Edit for applying
6. **Fall back gracefully** - if ast-grep doesn't work, use text tools without hesitation
