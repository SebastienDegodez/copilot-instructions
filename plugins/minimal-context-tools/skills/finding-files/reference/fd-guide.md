# fd Quick Reference

**Goal: Fast, intuitive file discovery with parallel search.**

## Core Patterns
```bash
fd 'pattern' [path] [options]          # Basic search
fd -e js -e ts                    # Multiple extensions
fd --type file | dir | exec         # Filter by type
fd --max-depth 3                    # Depth limit
fd -H                              # Include hidden files
fd -I                              # Ignore .gitignore
```

## Filtering Options
```bash
fd --exclude node_modules           # Exclude patterns
fd --size '+1M'                    # Size filtering (+/-/range)
fd --changed-within 1d              # Time filtering (d/h/m)
fd --full-path                      # Search full path
fd --case-sensitive                 # Smart case override
```

## Command Execution
```bash
fd -e js -x wc -l                 # Per file
fd -e js -X wc -l                 # Batch all
# Placeholders: {}, {.}, {/}, {/.}, {//}
fd -e jpg -x convert {} {.}.png       # Convert files
```

## Common Tasks
```bash
fd -e js src/                       # Find JS in src
fd '\.test\.' -e js                 # Find test files
fd --type empty -x rm                # Clean empty files
fd -e json -X jq '.version'         # Process JSON
fd -l                               # List with details
```

## Key Advantages vs find
- **13-23x faster** performance  
- Smart defaults (ignore hidden/.gitignore)
- Parallel directory traversal
- Intuitive pattern syntax (no -name -o -print)
- Colorized output by file type
