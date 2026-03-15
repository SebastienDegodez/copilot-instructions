# fzf Quick Reference Guide

**Goal: Interactive fuzzy selection for any command-line list.**

## Basic Usage
```bash
find . -type f | fzf              # Fuzzy select files
ps -ef | fzf                   # Select process
history | fzf                    # Select from history
```

## Display Modes
```bash
fzf --height 40%                # Height mode
fzf --layout reverse             # Reverse layout
fzf --border rounded               # Rounded border
fzf --tmux center,80%           # Tmux popup mode
fzf --style full                 # Full UI preset
```

## Search Syntax
```bash
sbtrkt                           # Fuzzy match
'strict                          # Exact match
'strict'                         # Exact word boundary
^start                            # Starts with prefix
end$                              # Ends with suffix
!exclude                          # Excludes pattern
!^prefix                          # Doesn't start with
```

## Multi-Select
```bash
fzf -m                            # Multi-select mode
fzf --multi                        # Long form
# Use TAB to select, Shift-TAB to deselect
```

## Preview Window
```bash
fzf --preview 'bat --color=always {}'
fzf --preview-window up,50%
fzf --preview "tree -C {}" --header "Directory Tree"
```

## Key Bindings
```bash
fzf --bind 'ctrl-y:execute-silent(echo {} | pbcopy)'
fzf --bind 'enter:become(vim {})'
fzf --bind 'f1:toggle-preview'
fzf --bind 'ctrl-r:reload(find .)'
```

## File System
```bash
fzf --walker file,dir,follow,hidden     # Walk with options
fzf --walker-skip .git,node_modules     # Skip directories
fzf --walker-root /path              # Start from root
```

## Integration Examples

### File Selection
```bash
vim $(fzf)                       # Edit selected file
cd $(find . -type d | fzf)       # Change directory
rm $(fzf -m)                     # Delete selected files
```

### Command History
```bash
eval $(history | fzf)            # Execute from history
fzf --scheme history               # Optimized for history
```

### Process Management
```bash
kill -9 $(ps -ef | fzf | awk '{print $2}')
kill $(ps aux | fzf | awk '{print $2}')
```

### Git Integration
```bash
git checkout $(git branch | fzf)
git log --oneline | fzf --multi | xargs git show
git diff --name-only | fzf -m | xargs git diff
```

### Advanced Selection
```bash
# Interactive ripgrep
rg "" | fzf --bind 'change:reload(rg {q})'

# JSON processing
cat data.json | jq -r '.[].name' | fzf

# Database queries
mysql -e "SHOW TABLES" | fzf
```

## Environment Configuration
```bash
export FZF_DEFAULT_COMMAND='find . -type f'
export FZF_DEFAULT_OPTS='--height 40% --layout reverse'
export FZF_CTRL_T_OPTS="--preview 'bat --color=always {}'"
export FZF_CTRL_R_OPTS='--no-sort'
export FZF_ALT_C_OPTS="--preview 'tree -C {}'"
```

## Shell Integration Setup
```bash
# Bash
eval "$(fzf --bash)"

# Zsh
source <(fzf --zsh)"

# Fish
fzf --fish | source
```

## Custom Functions
```bash
# File selection with preview
ff() {
  fzf --preview 'bat --color=always {}' --bind 'enter:become(vim {})'
}

# Directory change with tree preview
cdtree() {
  cd $(find . -type d | fzf --preview 'tree -C {}')
}
```

## Performance Tips
```bash
# For large lists
fzf --scheme path --walker file,dir

# Disable expensive features
fzf --no-ansi --no-mouse

# Use exact matching when appropriate
fzf -e for structured data
```

## Troubleshooting
```bash
# Check if fzf is installed
which fzf

# Test basic functionality
echo -e "one\ntwo\nthree" | fzf

# Verify shell integration
fzf --bash --help    # Check bash integration
fzf --zsh --help     # Check zsh integration
```
