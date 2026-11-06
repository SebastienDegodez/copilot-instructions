#!/usr/bin/env bash
# Checks that the Bash language server used by the bash-lsp plugin is installed.
# Install with:
#   npm install -g bash-language-server
#   sudo apt-get install -y shellcheck   # ou : brew install shellcheck
set -u

status=0
if command -v bash-language-server >/dev/null 2>&1; then
  echo "OK      bash-language-server: $(command -v bash-language-server)"
else
  echo "MISSING bash-language-server (required)"
  status=1
fi
if command -v shellcheck >/dev/null 2>&1; then
  echo "OK      shellcheck: $(command -v shellcheck)"
else
  echo "OPTIONAL shellcheck not found"
fi
if command -v shfmt >/dev/null 2>&1; then
  echo "OK      shfmt: $(command -v shfmt)"
else
  echo "OPTIONAL shfmt not found"
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(bash-language-server --version)"
fi
exit "$status"
