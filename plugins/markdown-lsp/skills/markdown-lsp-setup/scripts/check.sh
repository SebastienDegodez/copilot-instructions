#!/usr/bin/env bash
# Checks that the Markdown language server used by the markdown-lsp plugin is installed.
# Install with:
#   brew install marksman
#   curl -fsSL -o ~/.local/bin/marksman \
#   scoop install marksman
set -u

status=0
if command -v marksman >/dev/null 2>&1; then
  echo "OK      marksman: $(command -v marksman)"
else
  echo "MISSING marksman (required)"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(marksman --version)"
fi
exit "$status"
