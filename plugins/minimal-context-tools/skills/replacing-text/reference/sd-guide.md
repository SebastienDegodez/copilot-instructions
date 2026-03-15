# sd Quick Reference

**Goal: Fast, intuitive find & replace with JavaScript regex syntax.**

## Core Patterns
```bash
sd "find" "replace" file.txt              # Basic replacement
sd -F "literal" "new" file.txt            # String-literal mode  
sd '\s+$' '' file.txt                      # Regex: trim whitespace
sd '(\w+)' '$1_var' file.txt               # Capture groups
sd '(?P<name>\w+)' '$name' file.txt         # Named groups
sd '(?P<var>\w+)' '${var}_suffix' file.txt   # Ambiguity fix
```

## File Operations
```bash
sd "old" "new" *.md                       # Multiple files
cat file | sd "before" "after"               # Pipeline
sd --preview "find" "replace" file.txt        # Preview changes
sd "text" '$$literal' file.txt              # Escape $
sd "old" -- "-new-option"                  # Handle - in replacement
```

## Common Tasks
```bash
sd '\s+' ' ' file.txt                       # Fix whitespace
sd '<[^>]*>' '' file.html                   # Remove HTML tags
sd '\r\n' '\n' file.txt                    # Convert line endings
sd '(\d+)-(\d+)-(\d+)' '$3/$2/$1' file.csv  # Date format
sd 'oldFunc(' 'newFunc(' *.js              # Rename functions
```

## Key Advantages vs sed
- **2-12x faster** performance
- JavaScript regex syntax (no escaping hell)
- Split find/replace arguments (clearer)
- Automatic global replacement (no /g needed)
