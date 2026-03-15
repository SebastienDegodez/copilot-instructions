#!/bin/bash
# snip — CLI Token Killer hook
# PreToolUse hook: reads JSON from stdin, rewrites command through snip
# Compatible with both Claude Code and GitHub Copilot hook formats

# Graceful degradation: if snip or jq are missing, allow original command
if ! command -v snip &>/dev/null || ! command -v jq &>/dev/null; then
  exit 0
fi

set -euo pipefail

INPUT=$(cat)

# Detect format and extract command:
# - Claude Code: .tool_input.command
# - Copilot: .toolArgs is a JSON string containing .command
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FORMAT="claude"
if [ -z "$CMD" ]; then
  TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs // empty')
  if [ -n "$TOOL_ARGS" ]; then
    CMD=$(echo "$TOOL_ARGS" | jq -r '.command // empty')
    FORMAT="copilot"
  fi
fi

# Nothing to rewrite
if [ -z "$CMD" ]; then
  exit 0
fi

# Extract the first command (before && or | or ;)
FIRST_CMD=$(echo "$CMD" | head -1 | sed 's/[;&|].*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Skip if already using snip
case "$FIRST_CMD" in
  snip\ *|*/snip\ *) exit 0 ;;
esac

# Strip leading env var assignments (e.g. CGO_ENABLED=0 go test)
BARE_CMD=$(echo "$FIRST_CMD" | sed 's/^[A-Za-z_][A-Za-z0-9_]*=[^ ]* *//')

# Extract the base command name
BASE=$(echo "$BARE_CMD" | awk '{print $1}')

# Check if this command is supported
REWRITE=""
case "$BASE" in
  git|go|cargo|dotnet|npm|npx|yarn|pnpm|docker|kubectl|make|pip|pytest|jest|tsc|eslint|rustc)
    REWRITE=$(echo "$CMD" | sed "s|$BARE_CMD|snip $BARE_CMD|")
    ;;
esac

# No match — allow original command unchanged
if [ -z "$REWRITE" ]; then
  exit 0
fi

# Build output in the appropriate format
if [ "$FORMAT" = "copilot" ]; then
  # Copilot format: permissionDecision at top level
  jq -n \
    --arg cmd "$REWRITE" \
    '{
      "permissionDecision": "allow",
      "permissionDecisionReason": "snip auto-rewrite"
    }'
else
  # Claude Code format: hookSpecificOutput with updatedInput
  ORIGINAL_INPUT=$(echo "$INPUT" | jq -c '.tool_input')
  UPDATED_INPUT=$(echo "$ORIGINAL_INPUT" | jq --arg cmd "$REWRITE" '.command = $cmd')

  jq -n \
    --argjson updated "$UPDATED_INPUT" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "permissionDecisionReason": "snip auto-rewrite",
        "updatedInput": $updated
      }
    }'
fi
