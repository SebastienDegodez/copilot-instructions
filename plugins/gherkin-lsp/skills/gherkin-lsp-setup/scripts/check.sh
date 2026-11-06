#!/usr/bin/env bash
# Checks that the Gherkin language server used by the gherkin-lsp plugin is installed.
# Install with:
#   npm install -g @cucumber/language-server
set -u

status=0
if command -v cucumber-language-server >/dev/null 2>&1; then
  echo "OK      cucumber-language-server: $(command -v cucumber-language-server)"
else
  echo "MISSING cucumber-language-server (required)"
  status=1
fi
exit "$status"
