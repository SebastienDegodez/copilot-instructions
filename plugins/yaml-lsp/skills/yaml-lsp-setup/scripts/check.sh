#!/usr/bin/env bash
# Checks that the YAML language server used by the yaml-lsp plugin is installed.
# Install with:
#   npm install -g yaml-language-server
set -u

status=0
if command -v yaml-language-server >/dev/null 2>&1; then
  echo "OK      yaml-language-server: $(command -v yaml-language-server)"
else
  echo "MISSING yaml-language-server (required)"
  status=1
fi
exit "$status"
