---
name: rg-code-search
description: Use when searching code for patterns, class/method definitions, annotations, or multi-file analysis where terminal-based search provides better performance and flexibility than grep_search
---

# rg: Fast Code Search

Fast code search using ripgrep via terminal. Respects `.gitignore` automatically.

## When to Use

**rg:** Context lines, word boundaries, pipes, multi-pattern, advanced regex  
**grep_search:** Simple searches (faster, no terminal)

## Quick Reference

```bash
# Type: -t cs (C#), -t py, -t js, -t ts, -t md, -t yaml, -t csproj
rg '\[HttpGet\]' -t cs

# Flags
rg -l 'pattern'         # Files only
rg -c 'pattern'         # Count
rg -w 'word'            # Word boundaries
rg -F 'literal('        # No regex
rg -i 'case'            # Ignore case
rg -A 2 -B 2 'ctx'      # Context lines

# Exclude & pipes
rg 'p' -g '!*.min.js'   # Glob exclude
rg 'TODO' | wc -l       # Count total
```

## C#/.NET Patterns

```bash
rg '\[(ApiController|HttpGet|Authorize)\]' -t cs  # Attributes
rg '^(public|internal) (class|interface) \w+' -t cs  # Types
rg 'AddScoped|AddSingleton|AddTransient' -t cs  # DI
rg 'async Task|await ' -t cs  # Async
```

## Core Principle

One-shot results with context and line numbers. Respects `.gitignore` (no need to exclude `bin/obj/`).
