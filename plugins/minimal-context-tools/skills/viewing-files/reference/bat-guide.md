# bat Quick Reference

**Goal: Enhanced file viewer with syntax highlighting and Git integration.**

## Core Usage
```bash
bat README.md                    # View with syntax highlighting
bat file1 file2 file3           # Multiple files
bat --line-range 10:20 file.py  # View specific lines
bat -n script.sh                # Line numbers only
```

## Language & Themes
```bash
bat -l json data.txt            # Force language detection
bat --list-themes               # Show available themes
bat --theme Monokai Extended    # Set theme
export BAT_THEME="TwoDark"      # Set default theme
```

## Customizing Output
```bash
bat --style numbers,changes    # Show line numbers and git changes
bat --style plain               # No decorations
bat --decorations never         # Disable decorations when piping
bat -p file.txt | xclip         # Plain output for copying
```

## Git Integration
```bash
bat --diff file.rs              # Show git modifications
git show HEAD:file.py | bat -l py  # View historical files
git diff --name-only | xargs bat --diff  # Preview changed files
```

## Special Features
```bash
bat -A /etc/hosts              # Show non-printable characters
bat --wrap never               # Disable line wrapping
bat --tabs 2                   # Set tab width
bat --italic-text=always       # Enable italic text
```

## Integration Examples
```bash
# With fzf for file preview
fzf --preview "bat --color=always --style=numbers {}"

# Colorizing help text
command --help | bat -l help -p

# Tail with syntax highlighting
tail -f log.txt | bat --paging=never -l log

# Reading from stdin
curl -s api.com/data | bat -l json
```

## Environment Variables
```bash
export BAT_STYLE="numbers,changes,header"
export BAT_PAGER="less -RFK"
export BAT_THEME="GitHub"
export BAT_TABS=4
```
