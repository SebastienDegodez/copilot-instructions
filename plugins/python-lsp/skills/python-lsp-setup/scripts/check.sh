#!/usr/bin/env bash
# Checks that the Python language server used by the python-lsp plugin is installed.
# Install with:
#   npm install -g pyright
#   pipx install pyright   # ou : pip install pyright
set -u

status=0
if command -v pyright-langserver >/dev/null 2>&1; then
  echo "OK      pyright-langserver: $(command -v pyright-langserver)"
else
  echo "MISSING pyright-langserver (required)"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(pyright --version)"
fi
exit "$status"
