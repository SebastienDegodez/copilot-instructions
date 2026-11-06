#!/usr/bin/env bash
# Checks that the JSON language server used by the json-lsp plugin is installed.
# Install with:
#   npm install -g vscode-langservers-extracted
set -u

status=0
if command -v vscode-json-language-server >/dev/null 2>&1; then
  echo "OK      vscode-json-language-server: $(command -v vscode-json-language-server)"
else
  echo "MISSING vscode-json-language-server (required)"
  status=1
fi
exit "$status"
