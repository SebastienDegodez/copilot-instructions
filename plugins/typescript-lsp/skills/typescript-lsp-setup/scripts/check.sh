#!/usr/bin/env bash
# Checks that the TypeScript & JavaScript language server used by the typescript-lsp plugin is installed.
# Install with:
#   npm install -g typescript@latest
set -u

status=0
if command -v tsc >/dev/null 2>&1; then
  echo "OK      tsc: $(command -v tsc)"
else
  echo "MISSING tsc (required)"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(tsc --version)"
fi
exit "$status"
