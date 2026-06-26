#!/bin/bash
# snip — CLI Token Killer hook (thin adapter)
#
# Reads a PreToolUse payload (Claude Code or GitHub Copilot/VS Code shape) and
# delegates ALL rewrite and security logic to snip's native `snip hook` handler.
# snip owns command segmentation, the supported-command allowlist, transparent
# runner prefixes (uv/poetry/docker exec…), unverifiable-construct passthrough,
# and the conditional auto-allow (only when every segment is attested — #88).
# This script merely bridges the Copilot/VS Code hook format, which snip does
# not parse natively, to and from the Claude Code shape snip expects.

# Graceful degradation: if snip or jq are missing, allow the original command.
if ! command -v snip &>/dev/null || ! command -v jq &>/dev/null; then
  exit 0
fi

set -euo pipefail

INPUT=$(cat)

# Detect the caller's format and extract the command + its tool_input object:
# - Claude Code: .tool_input is an object with .command
# - Copilot/VS Code: .toolArgs is a JSON string containing .command
FORMAT="claude"
TOOL_INPUT=$(printf '%s' "$INPUT" | jq -c '.tool_input // empty')
CMD=$(printf '%s' "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null || true)
if [ -z "$CMD" ]; then
  TOOL_ARGS=$(printf '%s' "$INPUT" | jq -r '.toolArgs // empty')
  if [ -n "$TOOL_ARGS" ]; then
    TOOL_INPUT=$(printf '%s' "$TOOL_ARGS" | jq -c '.')
    CMD=$(printf '%s' "$TOOL_INPUT" | jq -r '.command // empty')
    FORMAT="copilot"
  fi
fi

# Nothing to rewrite.
[ -z "$CMD" ] && exit 0

# Normalize to the Claude Code PreToolUse shape `snip hook` expects (tool_name
# must be "Bash"), preserving any extra tool_input fields, then delegate.
PAYLOAD=$(jq -n --argjson ti "$TOOL_INPUT" '{tool_name: "Bash", tool_input: $ti}')
SNIP_OUT=$(printf '%s' "$PAYLOAD" | snip hook 2>/dev/null || true)

# snip emitted nothing → no rewrite needed; allow the original command unchanged.
[ -z "$SNIP_OUT" ] && exit 0

if [ "$FORMAT" = "claude" ]; then
  # snip's response already matches the Claude Code hook shape — pass it through.
  printf '%s\n' "$SNIP_OUT"
  exit 0
fi

# Copilot/VS Code: re-shape snip's Claude response. Propagate snip's decision —
# only auto-allow when snip attested every segment; otherwise rewrite for token
# savings but defer the decision so the user is still prompted (#88).
NEW_CMD=$(printf '%s' "$SNIP_OUT" | jq -r '.hookSpecificOutput.updatedInput.command // empty')
[ -z "$NEW_CMD" ] && exit 0

DECISION=$(printf '%s' "$SNIP_OUT" | jq -r '.hookSpecificOutput.permissionDecision // empty')
if [ "$DECISION" = "allow" ]; then
  jq -n --arg cmd "$NEW_CMD" \
    '{permissionDecision: "allow", permissionDecisionReason: "snip auto-rewrite", updatedInput: {command: $cmd}}'
else
  jq -n --arg cmd "$NEW_CMD" '{updatedInput: {command: $cmd}}'
fi
